import { http } from './http.js';

export function getPresentation(date) {
  return http.get(`/meeting-status/${date}`).then((res) => res.data.report);
}

export function getOverview(date) {
  return http.get(`/meeting-status/${date}/overview`).then((res) => res.data.overview);
}

export function getHeader(date) {
  return http.get(`/meeting-status/${date}/header`).then((res) => res.data.header);
}

export function saveHeader(date, header) {
  return http.put(`/meeting-status/${date}/header`, header).then((res) => res.data);
}

export function getSection(date, sectionKey) {
  return http.get(`/meeting-status/${date}/sections/${sectionKey}`).then((res) => res.data.section);
}

export function saveSection(date, sectionKey, markdown) {
  return http.put(`/meeting-status/${date}/sections/${sectionKey}`, { markdown }).then((res) => res.data);
}

export function getSectionPresentation(date, sectionKey) {
  return http.get(`/meeting-status/${date}/sections/${sectionKey}/presentation`).then((res) => res.data.report);
}

export function getShowcaseProjectPlaylist(date, projectId) {
  return http.get(`/meeting-status/${date}/showcase/projects/${projectId}/playlist`).then((res) => res.data.playlist);
}

export function refactorSection(date, sectionKey) {
  return http.post(`/meeting-status/${date}/sections/${sectionKey}/refactor`).then((res) => res.data);
}

export function saveSectionHtml(date, sectionKey, html) {
  return http.put(`/meeting-status/${date}/sections/${sectionKey}/html`, { html }).then((res) => res.data);
}

export function refactor(date) {
  return http.post(`/meeting-status/${date}/refactor`).then((res) => res.data.pages);
}

export function saveHtml(date, html) {
  return http.put(`/meeting-status/${date}/html`, { html }).then((res) => res.data.pages);
}
