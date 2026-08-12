<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { Sparkles } from 'lucide-vue-next';
import { todayISO } from '../../utils/date.js';
import { getVersionInfo } from '../../api/version.js';

const route = useRoute();
const PERIOD_RE = /^\d{4}-\d{2}-\d{2}$/;

const NO_NAV_ROUTES = ['home', 'release-notes'];
const showNav = computed(() => !NO_NAV_ROUTES.includes(route.name));
const period = computed(() => (PERIOD_RE.test(route.query.period) ? route.query.period : todayISO()));

const version = ref('');

onMounted(async () => {
  try {
    const info = await getVersionInfo();
    version.value = info.version;
  } catch {
    // 版本資訊非核心功能，讀取失敗時安靜忽略
  }
});
</script>

<template>
  <header class="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
      <div class="flex items-center space-x-2">
        <router-link to="/" class="flex items-center space-x-2 hover:opacity-80 transition-opacity">
          <div class="bg-blue-600 p-1.5 rounded-lg">
            <Sparkles class="w-5 h-5 text-white" />
          </div>
          <span class="text-xl font-bold text-gray-900 tracking-tight">SyncBoard</span>
        </router-link>
        <router-link
          v-if="version"
          to="/release-notes"
          class="text-xs font-mono text-gray-400 hover:text-blue-600 hover:bg-blue-50 px-1.5 py-0.5 rounded transition-colors"
          title="查看更新紀錄"
        >
          v{{ version }}
        </router-link>
      </div>
      <nav v-if="showNav" class="flex items-center space-x-6 text-sm font-medium">
        <router-link :to="`/projects?period=${period}`" class="text-gray-500 hover:text-gray-900 transition-colors" active-class="text-blue-600">
          專案列表
        </router-link>
        <router-link :to="`/members?period=${period}`" class="text-gray-500 hover:text-gray-900 transition-colors" active-class="text-blue-600">
          我的報告
        </router-link>
      </nav>
    </div>
  </header>
</template>
