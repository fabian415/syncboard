<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { FileText, Sparkles, Wand2, ListPlus, ArrowLeft, CheckCircle2, AlertTriangle } from 'lucide-vue-next';
import { useMemberReportStore } from '../stores/memberReport.js';
import { useProjectsStore } from '../stores/projects.js';
import { useUiStore } from '../stores/ui.js';
import * as membersApi from '../api/members.js';
import { todayISO, coverageStartFor } from '../utils/date.js';
import { buildPersonalReportTemplate, buildProductBlock } from '../constants/personalReportTemplate.js';
import MarkdownEditor from '../components/rd/MarkdownEditor.vue';

const route = useRoute();
const router = useRouter();
const report = useMemberReportStore();
const projects = useProjectsStore();
const ui = useUiStore();

const PERIOD_RE = /^\d{4}-\d{2}-\d{2}$/;
const PRODUCT_HEADING_RE = /^##\s*📦\s*Product[:：]\s*(.+?)\s*$/;
const OTHERS_HEADING_RE = /^##\s*🌐/;
const COVERAGE_LINE_RE = /^>\s*本次涵蓋\s*Product[:：].*$/m;

const userId = route.params.userId;
const meetingDate = PERIOD_RE.test(route.query.period) ? route.query.period : todayISO();
const coverageStart = coverageStartFor(meetingDate);

const member = ref(null);
const draft = ref('');
const saveMessage = ref('');
const isInitialLoading = ref(true);
const showProductMenu = ref(false);
const showQuickFill = ref(false);

const SECRET_TAP_WINDOW_MS = 3000;
const SECRET_TAP_COUNT = 3;
let spaceTapTimestamps = [];

function isEditableTarget(target) {
  if (!target) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

function handleSecretKeydown(event) {
  if (event.code !== 'Space' || isEditableTarget(event.target)) return;

  const now = Date.now();
  spaceTapTimestamps = [...spaceTapTimestamps, now].filter((t) => now - t <= SECRET_TAP_WINDOW_MS);

  if (spaceTapTimestamps.length >= SECRET_TAP_COUNT) {
    showQuickFill.value = !showQuickFill.value;
    spaceTapTimestamps = [];
  }
}

const tabsHint = computed(() => report.projects.map((p) => p.name).join('、'));
const hasUnsavedChanges = computed(() => !!report.markdown && draft.value !== report.markdown);
const subtitleFull = computed(
  () =>
    `請依模板填寫本期各 Product 的工作項目。${tabsHint.value ? `您目前所屬專案：${tabsHint.value}。` : ''}儲存後按「AI Refactor 並分送」，AI 只會做文字潤飾，不會偏離您填寫的原意。`
);
const insertedProductNames = computed(() => {
  const names = new Set();
  const re = new RegExp(PRODUCT_HEADING_RE.source, 'gm');
  let match;
  while ((match = re.exec(draft.value))) {
    names.add(match[1].trim());
  }
  return names;
});

onMounted(async () => {
  window.addEventListener('keydown', handleSecretKeydown);
  projects.loadList(meetingDate);
  try {
    const members = await membersApi.listMembers();
    member.value = members.find((m) => m.id === userId) ?? null;
    if (!member.value) return;

    await report.load(userId, meetingDate);
    draft.value =
      report.markdown ||
      buildPersonalReportTemplate({
        name: member.value.name,
        periodStart: coverageStart,
        periodEnd: meetingDate,
      });
  } finally {
    isInitialLoading.value = false;
  }
});

onUnmounted(() => window.removeEventListener('keydown', handleSecretKeydown));

function syncCoverageLine() {
  if (!COVERAGE_LINE_RE.test(draft.value)) return;
  const names = [...insertedProductNames.value];
  const line = names.length
    ? `> 本次涵蓋 Product：${names.map((n) => `\`${n}\``).join('、')}`
    : '> 本次涵蓋 Product：[請填入 Product 名稱]';
  draft.value = draft.value.replace(COVERAGE_LINE_RE, line);
}

function insertProductBlock(projectName) {
  const block = buildProductBlock(projectName);
  const othersIdx = draft.value.indexOf('## 🌐');
  if (othersIdx === -1) {
    draft.value = `${draft.value.replace(/\s*$/, '')}\n\n---\n\n${block}\n`;
  } else {
    draft.value = `${draft.value.slice(0, othersIdx)}${block}\n\n---\n\n${draft.value.slice(othersIdx)}`;
  }
  syncCoverageLine();
}

function removeProductBlock(projectName) {
  if (!window.confirm(`確定要移除「${projectName}」這個 Product 區塊嗎？此動作無法復原。`)) return;

  const lines = draft.value.split('\n');
  const headings = [];
  lines.forEach((line, i) => {
    const match = line.match(PRODUCT_HEADING_RE);
    if (match) headings.push({ index: i, name: match[1].trim() });
    else if (OTHERS_HEADING_RE.test(line)) headings.push({ index: i, name: null });
  });

  const targetPos = headings.findIndex((h) => h.name === projectName);
  if (targetPos === -1) return;

  const start = headings[targetPos].index;
  const end = targetPos + 1 < headings.length ? headings[targetPos + 1].index : lines.length;
  lines.splice(start, end - start);
  draft.value = lines.join('\n');
  syncCoverageLine();
}

function onSelectProduct(projectName) {
  if (insertedProductNames.value.has(projectName)) {
    removeProductBlock(projectName);
  } else {
    insertProductBlock(projectName);
  }
  showProductMenu.value = false;
}

async function handleSave() {
  saveMessage.value = '';
  try {
    await report.saveMarkdown(draft.value);
    saveMessage.value = '已儲存';
    setTimeout(() => (saveMessage.value = ''), 2000);
  } catch {
    // report.error already set for display
  }
}

async function handleQuickFill() {
  if (ui.isLoading) return;
  ui.start('✨ AI 正在生成範例內容...');
  try {
    const result = await report.generateSample();
    draft.value = result.markdown;
    saveMessage.value = '已生成範例內容，記得按「儲存」';
    setTimeout(() => (saveMessage.value = ''), 3000);
  } catch {
    // report.error already set for display
  } finally {
    ui.stop();
  }
}

async function handleDistribute() {
  if (ui.isLoading) return;
  ui.start('✨ AI 正在依模板整理您的報告，並分送到各專案...');
  try {
    await report.saveMarkdown(draft.value);
    await report.distribute();
  } catch {
    // report.error already set for display
  } finally {
    ui.stop();
  }
}
</script>

<template>
  <div v-if="isInitialLoading" class="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
    <p class="text-sm text-gray-500">載入中...</p>
  </div>

  <div v-else-if="!member" class="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
    <p class="text-sm text-gray-500">找不到這位成員，請確認網址是否正確。</p>
  </div>

  <div v-else class="h-[calc(100vh-8rem)] flex flex-col space-y-2">
    <div class="flex items-center justify-between flex-wrap gap-2">
      <div class="flex items-center gap-2 min-w-0">
        <button
          class="p-1.5 -ml-1.5 rounded-full hover:bg-gray-200 text-gray-600 transition-colors shrink-0"
          @click="router.push(`/members?period=${meetingDate}`)"
        >
          <ArrowLeft class="w-4 h-4" />
        </button>
        <h1
          class="text-base font-bold text-gray-900 flex items-center min-w-0 truncate"
          :title="subtitleFull"
        >
          <FileText class="w-4 h-4 mr-2 text-gray-400 shrink-0" />
          <span class="truncate">{{ member.name }} 的雙週報｜{{ coverageStart }} ~ {{ meetingDate }}</span>
        </h1>
      </div>

      <div class="flex items-center gap-2">
        <span v-if="saveMessage" class="text-xs text-green-600">{{ saveMessage }}</span>
        <span v-if="report.error" class="text-xs text-red-600">{{ report.error }}</span>

        <button
          v-if="showQuickFill"
          class="flex items-center px-2.5 py-1.5 rounded-lg border border-dashed border-gray-300 text-gray-600 bg-white hover:bg-gray-50 font-medium text-xs disabled:opacity-60 disabled:pointer-events-none"
          :disabled="ui.isLoading"
          title="測試用：依模板自動填入範例內容，方便快速驗證功能"
          @click="handleQuickFill"
        >
          <Wand2 class="w-3.5 h-3.5 mr-1.5 text-gray-500" />
          快速生成範例內容
        </button>

        <div class="relative">
          <button
            class="flex items-center px-2.5 py-1.5 rounded-lg border border-dashed border-gray-300 text-gray-600 bg-white hover:bg-gray-50 font-medium text-xs disabled:opacity-60 disabled:pointer-events-none"
            :disabled="ui.isLoading"
            title="從專案清單選擇，自動插入正確的 Product 區塊，避免手動打錯專案名稱或結構"
            @click="showProductMenu = !showProductMenu"
          >
            <ListPlus class="w-3.5 h-3.5 mr-1.5 text-gray-500" />
            插入 Product 區塊
          </button>

          <template v-if="showProductMenu">
            <div class="fixed inset-0 z-10" @click="showProductMenu = false"></div>
            <div class="absolute right-0 mt-1 w-56 max-h-72 overflow-y-auto bg-white rounded-lg border border-gray-200 shadow-lg z-20 py-1">
              <p v-if="projects.isLoading" class="px-3 py-2 text-xs text-gray-400">載入專案列表中...</p>
              <p v-else-if="!projects.list.length" class="px-3 py-2 text-xs text-gray-400">目前沒有可選的專案</p>
              <button
                v-for="p in projects.list"
                :key="p.id"
                class="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50"
                :class="insertedProductNames.has(p.name) ? 'text-gray-500' : 'text-gray-700'"
                :title="insertedProductNames.has(p.name) ? '已插入此 Product 區塊，點擊可移除（會再次確認）' : '點擊插入此 Product 區塊'"
                @click="onSelectProduct(p.name)"
              >
                <span class="truncate">{{ p.name }}</span>
                <CheckCircle2 v-if="insertedProductNames.has(p.name)" class="w-3.5 h-3.5 text-green-500 shrink-0" />
              </button>
            </div>
          </template>
        </div>

        <button
          class="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 font-medium text-xs disabled:opacity-60"
          :disabled="report.isSaving || ui.isLoading"
          @click="handleSave"
        >
          {{ report.isSaving ? '儲存中...' : '儲存' }}
        </button>

        <button
          class="relative group overflow-hidden rounded-lg p-[1.5px] disabled:opacity-60 disabled:pointer-events-none"
          :disabled="ui.isLoading"
          @click="handleDistribute"
        >
          <span class="absolute inset-0 bg-gradient-to-r from-blue-500 via-teal-500 to-green-500 rounded-lg opacity-70 group-hover:opacity-100 transition-opacity duration-300 animate-pulse"></span>
          <div class="relative flex items-center px-3.5 py-1.5 bg-white rounded-md group-hover:bg-opacity-95 transition-all duration-300">
            <Sparkles class="w-4 h-4 mr-1.5 text-teal-600 group-hover:scale-110 transition-transform" />
            <span class="font-bold text-sm bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-teal-600">
              AI Refactor 與分發專案
            </span>
          </div>
        </button>
      </div>
    </div>

    <div v-if="hasUnsavedChanges" class="flex items-center text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
      <AlertTriangle class="w-4 h-4 mr-2 shrink-0" />
      <span>有尚未儲存的變更，各專案的簡報預覽可能還是舊內容；請按「AI Refactor 並分送」以同步最新草稿。</span>
    </div>

    <div v-if="report.distributeResult" class="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-2">
      <div v-for="r in report.distributeResult.results" :key="r.projectId" class="flex items-center justify-between text-sm">
        <span class="flex items-center text-green-700">
          <CheckCircle2 class="w-4 h-4 mr-2" />
          已分送至「{{ r.projectName }}」
        </span>
        <router-link
          :to="`/projects/${r.projectId}/members/${userId}?period=${meetingDate}`"
          class="text-blue-600 hover:underline font-medium"
        >
          前往查看/編輯 →
        </router-link>
      </div>
      <div v-if="report.distributeResult.unmatched.length" class="flex items-start text-sm text-yellow-700">
        <AlertTriangle class="w-4 h-4 mr-2 mt-0.5 shrink-0" />
        <span>找不到對應專案，未分送：{{ report.distributeResult.unmatched.join('、') }}</span>
      </div>
    </div>

    <MarkdownEditor v-model="draft" />
  </div>
</template>
