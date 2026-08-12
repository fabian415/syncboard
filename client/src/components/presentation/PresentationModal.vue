<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { Maximize2, X, ChevronLeft, ChevronRight, Pencil } from 'lucide-vue-next';
import { usePresentationStore } from '../../stores/presentation.js';

const presentation = usePresentationStore();
const currentPage = ref(0);

function handleEdit() {
  const onEdit = presentation.onEdit;
  presentation.close();
  onEdit?.();
}

watch(
  () => presentation.isOpen,
  (isOpen) => {
    if (isOpen) currentPage.value = 0;
  },
);

function prev() {
  currentPage.value = Math.max(currentPage.value - 1, 0);
}
function next() {
  currentPage.value = Math.min(currentPage.value + 1, presentation.pages.length - 1);
}

function handleKeydown(e) {
  if (!presentation.isOpen) return;
  if (e.key === 'ArrowRight') next();
  else if (e.key === 'ArrowLeft') prev();
  else if (e.key === 'Escape') presentation.close();
}

watch(
  () => presentation.isOpen,
  (isOpen) => {
    document.body.style.overflow = isOpen ? 'hidden' : 'auto';
  },
);

onMounted(() => window.addEventListener('keydown', handleKeydown));
onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
  document.body.style.overflow = 'auto';
});
</script>

<template>
  <div v-if="presentation.isOpen" class="fixed inset-0 z-50 flex flex-col bg-gray-900 text-white">
    <div class="flex justify-between items-center px-6 py-4 bg-gray-900/80 backdrop-blur-sm border-b border-gray-800">
      <div class="flex items-center space-x-3">
        <Maximize2 class="text-gray-400 w-5 h-5" />
        <span class="font-medium text-gray-200">{{ presentation.title }}</span>
      </div>
      <div class="flex items-center space-x-6">
        <span class="text-sm font-mono text-gray-400 bg-gray-800 px-3 py-1 rounded-full">
          Page {{ currentPage + 1 }} / {{ presentation.pages.length }}
        </span>
        <button
          v-if="presentation.onEdit"
          class="flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-gray-800 hover:bg-gray-700 text-gray-200 transition-colors"
          @click="handleEdit"
        >
          <Pencil class="w-4 h-4 mr-1.5" />
          編輯內容
        </button>
        <button class="p-2 hover:bg-gray-800 rounded-full transition-colors group" @click="presentation.close">
          <X class="w-6 h-6 text-gray-400 group-hover:text-white" />
        </button>
      </div>
    </div>

    <div class="flex-1 flex items-center justify-center bg-gray-950 p-4 md:p-6 relative overflow-hidden">
      <Transition name="slide-fade" mode="out-in">
        <div
          :key="currentPage"
          class="presentation-slide"
          v-html="presentation.pages[currentPage]"
        ></div>
      </Transition>

      <button
        :disabled="currentPage === 0"
        class="absolute left-3 md:left-6 top-1/2 -translate-y-1/2 p-4 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-all"
        :class="currentPage === 0 ? 'opacity-0 pointer-events-none' : 'opacity-100 hover:scale-110'"
        @click="prev"
      >
        <ChevronLeft class="w-8 h-8" />
      </button>
      <button
        :disabled="currentPage === presentation.pages.length - 1"
        class="absolute right-3 md:right-6 top-1/2 -translate-y-1/2 p-4 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-all"
        :class="currentPage === presentation.pages.length - 1 ? 'opacity-0 pointer-events-none' : 'opacity-100 hover:scale-110'"
        @click="next"
      >
        <ChevronRight class="w-8 h-8" />
      </button>
    </div>

    <div class="flex items-center justify-center gap-4 py-3 bg-gray-900/80 backdrop-blur-sm border-t border-gray-800">
      <div class="flex items-center gap-2">
        <button
          v-for="(_, i) in presentation.pages"
          :key="i"
          class="rounded-full transition-all"
          :class="i === currentPage ? 'w-6 h-2 bg-blue-500' : 'w-2 h-2 bg-gray-600 hover:bg-gray-500'"
          @click="currentPage = i"
        ></button>
      </div>
      <span class="text-xs text-gray-500 ml-2 select-none">← → 切換頁面．Esc 關閉</span>
    </div>
  </div>
</template>

<style scoped>
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.slide-fade-enter-from {
  opacity: 0;
  transform: translateX(16px) scale(0.98);
}
.slide-fade-leave-to {
  opacity: 0;
  transform: translateX(-16px) scale(0.98);
}
</style>
