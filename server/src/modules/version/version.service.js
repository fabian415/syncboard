import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../../../..');
const versionFilePath = path.join(rootDir, 'version.txt');
const releasesFilePath = path.join(rootDir, 'release_notes.txt');

async function readFileIfExists(filePath) {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (err) {
    if (err.code === 'ENOENT') return '';
    throw err;
  }
}

/**
 * release_notes.txt blocks look like:
 *   ================================================================
 *   VERSION: v1.0.0
 *   DATE: 2026-08-12
 *   ----------------------------------------------------------------
 *   [新功能]
 *   - bullet one
 *   - bullet two
 *   ================================================================
 * Blocks are separated by "====" divider lines; each block's body is
 * split into "[category]" sections, each holding "- " bullet lines.
 */
function parseReleases(raw) {
  const chunks = raw
    .replace(/\r\n/g, '\n')
    .split(/^=+\s*$/m)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  const releases = [];

  for (const chunk of chunks) {
    const versionMatch = chunk.match(/^VERSION:\s*(.+)$/m);
    if (!versionMatch) continue; // title banner or empty chunk, not a release block

    const dateMatch = chunk.match(/^DATE:\s*(.+)$/m);
    const version = versionMatch[1].trim().replace(/^v/i, '');
    const date = dateMatch ? dateMatch[1].trim() : '';

    const bodyStart = chunk.search(/^-{5,}\s*$/m);
    const body = bodyStart === -1 ? '' : chunk.slice(chunk.indexOf('\n', bodyStart) + 1);

    const sections = [];
    let currentSection = null;

    for (const rawLine of body.split('\n')) {
      const line = rawLine.trim();
      if (!line) continue;

      const categoryMatch = line.match(/^\[(.+)\]$/);
      if (categoryMatch) {
        currentSection = { category: categoryMatch[1], notes: [] };
        sections.push(currentSection);
        continue;
      }

      if (line.startsWith('-')) {
        if (!currentSection) {
          currentSection = { category: '', notes: [] };
          sections.push(currentSection);
        }
        currentSection.notes.push(line.replace(/^-\s*/, ''));
      }
    }

    releases.push({ version, date, sections });
  }

  return releases;
}

export async function getVersionInfo() {
  const [versionRaw, releasesRaw] = await Promise.all([
    readFileIfExists(versionFilePath),
    readFileIfExists(releasesFilePath),
  ]);

  return {
    version: versionRaw.trim(),
    releases: parseReleases(releasesRaw),
  };
}
