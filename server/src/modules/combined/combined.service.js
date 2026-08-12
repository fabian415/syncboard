import { prisma } from '../../db/prisma.js';
import { HttpError } from '../../middleware/errorHandler.js';
import {
  assertValidDate,
  reportMarkdownPath,
  combinedHtmlPath,
  readTextFile,
  writeTextFile,
} from '../../storage/fsStore.js';
import { parseSlides, validateSlides, serializeSlides, InvalidSlidesError } from '../../ai/pageSplitter.js';
import { generateValidatedSlides } from '../../ai/slideGenerator.js';
import { buildCombineMessages } from '../../ai/combinePrompt.js';

async function findCombinedRow(projectId, date) {
  return prisma.combinedReport.findUnique({
    where: { projectId_reportDate: { projectId, reportDate: new Date(date) } },
  });
}

// Storage folders are named after the project display name rather than its
// UUID (see fsStore.js), so every fs path build needs a name lookup.
async function resolveProjectName(projectId) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new HttpError(404, 'Project not found');
  return project.name;
}

export async function combineProject(projectId, date) {
  assertValidDate(date);

  const projectName = await resolveProjectName(projectId);
  const reports = await prisma.report.findMany({
    where: { projectId, reportDate: new Date(date), status: 'SUBMITTED' },
    include: { user: true },
  });

  if (reports.length === 0) {
    throw new HttpError(422, 'No submitted reports to combine yet');
  }

  const memberReports = [];
  for (const report of reports) {
    const markdown = await readTextFile(reportMarkdownPath(projectName, report.user.name, date));
    if (markdown && markdown.trim()) {
      memberReports.push({ name: report.user.name, markdown });
    }
  }

  const pages = await generateValidatedSlides((opts) => buildCombineMessages(memberReports, opts));

  const htmlPath = combinedHtmlPath(projectName, date);
  await writeTextFile(htmlPath, serializeSlides(pages));

  await prisma.combinedReport.upsert({
    where: { projectId_reportDate: { projectId, reportDate: new Date(date) } },
    update: { htmlPath },
    create: { projectId, reportDate: new Date(date), htmlPath },
  });

  return { pages };
}

export async function getCombined(projectId, date) {
  assertValidDate(date);
  const projectName = await resolveProjectName(projectId);
  const row = await findCombinedRow(projectId, date);
  const htmlContent = await readTextFile(combinedHtmlPath(projectName, date));

  return {
    pages: htmlContent ? parseSlides(htmlContent) : null,
    generatedBy: row?.generatedBy ?? null,
    updatedAt: row?.updatedAt ?? null,
  };
}

export async function saveCombinedHtml(projectId, date, htmlContent) {
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

  const projectName = await resolveProjectName(projectId);
  const htmlPath = combinedHtmlPath(projectName, date);
  await writeTextFile(htmlPath, serializeSlides(pages));

  await prisma.combinedReport.upsert({
    where: { projectId_reportDate: { projectId, reportDate: new Date(date) } },
    update: { htmlPath },
    create: { projectId, reportDate: new Date(date), htmlPath },
  });

  return { pages };
}
