import { Router } from 'express';
import { getVersionInfoHandler } from './version.controller.js';

export const versionRouter = Router();

versionRouter.get('/', getVersionInfoHandler);
