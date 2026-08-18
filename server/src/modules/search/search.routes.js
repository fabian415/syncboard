import { Router } from 'express';
import { searchHandler } from './search.controller.js';

export const searchRouter = Router();

searchRouter.get('/', searchHandler);
