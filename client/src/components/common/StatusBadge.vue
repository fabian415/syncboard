<script setup>
import { CheckCircle2 } from 'lucide-vue-next';

defineProps({
  status: { type: String, required: true }, // 'DRAFTING' | 'SUBMITTED'
});
</script>

<template>
  <span
    v-if="status === 'SUBMITTED'"
    class="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full bg-green-50 text-green-700 border border-green-200"
  >
    <CheckCircle2 class="w-3.5 h-3.5 mr-1" /> 已提交
  </span>
  <span
    v-else
    class="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200"
  >
    草稿中
  </span>
</template>
