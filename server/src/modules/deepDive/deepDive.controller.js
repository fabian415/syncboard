import * as deepDiveService from './deepDive.service.js';

export async function listAssetsHandler(req, res, next) {
  try {
    const assets = await deepDiveService.listAssets(req.params.date);
    res.json({ assets });
  } catch (err) {
    next(err);
  }
}

export async function getAssetHandler(req, res, next) {
  try {
    const asset = await deepDiveService.getAsset(req.params.date, req.params.assetId);
    res.json({ asset });
  } catch (err) {
    next(err);
  }
}

export async function deleteAssetHandler(req, res, next) {
  try {
    await deepDiveService.deleteAsset(req.params.date, req.params.assetId);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}
