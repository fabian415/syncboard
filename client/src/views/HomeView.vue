<script setup>
import { useRouter } from 'vue-router';
import { Sparkles } from 'lucide-vue-next';
import MeetingDateGate from '../components/common/MeetingDateGate.vue';

const router = useRouter();

function onConfirmDate(date) {
  router.push(`/projects?period=${date}`);
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
      subheading="請先選擇要查看的會議日期，即可進入專案列表與我的報告。"
      @confirm="onConfirmDate"
    />
  </div>
</template>
