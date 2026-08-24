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
import { searchRouter } from './modules/search/search.routes.js';
import { deepDiveRouter } from './modules/deepDive/deepDive.routes.js';
import { createDeepDiveTusServer } from './modules/deepDive/deepDive.tus.js';
import { deepDiveAssetsMiddleware } from './modules/deepDive/deepDive.staticAssets.js';
import { deepDiveStaticRoot } from './storage/fsStore.js';
import { env } from './config/env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(__dirname, '../../client/dist');

export function createApp() {
  const app = express();

  app.use(cors());

  // Mounted before express.json() so the tus server — which manages its own
  // streaming request body for chunked PATCH uploads — sees the raw stream
  // rather than having it consumed by the JSON body parser first.
  const deepDiveTus = createDeepDiveTusServer();
  const deepDiveTusApp = express();
  deepDiveTusApp.all('*', (req, res) => deepDiveTus.handle(req, res));
  app.use('/api/deep-dive/uploads', deepDiveTusApp);

  app.use(express.json({ limit: '2mb' }));

  // First subtree in this app served as static files rather than proxied
  // through a JSON API — needed so HTML assets can play in a sandboxed
  // iframe and images get shareable direct URLs. HTML gets a nav-key
  // forwarding shim injected on the way out — see deepDiveAssetsMiddleware.
  app.use('/deep-dive-assets', deepDiveAssetsMiddleware(deepDiveStaticRoot()));

  app.get('/api/health', (req, res) => {
    res.json({ ok: true, service: 'syncboard-server', time: new Date().toISOString() });
  });

  app.use('/api/projects', projectsRouter);
  app.use('/api/members', membersRouter);
  app.use('/api/meeting-dates', meetingDatesRouter);
  app.use('/api/meeting-status', meetingStatusRouter);
  app.use('/api/version', versionRouter);
  app.use('/api/search', searchRouter);
  app.use('/api/deep-dive', deepDiveRouter);

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
