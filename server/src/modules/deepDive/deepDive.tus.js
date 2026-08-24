import { Server } from '@tus/server';
import { FileStore } from '@tus/file-store';
import { env } from '../../config/env.js';
import { assertValidDate, deepDiveUploadStagingDir } from '../../storage/fsStore.js';
import { assertAssetType, createAssetRecord } from './deepDive.service.js';

const TUS_PATH = '/api/deep-dive/uploads';

// Rejects an upload before any bytes are accepted if its metadata is
// missing/invalid, per @tus/server's documented "throw to reject" contract
// (onUploadCreate/onUploadFinish expect a thrown { status_code, body }, not
// a returned error).
function rejectWith(err) {
  throw { status_code: err.status || 400, body: err.publicMessage || err.message || 'Invalid upload' };
}

export function createDeepDiveTusServer() {
  return new Server({
    path: TUS_PATH,
    datastore: new FileStore({ directory: deepDiveUploadStagingDir() }),
    maxSize: env.DEEP_DIVE_MAX_UPLOAD_MB * 1024 * 1024,
    async onUploadCreate(req, upload) {
      const meta = upload.metadata || {};
      try {
        assertValidDate(meta.meetingDate);
        assertAssetType(meta.assetType);
      } catch (err) {
        rejectWith(err);
      }
      return {};
    },
    async onUploadFinish(req, upload) {
      const meta = upload.metadata || {};
      try {
        await createAssetRecord({
          meetingDate: meta.meetingDate,
          assetType: meta.assetType,
          originalName: meta.filename || upload.id,
          mimeType: meta.filetype || null,
          sizeBytes: upload.size ?? null,
          stagedFilePath: upload.storage?.path,
        });
      } catch (err) {
        rejectWith(err);
      }
      return {};
    },
  });
}
