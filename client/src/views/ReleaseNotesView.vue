<script setup>
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ArrowLeft, Rocket } from 'lucide-vue-next';
import { getVersionInfo } from '../api/version.js';

const router = useRouter();

const version = ref('');
const releases = ref([]);
const isLoading = ref(true);
const error = ref('');

const CATEGORY_STYLES = {
  新功能: 'bg-blue-50 text-blue-700 border-blue-200',
  補強功能: 'bg-purple-50 text-purple-700 border-purple-200',
  錯誤修正: 'bg-red-50 text-red-700 border-red-200',
};
const DEFAULT_CATEGORY_STYLE = 'bg-gray-100 text-gray-600 border-gray-200';

function categoryStyle(category) {
  return CATEGORY_STYLES[category] ?? DEFAULT_CATEGORY_STYLE;
}

function goBack() {
  if (window.history.length > 1) router.back();
  else router.push('/');
}

onMounted(async () => {
  try {
    const info = await getVersionInfo();
    version.value = info.version;
    releases.value = info.releases;
  } catch {
    error.value = '無法載入更新紀錄，請稍後再試。';
  } finally {
    isLoading.value = false;
  }
});
</script>

<template>
  <div class="max-w-3xl mx-auto space-y-6">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div>
        <button
          class="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 transition-colors mb-2"
          @click="goBack"
        >
          <ArrowLeft class="w-4 h-4 mr-1" /> 返回
        </button>
        <h1 class="text-2xl font-bold text-gray-900 flex items-center">
          <Rocket class="w-6 h-6 text-blue-600 mr-2" /> 更新紀錄
        </h1>
        <p v-if="version" class="mt-1 text-sm text-gray-500">目前版本：v{{ version }}</p>
      </div>
    </div>

    <p v-if="isLoading" class="text-sm text-gray-500">載入中...</p>
    <p v-else-if="error" class="text-sm text-red-600">{{ error }}</p>
    <div v-else-if="!releases.length" class="bg-white rounded-xl border border-gray-200 p-8 text-sm text-gray-500">
      尚無更新紀錄。
    </div>

    <div v-else class="space-y-6">
      <div
        v-for="release in releases"
        :key="release.version"
        class="bg-white rounded-xl border border-gray-200 p-6 space-y-4"
      >
        <div class="flex items-baseline space-x-3">
          <span class="text-lg font-bold text-gray-900">v{{ release.version }}</span>
          <span v-if="release.date" class="text-sm text-gray-400 font-mono">{{ release.date }}</span>
        </div>

        <div v-for="(section, i) in release.sections" :key="i" class="space-y-2">
          <span
            v-if="section.category"
            class="inline-block text-xs font-semibold px-2 py-0.5 rounded-full border"
            :class="categoryStyle(section.category)"
          >
            {{ section.category }}
          </span>
          <ul class="list-disc list-inside space-y-1">
            <li v-for="(note, j) in section.notes" :key="j" class="text-sm text-gray-600">{{ note }}</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>
