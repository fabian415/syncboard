import { Router } from 'express';
import { listMeetingDatesHandler, renameMeetingDateHandler } from './meetingDates.controller.js';

export const meetingDatesRouter = Router();

meetingDatesRouter.get('/', listMeetingDatesHandler);
meetingDatesRouter.patch('/', renameMeetingDateHandler);
