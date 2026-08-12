<script setup>
import { Sparkles, GitMerge, RefreshCw } from 'lucide-vue-next';

defineProps({
  hasPages: { type: Boolean, required: true },
  submittedCount: { type: Number, required: true },
  disabled: { type: Boolean, default: false },
});

defineEmits(['play', 'regenerate']);
</script>

<template>
  <div class="bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900 rounded-2xl shadow-lg p-1 relative overflow-hidden">
    <div class="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full blur-3xl opacity-20 -mr-20 -mt-20"></div>
    <div class="bg-slate-900/50 backdrop-blur-sm rounded-xl p-8 relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
      <div class="text-white flex-1">
        <div class="flex items-center space-x-2 mb-3">
          <Sparkles class="w-5 h-5 text-teal-400" />
          <span class="text-teal-400 font-semibold tracking-wide text-sm">DeviceOn 團隊</span>
        </div>
        <h2 class="text-3xl font-bold mb-2">專案進度的彙總報告</h2>
        <!-- <p class="text-gray-300">
          AI 已自動分析 {{ submittedCount }} 位成員提交的報告，並萃取出本期的核心進度、阻礙事項與下一步。
        </p> -->
      </div>

      <div class="flex flex-col items-stretch gap-3 shrink-0">
        <button v-if="hasPages" class="relative group overflow-hidden rounded-xl p-[2px]" :disabled="disabled" @click="$emit('play')">
          <span class="absolute inset-0 bg-gradient-to-r from-teal-400 via-blue-500 to-purple-600 rounded-xl opacity-80 group-hover:opacity-100 transition-opacity duration-300 animate-pulse"></span>
          <div class="relative flex items-center px-8 py-4 bg-slate-900 rounded-lg group-hover:bg-slate-800 transition-all duration-300">
            <GitMerge class="w-6 h-6 mr-3 text-teal-400 group-hover:scale-110 transition-transform" />
            <span class="font-bold text-lg text-white">播放 AI 彙總簡報</span>
          </div>
        </button>
        <button
          v-else
          class="relative group overflow-hidden rounded-xl p-[2px]"
          :disabled="disabled || submittedCount === 0"
          @click="$emit('regenerate')"
        >
          <span class="absolute inset-0 bg-gradient-to-r from-teal-400 via-blue-500 to-purple-600 rounded-xl opacity-80 group-hover:opacity-100 transition-opacity duration-300 animate-pulse"></span>
          <div class="relative flex items-center px-8 py-4 bg-slate-900 rounded-lg group-hover:bg-slate-800 transition-all duration-300 disabled:opacity-50">
            <GitMerge class="w-6 h-6 mr-3 text-teal-400 group-hover:scale-110 transition-transform" />
            <span class="font-bold text-lg text-white">產生彙總簡報</span>
          </div>
        </button>

        <button
          v-if="hasPages"
          class="flex items-center justify-center text-sm text-gray-300 hover:text-white transition-colors disabled:opacity-50"
          :disabled="disabled"
          @click="$emit('regenerate')"
        >
          <RefreshCw class="w-3.5 h-3.5 mr-1.5" />
          重新產生
        </button>
      </div>
    </div>
  </div>
</template>
