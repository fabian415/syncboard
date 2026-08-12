import { http } from './http.js';

export function getMemberReport(projectId, userId, date) {
  return http.get(`/projects/${projectId}/members/${userId}/reports/${date}`).then((res) => res.data.report);
}

export function saveHtml(projectId, userId, date, html) {
  return http
    .put(`/projects/${projectId}/members/${userId}/reports/${date}/html`, { html })
    .then((res) => res.data.htmlPages);
}
