import { Router } from 'express';
import {
  getMeetingStatusHandler,
  saveMarkdownHandler,
  saveHtmlHandler,
  refactorHandler,
} from './meetingStatus.controller.js';

export const meetingStatusRouter = Router();

meetingStatusRouter.get('/:date', getMeetingStatusHandler);
meetingStatusRouter.put('/:date/markdown', saveMarkdownHandler);
meetingStatusRouter.put('/:date/html', saveHtmlHandler);
meetingStatusRouter.post('/:date/refactor', refactorHandler);
