<script setup>
import { computed } from 'vue';
import { CheckCircle2 } from 'lucide-vue-next';

const props = defineProps({
  icon: { type: [Object, Function], required: true },
  tag: { type: String, default: '' },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  progress: { type: Object, default: null }, // { current, total }
  filled: { type: Boolean, default: null }, // true/false renders a filled/empty status pill
  disabled: { type: Boolean, default: false },
  disabledBadge: { type: String, default: '即將推出' },
});

const emit = defineEmits(['click']);

const progressPercent = computed(() =>
  props.progress && props.progress.total > 0 ? (props.progress.current / props.progress.total) * 100 : 0,
);

function handleClick() {
  if (props.disabled) return;
  emit('click');
}
</script>

<template>
  <div
    class="rounded-xl border shadow-sm p-6 flex flex-col h-full transition-all"
    :class="
      disabled
        ? 'bg-gray-50 border-gray-200 opacity-70 cursor-not-allowed'
        : 'bg-white border-gray-200 hover:shadow-md hover:border-blue-300 cursor-pointer group'
    "
    @click="handleClick"
  >
    <div class="flex justify-between items-start mb-4">
      <div
        class="p-3 rounded-lg transition-colors"
        :class="disabled ? 'bg-gray-100 text-gray-400' : 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'"
      >
        <component :is="icon" class="w-6 h-6" />
      </div>
      <span
        v-if="disabled"
        class="px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-500 rounded-full"
      >
        {{ disabledBadge }}
      </span>
      <span v-else-if="tag" class="px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
        {{ tag }}
      </span>
    </div>

    <h3 class="text-xl font-bold text-gray-900 mb-2">{{ title }}</h3>
    <p class="text-sm text-gray-500 mb-6 flex-1">{{ description }}</p>

    <div v-if="progress">
      <div class="flex justify-between text-sm text-gray-600 mb-2">
        <span>本期繳交進度</span>
        <span class="font-medium">{{ progress.current }} / {{ progress.total }}</span>
      </div>
      <div class="w-full bg-gray-100 rounded-full h-2">
        <div
          class="h-2 rounded-full"
          :class="progressPercent === 100 ? 'bg-green-500' : 'bg-blue-500'"
          :style="{ width: `${progressPercent}%` }"
        ></div>
      </div>
    </div>

    <div v-else-if="filled !== null">
      <span
        v-if="filled"
        class="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full bg-green-50 text-green-700 border border-green-200"
      >
        <CheckCircle2 class="w-3.5 h-3.5 mr-1" /> 已填寫
      </span>
      <span
        v-else
        class="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200"
      >
        尚未填寫
      </span>
    </div>
  </div>
</template>
