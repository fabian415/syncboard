import { prisma } from '../../db/prisma.js';
import { HttpError } from '../../middleware/errorHandler.js';
import {
  assertValidDate,
  reportMarkdownPath,
  reportHtmlPath,
  readTextFile,
  writeTextFile,
} from '../../storage/fsStore.js';
import { parseSlides, validateSlides, serializeSlides, InvalidSlidesError } from '../../ai/pageSplitter.js';
import { generateValidatedSlides } from '../../ai/slideGenerator.js';
import { buildRefactorMessages } from '../../ai/refactorPrompt.js';

async function findReportRow(projectId, userId, date) {
  return prisma.report.findUnique({
    where: { projectId_userId_reportDate: { projectId, userId, reportDate: new Date(date) } },
  });
}

// Storage folders are named after the project/user display name rather than
// their UUID (see fsStore.js), so every fs path build needs a name lookup.
async function resolveNames(projectId, userId) {
  const [project, user] = await Promise.all([
    prisma.project.findUnique({ where: { id: projectId } }),
    prisma.user.findUnique({ where: { id: userId } }),
  ]);
  if (!project) throw new HttpError(404, 'Project not found');
  if (!user) throw new HttpError(404, 'User not found');
  return { projectName: project.name, userName: user.name };
}

export async function getMemberReport(projectId, userId, date) {
  assertValidDate(date);
  const { projectName, userName } = await resolveNames(projectId, userId);
  const row = await findReportRow(projectId, userId, date);
  const markdown = (await readTextFile(reportMarkdownPath(projectName, userName, date))) ?? '';
  const htmlContent = await readTextFile(reportHtmlPath(projectName, userName, date));

  return {
    id: row?.id ?? null,
    status: row?.status ?? 'DRAFTING',
    markdown,
    htmlPages: htmlContent ? parseSlides(htmlContent) : null,
    submittedAt: row?.submittedAt ?? null,
    updatedAt: row?.updatedAt ?? null,
  };
}

export async function saveMarkdown(projectId, userId, date, markdown) {
  assertValidDate(date);
  const { projectName, userName } = await resolveNames(projectId, userId);
  const filePath = reportMarkdownPath(projectName, userName, date);
  await writeTextFile(filePath, markdown);

  const row = await prisma.report.upsert({
    where: { projectId_userId_reportDate: { projectId, userId, reportDate: new Date(date) } },
    update: {},
    create: {
      projectId,
      userId,
      reportDate: new Date(date),
      markdownPath: filePath,
      status: 'DRAFTING',
    },
  });

  return { id: row.id, status: row.status, updatedAt: row.updatedAt };
}

export async function submitReport(projectId, userId, date) {
  assertValidDate(date);
  const { projectName, userName } = await resolveNames(projectId, userId);
  const markdown = await readTextFile(reportMarkdownPath(projectName, userName, date));
  if (!markdown || !markdown.trim()) {
    throw new HttpError(422, 'Cannot submit an empty report');
  }

  const row = await findReportRow(projectId, userId, date);
  if (!row) {
    throw new HttpError(422, 'Save the report before submitting');
  }

  const updated = await prisma.report.update({
    where: { id: row.id },
    data: { status: 'SUBMITTED', submittedAt: new Date() },
  });

  return { id: updated.id, status: updated.status, submittedAt: updated.submittedAt };
}

export async function refactorReport(projectId, userId, date) {
  assertValidDate(date);
  const { projectName, userName } = await resolveNames(projectId, userId);
  const markdown = await readTextFile(reportMarkdownPath(projectName, userName, date));
  if (!markdown || !markdown.trim()) {
    throw new HttpError(422, '請先撰寫並儲存報告內容再進行 Refactor');
  }

  const pages = await generateValidatedSlides((opts) => buildRefactorMessages(markdown, opts));
  const htmlPath = reportHtmlPath(projectName, userName, date);
  await writeTextFile(htmlPath, serializeSlides(pages));

  const row = await findReportRow(projectId, userId, date);
  if (row) {
    await prisma.report.update({ where: { id: row.id }, data: { htmlPath } });
  }

  return { htmlPages: pages };
}

export async function saveHtml(projectId, userId, date, htmlContent) {
  assertValidDate(date);
  let pages;
  try {
    pages = validateSlides(parseSlides(htmlContent));
  } catch (err) {
    if (err instanceof InvalidSlidesError) {
      throw new HttpError(400, err.message, '簡報格式不符合規則（需 1-2 頁，且每頁需含標題）');
    }
    throw err;
  }

  const { projectName, userName } = await resolveNames(projectId, userId);
  const htmlPath = reportHtmlPath(projectName, userName, date);
  await writeTextFile(htmlPath, serializeSlides(pages));

  const row = await findReportRow(projectId, userId, date);
  if (row) {
    await prisma.report.update({ where: { id: row.id }, data: { htmlPath } });
  }

  return { htmlPages: pages };
}
