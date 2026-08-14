<script setup>
import { computed, ref, watch, onMounted, onUnmounted } from 'vue';
import { Maximize2, Minimize2, X, Pencil } from 'lucide-vue-next';
import { usePresentationStore } from '../../stores/presentation.js';

const presentation = usePresentationStore();
const currentPage = ref(0);
const shellRef = ref(null);
const isFullscreen = ref(false);

function handleEdit() {
  const onEdit = presentation.onEdit;
  presentation.close();
  onEdit?.();
}

async function enterFullscreen() {
  try {
    await shellRef.value?.requestFullscreen?.();
  } catch {
    // Fullscreen can be denied by the browser (e.g. not a direct user gesture); ignore.
  }
}

async function exitFullscreenIfActive() {
  if (!document.fullscreenElement) return;
  try {
    await document.exitFullscreen();
  } catch {
    // Already exiting/exited; ignore.
  }
}

watch(
  () => presentation.isOpen,
  (isOpen) => {
    // requestFullscreen() itself is triggered synchronously from the store's
    // open() action so it stays inside the user-activation window; this just
    // resets the page and tears fullscreen back down on close.
    if (isOpen) currentPage.value = 0;
    else exitFullscreenIfActive();
  },
);

// Running page number across every merged deck, e.g. deck 2's page 1 after a
// 3-page deck 1 is global page 4 — not deck-local page 1.
const globalPageNumber = computed(() => presentation.pagesBeforeCurrentDeck + currentPage.value + 1);

const isAtFirstDeckPage = () => currentPage.value === 0 && !presentation.hasPrevDeck;
const isAtLastDeckPage = () => currentPage.value === presentation.pages.length - 1 && !presentation.hasNextDeck;

function prev() {
  if (currentPage.value > 0) {
    currentPage.value -= 1;
  } else if (presentation.hasPrevDeck) {
    presentation.goToDeck(presentation.deckIndex - 1);
    currentPage.value = presentation.pages.length - 1;
  }
}
function next() {
  if (currentPage.value < presentation.pages.length - 1) {
    currentPage.value += 1;
  } else if (presentation.hasNextDeck) {
    presentation.goToDeck(presentation.deckIndex + 1);
    currentPage.value = 0;
  }
}

async function toggleFullscreen() {
  if (!document.fullscreenElement) await enterFullscreen();
  else await exitFullscreenIfActive();
}

function onFullscreenChange() {
  const wasFullscreen = isFullscreen.value;
  isFullscreen.value = !!document.fullscreenElement;
  // Some browsers swallow the Escape keydown internally while exiting
  // fullscreen, so it never reaches our window keydown listener at all — the
  // only reliable signal that Escape was pressed is this real fullscreenchange
  // event firing. Treat any exit from fullscreen as "leave the presentation".
  if (wasFullscreen && !isFullscreen.value) presentation.close();
}

function handleKeydown(e) {
  if (!presentation.isOpen) return;
  if (e.key === 'ArrowRight') next();
  else if (e.key === 'ArrowLeft') prev();
  // Fallback for when Escape's keydown does reach us (or fullscreen was never
  // active to begin with, e.g. the request was silently denied).
  else if (e.key === 'Escape') presentation.close();
}

function handleSlideClick(e) {
  const link = e.target.closest('a[href]');
  if (!link) return;
  e.preventDefault();
  window.open(link.href, '_blank', 'noopener');
}

watch(
  () => presentation.isOpen,
  (isOpen) => {
    document.body.style.overflow = isOpen ? 'hidden' : 'auto';
  },
);

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
  document.addEventListener('fullscreenchange', onFullscreenChange);
});
onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
  document.removeEventListener('fullscreenchange', onFullscreenChange);
  document.body.style.overflow = 'auto';
});
</script>

<template>
  <div v-if="presentation.isOpen" ref="shellRef" class="presentation-shell fixed inset-0 z-50 flex flex-col">
    <div class="presentation-topbar flex justify-between items-center px-6 py-3 border-b">
      <div class="flex items-center space-x-3">
        <button
          class="presentation-icon-btn p-1.5 rounded-full"
          :title="isFullscreen ? '退出全螢幕' : '全螢幕'"
          @click="toggleFullscreen"
        >
          <Minimize2 v-if="isFullscreen" class="w-5 h-5" />
          <Maximize2 v-else class="w-5 h-5" />
        </button>
        <span class="presentation-title font-medium">{{ presentation.title }}</span>
      </div>
      <div class="flex items-center space-x-4">
        <button
          v-if="presentation.onEdit"
          class="presentation-btn flex items-center px-3 py-1.5 rounded-full text-sm font-medium"
          @click="handleEdit"
        >
          <Pencil class="w-4 h-4 mr-1.5" />
          編輯內容
        </button>
        <button class="presentation-icon-btn p-2 rounded-full" @click="presentation.close">
          <X class="w-6 h-6" />
        </button>
      </div>
    </div>

    <div class="presentation-stage flex-1 relative overflow-hidden">
      <Transition name="slide-fade" mode="out-in">
        <div
          :key="currentPage"
          class="presentation-slide"
          v-html="presentation.pages[currentPage]"
          @click="handleSlideClick"
        ></div>
      </Transition>
    </div>

    <div class="presentation-navbar flex items-center justify-between px-6 py-3 border-t">
      <button class="presentation-nav-btn" :disabled="isAtFirstDeckPage()" @click="prev">← 上一頁</button>
      <div class="flex items-center gap-3">
        <span class="presentation-page-info">{{ globalPageNumber }} / {{ presentation.totalPages }}</span>
        <div class="presentation-progress-bar">
          <div
            class="presentation-progress-fill"
            :style="{ width: (globalPageNumber / presentation.totalPages) * 100 + '%' }"
          ></div>
        </div>
        <span class="presentation-hint hidden md:inline select-none">← → 切換頁面．Esc 關閉簡報</span>
      </div>
      <button
        class="presentation-nav-btn"
        :disabled="isAtLastDeckPage()"
        @click="next"
      >
        下一頁 →
      </button>
    </div>
  </div>
</template>
