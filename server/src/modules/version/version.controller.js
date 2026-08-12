import * as versionService from './version.service.js';

export async function getVersionInfoHandler(req, res, next) {
  try {
    const info = await versionService.getVersionInfo();
    res.json(info);
  } catch (err) {
    next(err);
  }
}
