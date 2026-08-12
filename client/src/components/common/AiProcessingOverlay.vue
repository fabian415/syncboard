<script setup>
import { Sparkles } from 'lucide-vue-next';
import { useUiStore } from '../../stores/ui.js';

const ui = useUiStore();
</script>

<template>
  <div v-if="ui.isLoading" class="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm">
    <div class="bg-white rounded-2xl p-8 max-w-sm w-full flex flex-col items-center shadow-2xl text-center">
      <div class="relative w-20 h-20 mb-6">
        <div class="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
        <div class="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
        <Sparkles class="absolute inset-0 m-auto w-8 h-8 text-blue-600 animate-pulse" />
      </div>
      <h3 class="text-xl font-bold text-gray-900 mb-2">處理中</h3>
      <p class="text-gray-500">{{ ui.message }}</p>
    </div>
  </div>
</template>
