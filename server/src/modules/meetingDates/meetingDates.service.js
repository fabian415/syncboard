import { prisma } from '../../db/prisma.js';

/**
 * Every date that already has at least one project Report, so the frontend
 * can offer "jump back in" chips instead of forcing everyone to
 * remember/retype the same date.
 */
export async function listMeetingDates() {
  const reportGroups = await prisma.report.groupBy({ by: ['reportDate'], _count: { _all: true } });

  return reportGroups
    .map((g) => ({ date: g.reportDate.toISOString().slice(0, 10), count: g._count._all }))
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}
