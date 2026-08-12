import { prisma } from '../../db/prisma.js';
import { HttpError } from '../../middleware/errorHandler.js';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// A project's members aren't a separate roster anymore — anyone who has
// saved a Report for the project in the selected period counts, so
// membership is scoped per period instead of being a lifetime roster.
async function listMemberUserIds(projectId, date) {
  const rows = await prisma.report.findMany({
    where: { projectId, reportDate: new Date(date) },
    distinct: ['userId'],
    select: { userId: true },
  });
  return rows.map((r) => r.userId);
}

export async function listProjects(date = todayISO()) {
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: 'asc' },
  });

  return Promise.all(
    projects.map(async (project) => {
      const [memberUserIds, submittedCount] = await Promise.all([
        listMemberUserIds(project.id, date),
        prisma.report.count({
          where: { projectId: project.id, reportDate: new Date(date), status: 'SUBMITTED' },
        }),
      ]);
      return {
        id: project.id,
        name: project.name,
        description: project.description,
        tag: project.tag,
        memberCount: memberUserIds.length,
        submittedCount,
      };
    }),
  );
}

export async function getProjectDetail(projectId, date = todayISO()) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });

  if (!project) {
    throw new HttpError(404, 'Project not found');
  }

  const memberUserIds = await listMemberUserIds(projectId, date);
  const users = await prisma.user.findMany({ where: { id: { in: memberUserIds } } });
  const userById = new Map(users.map((u) => [u.id, u]));

  const reports = await prisma.report.findMany({
    where: { projectId, reportDate: new Date(date) },
  });
  const reportByUserId = new Map(reports.map((r) => [r.userId, r]));

  const members = memberUserIds.map((userId) => {
    const user = userById.get(userId);
    const report = reportByUserId.get(userId);
    return {
      userId,
      name: user.name,
      role: user.role,
      status: report?.status ?? 'DRAFTING',
      hasPresentation: report?.htmlPath != null,
      submittedAt: report?.submittedAt ?? null,
      updatedAt: report?.updatedAt ?? null,
    };
  });

  return {
    id: project.id,
    name: project.name,
    description: project.description,
    tag: project.tag,
    members,
  };
}
