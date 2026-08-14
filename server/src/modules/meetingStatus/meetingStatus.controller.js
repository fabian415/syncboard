import { z } from 'zod';
import * as meetingStatusService from './meetingStatus.service.js';

const markdownSchema = z.object({ markdown: z.string() });
const htmlSchema = z.object({ html: z.string() });
const headerSchema = z.object({ host: z.string(), attendees: z.string() });

export async function getPresentationHandler(req, res, next) {
  try {
    const report = await meetingStatusService.getPresentation(req.params.date);
    res.json({ report });
  } catch (err) {
    next(err);
  }
}

export async function getOverviewHandler(req, res, next) {
  try {
    const overview = await meetingStatusService.getOverview(req.params.date);
    res.json({ overview });
  } catch (err) {
    next(err);
  }
}

export async function getHeaderHandler(req, res, next) {
  try {
    const header = await meetingStatusService.getHeader(req.params.date);
    res.json({ header });
  } catch (err) {
    next(err);
  }
}

export async function saveHeaderHandler(req, res, next) {
  try {
    const header = headerSchema.parse(req.body);
    const result = await meetingStatusService.saveHeader(req.params.date, header);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getSectionHandler(req, res, next) {
  try {
    const section = await meetingStatusService.getSection(req.params.date, req.params.sectionKey);
    res.json({ section });
  } catch (err) {
    next(err);
  }
}

export async function saveSectionHandler(req, res, next) {
  try {
    const { markdown } = markdownSchema.parse(req.body);
    const result = await meetingStatusService.saveSection(req.params.date, req.params.sectionKey, markdown);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getSectionPresentationHandler(req, res, next) {
  try {
    const report = await meetingStatusService.getSectionPresentation(req.params.date, req.params.sectionKey);
    res.json({ report });
  } catch (err) {
    next(err);
  }
}

export async function refactorSectionHandler(req, res, next) {
  try {
    const result = await meetingStatusService.refactorSection(req.params.date, req.params.sectionKey);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function saveSectionHtmlHandler(req, res, next) {
  try {
    const { html } = htmlSchema.parse(req.body);
    const result = await meetingStatusService.saveSectionHtml(req.params.date, req.params.sectionKey, html);
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
