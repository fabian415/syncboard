import { http } from './http.js';

export function getCombined(projectId, date) {
  return http.get(`/projects/${projectId}/combined/${date}`).then((res) => res.data);
}

export function combineProject(projectId, date) {
  return http.post(`/projects/${projectId}/combined/${date}/combine`).then((res) => res.data.pages);
}

export function saveCombinedHtml(projectId, date, html) {
  return http.put(`/projects/${projectId}/combined/${date}`, { html }).then((res) => res.data.pages);
}
