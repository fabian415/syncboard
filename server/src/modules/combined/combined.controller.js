import { z } from 'zod';
import * as combinedService from './combined.service.js';

const htmlSchema = z.object({ html: z.string() });

export async function combineHandler(req, res, next) {
  try {
    const result = await combinedService.combineProject(req.params.projectId, req.params.date);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getCombinedHandler(req, res, next) {
  try {
    const result = await combinedService.getCombined(req.params.projectId, req.params.date);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function saveCombinedHandler(req, res, next) {
  try {
    const { html } = htmlSchema.parse(req.body);
    const result = await combinedService.saveCombinedHtml(req.params.projectId, req.params.date, html);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
