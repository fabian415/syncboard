<script setup>
import { ref, onMounted } from 'vue';
import { CalendarDays, ArrowRight, History } from 'lucide-vue-next';
import * as meetingDatesApi from '../../api/meetingDates.js';
import { todayISO } from '../../utils/date.js';

defineProps({
  heading: { type: String, default: '選擇會議日期' },
  subheading: { type: String, default: '請先選擇本次要查看/填寫的會議日期。' },
});
const emit = defineEmits(['confirm']);

const existingDates = ref([]);
const isLoading = ref(true);
const selectedDate = ref(todayISO());

onMounted(async () => {
  try {
    existingDates.value = await meetingDatesApi.listMeetingDates();
  } finally {
    isLoading.value = false;
  }
});

function confirmCustom() {
  if (selectedDate.value) emit('confirm', selectedDate.value);
}
</script>

<template>
  <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-8 max-w-lg space-y-6">
    <div>
      <div class="flex items-center text-gray-700 mb-1">
        <CalendarDays class="w-5 h-5 mr-2 text-blue-600" />
        <h2 class="font-bold">{{ heading }}</h2>
      </div>
      <p class="text-sm text-gray-500">{{ subheading }}</p>
    </div>

    <div v-if="!isLoading && existingDates.length" class="space-y-2">
      <p class="text-xs font-medium text-gray-400 flex items-center">
        <History class="w-3.5 h-3.5 mr-1" />
        已有記錄的會議日期，點擊快速進入
      </p>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="d in existingDates"
          :key="d.date"
          class="px-3 py-1.5 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 text-sm text-gray-700 transition-colors"
          @click="emit('confirm', d.date)"
        >
          {{ d.date }}
          <span class="text-gray-400 ml-1">({{ d.count }})</span>
        </button>
      </div>
    </div>

    <div class="space-y-3 pt-2 border-t border-gray-100">
      <p class="text-xs font-medium text-gray-400">或選擇其他日期</p>
      <div class="flex gap-2">
        <input
          v-model="selectedDate"
          type="date"
          class="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500"
        />
        <button
          class="flex items-center justify-center px-5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:pointer-events-none"
          :disabled="!selectedDate"
          @click="confirmCustom"
        >
          前往
          <ArrowRight class="w-4 h-4 ml-2" />
        </button>
      </div>
    </div>
  </div>
</template>
