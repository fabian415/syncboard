import * as meetingDatesService from './meetingDates.service.js';

export async function listMeetingDatesHandler(req, res, next) {
  try {
    const dates = await meetingDatesService.listMeetingDates();
    res.json({ dates });
  } catch (err) {
    next(err);
  }
}
