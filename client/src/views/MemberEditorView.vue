<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { FileText, ArrowLeft } from 'lucide-vue-next';
import { useProjectsStore } from '../stores/projects.js';
import { useReportStore } from '../stores/report.js';
import { usePresentationStore } from '../stores/presentation.js';
import { todayISO } from '../utils/date.js';
import { serializeSlides } from '../utils/slides.js';
import HtmlSourceEditor from '../components/rd/HtmlSourceEditor.vue';
import StatusBadge from '../components/common/StatusBadge.vue';

const route = useRoute();
const router = useRouter();
const projects = useProjectsStore();
const report = useReportStore();
const presentation = usePresentationStore();

const projectId = route.params.projectId;
const userId = route.params.userId;
const htmlDraft = ref('');
const saveMessage = ref('');
const isInitialLoading = ref(true);
const PERIOD_RE = /^\d{4}-\d{2}-\d{2}$/;
const date = PERIOD_RE.test(route.query.period) ? route.query.period : todayISO();

const member = computed(() => projects.detail?.members.find((m) => m.userId === userId) ?? null);

onMounted(async () => {
  try {
    await projects.loadDetail(projectId, date);
    if (!member.value) return;

    await report.load(projectId, userId, date);
    if (report.htmlPages) htmlDraft.value = serializeSlides(report.htmlPages);
  } finally {
    isInitialLoading.value = false;
  }
});

watch(
  () => report.htmlPages,
  (pages) => {
    htmlDraft.value = pages ? serializeSlides(pages) : '';
  },
);

async function handleSave() {
  saveMessage.value = '';
  try {
    await report.saveHtml(htmlDraft.value);
    saveMessage.value = '已儲存';
    setTimeout(() => (saveMessage.value = ''), 2000);
  } catch {
    // report.error already set for display
  }
}

function openPreview() {
  if (!report.htmlPages) return;
  presentation.open(report.htmlPages, `${member.value?.name} 的簡報`);
}
</script>

<template>
  <div v-if="isInitialLoading" class="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
    <p class="text-sm text-gray-500">載入中...</p>
  </div>

  <div v-else-if="!member" class="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
    <p class="text-sm text-gray-500">找不到這位成員，請確認網址是否正確。</p>
  </div>

  <div v-else class="flex-1 min-h-0 flex flex-col space-y-2">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div class="flex items-center gap-1.5 min-w-0">
        <button
          class="p-1 -ml-1 rounded-full hover:bg-gray-200 text-gray-600 transition-colors shrink-0"
          @click="router.back()"
        >
          <ArrowLeft class="w-4 h-4" />
        </button>
        <div class="min-w-0">
          <h1 class="text-sm font-semibold text-gray-900 flex items-center">
            <FileText class="w-3.5 h-3.5 mr-1 text-gray-400 shrink-0" />
            <span class="truncate">{{ projects.detail?.name }} - {{ member.name }}</span>
          </h1>
          <p class="text-[11px] text-gray-500 truncate">
            內容來自成員在「我的報告」填寫並分送的雙週報，這裡可直接微調簡報 HTML。
          </p>
        </div>
      </div>

      <div class="flex items-center space-x-3">
        <StatusBadge :status="report.status" />
        <span v-if="saveMessage" class="text-sm text-green-600">{{ saveMessage }}</span>
        <span v-if="report.error" class="text-sm text-red-600">{{ report.error }}</span>
        <button
          v-if="report.htmlPages"
          class="px-3.5 py-2 rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 font-medium text-sm"
          @click="openPreview"
        >
          簡報放映
        </button>
        <button
          class="px-3.5 py-2 rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 font-medium text-sm disabled:opacity-60"
          :disabled="report.isSaving"
          @click="handleSave"
        >
          {{ report.isSaving ? '儲存中...' : '儲存' }}
        </button>
      </div>
    </div>

    <div v-if="!report.htmlPages" class="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 flex items-center justify-center">
      <p class="text-sm text-gray-500">此成員本期尚無簡報內容，請對方到「我的報告」填寫並分送。</p>
    </div>
    <HtmlSourceEditor v-else v-model="htmlDraft" />
  </div>
</template>
