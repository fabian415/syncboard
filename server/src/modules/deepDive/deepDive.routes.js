import { Router } from 'express';
import { listAssetsHandler, getAssetHandler, deleteAssetHandler } from './deepDive.controller.js';

export const deepDiveRouter = Router();

deepDiveRouter.get('/:date/assets', listAssetsHandler);
deepDiveRouter.get('/:date/assets/:assetId', getAssetHandler);
deepDiveRouter.delete('/:date/assets/:assetId', deleteAssetHandler);
