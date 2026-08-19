<script setup>
import { Check, ChevronRight } from 'lucide-vue-next';

// state: 'default' (not yet played) | 'current' (presentation open right now) | 'done' (played to the last slide)
defineProps({
  icon: { type: [Object, Function], required: true },
  title: { type: String, required: true },
  tag: { type: String, default: '' },
  description: { type: String, default: '' },
  state: { type: String, default: 'default' },
});
defineEmits(['click']);
</script>

<template>
  <button
    type="button"
    class="w-full flex items-center gap-4 px-5 py-4 text-left rounded-xl border transition-all group"
    :class="{
      'bg-blue-50 border-blue-400 ring-2 ring-blue-200': state === 'current',
      'bg-gray-800 border-gray-800 hover:border-gray-600': state === 'done',
      'bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm': state === 'default',
    }"
    @click="$emit('click')"
  >
    <div
      class="p-2.5 rounded-lg transition-colors shrink-0"
      :class="
        state === 'done'
          ? 'bg-gray-700 text-gray-300'
          : 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'
      "
    >
      <component :is="icon" class="w-5 h-5" />
    </div>
    <div class="min-w-0 flex-1">
      <div class="flex items-center gap-2">
        <h3 class="font-bold" :class="state === 'done' ? 'text-white' : 'text-gray-900'">{{ title }}</h3>
        <span
          v-if="tag"
          class="px-2 py-0.5 text-xs font-medium rounded-full"
          :class="state === 'done' ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-600'"
        >
          {{ tag }}
        </span>
        <span
          v-if="state === 'done'"
          class="px-2 py-0.5 text-xs font-medium bg-emerald-500/20 text-emerald-300 rounded-full inline-flex items-center gap-1"
        >
          <Check class="w-3 h-3" />已播放完畢
        </span>
        <span v-else-if="state === 'current'" class="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
          播放中
        </span>
      </div>
      <p class="text-sm mt-0.5" :class="state === 'done' ? 'text-gray-400' : 'text-gray-500'">{{ description }}</p>
    </div>
    <ChevronRight
      class="w-5 h-5 shrink-0 transition-colors"
      :class="state === 'done' ? 'text-gray-500' : 'text-gray-300 group-hover:text-blue-500'"
    />
  </button>
</template>
