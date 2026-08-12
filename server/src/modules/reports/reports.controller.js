import { z } from 'zod';
import * as reportsService from './reports.service.js';

const markdownSchema = z.object({ markdown: z.string() });
const htmlSchema = z.object({ html: z.string() });

export async function getReportHandler(req, res, next) {
  try {
    const report = await reportsService.getMemberReport(req.params.projectId, req.params.userId, req.params.date);
    res.json({ report });
  } catch (err) {
    next(err);
  }
}

export async function saveMarkdownHandler(req, res, next) {
  try {
    const { markdown } = markdownSchema.parse(req.body);
    const report = await reportsService.saveMarkdown(
      req.params.projectId,
      req.params.userId,
      req.params.date,
      markdown,
    );
    res.json({ report });
  } catch (err) {
    next(err);
  }
}

export async function submitHandler(req, res, next) {
  try {
    const report = await reportsService.submitReport(req.params.projectId, req.params.userId, req.params.date);
    res.json({ report });
  } catch (err) {
    next(err);
  }
}

export async function refactorHandler(req, res, next) {
  try {
    const result = await reportsService.refactorReport(req.params.projectId, req.params.userId, req.params.date);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function saveHtmlHandler(req, res, next) {
  try {
    const { html } = htmlSchema.parse(req.body);
    const result = await reportsService.saveHtml(req.params.projectId, req.params.userId, req.params.date, html);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
