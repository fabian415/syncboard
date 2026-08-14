import { http } from './http.js';

export function getMeetingStatus(date) {
  return http.get(`/meeting-status/${date}`).then((res) => res.data.report);
}

export function saveMarkdown(date, markdown) {
  return http.put(`/meeting-status/${date}/markdown`, { markdown }).then((res) => res.data);
}

export function refactor(date) {
  return http.post(`/meeting-status/${date}/refactor`).then((res) => res.data.pages);
}

export function saveHtml(date, html) {
  return http.put(`/meeting-status/${date}/html`, { html }).then((res) => res.data.pages);
}
