import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import fs from 'node:fs/promises';
import { deepDiveSlidesDir } from '../storage/fsStore.js';
import { env } from '../config/env.js';

const execFileAsync = promisify(execFile);
const CONVERT_TIMEOUT_MS = 120_000;
const SLIDE_FILE_RE = /^slide-(\d+)\.png$/;

// pdftoppm zero-pads page numbers once the deck is large enough
// (slide-01.png vs slide-1.png) — normalize to the plain slide-{n}.png
// scheme fsStore's deepDiveSlidePath() assumes, regardless of deck size.
// Renames go through a .tmp suffix first so a renumber pass can't collide
// with a file that hasn't been renamed yet (e.g. slide-2 -> slide-1 while
// slide-1 still exists).
async function renumberSlides(slidesDir) {
  const files = await fs.readdir(slidesDir);
  const numbered = files
    .map((f) => ({ file: f, n: Number(f.match(SLIDE_FILE_RE)?.[1]) }))
    .filter((f) => Number.isFinite(f.n))
    .sort((a, b) => a.n - b.n);

  for (let i = 0; i < numbered.length; i += 1) {
    await fs.rename(path.join(slidesDir, numbered[i].file), path.join(slidesDir, `slide-${i + 1}.png.tmp`));
  }
  const tmpFiles = await fs.readdir(slidesDir);
  await Promise.all(
    tmpFiles
      .filter((f) => f.endsWith('.png.tmp'))
      .map((f) => fs.rename(path.join(slidesDir, f), path.join(slidesDir, f.replace(/\.tmp$/, '')))),
  );
  return numbered.length;
}

// Converts an uploaded PPTX to one PNG per slide. The actual LibreOffice
// rendering happens in the dedicated `unoserver` sidecar container
// (docker/unoserver) — this process stays a persistent LO instance instead
// of spawning a fresh `soffice` per conversion, and keeps LibreOffice's
// ~300-500MB footprint out of the main backend image. `unoconvert` (a thin
// Python client, no local LibreOffice/uno needed) talks to it over the
// compose network to produce a PDF; poppler's pdftoppm then rasterizes each
// PDF page locally. If the sidecar is unreachable (e.g. a local dev machine
// running outside Docker) or pdftoppm is missing, this throws and the
// caller (deepDive.service.js) marks the asset FAILED rather than letting
// the error take down the server.
export async function convertPptxToSlides({ date, assetId, sourcePath }) {
  const slidesDir = deepDiveSlidesDir(date, assetId);
  await fs.mkdir(slidesDir, { recursive: true });

  const pdfPath = path.join(slidesDir, `${path.basename(sourcePath, path.extname(sourcePath))}.pdf`);
  try {
    await execFileAsync(
      'unoconvert',
      [
        '--host', env.UNOSERVER_HOST,
        '--port', String(env.UNOSERVER_PORT),
        // unoconvert's 'auto' host-location treats a 'localhost' host as
        // sharing a filesystem with the server and just sends a path — but
        // the sidecar always runs in its own container with its own
        // filesystem, even when reached via a published localhost port from
        // local (non-Docker) dev. Force binary transfer so it works in both
        // that case and the normal Docker-to-Docker case.
        '--host-location', 'remote',
        sourcePath,
        pdfPath,
      ],
      { timeout: CONVERT_TIMEOUT_MS },
    );
  } catch (err) {
    throw new Error(`LibreOffice conversion failed (is the unoserver sidecar reachable?): ${err.message}`);
  }

  try {
    await execFileAsync('pdftoppm', ['-png', '-r', '150', pdfPath, path.join(slidesDir, 'slide')], {
      timeout: CONVERT_TIMEOUT_MS,
    });
  } catch (err) {
    throw new Error(`PDF rasterization failed (is poppler-utils installed?): ${err.message}`);
  } finally {
    await fs.rm(pdfPath, { force: true });
  }

  const slideCount = await renumberSlides(slidesDir);
  if (slideCount === 0) {
    throw new Error('PPTX conversion produced no slide images');
  }
  return slideCount;
}
