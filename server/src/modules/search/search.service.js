import { prisma } from '../../db/prisma.js';
import {
  reportHtmlPath,
  meetingStatusHtmlPath,
  meetingStatusSectionHtmlPath,
  readTextFile,
} from '../../storage/fsStore.js';
import { parseSlides } from '../../ai/pageSplitter.js';

const MAX_RESULTS = 30;
const SNIPPET_RADIUS = 60;

function dateStr(date) {
  return date.toISOString().slice(0, 10);
}

function stripHtml(html) {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Finds the first slide (in document order) whose stripped text contains the
// query, and carves a snippet around the match so the dropdown can show why
// this document matched without shipping the whole deck to the client.
function findMatch(pages, query) {
  const lowerQuery = query.toLowerCase();
  for (let i = 0; i < pages.length; i += 1) {
    const text = stripHtml(pages[i]);
    const idx = text.toLowerCase().indexOf(lowerQuery);
    if (idx === -1) continue;
    const start = Math.max(0, idx - SNIPPET_RADIUS);
    const end = Math.min(text.length, idx + query.length + SNIPPET_RADIUS);
    const snippet = `${start > 0 ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}`;
    return { slideIndex: i, snippet };
  }
  return null;
}

async function searchReports(query) {
  const rows = await prisma.report.findMany({
    where: { htmlPath: { not: null } },
    include: { project: true, user: true },
    orderBy: { reportDate: 'desc' },
  });

  const results = [];
  for (const row of rows) {
    const date = dateStr(row.reportDate);
    const html = await readTextFile(reportHtmlPath(row.project.name, row.user.name, date));
    if (!html) continue;
    const match = findMatch(parseSlides(html), query);
    if (!match) continue;
    results.push({
      type: 'report',
      title: `${row.user.name} 的日報`,
      subtitle: `${row.project.name}｜${date}`,
      date,
      projectId: row.projectId,
      userId: row.userId,
      ...match,
    });
  }
  return results;
}

async function searchMeetingSections(query) {
  const rows = await prisma.meetingStatusSection.findMany({
    where: { htmlPath: { not: null }, sectionKey: { not: 'header' } },
    orderBy: { meetingDate: 'desc' },
  });

  const projectIds = rows
    .filter((row) => row.sectionKey.startsWith('project-'))
    .map((row) => row.sectionKey.slice('project-'.length));
  const projects = await prisma.project.findMany({ where: { id: { in: projectIds } } });
  const projectById = new Map(projects.map((project) => [project.id, project]));

  const results = [];
  for (const row of rows) {
    const date = dateStr(row.meetingDate);
    const html = await readTextFile(meetingStatusSectionHtmlPath(date, row.sectionKey));
    if (!html) continue;
    const match = findMatch(parseSlides(html), query);
    if (!match) continue;

    const isFollowUp = row.sectionKey === 'follow-up';
    const project = isFollowUp ? null : projectById.get(row.sectionKey.slice('project-'.length));
    results.push({
      type: 'section',
      title: isFollowUp ? 'Follow-up 投影片' : `${project?.name ?? '未知專案'} 進度投影片`,
      subtitle: date,
      date,
      sectionKey: row.sectionKey,
      projectId: project?.id ?? null,
      ...match,
    });
  }
  return results;
}

async function searchMeetingReports(query) {
  const rows = await prisma.meetingStatusReport.findMany({
    where: { htmlPath: { not: null } },
    orderBy: { meetingDate: 'desc' },
  });

  const results = [];
  for (const row of rows) {
    const date = dateStr(row.meetingDate);
    const html = await readTextFile(meetingStatusHtmlPath(date));
    if (!html) continue;
    const match = findMatch(parseSlides(html), query);
    if (!match) continue;
    results.push({
      type: 'meeting',
      title: '會議整體簡報',
      subtitle: date,
      date,
      ...match,
    });
  }
  return results;
}

export async function search(query) {
  const trimmed = (query ?? '').trim();
  if (!trimmed) return [];

  const [reports, sections, meetings] = await Promise.all([
    searchReports(trimmed),
    searchMeetingSections(trimmed),
    searchMeetingReports(trimmed),
  ]);

  return [...reports, ...sections, ...meetings]
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .slice(0, MAX_RESULTS);
}
