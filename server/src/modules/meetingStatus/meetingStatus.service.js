import { prisma } from '../../db/prisma.js';
import { HttpError } from '../../middleware/errorHandler.js';
import { listMemberUserIds } from '../projects/projects.service.js';
import {
  assertValidDate,
  meetingStatusMarkdownPath,
  meetingStatusHtmlPath,
  meetingStatusSectionMarkdownPath,
  meetingStatusSectionHtmlPath,
  readTextFile,
  writeTextFile,
} from '../../storage/fsStore.js';
import { parseSlides, validateSlides, serializeSlides, InvalidSlidesError } from '../../ai/pageSplitter.js';
import { generateValidatedSlides } from '../../ai/slideGenerator.js';
import { buildMeetingStatusMessages } from '../../ai/meetingStatusPrompt.js';
import { buildProjectSectionMessages } from '../../ai/projectSectionPrompt.js';
import { buildFollowUpSectionMessages } from '../../ai/followUpSectionPrompt.js';

const PAGE_RANGE = { min: 2, max: 8 };
const SECTION_PAGE_RANGE = { min: 1, max: 2 };
const FOLLOW_UP_SECTION_PAGE_RANGE = { min: 1, max: 6 };
const SECTION_KEY_RE = /^(header|follow-up|project-[0-9a-fA-F-]{36})$/;
const SLIDE_SECTION_KEY_RE = /^(follow-up|project-[0-9a-fA-F-]{36})$/;

export function assertValidSectionKey(sectionKey) {
  if (typeof sectionKey !== 'string' || !SECTION_KEY_RE.test(sectionKey)) {
    throw new HttpError(400, `Invalid sectionKey: ${sectionKey}`);
  }
  return sectionKey;
}

function assertSlideSectionKey(sectionKey) {
  assertValidSectionKey(sectionKey);
  if (!SLIDE_SECTION_KEY_RE.test(sectionKey)) {
    throw new HttpError(400, `Slide generation is not available for this section: ${sectionKey}`);
  }
  return sectionKey;
}

function sectionMessageBuilder(sectionKey, markdown) {
  return sectionKey === 'follow-up'
    ? (opts) => buildFollowUpSectionMessages(markdown, opts)
    : (opts) => buildProjectSectionMessages(markdown, opts);
}

function sectionPageRange(sectionKey) {
  return sectionKey === 'follow-up' ? FOLLOW_UP_SECTION_PAGE_RANGE : SECTION_PAGE_RANGE;
}

function projectSectionKey(projectId) {
  return `project-${projectId}`;
}

async function findReportRow(date) {
  return prisma.meetingStatusReport.findUnique({ where: { meetingDate: new Date(date) } });
}

async function findSectionRow(date, sectionKey) {
  return prisma.meetingStatusSection.findUnique({
    where: { meetingDate_sectionKey: { meetingDate: new Date(date), sectionKey } },
  });
}

export async function getPresentation(date) {
  assertValidDate(date);
  const htmlContent = await readTextFile(meetingStatusHtmlPath(date));
  const row = await findReportRow(date);

  return {
    pages: htmlContent ? parseSlides(htmlContent) : null,
    updatedAt: row?.updatedAt ?? null,
  };
}

export async function getSection(date, sectionKey) {
  assertValidDate(date);
  assertValidSectionKey(sectionKey);
  const markdown = (await readTextFile(meetingStatusSectionMarkdownPath(date, sectionKey))) ?? '';
  const row = await findSectionRow(date, sectionKey);
  return { markdown, updatedAt: row?.updatedAt ?? null };
}

export async function saveSection(date, sectionKey, markdown) {
  assertValidDate(date);
  assertValidSectionKey(sectionKey);
  const filePath = meetingStatusSectionMarkdownPath(date, sectionKey);
  await writeTextFile(filePath, markdown);

  const row = await prisma.meetingStatusSection.upsert({
    where: { meetingDate_sectionKey: { meetingDate: new Date(date), sectionKey } },
    update: { markdownPath: filePath },
    create: { meetingDate: new Date(date), sectionKey, markdownPath: filePath },
  });

  return { updatedAt: row.updatedAt };
}

function parseHeader(markdown) {
  const hostMatch = /^\*\*主持人\*\*：(.*)$/m.exec(markdown ?? '');
  const attendeesMatch = /^\*\*與會人員\*\*：(.*)$/m.exec(markdown ?? '');
  return {
    host: hostMatch ? hostMatch[1].trim() : '',
    attendees: attendeesMatch ? attendeesMatch[1].trim() : '',
  };
}

function serializeHeader({ host, attendees }) {
  return `**主持人**：${host || ''}\n**與會人員**：${attendees || ''}`;
}

export async function getHeader(date) {
  const { markdown, updatedAt } = await getSection(date, 'header');
  return { ...parseHeader(markdown), updatedAt };
}

export async function saveHeader(date, header) {
  return saveSection(date, 'header', serializeHeader(header));
}

export async function getOverview(date) {
  assertValidDate(date);
  const projects = await prisma.project.findMany({ orderBy: { createdAt: 'asc' } });
  const keys = ['header', 'follow-up', ...projects.map((p) => projectSectionKey(p.id))];
  const rows = await prisma.meetingStatusSection.findMany({
    where: { meetingDate: new Date(date), sectionKey: { in: keys } },
  });
  const rowByKey = new Map(rows.map((r) => [r.sectionKey, r]));

  const headerRow = rowByKey.get('header');
  const headerMarkdown = headerRow ? await readTextFile(meetingStatusSectionMarkdownPath(date, 'header')) : '';
  const header = { ...parseHeader(headerMarkdown), updatedAt: headerRow?.updatedAt ?? null };

  const followUpRow = rowByKey.get('follow-up');
  const followUp = { hasContent: !!followUpRow, updatedAt: followUpRow?.updatedAt ?? null };

  return {
    header,
    followUp,
    projects: await Promise.all(
      projects.map(async (project) => {
        const row = rowByKey.get(projectSectionKey(project.id));
        const [memberUserIds, submittedCount] = await Promise.all([
          listMemberUserIds(project.id, date),
          prisma.report.count({
            where: { projectId: project.id, reportDate: new Date(date), status: 'SUBMITTED' },
          }),
        ]);
        return {
          projectId: project.id,
          name: project.name,
          description: project.description,
          tag: project.tag,
          hasContent: !!row,
          updatedAt: row?.updatedAt ?? null,
          memberCount: memberUserIds.length,
          submittedCount,
        };
      }),
    ),
  };
}

async function composeMeetingMarkdown(date) {
  const projects = await prisma.project.findMany({ orderBy: { createdAt: 'asc' } });
  const header = await getHeader(date);
  const followUp = await getSection(date, 'follow-up');

  const projectSections = [];
  for (const project of projects) {
    const section = await getSection(date, projectSectionKey(project.id));
    if (section.markdown.trim()) projectSections.push(section);
  }

  const parts = [
    `# 📋 Meeting Overall Status｜${date}`,
    '',
    `**主持人**：${header.host || '無'}`,
    `**與會人員**：${header.attendees || '無'}`,
    '',
    '---',
    '',
    followUp.markdown.trim(),
    '',
    '---',
    '',
    '## 2. Product Overall Status',
    '',
  ];
  for (const section of projectSections) {
    parts.push(section.markdown.trim());
    parts.push('');
  }

  return { markdown: parts.join('\n'), hasContent: followUp.markdown.trim() || projectSections.length > 0 };
}

export async function refactor(date) {
  assertValidDate(date);
  const { markdown, hasContent } = await composeMeetingMarkdown(date);
  if (!hasContent) {
    throw new HttpError(422, '請先撰寫並儲存整體進度內容再產生簡報');
  }

  await writeTextFile(meetingStatusMarkdownPath(date), markdown);

  const pages = await generateValidatedSlides((opts) => buildMeetingStatusMessages(markdown, opts), PAGE_RANGE);

  const htmlPath = meetingStatusHtmlPath(date);
  await writeTextFile(htmlPath, serializeSlides(pages));

  await prisma.meetingStatusReport.upsert({
    where: { meetingDate: new Date(date) },
    update: { htmlPath, markdownPath: meetingStatusMarkdownPath(date) },
    create: { meetingDate: new Date(date), markdownPath: meetingStatusMarkdownPath(date), htmlPath },
  });

  return { pages };
}

export async function getSectionPresentation(date, sectionKey) {
  assertValidDate(date);
  assertSlideSectionKey(sectionKey);
  const htmlContent = await readTextFile(meetingStatusSectionHtmlPath(date, sectionKey));
  const row = await findSectionRow(date, sectionKey);

  return {
    pages: htmlContent ? parseSlides(htmlContent) : null,
    updatedAt: row?.htmlPath ? row.updatedAt : null,
  };
}

export async function refactorSection(date, sectionKey) {
  assertValidDate(date);
  assertSlideSectionKey(sectionKey);
  const { markdown } = await getSection(date, sectionKey);
  if (!markdown.trim()) {
    throw new HttpError(422, '請先撰寫並儲存內容再產生投影片');
  }

  const pages = await generateValidatedSlides(sectionMessageBuilder(sectionKey, markdown), sectionPageRange(sectionKey));

  const htmlPath = meetingStatusSectionHtmlPath(date, sectionKey);
  await writeTextFile(htmlPath, serializeSlides(pages));

  const row = await prisma.meetingStatusSection.upsert({
    where: { meetingDate_sectionKey: { meetingDate: new Date(date), sectionKey } },
    update: { htmlPath },
    create: { meetingDate: new Date(date), sectionKey, markdownPath: meetingStatusSectionMarkdownPath(date, sectionKey), htmlPath },
  });

  return { pages, updatedAt: row.updatedAt };
}

export async function saveSectionHtml(date, sectionKey, htmlContent) {
  assertValidDate(date);
  assertSlideSectionKey(sectionKey);
  const range = sectionPageRange(sectionKey);
  let pages;
  try {
    pages = validateSlides(parseSlides(htmlContent), range);
  } catch (err) {
    if (err instanceof InvalidSlidesError) {
      throw new HttpError(
        400,
        err.message,
        `簡報格式不符合規則（需 ${range.min}-${range.max} 頁，且每頁需含標題）`,
      );
    }
    throw err;
  }

  const htmlPath = meetingStatusSectionHtmlPath(date, sectionKey);
  await writeTextFile(htmlPath, serializeSlides(pages));

  const row = await prisma.meetingStatusSection.upsert({
    where: { meetingDate_sectionKey: { meetingDate: new Date(date), sectionKey } },
    update: { htmlPath },
    create: { meetingDate: new Date(date), sectionKey, markdownPath: meetingStatusSectionMarkdownPath(date, sectionKey), htmlPath },
  });

  return { pages, updatedAt: row.updatedAt };
}

export async function saveHtml(date, htmlContent) {
  assertValidDate(date);
  let pages;
  try {
    pages = validateSlides(parseSlides(htmlContent), PAGE_RANGE);
  } catch (err) {
    if (err instanceof InvalidSlidesError) {
      throw new HttpError(400, err.message, `簡報格式不符合規則（需 ${PAGE_RANGE.min}-${PAGE_RANGE.max} 頁，且每頁需含標題）`);
    }
    throw err;
  }

  const htmlPath = meetingStatusHtmlPath(date);
  await writeTextFile(htmlPath, serializeSlides(pages));

  await prisma.meetingStatusReport.upsert({
    where: { meetingDate: new Date(date) },
    update: { htmlPath },
    create: { meetingDate: new Date(date), markdownPath: meetingStatusMarkdownPath(date), htmlPath },
  });

  return { pages };
}
