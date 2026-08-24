import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { env } from '../config/env.js';
import { HttpError } from '../middleware/errorHandler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORAGE_ROOT = path.resolve(__dirname, '../../', env.STORAGE_ROOT);

const DATE_RE = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
// Characters that are unsafe in a Windows or POSIX path segment.
const RESERVED_NAME_CHARS = ['/', ':', '*', '?', '"', '<', '>', path.win32.sep];

function assertSafeSegment(value, re, label) {
  if (typeof value !== 'string' || !re.test(value)) {
    throw new HttpError(400, `Invalid ${label}: ${value}`);
  }
  return value;
}

export function assertValidDate(date) {
  return assertSafeSegment(date, DATE_RE, 'date');
}

// Folder names are derived from user/project display names (e.g. "Fabian",
// "Physical AI") rather than their UUIDs, so the tree in storage/ stays
// human-readable. Sanitize rather than whitelist since names can contain
// spaces, unicode, "&", etc.
function assertValidName(name, label) {
  if (typeof name !== 'string' || !name.trim()) {
    throw new HttpError(400, `Invalid ${label}: ${name}`);
  }
  let cleaned = name.trim();
  for (const ch of RESERVED_NAME_CHARS) {
    cleaned = cleaned.split(ch).join('_');
  }
  if (cleaned === '.' || cleaned === '..') {
    throw new HttpError(400, `Invalid ${label}: ${name}`);
  }
  return cleaned;
}

export function reportDir(projectName, userName, date) {
  const project = assertValidName(projectName, 'projectName');
  const user = assertValidName(userName, 'userName');
  assertValidDate(date);
  return path.join(STORAGE_ROOT, project, user, date);
}

export function reportMarkdownPath(projectName, userName, date) {
  return path.join(reportDir(projectName, userName, date), 'report.md');
}

export function reportHtmlPath(projectName, userName, date) {
  return path.join(reportDir(projectName, userName, date), 'presentation.html');
}

export function memberReportDir(userName, periodStart) {
  const user = assertValidName(userName, 'userName');
  assertValidDate(periodStart);
  return path.join(STORAGE_ROOT, '_members', user, periodStart);
}

export function memberReportMarkdownPath(userName, periodStart) {
  return path.join(memberReportDir(userName, periodStart), 'report.md');
}

export function meetingStatusDir(date) {
  assertValidDate(date);
  return path.join(STORAGE_ROOT, '_meeting-status', date);
}

export function meetingStatusMarkdownPath(date) {
  return path.join(meetingStatusDir(date), 'report.md');
}

export function meetingStatusHtmlPath(date) {
  return path.join(meetingStatusDir(date), 'presentation.html');
}

export function meetingStatusSectionMarkdownPath(date, sectionKey) {
  return path.join(meetingStatusDir(date), 'sections', `${sectionKey}.md`);
}

export function meetingStatusSectionHtmlPath(date, sectionKey) {
  return path.join(meetingStatusDir(date), 'sections', `${sectionKey}.html`);
}

export function combinedDir(projectName, date) {
  const project = assertValidName(projectName, 'projectName');
  assertValidDate(date);
  return path.join(STORAGE_ROOT, project, 'combined', date);
}

export function combinedHtmlPath(projectName, date) {
  return path.join(combinedDir(projectName, date), 'combined.html');
}

// Deep Dive assets are keyed by a server-generated UUID (not a user-supplied
// name), so unlike reportDir/combinedDir there's no untrusted name segment
// to sanitize here — assertValidDate is the only guard needed.
export function deepDiveDir(date) {
  assertValidDate(date);
  return path.join(STORAGE_ROOT, '_deep-dive', date);
}

export function deepDiveAssetDir(date, assetId) {
  return path.join(deepDiveDir(date), assetId);
}

export function deepDiveOriginalPath(date, assetId, ext) {
  return path.join(deepDiveAssetDir(date, assetId), `original.${ext}`);
}

export function deepDiveSlidesDir(date, assetId) {
  return path.join(deepDiveAssetDir(date, assetId), 'slides');
}

export function deepDiveSlidePath(date, assetId, n) {
  return path.join(deepDiveSlidesDir(date, assetId), `slide-${n}.png`);
}

// Static-mount root for express.static — only this subtree is ever served
// as raw files. Kept separate from deepDiveUploadStagingDir() so in-progress
// or abandoned tus uploads are never web-reachable.
export function deepDiveStaticRoot() {
  return path.join(STORAGE_ROOT, '_deep-dive');
}

export function deepDiveUploadStagingDir() {
  return path.join(STORAGE_ROOT, '_deep-dive-uploads');
}

// Converts an absolute fs path under deepDiveStaticRoot() into the
// root-relative URL the express.static mount serves it at.
export function deepDivePublicUrl(absPath) {
  const rel = path.relative(deepDiveStaticRoot(), absPath).split(path.sep).join('/');
  return `/deep-dive-assets/${rel}`;
}

export async function removeDir(dirPath) {
  await fs.rm(dirPath, { recursive: true, force: true });
}

export async function readTextFile(filePath) {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

export async function writeTextFile(filePath, content) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, 'utf-8');
}

// Renames a report/meeting-status folder in place (e.g. when a meeting date
// is changed). Merges into an existing destination rather than clobbering it,
// since the caller may be consolidating into a date that already has files.
export async function moveDir(src, dest) {
  if (src === dest) return;
  const srcExists = await fs
    .access(src)
    .then(() => true)
    .catch(() => false);
  if (!srcExists) return;

  await fs.mkdir(path.dirname(dest), { recursive: true });
  const destExists = await fs
    .access(dest)
    .then(() => true)
    .catch(() => false);
  if (!destExists) {
    await fs.rename(src, dest);
  } else {
    await fs.cp(src, dest, { recursive: true, force: true });
    await fs.rm(src, { recursive: true, force: true });
  }
}
