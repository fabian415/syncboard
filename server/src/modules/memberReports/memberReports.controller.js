import { z } from 'zod';
import * as memberReportsService from './memberReports.service.js';

const markdownSchema = z.object({ markdown: z.string() });

export async function listMembersHandler(req, res, next) {
  try {
    const members = await memberReportsService.listMembers();
    res.json({ members });
  } catch (err) {
    next(err);
  }
}

export async function getPersonalReportHandler(req, res, next) {
  try {
    const report = await memberReportsService.getPersonalReport(req.params.userId, req.params.periodStart);
    res.json({ report });
  } catch (err) {
    next(err);
  }
}

export async function saveMarkdownHandler(req, res, next) {
  try {
    const { markdown } = markdownSchema.parse(req.body);
    const result = await memberReportsService.saveMarkdown(req.params.userId, req.params.periodStart, markdown);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function distributeHandler(req, res, next) {
  try {
    const result = await memberReportsService.distributeReport(req.params.userId, req.params.periodStart);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function generateSampleHandler(req, res, next) {
  try {
    const result = await memberReportsService.generateSampleReport(req.params.userId, req.params.periodStart);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
