<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Download, Loader2 } from 'lucide-vue-next';
import * as membersApi from '../api/members.js';
import { todayISO } from '../utils/date.js';

const route = useRoute();
const router = useRouter();
const members = ref([]);
const isLoading = ref(true);
const error = ref('');
const downloadingId = ref(null);

const PERIOD_RE = /^\d{4}-\d{2}-\d{2}$/;
const selectedDate = PERIOD_RE.test(route.query.period) ? route.query.period : todayISO();

onMounted(async () => {
  try {
    members.value = await membersApi.listMembers();
  } catch (err) {
    error.value = err.response?.data?.error || '載入成員名單失敗';
  } finally {
    isLoading.value = false;
  }
});

function openReport(member) {
  router.push(`/members/${member.id}/report?period=${selectedDate}`);
}

function filenameFromDisposition(disposition, fallback) {
  if (!disposition) return fallback;
  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match) return decodeURIComponent(utf8Match[1]);
  const plainMatch = disposition.match(/filename="?([^";]+)"?/i);
  return plainMatch ? plainMatch[1] : fallback;
}

async function downloadArchive(member) {
  if (downloadingId.value) return;
  downloadingId.value = member.id;
  error.value = '';
  try {
    const res = await membersApi.downloadReportsArchive(member.id);
    const filename = filenameFromDisposition(res.headers['content-disposition'], `${member.name}-meeting-reports.zip`);
    const url = URL.createObjectURL(new Blob([res.data], { type: 'application/zip' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    let message = '下載失敗';
    try {
      const text = await err.response?.data?.text?.();
      message = text ? JSON.parse(text).error : message;
    } catch {
      // response wasn't JSON, fall back to default message
    }
    error.value = message;
  } finally {
    downloadingId.value = null;
  }
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">個人報告上傳</h1>
      <p class="mt-1 text-sm text-gray-500">會議日期：{{ selectedDate }}｜請選擇您的名字填寫該期雙週報。</p>
    </div>

    <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

    <p v-if="isLoading" class="text-sm text-gray-500">載入中...</p>

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      <div
        v-for="member in members"
        :key="member.id"
        class="relative bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all"
      >
        <button class="w-full p-5 flex items-center space-x-3 text-left" @click="openReport(member)">
          <div class="h-11 w-11 shrink-0 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 border border-gray-300 flex items-center justify-center text-gray-700 font-bold">
            {{ member.name.charAt(0) }}
          </div>
          <div>
            <div class="font-bold text-gray-900">{{ member.name }}</div>
            <div class="text-xs text-gray-500">{{ member.role === 'MANAGER' ? '專案主管' : 'RD' }}</div>
          </div>
        </button>
        <button
          class="absolute top-3 right-3 p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
          title="下載歷來會議 Markdown（zip）"
          :disabled="downloadingId === member.id"
          @click.stop="downloadArchive(member)"
        >
          <Loader2 v-if="downloadingId === member.id" class="h-4 w-4 animate-spin" />
          <Download v-else class="h-4 w-4" />
        </button>
      </div>
    </div>
  </div>
</template>
