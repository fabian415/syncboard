import { Router } from 'express';
import {
  listMembersHandler,
  getPersonalReportHandler,
  saveMarkdownHandler,
  distributeHandler,
  generateSampleHandler,
} from './memberReports.controller.js';

export const membersRouter = Router();

membersRouter.get('/', listMembersHandler);
membersRouter.get('/:userId/report/:periodStart', getPersonalReportHandler);
membersRouter.put('/:userId/report/:periodStart/markdown', saveMarkdownHandler);
membersRouter.post('/:userId/report/:periodStart/distribute', distributeHandler);
membersRouter.post('/:userId/report/:periodStart/generate-sample', generateSampleHandler);
