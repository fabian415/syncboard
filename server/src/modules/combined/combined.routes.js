import { Router } from 'express';
import { combineHandler, getCombinedHandler, saveCombinedHandler } from './combined.controller.js';

export const combinedRouter = Router({ mergeParams: true });

combinedRouter.get('/:date', getCombinedHandler);
combinedRouter.put('/:date', saveCombinedHandler);
combinedRouter.post('/:date/combine', combineHandler);
