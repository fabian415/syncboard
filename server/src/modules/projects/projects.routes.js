import { Router } from 'express';
import { listProjectsHandler, getProjectHandler } from './projects.controller.js';
import { reportsRouter } from '../reports/reports.routes.js';
import { combinedRouter } from '../combined/combined.routes.js';

export const projectsRouter = Router();

projectsRouter.get('/', listProjectsHandler);
projectsRouter.get('/:projectId', getProjectHandler);
projectsRouter.use('/:projectId/members/:userId/reports', reportsRouter);
projectsRouter.use('/:projectId/combined', combinedRouter);
