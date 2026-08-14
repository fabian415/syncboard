import { z } from 'zod';
import * as meetingStatusService from './meetingStatus.service.js';

const markdownSchema = z.object({ markdown: z.string() });
const htmlSchema = z.object({ html: z.string() });

export async function getMeetingStatusHandler(req, res, next) {
  try {
    const report = await meetingStatusService.getMeetingStatus(req.params.date);
    res.json({ report });
  } catch (err) {
    next(err);
  }
}

export async function saveMarkdownHandler(req, res, next) {
  try {
    const { markdown } = markdownSchema.parse(req.body);
    const result = await meetingStatusService.saveMarkdown(req.params.date, markdown);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function saveHtmlHandler(req, res, next) {
  try {
    const { html } = htmlSchema.parse(req.body);
    const result = await meetingStatusService.saveHtml(req.params.date, html);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function refactorHandler(req, res, next) {
  try {
    const result = await meetingStatusService.refactor(req.params.date);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
