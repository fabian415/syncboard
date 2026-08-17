import { z } from 'zod';
import archiver from 'archiver';
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

export async function downloadReportsArchiveHandler(req, res, next) {
  try {
    const { userName, entries } = await memberReportsService.listMemberReportArchiveEntries(req.params.userId);

    const asciiFallback = `${userName.replace(/[^\x20-\x7e]/g, '_')}-meeting-reports.zip`;
    const utf8Name = encodeURIComponent(`${userName}-meeting-reports.zip`);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${asciiFallback}"; filename*=UTF-8''${utf8Name}`,
    );

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', next);
    archive.pipe(res);
    for (const entry of entries) {
      archive.append(entry.markdown, { name: `${entry.periodStart}.md` });
    }
    await archive.finalize();
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
