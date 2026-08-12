import { Router } from 'express';
import {
  getReportHandler,
  saveMarkdownHandler,
  submitHandler,
  refactorHandler,
  saveHtmlHandler,
} from './reports.controller.js';

export const reportsRouter = Router({ mergeParams: true });

reportsRouter.get('/:date', getReportHandler);
reportsRouter.put('/:date/markdown', saveMarkdownHandler);
reportsRouter.put('/:date/html', saveHtmlHandler);
reportsRouter.post('/:date/refactor', refactorHandler);
reportsRouter.post('/:date/submit', submitHandler);
