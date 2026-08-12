<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { Folder } from 'lucide-vue-next';

const props = defineProps({
  project: { type: Object, required: true },
  period: { type: String, required: true },
});

const router = useRouter();

const progress = computed(() =>
  props.project.memberCount > 0 ? (props.project.submittedCount / props.project.memberCount) * 100 : 0,
);

function open() {
  router.push(`/projects/${props.project.id}?period=${props.period}`);
}
</script>

<template>
  <div
    class="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300 cursor-pointer transition-all p-6 group flex flex-col h-full"
    @click="open"
  >
    <div class="flex justify-between items-start mb-4">
      <div class="p-3 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
        <Folder class="w-6 h-6" />
      </div>
      <span v-if="project.tag" class="px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
        {{ project.tag }}
      </span>
    </div>
    <h3 class="text-xl font-bold text-gray-900 mb-2">{{ project.name }}</h3>
    <p class="text-sm text-gray-500 mb-6 flex-1">{{ project.description }}</p>

    <div>
      <div class="flex justify-between text-sm text-gray-600 mb-2">
        <span>本期繳交進度</span>
        <span class="font-medium">{{ project.submittedCount }} / {{ project.memberCount }}</span>
      </div>
      <div class="w-full bg-gray-100 rounded-full h-2">
        <div
          class="h-2 rounded-full"
          :class="progress === 100 ? 'bg-green-500' : 'bg-blue-500'"
          :style="{ width: `${progress}%` }"
        ></div>
      </div>
    </div>
  </div>
</template>
