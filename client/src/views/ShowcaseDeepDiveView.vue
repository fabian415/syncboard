<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ArrowLeft, FileCode, Presentation, Loader2, AlertCircle } from 'lucide-vue-next';
import { useDeepDiveStore } from '../stores/deepDive.js';
import { usePresentationStore } from '../stores/presentation.js';
import { todayISO } from '../utils/date.js';
import HtmlAssetViewerModal from '../components/deepDive/HtmlAssetViewerModal.vue';

const route = useRoute();
const router = useRouter();
const deepDive = useDeepDiveStore();
const presentation = usePresentationStore();

const PERIOD_RE = /^\d{4}-\d{2}-\d{2}$/;
const date = PERIOD_RE.test(route.query.period) ? route.query.period : todayISO();

const isInitialLoading = ref(true);
const htmlAsset = ref(null);

onMounted(async () => {
  try {
    await deepDive.loadAssets(date);
    deepDive.startPolling(date);
  } finally {
    isInitialLoading.value = false;
  }
});
onUnmounted(() => {
  deepDive.stopPolling();
});

function playHtml(asset) {
  htmlAsset.value = asset;
}

function playPptx(asset) {
  if (asset.status !== 'READY') return;
  const pages = asset.slideUrls.map((url) => `<div class="deep-dive-pptx-slide"><img src="${url}" /></div>`);
  presentation.openQueue([{ title: asset.originalName, pages }]);
}

function goBack() {
  router.push(`/showcase?period=${date}`);
}
</script>

<template>
  <div v-if="isInitialLoading" class="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
    <p class="text-sm text-gray-500">載入中...</p>
  </div>

  <div v-else class="space-y-6">
    <div>
      <button class="flex items-center text-xs text-gray-500 hover:text-blue-600 transition-colors mb-2" @click="goBack">
        <ArrowLeft class="w-3.5 h-3.5 mr-1.5" />
        返回成果展示
      </button>
      <h1 class="text-lg font-bold text-gray-900">Deep Dive & 技術分享｜{{ date }}</h1>
    </div>

    <p v-if="deepDive.error" class="text-sm text-red-600">{{ deepDive.error }}</p>

    <div v-if="!deepDive.hasAssets" class="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-sm text-gray-500">
      這場會議還沒有上傳任何 Deep Dive 資源。
    </div>

    <template v-else>
      <div v-if="deepDive.byType('HTML').length > 0">
        <h3 class="text-sm font-bold text-gray-700 mb-2 flex items-center">
          <FileCode class="w-4 h-4 mr-1.5 text-gray-400" />HTML
        </h3>
        <div class="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          <button
            v-for="asset in deepDive.byType('HTML')"
            :key="asset.id"
            type="button"
            class="w-full p-3 flex items-center gap-3 text-left hover:bg-gray-50"
            @click="playHtml(asset)"
          >
            <FileCode class="w-5 h-5 text-blue-500 shrink-0" />
            <span class="text-sm text-gray-800 truncate flex-1">{{ asset.originalName }}</span>
          </button>
        </div>
      </div>

      <div v-if="deepDive.byType('PPTX').length > 0">
        <h3 class="text-sm font-bold text-gray-700 mb-2 flex items-center">
          <Presentation class="w-4 h-4 mr-1.5 text-gray-400" />PPTX
        </h3>
        <div class="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          <button
            v-for="asset in deepDive.byType('PPTX')"
            :key="asset.id"
            type="button"
            class="w-full p-3 flex items-center gap-3 text-left"
            :class="asset.status === 'READY' ? 'hover:bg-gray-50' : 'opacity-60 cursor-not-allowed'"
            :disabled="asset.status !== 'READY'"
            @click="playPptx(asset)"
          >
            <Presentation class="w-5 h-5 text-orange-500 shrink-0" />
            <span class="text-sm text-gray-800 truncate flex-1">{{ asset.originalName }}</span>
            <span v-if="asset.status === 'PROCESSING'" class="flex items-center text-xs text-blue-600 shrink-0">
              <Loader2 class="w-3.5 h-3.5 mr-1 animate-spin" />轉換中
            </span>
            <span v-else-if="asset.status === 'FAILED'" class="flex items-center text-xs text-red-600 shrink-0">
              <AlertCircle class="w-3.5 h-3.5 mr-1" />轉換失敗
            </span>
            <span v-else class="text-xs text-gray-400 shrink-0">{{ asset.slideCount }} 頁</span>
          </button>
        </div>
      </div>
    </template>

    <HtmlAssetViewerModal :asset="htmlAsset" @close="htmlAsset = null" />
  </div>
</template>
