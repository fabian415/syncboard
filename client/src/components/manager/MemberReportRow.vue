<script setup>
import { Clock } from 'lucide-vue-next';
import StatusBadge from '../common/StatusBadge.vue';

const props = defineProps({
  member: { type: Object, required: true }, // { userId, name, status, hasPresentation, submittedAt }
});

defineEmits(['preview', 'edit']);
</script>

<template>
  <div
    class="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer"
    @click="member.hasPresentation ? $emit('preview', member) : $emit('edit', member)"
  >
    <div class="flex items-center space-x-4 text-left">
      <div class="h-10 w-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 border border-gray-300 flex items-center justify-center text-gray-700 font-bold">
        {{ member.name.charAt(0) }}
      </div>
      <div>
        <h4 class="text-base font-bold text-gray-900 hover:text-blue-600 transition-colors">{{ member.name }}</h4>
        <div v-if="member.submittedAt" class="flex items-center text-sm text-gray-500 mt-0.5">
          <Clock class="w-3.5 h-3.5 mr-1" />
          <span>{{ new Date(member.submittedAt).toLocaleString() }}</span>
        </div>
      </div>
    </div>

    <div class="flex items-center space-x-4">
      <StatusBadge :status="member.status" />
      <span
        class="px-4 py-2 border rounded-lg text-sm font-medium transition-colors"
        :class="
          member.hasPresentation
            ? 'border-gray-300 text-gray-700 bg-white'
            : 'border-transparent text-gray-400 bg-gray-50'
        "
      >
        預覽簡報
      </span>
    </div>
  </div>
</template>
