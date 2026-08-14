import { prisma } from '../../db/prisma.js';
import { HttpError } from '../../middleware/errorHandler.js';
import {
  assertValidDate,
  meetingStatusMarkdownPath,
  meetingStatusHtmlPath,
  readTextFile,
  writeTextFile,
} from '../../storage/fsStore.js';
import { parseSlides, validateSlides, serializeSlides, InvalidSlidesError } from '../../ai/pageSplitter.js';
import { generateValidatedSlides } from '../../ai/slideGenerator.js';
import { buildMeetingStatusMessages } from '../../ai/meetingStatusPrompt.js';

const PAGE_RANGE = { min: 2, max: 8 };

async function findRow(date) {
  return prisma.meetingStatusReport.findUnique({ where: { meetingDate: new Date(date) } });
}

export async function getMeetingStatus(date) {
  assertValidDate(date);
  const markdown = (await readTextFile(meetingStatusMarkdownPath(date))) ?? '';
  const htmlContent = await readTextFile(meetingStatusHtmlPath(date));
  const row = await findRow(date);

  return {
    markdown,
    pages: htmlContent ? parseSlides(htmlContent) : null,
    updatedAt: row?.updatedAt ?? null,
  };
}

export async function saveMarkdown(date, markdown) {
  assertValidDate(date);
  const filePath = meetingStatusMarkdownPath(date);
  await writeTextFile(filePath, markdown);

  const row = await prisma.meetingStatusReport.upsert({
    where: { meetingDate: new Date(date) },
    update: { markdownPath: filePath },
    create: { meetingDate: new Date(date), markdownPath: filePath },
  });

  return { updatedAt: row.updatedAt };
}

export async function refactor(date) {
  assertValidDate(date);
  const markdown = await readTextFile(meetingStatusMarkdownPath(date));
  if (!markdown || !markdown.trim()) {
    throw new HttpError(422, '請先撰寫並儲存會議總覽內容再產生簡報');
  }

  const pages = await generateValidatedSlides((opts) => buildMeetingStatusMessages(markdown, opts), PAGE_RANGE);

  const htmlPath = meetingStatusHtmlPath(date);
  await writeTextFile(htmlPath, serializeSlides(pages));

  await prisma.meetingStatusReport.upsert({
    where: { meetingDate: new Date(date) },
    update: { htmlPath },
    create: { meetingDate: new Date(date), markdownPath: meetingStatusMarkdownPath(date), htmlPath },
  });

  return { pages };
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
