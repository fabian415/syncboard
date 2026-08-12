import { http } from './http.js';

export function listMembers() {
  return http.get('/members').then((res) => res.data.members);
}

export function getPersonalReport(userId, periodStart) {
  return http.get(`/members/${userId}/report/${periodStart}`).then((res) => res.data.report);
}

export function savePersonalMarkdown(userId, periodStart, markdown) {
  return http.put(`/members/${userId}/report/${periodStart}/markdown`, { markdown }).then((res) => res.data);
}

export function distributeReport(userId, periodStart) {
  return http.post(`/members/${userId}/report/${periodStart}/distribute`).then((res) => res.data);
}

export function generateSampleReport(userId, periodStart) {
  return http.post(`/members/${userId}/report/${periodStart}/generate-sample`).then((res) => res.data);
}
