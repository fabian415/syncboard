import { prisma } from '../../db/prisma.js';
import { HttpError } from '../../middleware/errorHandler.js';
import {
  assertValidDate,
  reportDir,
  reportMarkdownPath,
  reportHtmlPath,
  memberReportDir,
  memberReportMarkdownPath,
  meetingStatusDir,
  meetingStatusMarkdownPath,
  meetingStatusHtmlPath,
  meetingStatusSectionMarkdownPath,
  meetingStatusSectionHtmlPath,
  combinedDir,
  combinedHtmlPath,
  moveDir,
} from '../../storage/fsStore.js';

/**
 * Every date that already has at least one Report, MemberReport,
 * MeetingStatusReport, MeetingStatusSection, or CombinedReport, so the
 * frontend can offer "jump back in" chips instead of forcing everyone to
 * remember/retype the same date. Covers all five tables since a meeting
 * date can have data in any of them (e.g. draft MeetingStatusSections exist
 * before the MeetingStatusReport is finalized).
 */
export async function listMeetingDates() {
  const [reportGroups, memberReportGroups, meetingStatusGroups, sectionGroups, combinedGroups] = await Promise.all([
    prisma.report.groupBy({ by: ['reportDate'], _count: { _all: true } }),
    prisma.memberReport.groupBy({ by: ['periodStart'], _count: { _all: true } }),
    prisma.meetingStatusReport.groupBy({ by: ['meetingDate'], _count: { _all: true } }),
    prisma.meetingStatusSection.groupBy({ by: ['meetingDate'], _count: { _all: true } }),
    prisma.combinedReport.groupBy({ by: ['reportDate'], _count: { _all: true } }),
  ]);

  const counts = new Map();
  const addAll = (groups, dateField) => {
    for (const g of groups) {
      const date = g[dateField].toISOString().slice(0, 10);
      counts.set(date, (counts.get(date) || 0) + g._count._all);
    }
  };
  addAll(reportGroups, 'reportDate');
  addAll(memberReportGroups, 'periodStart');
  addAll(meetingStatusGroups, 'meetingDate');
  addAll(sectionGroups, 'meetingDate');
  addAll(combinedGroups, 'reportDate');

  return [...counts.entries()]
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

/**
 * Re-dates every record (and its storage/ folder) tied to oldDate — Reports,
 * MemberReports, the MeetingStatusReport/Sections, and CombinedReports — so a
 * meeting scheduled under the wrong date can be moved as one unit instead of
 * regenerating everything from scratch. Refuses to run if newDate already has
 * any conflicting data, since that would otherwise silently overwrite it.
 */
export async function renameMeetingDate(oldDate, newDate) {
  assertValidDate(oldDate);
  assertValidDate(newDate);
  if (oldDate === newDate) return { moved: 0 };

  const oldD = new Date(oldDate);
  const newD = new Date(newDate);

  const [reports, memberReports, meetingStatusReport, sections, combinedReports] = await Promise.all([
    prisma.report.findMany({ where: { reportDate: oldD }, include: { project: true, user: true } }),
    prisma.memberReport.findMany({ where: { periodStart: oldD }, include: { user: true } }),
    prisma.meetingStatusReport.findUnique({ where: { meetingDate: oldD } }),
    prisma.meetingStatusSection.findMany({ where: { meetingDate: oldD } }),
    prisma.combinedReport.findMany({ where: { reportDate: oldD }, include: { project: true } }),
  ]);

  const totalRows = reports.length + memberReports.length + (meetingStatusReport ? 1 : 0) + sections.length + combinedReports.length;
  if (totalRows === 0) {
    throw new HttpError(404, `No data found for meeting date ${oldDate}`, `找不到會議日期 ${oldDate} 的任何資料`);
  }

  const [reportsAtNew, memberReportsAtNew, meetingStatusReportAtNew, sectionsAtNew, combinedAtNew] = await Promise.all([
    prisma.report.findMany({ where: { reportDate: newD } }),
    prisma.memberReport.findMany({ where: { periodStart: newD } }),
    prisma.meetingStatusReport.findUnique({ where: { meetingDate: newD } }),
    prisma.meetingStatusSection.findMany({ where: { meetingDate: newD } }),
    prisma.combinedReport.findMany({ where: { reportDate: newD } }),
  ]);

  const reportKey = (r) => `${r.projectId}::${r.userId}`;
  const newReportKeys = new Set(reportsAtNew.map(reportKey));
  if (reports.some((r) => newReportKeys.has(reportKey(r)))) {
    throw new HttpError(
      409,
      `Target date ${newDate} already has a report for one of the moving project/user pairs`,
      `目標日期 ${newDate} 已經有相同專案／成員的報告，無法變更`,
    );
  }

  const newMemberUserIds = new Set(memberReportsAtNew.map((m) => m.userId));
  if (memberReports.some((m) => newMemberUserIds.has(m.userId))) {
    throw new HttpError(
      409,
      `Target date ${newDate} already has a member report for one of the moving users`,
      `目標日期 ${newDate} 已經有相同成員的雙週報，無法變更`,
    );
  }

  if (meetingStatusReport && meetingStatusReportAtNew) {
    throw new HttpError(
      409,
      `Target date ${newDate} already has a meeting status report`,
      `目標日期 ${newDate} 已經有整體進度簡報資料，無法變更`,
    );
  }

  const newSectionKeys = new Set(sectionsAtNew.map((s) => s.sectionKey));
  if (sections.some((s) => newSectionKeys.has(s.sectionKey))) {
    throw new HttpError(
      409,
      `Target date ${newDate} already has meeting status section data`,
      `目標日期 ${newDate} 已經有整體進度區塊資料，無法變更`,
    );
  }

  const newCombinedProjectIds = new Set(combinedAtNew.map((c) => c.projectId));
  if (combinedReports.some((c) => newCombinedProjectIds.has(c.projectId))) {
    throw new HttpError(
      409,
      `Target date ${newDate} already has a combined report for one of the moving projects`,
      `目標日期 ${newDate} 已經有相同專案的彙整報告，無法變更`,
    );
  }

  await prisma.$transaction([
    ...reports.map((r) =>
      prisma.report.update({
        where: { id: r.id },
        data: {
          reportDate: newD,
          markdownPath: reportMarkdownPath(r.project.name, r.user.name, newDate),
          htmlPath: r.htmlPath ? reportHtmlPath(r.project.name, r.user.name, newDate) : null,
        },
      }),
    ),
    ...memberReports.map((m) =>
      prisma.memberReport.update({
        where: { id: m.id },
        data: { periodStart: newD, markdownPath: memberReportMarkdownPath(m.user.name, newDate) },
      }),
    ),
    ...(meetingStatusReport
      ? [
          prisma.meetingStatusReport.update({
            where: { id: meetingStatusReport.id },
            data: {
              meetingDate: newD,
              markdownPath: meetingStatusMarkdownPath(newDate),
              htmlPath: meetingStatusReport.htmlPath ? meetingStatusHtmlPath(newDate) : null,
            },
          }),
        ]
      : []),
    ...sections.map((s) =>
      prisma.meetingStatusSection.update({
        where: { id: s.id },
        data: {
          meetingDate: newD,
          markdownPath: meetingStatusSectionMarkdownPath(newDate, s.sectionKey),
          htmlPath: s.htmlPath ? meetingStatusSectionHtmlPath(newDate, s.sectionKey) : null,
        },
      }),
    ),
    ...combinedReports.map((c) =>
      prisma.combinedReport.update({
        where: { id: c.id },
        data: { reportDate: newD, htmlPath: combinedHtmlPath(c.project.name, newDate) },
      }),
    ),
  ]);

  const projectUserPairs = new Map(
    reports.map((r) => [`${r.projectId}::${r.userId}`, { projectName: r.project.name, userName: r.user.name }]),
  );
  for (const { projectName, userName } of projectUserPairs.values()) {
    await moveDir(reportDir(projectName, userName, oldDate), reportDir(projectName, userName, newDate));
  }

  const memberUserNames = new Map(memberReports.map((m) => [m.userId, m.user.name]));
  for (const userName of memberUserNames.values()) {
    await moveDir(memberReportDir(userName, oldDate), memberReportDir(userName, newDate));
  }

  if (meetingStatusReport || sections.length > 0) {
    await moveDir(meetingStatusDir(oldDate), meetingStatusDir(newDate));
  }

  const combinedProjectNames = new Map(combinedReports.map((c) => [c.projectId, c.project.name]));
  for (const projectName of combinedProjectNames.values()) {
    await moveDir(combinedDir(projectName, oldDate), combinedDir(projectName, newDate));
  }

  return { moved: totalRows };
}
