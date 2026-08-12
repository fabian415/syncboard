<script setup>
import { computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useProjectsStore } from '../stores/projects.js';
import ProjectCard from '../components/manager/ProjectCard.vue';

const route = useRoute();
const router = useRouter();
const projects = useProjectsStore();

const PERIOD_RE = /^\d{4}-\d{2}-\d{2}$/;
const period = computed(() => (PERIOD_RE.test(route.query.period) ? route.query.period : null));

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
</script>

<template>
  <div v-if="period" class="space-y-6">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">專案總覽</h1>
        <p class="mt-1 text-sm text-gray-500">會議日期：{{ period }}｜請選擇一個專案以查看本期的 AI 統整簡報與團隊進度。</p>
      </div>
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
