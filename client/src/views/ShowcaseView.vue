<script setup>
import { ref, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ListChecks, Folder, Presentation, Pencil, Check, X, RotateCcw, Download, Loader2, ChevronDown } from 'lucide-vue-next';
import { useMeetingStatusStore } from '../stores/meetingStatus.js';
import { usePresentationStore } from '../stores/presentation.js';
import { usePlaybackStore } from '../stores/playback.js';
import { useUiStore } from '../stores/ui.js';
import { todayISO } from '../utils/date.js';
import { buildSlidesExportHtml, buildSlidesExportMarkdown } from '../utils/exportSlides.js';
import * as meetingStatusApi from '../api/meetingStatus.js';
import * as meetingDatesApi from '../api/meetingDates.js';
import ShowcaseItemCard from '../components/showcase/ShowcaseItemCard.vue';

const route = useRoute();
const router = useRouter();
const meetingStatus = useMeetingStatusStore();
const presentation = usePresentationStore();
const playback = usePlaybackStore();
const ui = useUiStore();

const FOLLOW_UP_KEY = 'follow-up';
const projectKey = (projectId) => `project-${projectId}`;

// The item whose presentation is currently open — cleared once the modal
// closes, so "played" state (from the playback store) can take over.
const currentPlayingKey = ref(null);
function itemState(itemKey) {
  if (currentPlayingKey.value === itemKey) return 'current';
  if (playback.isPlayed(date.value, itemKey)) return 'done';
  return 'default';
}
watch(
  () => presentation.isOpen,
  (isOpen) => {
    if (!isOpen) currentPlayingKey.value = null;
  },
);

const PERIOD_RE = /^\d{4}-\d{2}-\d{2}$/;
const date = ref(PERIOD_RE.test(route.query.period) ? route.query.period : todayISO());

const isInitialLoading = ref(true);
const error = ref('');

const isEditingDate = ref(false);
const isSavingDate = ref(false);
const dateDraft = ref('');
const dateError = ref('');

onMounted(async () => {
  try {
    await meetingStatus.loadOverview(date.value);
  } finally {
    isInitialLoading.value = false;
  }
});

function startEditDate() {
  dateDraft.value = date.value;
  dateError.value = '';
  isEditingDate.value = true;
}

function cancelEditDate() {
  isEditingDate.value = false;
  dateError.value = '';
}

async function confirmEditDate() {
  if (!dateDraft.value || dateDraft.value === date.value) {
    isEditingDate.value = false;
    return;
  }
  isSavingDate.value = true;
  dateError.value = '';
  try {
    await meetingDatesApi.renameMeetingDate(date.value, dateDraft.value);
    const newDate = dateDraft.value;
    router.replace({ query: { ...route.query, period: newDate } });
    date.value = newDate;
    isEditingDate.value = false;
    isInitialLoading.value = true;
    try {
      await meetingStatus.loadOverview(newDate);
    } finally {
      isInitialLoading.value = false;
    }
  } catch (err) {
    dateError.value = err.response?.data?.error || '更改日期失敗';
  } finally {
    isSavingDate.value = false;
  }
}

async function playFollowUp() {
  if (ui.isLoading) return;
  error.value = '';
  ui.start('準備 Follow-up 投影片...');
  try {
    const { pages: followUpPages } = await meetingStatusApi.getSectionPresentation(date.value, 'follow-up');
    const projectsWithSection = (meetingStatus.overview?.projects ?? []).filter((p) => p.sectionGenerated);
    const projectDecks = await Promise.all(
      projectsWithSection.map(async (project) => {
        const { pages } = await meetingStatusApi.getSectionPresentation(date.value, `project-${project.projectId}`);
        return pages?.length ? { title: `${project.name}－Product Overall Status`, pages } : null;
      }),
    );

    const decks = [];
    if (followUpPages?.length) decks.push({ title: 'Follow-up Items', pages: followUpPages });
    decks.push(...projectDecks.filter(Boolean));

    if (decks.length === 0) {
      error.value = '尚未產生 Follow-up 投影片，請先至整體進度頁面產生簡報';
      return;
    }
    currentPlayingKey.value = FOLLOW_UP_KEY;
    presentation.openQueue(decks, { onComplete: () => playback.markPlayed(date.value, FOLLOW_UP_KEY) });
  } catch (err) {
    error.value = err.response?.data?.error || '載入投影片失敗';
  } finally {
    ui.stop();
  }
}

async function playProject(project) {
  if (ui.isLoading) return;
  error.value = '';
  ui.start(`準備 ${project.name} 投影片...`);
  try {
    const result = await meetingStatusApi.getShowcaseProjectPlaylist(date.value, project.projectId);
    const decks = [];
    for (const member of result.members) {
      decks.push({ title: `${result.name}－${member.name}`, pages: member.pages });
    }
    if (decks.length === 0) {
      error.value = `${project.name} 目前還沒有任何投影片可播放`;
      return;
    }
    const key = projectKey(project.projectId);
    currentPlayingKey.value = key;
    presentation.openQueue(decks, { onComplete: () => playback.markPlayed(date.value, key) });
  } catch (err) {
    error.value = err.response?.data?.error || '載入投影片失敗';
  } finally {
    ui.stop();
  }
}

function resetPlayback() {
  playback.resetAll();
}

const isExporting = ref(false);
const showExportMenu = ref(false);

async function collectAllDecks() {
  const decks = [];

  const { pages: followUpPages } = await meetingStatusApi.getSectionPresentation(date.value, 'follow-up');
  if (followUpPages?.length) decks.push({ title: 'Follow-up Items', pages: followUpPages });

  const projects = meetingStatus.overview?.projects ?? [];
  for (const project of projects.filter((p) => p.sectionGenerated)) {
    const { pages } = await meetingStatusApi.getSectionPresentation(date.value, `project-${project.projectId}`);
    if (pages?.length) decks.push({ title: `${project.name}－Product Overall Status`, pages });
  }

  for (const project of projects) {
    const result = await meetingStatusApi.getShowcaseProjectPlaylist(date.value, project.projectId);
    for (const member of result.members ?? []) {
      if (member.pages?.length) decks.push({ title: `${result.name}－${member.name}`, pages: member.pages });
    }
  }

  return decks;
}

function downloadFile(content, mimeType, filename) {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

async function exportAs(format) {
  if (ui.isLoading || isExporting.value) return;
  showExportMenu.value = false;
  error.value = '';
  isExporting.value = true;
  ui.start(format === 'markdown' ? '匯出 Markdown 文件中...' : '匯出投影片中...');
  try {
    const decks = await collectAllDecks();
    if (decks.length === 0) {
      error.value = '目前沒有可匯出的投影片';
      return;
    }

    if (format === 'markdown') {
      const markdown = buildSlidesExportMarkdown(decks, date.value);
      downloadFile(markdown, 'text/markdown', `成果展示-${date.value}.md`);
    } else {
      const html = buildSlidesExportHtml(decks, date.value);
      downloadFile(html, 'text/html', `成果展示-${date.value}.html`);
    }
  } catch (err) {
    error.value = err.response?.data?.error || '匯出失敗';
  } finally {
    isExporting.value = false;
    ui.stop();
  }
}
</script>

<template>
  <div v-if="isInitialLoading" class="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
    <p class="text-sm text-gray-500">載入中...</p>
  </div>

  <div v-else class="space-y-4">
    <div class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">成果展示</h1>

        <div v-if="!isEditingDate" class="mt-1 flex items-center gap-1.5">
          <p class="text-sm text-gray-500">會議日期：{{ date }}｜點選項目開始投影播放。</p>
          <button
            type="button"
            class="p-1 text-gray-400 hover:text-blue-600 transition-colors"
            title="更改會議日期"
            @click="startEditDate"
          >
            <Pencil class="w-3.5 h-3.5" />
          </button>
        </div>

        <div v-else class="mt-1.5 flex items-center gap-2">
          <input
            v-model="dateDraft"
            type="date"
            class="px-3 py-1.5 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
            :disabled="isSavingDate"
          />
          <button
            type="button"
            class="p-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
            title="確認"
            :disabled="isSavingDate || !dateDraft"
            @click="confirmEditDate"
          >
            <Check class="w-4 h-4" />
          </button>
          <button
            type="button"
            class="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-60 transition-colors"
            title="取消"
            :disabled="isSavingDate"
            @click="cancelEditDate"
          >
            <X class="w-4 h-4" />
          </button>
          <span v-if="isSavingDate" class="text-xs text-gray-400">更改中...</span>
        </div>
        <p v-if="dateError" class="mt-1 text-xs text-red-600">{{ dateError }}</p>
      </div>

      <div class="shrink-0 flex items-center gap-2">
        <div class="relative">
          <button
            type="button"
            class="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-gray-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            title="將所有會議內容匯出成投影片或 Markdown 文件"
            :disabled="isExporting"
            @click="showExportMenu = !showExportMenu"
          >
            <Loader2 v-if="isExporting" class="w-3.5 h-3.5 animate-spin" />
            <Download v-else class="w-3.5 h-3.5" />
            匯出
            <ChevronDown class="w-3.5 h-3.5" />
          </button>

          <template v-if="showExportMenu">
            <div class="fixed inset-0 z-10" @click="showExportMenu = false"></div>
            <div class="absolute right-0 mt-1 w-44 bg-white rounded-lg border border-gray-200 shadow-lg z-20 py-1">
              <button
                type="button"
                class="w-full flex items-center px-3 py-2 text-sm text-left text-gray-700 hover:bg-gray-50"
                @click="exportAs('slides')"
              >
                投影片
              </button>
              <button
                type="button"
                class="w-full flex items-center px-3 py-2 text-sm text-left text-gray-700 hover:bg-gray-50"
                @click="exportAs('markdown')"
              >
                Markdown 文件
              </button>
            </div>
          </template>
        </div>
        <button
          type="button"
          class="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-gray-700 transition-colors"
          title="重置所有播放紀錄"
          @click="resetPlayback"
        >
          <RotateCcw class="w-3.5 h-3.5" />
          重置播放紀錄
        </button>
      </div>
    </div>

    <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

    <div class="space-y-3">
      <ShowcaseItemCard
        :icon="ListChecks"
        title="Follow-up Items & Product Overall Status"
        tag="追蹤"
        :description="`由 ${meetingStatus.overview?.header?.host || '主持人'} 進行追蹤事項與各專案整體進度說明`"
        :state="itemState(FOLLOW_UP_KEY)"
        @click="playFollowUp"
      />

      <ShowcaseItemCard
        v-for="project in meetingStatus.overview?.projects ?? []"
        :key="project.projectId"
        :icon="Folder"
        :title="project.name"
        :tag="project.tag"
        :description="project.description"
        :state="itemState(projectKey(project.projectId))"
        @click="playProject(project)"
      />

      <div class="w-full flex items-center gap-4 px-5 py-4 bg-white rounded-xl border border-gray-200 opacity-70 cursor-not-allowed">
        <div class="p-2.5 rounded-lg bg-gray-100 text-gray-400 shrink-0">
          <Presentation class="w-5 h-5" />
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <h3 class="font-bold text-gray-900">Deep Dive & 技術分享</h3>
            <span class="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-500 rounded-full">尚未實作</span>
          </div>
          <p class="text-sm text-gray-500 mt-0.5">技術分享與深度探討</p>
        </div>
      </div>
    </div>
  </div>
</template>
