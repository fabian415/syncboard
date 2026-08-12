<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { Sparkles } from 'lucide-vue-next';
import { todayISO } from '../../utils/date.js';

const route = useRoute();
const PERIOD_RE = /^\d{4}-\d{2}-\d{2}$/;

const showNav = computed(() => route.name !== 'home');
const period = computed(() => (PERIOD_RE.test(route.query.period) ? route.query.period : todayISO()));
</script>

<template>
  <header class="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
      <router-link to="/" class="flex items-center space-x-2 hover:opacity-80 transition-opacity">
        <div class="bg-blue-600 p-1.5 rounded-lg">
          <Sparkles class="w-5 h-5 text-white" />
        </div>
        <span class="text-xl font-bold text-gray-900 tracking-tight">SyncBoard</span>
      </router-link>
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
