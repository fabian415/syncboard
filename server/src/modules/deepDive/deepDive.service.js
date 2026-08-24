import path from 'node:path';
import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { prisma } from '../../db/prisma.js';
import { HttpError } from '../../middleware/errorHandler.js';
import {
  assertValidDate,
  deepDiveAssetDir,
  deepDiveOriginalPath,
  deepDiveSlidePath,
  deepDivePublicUrl,
  removeDir,
} from '../../storage/fsStore.js';
import { convertPptxToSlides } from '../../deepDive/pptxConverter.js';

const ASSET_TYPES = ['HTML', 'IMAGE', 'PPTX'];
// SVG is deliberately excluded from IMAGE: it can embed <script>/event
// handlers and would be a stored-XSS vector once served as a direct,
// unauthenticated static link.
const EXTENSIONS_BY_TYPE = {
  HTML: ['html', 'htm'],
  IMAGE: ['png', 'jpg', 'jpeg', 'gif', 'webp'],
  PPTX: ['pptx'],
};

export function assertAssetType(assetType) {
  if (!ASSET_TYPES.includes(assetType)) {
    throw new HttpError(400, `Invalid assetType: ${assetType}`);
  }
  return assetType;
}

function extensionFor(assetType, originalName) {
  const ext = path.extname(originalName || '').slice(1).toLowerCase();
  const allowed = EXTENSIONS_BY_TYPE[assetType];
  if (!ext || !allowed.includes(ext)) {
    throw new HttpError(400, `Unsupported file extension "${ext}" for asset type ${assetType}`);
  }
  return ext;
}

function toDateOnly(date) {
  return new Date(`${date}T00:00:00.000Z`);
}

function formatDateOnly(dateValue) {
  return dateValue.toISOString().slice(0, 10);
}

function slideUrls(date, assetId, slideCount) {
  if (!slideCount) return [];
  return Array.from({ length: slideCount }, (_, i) => deepDivePublicUrl(deepDiveSlidePath(date, assetId, i + 1)));
}

export function toPublicAsset(row) {
  const date = formatDateOnly(row.meetingDate);
  const base = {
    id: row.id,
    assetType: row.assetType,
    status: row.status,
    originalName: row.originalName,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    errorMessage: row.errorMessage,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
  if (row.assetType === 'PPTX') {
    return {
      ...base,
      slideCount: row.slideCount ?? 0,
      slideUrls: slideUrls(date, row.id, row.slideCount),
      url: deepDivePublicUrl(row.filePath),
    };
  }
  return { ...base, url: deepDivePublicUrl(row.filePath) };
}

// Invoked from the tus server's onUploadFinish hook once a chunked upload
// completes. Moves the staged file out of the (non-web-reachable) tus
// staging dir into its permanent, statically-served location, then — for
// PPTX only — kicks off conversion without awaiting it, so the upload
// response returns immediately instead of blocking on a LibreOffice run.
export async function createAssetRecord({ meetingDate, assetType, originalName, mimeType, sizeBytes, stagedFilePath }) {
  assertValidDate(meetingDate);
  assertAssetType(assetType);
  const ext = extensionFor(assetType, originalName);

  const assetId = randomUUID();
  const destPath = deepDiveOriginalPath(meetingDate, assetId, ext);
  await fs.mkdir(path.dirname(destPath), { recursive: true });
  await fs.rename(stagedFilePath, destPath);

  const row = await prisma.deepDiveAsset.create({
    data: {
      id: assetId,
      meetingDate: toDateOnly(meetingDate),
      assetType,
      status: assetType === 'PPTX' ? 'PROCESSING' : 'READY',
      originalName: originalName || `${assetId}.${ext}`,
      filePath: destPath,
      mimeType: mimeType || null,
      sizeBytes: Number.isFinite(sizeBytes) ? sizeBytes : null,
    },
  });

  if (assetType === 'PPTX') {
    convertPptxToSlides({ date: meetingDate, assetId, sourcePath: destPath })
      .then((slideCount) => prisma.deepDiveAsset.update({ where: { id: assetId }, data: { status: 'READY', slideCount } }))
      .catch((err) => {
        console.error(`[deepDive] PPTX conversion failed for asset ${assetId}:`, err);
        return prisma.deepDiveAsset.update({
          where: { id: assetId },
          data: { status: 'FAILED', errorMessage: (err.message || 'PPTX conversion failed').slice(0, 500) },
        });
      });
  }

  return row;
}

export async function listAssets(date) {
  assertValidDate(date);
  const rows = await prisma.deepDiveAsset.findMany({
    where: { meetingDate: toDateOnly(date) },
    orderBy: { createdAt: 'asc' },
  });
  return rows.map(toPublicAsset);
}

async function findAssetOrThrow(date, assetId) {
  assertValidDate(date);
  const row = await prisma.deepDiveAsset.findUnique({ where: { id: assetId } });
  if (!row || formatDateOnly(row.meetingDate) !== date) {
    throw new HttpError(404, 'Asset not found');
  }
  return row;
}

export async function getAsset(date, assetId) {
  const row = await findAssetOrThrow(date, assetId);
  return toPublicAsset(row);
}

export async function deleteAsset(date, assetId) {
  const row = await findAssetOrThrow(date, assetId);
  await removeDir(deepDiveAssetDir(date, row.id));
  await prisma.deepDiveAsset.delete({ where: { id: row.id } });
}
