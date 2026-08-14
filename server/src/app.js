import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import { errorHandler } from './middleware/errorHandler.js';
import { projectsRouter } from './modules/projects/projects.routes.js';
import { membersRouter } from './modules/memberReports/memberReports.routes.js';
import { meetingDatesRouter } from './modules/meetingDates/meetingDates.routes.js';
import { meetingStatusRouter } from './modules/meetingStatus/meetingStatus.routes.js';
import { versionRouter } from './modules/version/version.routes.js';
import { env } from './config/env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(__dirname, '../../client/dist');

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (req, res) => {
    res.json({ ok: true, service: 'syncboard-server', time: new Date().toISOString() });
  });

  app.use('/api/projects', projectsRouter);
  app.use('/api/members', membersRouter);
  app.use('/api/meeting-dates', meetingDatesRouter);
  app.use('/api/meeting-status', meetingStatusRouter);
  app.use('/api/version', versionRouter);

  app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Not Found' });
  });

  if (env.NODE_ENV === 'production') {
    app.use(express.static(clientDist));
    app.get('*', (req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  app.use(errorHandler);

  return app;
}
