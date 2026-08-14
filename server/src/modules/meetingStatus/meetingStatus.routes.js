import { Router } from 'express';
import {
  getPresentationHandler,
  getOverviewHandler,
  getHeaderHandler,
  saveHeaderHandler,
  getSectionHandler,
  saveSectionHandler,
  getSectionPresentationHandler,
  refactorSectionHandler,
  saveSectionHtmlHandler,
  saveHtmlHandler,
  refactorHandler,
} from './meetingStatus.controller.js';

export const meetingStatusRouter = Router();

meetingStatusRouter.get('/:date', getPresentationHandler);
meetingStatusRouter.get('/:date/overview', getOverviewHandler);
meetingStatusRouter.get('/:date/header', getHeaderHandler);
meetingStatusRouter.put('/:date/header', saveHeaderHandler);
meetingStatusRouter.get('/:date/sections/:sectionKey', getSectionHandler);
meetingStatusRouter.put('/:date/sections/:sectionKey', saveSectionHandler);
meetingStatusRouter.get('/:date/sections/:sectionKey/presentation', getSectionPresentationHandler);
meetingStatusRouter.post('/:date/sections/:sectionKey/refactor', refactorSectionHandler);
meetingStatusRouter.put('/:date/sections/:sectionKey/html', saveSectionHtmlHandler);
meetingStatusRouter.put('/:date/html', saveHtmlHandler);
meetingStatusRouter.post('/:date/refactor', refactorHandler);
