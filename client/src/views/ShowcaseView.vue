<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { ListChecks, Folder, Presentation } from 'lucide-vue-next';
import { useMeetingStatusStore } from '../stores/meetingStatus.js';
import { usePresentationStore } from '../stores/presentation.js';
import { useUiStore } from '../stores/ui.js';
import { todayISO } from '../utils/date.js';
import * as meetingStatusApi from '../api/meetingStatus.js';
import StatusCard from '../components/manager/StatusCard.vue';

const route = useRoute();
const meetingStatus = useMeetingStatusStore();
const presentation = usePresentationStore();
const ui = useUiStore();

const PERIOD_RE = /^\d{4}-\d{2}-\d{2}$/;
const date = PERIOD_RE.test(route.query.period) ? route.query.period : todayISO();

const isInitialLoading = ref(true);
const error = ref('');

onMounted(async () => {
  try {
    await meetingStatus.loadOverview(date);
  } finally {
    isInitialLoading.value = false;
  }
});

async function playFollowUp() {
  if (ui.isLoading) return;
  error.value = '';
  ui.start('準備 Follow-up 投影片...');
  try {
    const { pages } = await meetingStatusApi.getSectionPresentation(date, 'follow-up');
    if (!pages || pages.length === 0) {
      error.value = '尚未產生 Follow-up 投影片，請先至整體進度頁面產生簡報';
      return;
    }
    presentation.open(pages, 'Follow-up Items');
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
    const result = await meetingStatusApi.getShowcaseProjectPlaylist(date, project.projectId);
    const decks = [];
    if (result.sectionPages?.length) decks.push({ title: result.name, pages: result.sectionPages });
    for (const member of result.members) {
      decks.push({ title: `${result.name}－${member.name}`, pages: member.pages });
    }
    if (decks.length === 0) {
      error.value = `${project.name} 目前還沒有任何投影片可播放`;
      return;
    }
    presentation.openQueue(decks);
  } catch (err) {
    error.value = err.response?.data?.error || '載入投影片失敗';
  } finally {
    ui.stop();
  }
}
</script>

<template>
  <div v-if="isInitialLoading" class="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
    <p class="text-sm text-gray-500">載入中...</p>
  </div>

  <div v-else class="space-y-4">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">成果展示</h1>
      <p class="mt-1 text-sm text-gray-500">會議日期：{{ date }}｜點選項目開始投影播放。</p>
    </div>

    <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <StatusCard
        :icon="ListChecks"
        tag="追蹤"
        title="Follow-up Items"
        :description="`由 ${meetingStatus.overview?.header?.host || '主持人'} 進行追蹤事項說明`"
        @click="playFollowUp"
      />
      <StatusCard
        v-for="project in meetingStatus.overview?.projects ?? []"
        :key="project.projectId"
        :icon="Folder"
        :tag="project.tag"
        :title="project.name"
        :description="project.description"
        @click="playProject(project)"
      />
      <StatusCard
        :icon="Presentation"
        tag="分享"
        title="Deep Dive & 技術分享"
        description="技術分享與深度探討"
        disabled
        disabled-badge="尚未實作"
      />
    </div>
  </div>
</template>
