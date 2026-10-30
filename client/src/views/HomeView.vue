<script setup>
import { useRouter } from 'vue-router';
import { Sparkles, PackageOpen, ArrowRight } from 'lucide-vue-next';
import MeetingDateGate from '../components/common/MeetingDateGate.vue';

const router = useRouter();

function onConfirmDate(date) {
  router.push(`/showcase?period=${date}`);
}
</script>

<template>
  <div class="flex flex-col items-center pt-8 pb-4 space-y-8">
    <div class="text-center space-y-3 max-w-xl">
      <div class="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-teal-500 flex items-center justify-center shadow-lg shadow-blue-600/20">
        <Sparkles class="w-7 h-7 text-white" />
      </div>
      <h1 class="text-3xl font-bold text-gray-900 tracking-tight">歡迎回來，SyncBoard</h1>
      <p class="text-sm text-gray-500">
        會議簡報平台：撰寫條列式進度，AI 自動整理成全螢幕簡報，專案成員一起同步本期狀態。
      </p>
    </div>

    <MeetingDateGate
      heading="選擇會議日期"
      subheading="請先選擇要查看的會議日期，即可進入成果展示與我的報告。"
      @confirm="onConfirmDate"
    />

    <router-link
      to="/export"
      class="flex items-center w-full max-w-lg px-5 py-4 bg-white rounded-xl border border-gray-200 shadow-sm hover:border-blue-300 hover:shadow-md transition-all"
    >
      <PackageOpen class="w-5 h-5 mr-3 text-blue-600 shrink-0" />
      <div class="flex-1">
        <div class="font-bold text-gray-700">報告打包下載</div>
        <div class="text-xs text-gray-500">依日期區間與成員，打包下載個人報告與各專案簡報</div>
      </div>
      <ArrowRight class="w-4 h-4 text-gray-400" />
    </router-link>
  </div>
</template>
