import * as meetingDatesService from './meetingDates.service.js';

export async function listMeetingDatesHandler(req, res, next) {
  try {
    const dates = await meetingDatesService.listMeetingDates();
    res.json({ dates });
  } catch (err) {
    next(err);
  }
}

export async function renameMeetingDateHandler(req, res, next) {
  try {
    const { oldDate, newDate } = req.body;
    const result = await meetingDatesService.renameMeetingDate(oldDate, newDate);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
