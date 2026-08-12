import { Router } from 'express';
import { listMeetingDatesHandler } from './meetingDates.controller.js';

export const meetingDatesRouter = Router();

meetingDatesRouter.get('/', listMeetingDatesHandler);
