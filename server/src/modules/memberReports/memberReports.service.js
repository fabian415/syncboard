import { prisma } from '../../db/prisma.js';
import { HttpError } from '../../middleware/errorHandler.js';
import {
  assertValidDate,
  memberReportMarkdownPath,
  reportMarkdownPath,
  reportHtmlPath,
  readTextFile,
  writeTextFile,
} from '../../storage/fsStore.js';
import { serializeSlides } from '../../ai/pageSplitter.js';
import { generateValidatedSlides } from '../../ai/slideGenerator.js';
import { buildDistributeMessages } from '../../ai/personalReportPrompt.js';
import { chatComplete } from '../../ai/aiClient.js';
import { buildSampleProductMessages } from '../../ai/sampleReportPrompt.js';

const PRODUCT_HEADING_RE = /^##\s*📦\s*Product[:：]\s*(.+?)\s*$/;
const OTHERS_HEADING_RE = /^##\s*🌐/;
const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_SAMPLE_PRODUCTS = 2;

function coverageStartFor(periodStart) {
  const endMs = Date.parse(`${periodStart}T00:00:00Z`);
  return new Date(endMs - 14 * DAY_MS).toISOString().slice(0, 10);
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}


export async function listMembers() {
  const users = await prisma.user.findMany({
    orderBy: { name: 'asc' },
  });
  return users.map((u) => ({ id: u.id, name: u.name, role: u.role }));
}

// A member's projects aren't a separate roster anymore — they're whichever
// projects the member has ever saved a Report for.
async function getMemberProjects(userId) {
  const reports = await prisma.report.findMany({
    where: { userId },
    distinct: ['projectId'],
    orderBy: { createdAt: 'asc' },
    select: { project: { select: { id: true, name: true } } },
  });
  return reports.map((r) => ({ id: r.project.id, name: r.project.name }));
}

// Storage folders are named after the user's display name rather than their
// UUID (see fsStore.js), so every fs path build needs a name lookup.
async function resolveUserName(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new HttpError(404, 'Member not found');
  return user.name;
}

export async function getPersonalReport(userId, periodStart) {
  assertValidDate(periodStart);
  const userName = await resolveUserName(userId);
  const markdown = (await readTextFile(memberReportMarkdownPath(userName, periodStart))) ?? '';
  const row = await prisma.memberReport.findUnique({
    where: { userId_periodStart: { userId, periodStart: new Date(periodStart) } },
  });
  const projects = await getMemberProjects(userId);

  return {
    markdown,
    updatedAt: row?.updatedAt ?? null,
    projects,
  };
}

export async function listMemberReportArchiveEntries(userId) {
  const userName = await resolveUserName(userId);

  const rows = await prisma.memberReport.findMany({
    where: { userId },
    orderBy: { periodStart: 'asc' },
  });
  if (rows.length === 0) {
    throw new HttpError(404, 'No reports found', '此成員尚無任何會議報告可下載');
  }

  const entries = [];
  for (const row of rows) {
    const periodStart = row.periodStart.toISOString().slice(0, 10);
    const markdown = await readTextFile(memberReportMarkdownPath(userName, periodStart));
    if (markdown != null) {
      entries.push({ periodStart, markdown });
    }
  }
  if (entries.length === 0) {
    throw new HttpError(404, 'No reports found', '此成員尚無任何會議報告可下載');
  }

  return { userName, entries };
}

export async function saveMarkdown(userId, periodStart, markdown) {
  assertValidDate(periodStart);
  const userName = await resolveUserName(userId);
  const filePath = memberReportMarkdownPath(userName, periodStart);
  await writeTextFile(filePath, markdown);

  const row = await prisma.memberReport.upsert({
    where: { userId_periodStart: { userId, periodStart: new Date(periodStart) } },
    update: { markdownPath: filePath },
    create: { userId, periodStart: new Date(periodStart), markdownPath: filePath },
  });

  return { updatedAt: row.updatedAt };
}

const VARIATION_HINTS = [
  '這次著重在效能與延遲優化，含具體的量測數字',
  '這次著重在修復一個困擾使用者已久的 bug，並描述除錯過程',
  '這次著重在導入一個新的第三方服務／SDK 整合',
  '這次著重在資安或合規要求（如漏洞修補、權限控管）',
  '這次著重在跨團隊協作與流程優化',
  '這次著重在使用者體驗／介面改版',
  '這次著重在自動化測試或 CI/CD 流程改善',
  '這次著重在資料庫或資料管線的重構',
  '這次著重在監控、告警或可觀測性的建置',
  '這次著重在行動裝置或多平台支援',
];

/**
 * Testing convenience only: pads out to at least MIN_SAMPLE_PRODUCTS Product
 * sections even if the member belongs to fewer real projects, so the sample
 * report has enough content to exercise the multi-Product UI.
 */
function pickProductsForSample(memberProjects, allProjects) {
  const names = memberProjects.map((p) => p.name);
  if (names.length >= MIN_SAMPLE_PRODUCTS) return names;

  const pool = shuffle(allProjects.filter((p) => !names.includes(p.name)).map((p) => p.name));
  const needed = MIN_SAMPLE_PRODUCTS - names.length + (Math.random() < 0.5 ? 1 : 0);
  return [...names, ...pool.slice(0, Math.max(needed, 0))];
}

const OTHER_EVENTS_POOL = [
  '協助新人 onboarding，帶教一週的環境設定與流程說明。',
  '參與跨團隊技術分享會，介紹本期導入的新工具。',
  '協助處理 production 緊急事件，完成事後檢討報告。',
  '支援其他專案的臨時需求，協助排查問題。',
  '協助整理本期雙週報示例資料，供簡報模板壓力測試使用。',
];

const MIN_SAMPLE_HIGHLIGHTS = 5;
const REQUIRED_BLOCK_HEADINGS = [
  '### - 核心重點',
  '### - 項目的補充說明',
  '### - 下週計畫',
  '### - 🔥 討論 / 阻礙',
  '### - 🔗 相關連結',
];

function stripCodeFence(text) {
  return text
    .trim()
    .replace(/^```(?:markdown)?\n?/, '')
    .replace(/```$/, '')
    .trim();
}

function pickVariationSeed() {
  const hint = VARIATION_HINTS[Math.floor(Math.random() * VARIATION_HINTS.length)];
  return `${hint}（隨機碼：${Math.random().toString(36).slice(2, 8)}）`;
}

function isValidSampleBlock(block) {
  if (!block.startsWith('## 📦 Product：')) return false;
  const highlightCount = (block.match(/^\*\s+\*\*\d+\./gm) || []).length;
  if (highlightCount < MIN_SAMPLE_HIGHLIGHTS) return false;
  return REQUIRED_BLOCK_HEADINGS.every((heading) => block.includes(heading));
}

/**
 * One AI call per Product, run in parallel — a single mega-prompt covering
 * every Product a manager belongs to (e.g. 5) easily exceeded AI_TIMEOUT_MS
 * once each block was asked for 5-8 highlights.
 */
async function generateSampleProductBlock(memberName, productName) {
  const opts = { name: memberName, productName, variationSeed: pickVariationSeed() };

  let block = stripCodeFence(await chatComplete(buildSampleProductMessages(opts, { retry: false }), { temperature: 0.95 }));
  if (!isValidSampleBlock(block)) {
    block = stripCodeFence(await chatComplete(buildSampleProductMessages(opts, { retry: true }), { temperature: 0.95 }));
  }
  if (!isValidSampleBlock(block)) {
    throw new HttpError(502, 'AI sample generation format mismatch', `AI 產生「${productName}」的內容格式不符，請重試一次`);
  }

  return block;
}

export async function generateSampleReport(userId, periodStart) {
  assertValidDate(periodStart);
  const member = await prisma.user.findUnique({ where: { id: userId } });
  if (!member) {
    throw new HttpError(404, 'Member not found');
  }

  const memberProjects = await getMemberProjects(userId);
  const allProjects = await prisma.project.findMany({ select: { name: true } });
  const productNames = pickProductsForSample(memberProjects, allProjects);

  const blocks = await Promise.all(productNames.map((productName) => generateSampleProductBlock(member.name, productName)));

  const coverageStart = coverageStartFor(periodStart);
  const other = OTHER_EVENTS_POOL[Math.floor(Math.random() * OTHER_EVENTS_POOL.length)];

  const markdown = `# 🚀 Presenter：${member.name}｜雙週報 ${coverageStart} ~ ${periodStart}
> 本次涵蓋 Product：${productNames.map((n) => `\`${n}\``).join('、')}

---

${blocks.join('\n\n---\n\n')}

---

## 🌐 其他事項 (Event Support or Others Project)

* ${other}
`;

  return { markdown, productNames };
}

/**
 * Splits the personal report into per-Product sections. The "others" section
 * (## 🌐 ...) is recognized as a boundary but not returned — it isn't routed
 * to any project.
 */
export function parseProductSections(markdown) {
  const lines = markdown.split('\n');
  const headingIndexes = [];

  lines.forEach((line, i) => {
    const match = line.match(PRODUCT_HEADING_RE);
    if (match) {
      headingIndexes.push({ index: i, productName: match[1].trim() });
    } else if (OTHERS_HEADING_RE.test(line)) {
      headingIndexes.push({ index: i, productName: null });
    }
  });

  const sections = [];
  for (let i = 0; i < headingIndexes.length; i += 1) {
    const { index, productName } = headingIndexes[i];
    if (!productName) continue;
    const end = i + 1 < headingIndexes.length ? headingIndexes[i + 1].index : lines.length;
    const content = lines
      .slice(index + 1, end)
      .join('\n')
      .replace(/\n-{3,}\s*$/, '')
      .trim();
    if (content) {
      sections.push({ productName, content });
    }
  }

  return sections;
}

function normalize(name) {
  return name.trim().toLowerCase();
}

function matchProject(productName, projects) {
  const normalized = normalize(productName);
  const exact = projects.find((p) => normalize(p.name) === normalized);
  if (exact) return exact;
  return projects.find((p) => normalize(p.name).includes(normalized) || normalized.includes(normalize(p.name)));
}

export async function distributeReport(userId, periodStart) {
  assertValidDate(periodStart);
  const member = await prisma.user.findUnique({ where: { id: userId } });
  if (!member) {
    throw new HttpError(404, 'Member not found');
  }

  const markdown = await readTextFile(memberReportMarkdownPath(member.name, periodStart));
  if (!markdown || !markdown.trim()) {
    throw new HttpError(422, '請先撰寫並儲存您的報告內容再進行 Refactor');
  }

  const sections = parseProductSections(markdown);
  if (sections.length === 0) {
    throw new HttpError(
      422,
      'No product sections found',
      '找不到任何 Product 段落，請確認格式是否為「## 📦 Product：專案名稱」',
    );
  }

  const allProjects = await prisma.project.findMany({ select: { id: true, name: true } });

  const results = [];
  const unmatched = [];

  for (const section of sections) {
    const project = matchProject(section.productName, allProjects);
    if (!project) {
      unmatched.push(section.productName);
      continue;
    }

    const pages = await generateValidatedSlides((opts) =>
      buildDistributeMessages(
        { memberName: member.name, productName: project.name, sectionMarkdown: section.content },
        opts,
      ),
    );

    const mdPath = reportMarkdownPath(project.name, member.name, periodStart);
    const htmlPath = reportHtmlPath(project.name, member.name, periodStart);
    await writeTextFile(mdPath, section.content);
    await writeTextFile(htmlPath, serializeSlides(pages));

    await prisma.report.upsert({
      where: { projectId_userId_reportDate: { projectId: project.id, userId, reportDate: new Date(periodStart) } },
      update: { markdownPath: mdPath, htmlPath, status: 'SUBMITTED', submittedAt: new Date() },
      create: {
        projectId: project.id,
        userId,
        reportDate: new Date(periodStart),
        markdownPath: mdPath,
        htmlPath,
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
    });

    results.push({ projectId: project.id, projectName: project.name, htmlPages: pages });
  }

  if (results.length === 0) {
    throw new HttpError(
      422,
      'No sections matched a project',
      `沒有任何 Product 段落對應到現有的專案（${unmatched.join('、')}），請確認名稱是否正確`,
    );
  }

  return { results, unmatched };
}
