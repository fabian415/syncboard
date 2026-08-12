import * as projectsService from './projects.service.js';

export async function listProjectsHandler(req, res, next) {
  try {
    const projects = await projectsService.listProjects(req.query.date);
    res.json({ projects });
  } catch (err) {
    next(err);
  }
}

export async function getProjectHandler(req, res, next) {
  try {
    const project = await projectsService.getProjectDetail(req.params.projectId, req.query.date);
    res.json({ project });
  } catch (err) {
    next(err);
  }
}
