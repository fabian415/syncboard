import { http } from './http.js';

export function listMeetingDates() {
  return http.get('/meeting-dates').then((res) => res.data.dates);
}
