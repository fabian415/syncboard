import { http } from './http.js';

export function listProjects(date) {
  return http.get('/projects', { params: date ? { date } : {} }).then((res) => res.data.projects);
}

export function getProject(projectId, date) {
  return http.get(`/projects/${projectId}`, { params: date ? { date } : {} }).then((res) => res.data.project);
}
