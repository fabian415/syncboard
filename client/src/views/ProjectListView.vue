<script setup>
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { CalendarClock } from 'lucide-vue-next';
import { useProjectsStore } from '../stores/projects.js';
import { usePresentationStore } from '../stores/presentation.js';
import * as meetingStatusApi from '../api/meetingStatus.js';
import ProjectCard from '../components/manager/ProjectCard.vue';

const route = useRoute();
const router = useRouter();
const projects = useProjectsStore();
const presentation = usePresentationStore();

const PERIOD_RE = /^\d{4}-\d{2}-\d{2}$/;
const period = computed(() => (PERIOD_RE.test(route.query.period) ? route.query.period : null));
const isLoadingMeetingStatus = ref(false);

watch(
  period,
  (p) => {
    if (p) projects.loadList(p);
    else router.replace('/');
  },
  { immediate: true },
);

function changeDate() {
  router.push('/');
}

function goToMeetingStatusEditor() {
  router.push(`/meeting-status?period=${period.value}`);
}

async function playMeetingStatus() {
  if (isLoadingMeetingStatus.value) return;
  isLoadingMeetingStatus.value = true;
  try {
    const report = await meetingStatusApi.getPresentation(period.value);
    if (report.pages) {
      presentation.open(report.pages, `整體進度簡報｜${period.value}`, goToMeetingStatusEditor);
    } else {
      goToMeetingStatusEditor();
    }
  } catch {
    goToMeetingStatusEditor();
  } finally {
    isLoadingMeetingStatus.value = false;
  }
}
</script>

<template>
  <div v-if="period" class="space-y-6">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">專案總覽</h1>
        <p class="mt-1 text-sm text-gray-500">會議日期：{{ period }}｜請選擇一個專案以查看本期的統整匯報與團隊進度。</p>
      </div>
      <button
        class="flex items-center px-4 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium text-sm shadow-sm transition-colors shrink-0 disabled:opacity-60"
        :disabled="isLoadingMeetingStatus"
        @click="playMeetingStatus"
      >
        <CalendarClock class="w-4 h-4 mr-2" />
        {{ isLoadingMeetingStatus ? '載入中...' : '整體進度簡報' }}
      </button>
    </div>

    <p v-if="projects.error" class="text-sm text-red-600">{{ projects.error }}</p>

    <p v-if="projects.isLoading" class="text-sm text-gray-500">載入中...</p>

    <div v-else-if="projects.list.length === 0" class="bg-white rounded-xl border border-gray-200 p-8 text-sm text-gray-500">
      目前沒有任何專案。
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <ProjectCard v-for="project in projects.list" :key="project.id" :project="project" :period="period" />
    </div>
  </div>
</template>
