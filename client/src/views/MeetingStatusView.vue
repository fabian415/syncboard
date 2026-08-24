<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { CalendarClock, ListChecks, Folder, Presentation } from 'lucide-vue-next';
import { useMeetingStatusStore } from '../stores/meetingStatus.js';
import { useDeepDiveStore } from '../stores/deepDive.js';
import { todayISO } from '../utils/date.js';
import StatusCard from '../components/manager/StatusCard.vue';

const route = useRoute();
const router = useRouter();
const meetingStatus = useMeetingStatusStore();
const deepDive = useDeepDiveStore();

const PERIOD_RE = /^\d{4}-\d{2}-\d{2}$/;
const date = PERIOD_RE.test(route.query.period) ? route.query.period : todayISO();

const isInitialLoading = ref(true);

onMounted(async () => {
  try {
    await Promise.all([meetingStatus.loadOverview(date), deepDive.loadAssets(date)]);
  } finally {
    isInitialLoading.value = false;
  }
});

function goToFollowUp() {
  router.push(`/meeting-status/follow-up?period=${date}`);
}

function goToProject(projectId) {
  router.push(`/meeting-status/projects/${projectId}?period=${date}`);
}

function goToDeepDive() {
  router.push(`/meeting-status/deep-dive?period=${date}`);
}
</script>

<template>
  <div v-if="isInitialLoading" class="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
    <p class="text-sm text-gray-500">載入中...</p>
  </div>

  <div v-else class="space-y-4">
    <div class="flex items-center justify-between flex-wrap gap-2">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 flex items-center">
          整體進度上傳
        </h1>
        <p class="mt-1 text-sm text-gray-500">會議日期：{{ date }}｜請填寫各區塊內容並產生整體進度簡報。</p>
      </div>

      <div class="flex items-center gap-2">
        <span v-if="meetingStatus.error" class="text-xs text-red-600">{{ meetingStatus.error }}</span>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <StatusCard
        :icon="ListChecks"
        tag="追蹤"
        title="Follow-up"
        description="本次會議的追蹤事項與上次進度"
        :filled="meetingStatus.overview?.followUp.hasContent ?? false"
        @click="goToFollowUp"
      />
      <StatusCard
        v-for="project in meetingStatus.overview?.projects ?? []"
        :key="project.projectId"
        :icon="Folder"
        :tag="project.tag"
        :title="project.name"
        :description="project.description"
        :progress="{
          current: project.generatedCount + (project.sectionGenerated ? 1 : 0),
          total: project.memberCount + (project.hasContent ? 1 : 0),
        }"
        @click="goToProject(project.projectId)"
      />
      <StatusCard
        :icon="Presentation"
        tag="分享"
        title="Deep Dive & 技術分享"
        description="技術分享與深度探討"
        :filled="deepDive.hasAssets"
        @click="goToDeepDive"
      />
    </div>
  </div>
</template>
