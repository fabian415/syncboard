import { http } from './http.js';

export function listMeetingDates() {
  return http.get('/meeting-dates').then((res) => res.data.dates);
}

export function renameMeetingDate(oldDate, newDate) {
  return http.patch('/meeting-dates', { oldDate, newDate }).then((res) => res.data);
}
