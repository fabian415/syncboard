<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import * as membersApi from '../api/members.js';
import { todayISO } from '../utils/date.js';

const route = useRoute();
const router = useRouter();
const members = ref([]);
const isLoading = ref(true);
const error = ref('');

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
      <button
        v-for="member in members"
        :key="member.id"
        class="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all p-5 flex items-center space-x-3 text-left"
        @click="openReport(member)"
      >
        <div class="h-11 w-11 shrink-0 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 border border-gray-300 flex items-center justify-center text-gray-700 font-bold">
          {{ member.name.charAt(0) }}
        </div>
        <div>
          <div class="font-bold text-gray-900">{{ member.name }}</div>
          <div class="text-xs text-gray-500">{{ member.role === 'MANAGER' ? '專案主管' : 'RD' }}</div>
        </div>
      </button>
    </div>
  </div>
</template>
