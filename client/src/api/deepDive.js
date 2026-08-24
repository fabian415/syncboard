import { http } from './http.js';

export const TUS_UPLOAD_ENDPOINT = '/api/deep-dive/uploads';

export function listAssets(date) {
  return http.get(`/deep-dive/${date}/assets`).then((res) => res.data.assets);
}

export function getAsset(date, assetId) {
  return http.get(`/deep-dive/${date}/assets/${assetId}`).then((res) => res.data.asset);
}

export function deleteAsset(date, assetId) {
  return http.delete(`/deep-dive/${date}/assets/${assetId}`).then((res) => res.data);
}
