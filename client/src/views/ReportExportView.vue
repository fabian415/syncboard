<script setup>
import { ref, computed, onMounted } from 'vue';
import { PackageOpen, Download, Loader2 } from 'lucide-vue-next';
import * as membersApi from '../api/members.js';
import { todayISO } from '../utils/date.js';

const members = ref([]);
const isLoading = ref(true);
const isDownloading = ref(false);
const error = ref('');

function sixMonthsAgoISO() {
  const d = new Date(`${todayISO()}T00:00:00Z`);
  const day = d.getUTCDate();
  // Clamp to the target month's last day so e.g. 08-31 → 02-28, not 03-03.
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() - 6);
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return d.toISOString().slice(0, 10);
}

const startDate = ref(sixMonthsAgoISO());
const endDate = ref(todayISO());
const selectedUserId = ref('');

const rangeInvalid = computed(() => startDate.value && endDate.value && startDate.value > endDate.value);
const canDownload = computed(
  () => selectedUserId.value && startDate.value && endDate.value && !rangeInvalid.value && !isDownloading.value,
);

onMounted(async () => {
  try {
    members.value = await membersApi.listMembers();
  } catch (err) {
    error.value = err.response?.data?.error || '載入成員名單失敗';
  } finally {
    isLoading.value = false;
  }
});

function filenameFromDisposition(disposition, fallback) {
  if (!disposition) return fallback;
  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match) return decodeURIComponent(utf8Match[1]);
  const plainMatch = disposition.match(/filename="?([^";]+)"?/i);
  return plainMatch ? plainMatch[1] : fallback;
}

async function download() {
  if (!canDownload.value) return;
  isDownloading.value = true;
  error.value = '';
  try {
    const res = await membersApi.downloadReportsExport(selectedUserId.value, startDate.value, endDate.value);
    const member = members.value.find((m) => m.id === selectedUserId.value);
    const fallback = `${member?.name ?? 'member'}_${startDate.value}_${endDate.value}.zip`;
    const filename = filenameFromDisposition(res.headers['content-disposition'], fallback);
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
    isDownloading.value = false;
  }
}
</script>

<template>
  <div class="flex flex-col items-center pt-8 pb-4">
    <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-8 w-full max-w-lg space-y-6">
      <div>
        <div class="flex items-center text-gray-700 mb-1">
          <PackageOpen class="w-5 h-5 mr-2 text-blue-600" />
          <h2 class="font-bold">報告打包下載</h2>
        </div>
        <p class="text-sm text-gray-500">
          選擇日期區間與成員，將該成員的個人報告 Markdown，以及各專案下的 report.md 與 presentation.html 一起打包成 zip。
        </p>
      </div>

      <div class="space-y-2">
        <label class="text-xs font-medium text-gray-400">日期區間</label>
        <div class="flex items-center gap-2">
          <input
            v-model="startDate"
            type="date"
            class="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500"
          />
          <span class="text-gray-400">~</span>
          <input
            v-model="endDate"
            type="date"
            class="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500"
          />
        </div>
        <p v-if="rangeInvalid" class="text-xs text-red-600">起始日不可晚於終止日</p>
      </div>

      <div class="space-y-2">
        <label class="text-xs font-medium text-gray-400">成員</label>
        <select
          v-model="selectedUserId"
          :disabled="isLoading"
          class="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl bg-white focus:outline-none focus:border-blue-500"
        >
          <option value="" disabled>{{ isLoading ? '載入中...' : '請選擇成員' }}</option>
          <option v-for="m in members" :key="m.id" :value="m.id">{{ m.name }}</option>
        </select>
      </div>

      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

      <button
        class="w-full flex items-center justify-center py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:pointer-events-none"
        :disabled="!canDownload"
        @click="download"
      >
        <Loader2 v-if="isDownloading" class="w-4 h-4 mr-2 animate-spin" />
        <Download v-else class="w-4 h-4 mr-2" />
        打包下載
      </button>
    </div>
  </div>
</template>
