import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function upsertUser({ email, name, role }) {
  return prisma.user.upsert({
    where: { email },
    update: { name, role },
    create: { email, name, role },
  });
}

async function upsertProject({ id, name, description, tag, order }) {
  return prisma.project.upsert({
    where: { id },
    update: { name, description, tag, order },
    create: { id, name, description, tag, order },
  });
}

async function main() {
  // 依 docs/2026-08-07_BiWeeklyReport.xlsx 的真實團隊/專案結構改寫
  await upsertUser({ email: 'fabian@syncboard.dev', name: 'Fabian', role: 'RD' });
  await upsertUser({ email: 'alex@syncboard.dev', name: 'Alex', role: 'RD' });
  await upsertUser({ email: 'tungyi@syncboard.dev', name: 'TungYi', role: 'RD' });
  await upsertUser({ email: 'iris@syncboard.dev', name: 'Iris', role: 'RD' });
  await upsertUser({ email: 'jim@syncboard.dev', name: 'Jim', role: 'RD' });
  await upsertUser({ email: 'rafael@syncboard.dev', name: 'Rafael', role: 'RD' });
  await upsertUser({ email: 'scott@syncboard.dev', name: 'Scott', role: 'RD' });
  await upsertUser({ email: 'wunhuei@syncboard.dev', name: 'WunHuei', role: 'RD' });

  await upsertProject({
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Physical AI',
    description: '機械手臂與視覺感知的實體 AI 研發',
    tag: 'R&D',
    order: 1,
  });
  await upsertProject({
    id: '00000000-0000-0000-0000-000000000006',
    name: 'Industrial Claw',
    description: '工業級機械爪夾具研發',
    tag: 'R&D',
    order: 2,
  });
  await upsertProject({
    id: '00000000-0000-0000-0000-000000000002',
    name: 'GenAI Studio & LLM',
    description: '企業級 GenAI 模型訓練與推論平台',
    tag: 'Platform',
    order: 3,
  });
  await upsertProject({
    id: '00000000-0000-0000-0000-000000000003',
    name: 'DeviceOn',
    description: '企業級 IoT 裝置管理平台',
    tag: '維運',
    order: 4,
  });
  await upsertProject({
    id: '00000000-0000-0000-0000-000000000005',
    name: 'Project & Others',
    description: '跨專案支援與其他任務',
    tag: 'Support',
    order: 5,
  });

  console.log('Seed complete.');
  console.log('專案：Physical AI / Industrial Claw / GenAI Studio & LLM / DeviceOn / Project & Others');
  console.log('成員：Fabian, Alex, TungYi, Iris, Jim, Rafael, Scott, WunHuei（皆為 RD）');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
