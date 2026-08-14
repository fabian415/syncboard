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
