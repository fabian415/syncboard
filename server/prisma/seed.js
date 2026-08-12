import { PrismaClient } from '@prisma/client';
import { reportMarkdownPath, writeTextFile } from '../src/storage/fsStore.js';

const prisma = new PrismaClient();

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

async function upsertUser({ email, name, role }) {
  return prisma.user.upsert({
    where: { email },
    update: { name, role },
    create: { email, name, role },
  });
}

async function upsertProject({ id, name, description, tag }) {
  return prisma.project.upsert({
    where: { id },
    update: { name, description, tag },
    create: { id, name, description, tag },
  });
}

// Membership isn't a separate table anymore — a user "belongs" to a project
// once they have a Report row for it. Seed an empty draft dated today (the
// same date the demo reports below use) purely to establish that
// relationship for the demo data, without adding a stray date to the
// "已有記錄的會議日期" quick-jump list.
async function seedMembership(project, user, date) {
  const filePath = reportMarkdownPath(project.name, user.name, date);
  await writeTextFile(filePath, '');
  await prisma.report.upsert({
    where: { projectId_userId_reportDate: { projectId: project.id, userId: user.id, reportDate: new Date(date) } },
    update: {},
    create: {
      projectId: project.id,
      userId: user.id,
      reportDate: new Date(date),
      markdownPath: filePath,
      status: 'DRAFTING',
    },
  });
}

async function seedReport(project, user, date, markdown) {
  const filePath = reportMarkdownPath(project.name, user.name, date);
  await writeTextFile(filePath, markdown);
  await prisma.report.upsert({
    where: { projectId_userId_reportDate: { projectId: project.id, userId: user.id, reportDate: new Date(date) } },
    update: { markdownPath: filePath },
    create: {
      projectId: project.id,
      userId: user.id,
      reportDate: new Date(date),
      markdownPath: filePath,
      status: 'DRAFTING',
    },
  });
}

async function main() {
  const today = todayISO();

  // 依 docs/2026-08-07_BiWeeklyReport.xlsx 的真實團隊/專案結構改寫
  const fabian = await upsertUser({ email: 'fabian@syncboard.dev', name: 'Fabian', role: 'RD' });
  const alex = await upsertUser({ email: 'alex@syncboard.dev', name: 'Alex', role: 'RD' });
  const tungyi = await upsertUser({ email: 'tungyi@syncboard.dev', name: 'TungYi', role: 'RD' });
  const iris = await upsertUser({ email: 'iris@syncboard.dev', name: 'Iris', role: 'RD' });
  const jim = await upsertUser({ email: 'jim@syncboard.dev', name: 'Jim', role: 'RD' });
  const rafael = await upsertUser({ email: 'rafael@syncboard.dev', name: 'Rafael', role: 'RD' });
  const scott = await upsertUser({ email: 'scott@syncboard.dev', name: 'Scott', role: 'RD' });
  const wunhuei = await upsertUser({ email: 'wunhuei@syncboard.dev', name: 'WunHuei', role: 'RD' });

  const physicalAi = await upsertProject({
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Physical AI',
    description: '機械手臂與視覺感知的實體 AI 研發',
    tag: 'R&D',
  });
  const genaiStudio = await upsertProject({
    id: '00000000-0000-0000-0000-000000000002',
    name: 'GenAI Studio & LLM',
    description: '企業級 GenAI 模型訓練與推論平台',
    tag: 'Platform',
  });
  const deviceOn = await upsertProject({
    id: '00000000-0000-0000-0000-000000000003',
    name: 'DeviceOn',
    description: '企業級 IoT 裝置管理平台',
    tag: '維運',
  });
  const epd = await upsertProject({
    id: '00000000-0000-0000-0000-000000000004',
    name: 'EPD',
    description: '電子紙裝置管理與韌體',
    tag: '維運',
  });
  const others = await upsertProject({
    id: '00000000-0000-0000-0000-000000000005',
    name: 'Project & Others',
    description: '跨專案支援與其他任務',
    tag: 'Support',
  });

  await Promise.all([
    seedMembership(physicalAi, tungyi, today),
    seedMembership(physicalAi, iris, today),
    seedMembership(physicalAi, jim, today),
    seedMembership(physicalAi, fabian, today),

    seedMembership(genaiStudio, alex, today),
    seedMembership(genaiStudio, scott, today),
    seedMembership(genaiStudio, fabian, today),

    seedMembership(deviceOn, tungyi, today),
    seedMembership(deviceOn, rafael, today),
    seedMembership(deviceOn, scott, today),
    seedMembership(deviceOn, wunhuei, today),
    seedMembership(deviceOn, fabian, today),

    seedMembership(epd, fabian, today),

    seedMembership(others, wunhuei, today),
    seedMembership(others, iris, today),
    seedMembership(others, fabian, today),
  ]);

  // 種一筆今天的範例報告，方便 clone 後直接示範 AI Refactor / Combine
  await seedReport(
    deviceOn,
    rafael,
    today,
    `# 🗓 Rafael 的每日進度｜${today}

## 項目一：DeviceOn Java17 升級 + OTA 更新流程
- **狀態**：Ongoing
- **類型**：New Feature
- **內容**：
  - App 端：完成 RESTful API 串接 (7/20)
  - Docker Compose：完成資料表 schema、後端功能
  - 下一步：Image Deploy 的 Payload Package Deploy
- **進度**：60%
- **備註**：無

## 項目二：EdgeBMC flash BIOS issue (Model: DS-054)
- **狀態**：Ongoing
- **類型**：Enhancement
- **內容**：
  - 已確認問題並升級給 PM，EC 已確認問題
  - 壓力測試：flash bios -> power on 重複 20 輪，3 輪後開機失敗
  - 下一步：新增 flash bios 前的安全關機機制
- **進度**：70%
- **備註**：無

---

## 🔥 阻礙 / 需協助事項
- 需要 DQA 協助接手 EdgeBMC 相關維運項目

## 🔗 相關連結
- （無）
`,
  );

  await seedReport(
    genaiStudio,
    alex,
    today,
    `# 🗓 Alex 的每日進度｜${today}

## 項目一：Phison 推論引擎整合
- **狀態**：Done
- **類型**：New Feature
- **內容**：
  - Merge to backend
  - Check installer integrity
  - 完成 runtime 測試
- **進度**：100%
- **備註**：無

## 項目二：1.5 版本發布準備
- **狀態**：Ongoing
- **類型**：Others
- **內容**：
  - 新增 LoRA fine-tuning 模型支援（Gemma / Qwen 系列）
  - 支援多 GPU LoRA fine-tuning
  - 下一步：Beta 2 測試、線上文件撰寫
- **進度**：50%
- **備註**：無

---

## 🔥 阻礙 / 需協助事項
- （無）

## 🔗 相關連結
- （無）
`,
  );

  console.log('Seed complete.');
  console.log('專案：Physical AI / GenAI Studio & LLM / DeviceOn / EPD / Project & Others');
  console.log('成員：Fabian, Alex, TungYi, Iris, Jim, Rafael, Scott, WunHuei（皆為 RD）');
  console.log(`已為 Rafael（DeviceOn）與 Alex（GenAI Studio & LLM）種入 ${today} 的範例報告`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
