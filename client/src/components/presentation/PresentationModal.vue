<script setup>
import { computed, ref, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { X, Pencil } from 'lucide-vue-next';
import { usePresentationStore } from '../../stores/presentation.js';
import { findSlideIndexContaining } from '../../utils/slides.js';

const presentation = usePresentationStore();
const currentPage = ref(0);
const stageRef = ref(null);
// Gates slide rendering until the first auto-pagination pass has run, so the
// viewer never flashes unpaginated (potentially overflowing) content.
const paginated = ref(false);

function runAutoPaginate() {
  const stage = stageRef.value;
  if (!stage) return;
  presentation.autoPaginate({ width: stage.clientWidth, height: stage.clientHeight });
  if (currentPage.value > presentation.pages.length - 1) {
    currentPage.value = Math.max(0, presentation.pages.length - 1);
  }
}

let resizeTimer = null;
function handleResize() {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(runAutoPaginate, 150);
}

function handleEdit() {
  const onEdit = presentation.onEdit;
  presentation.close();
  onEdit?.();
}

watch(
  () => presentation.isOpen,
  async (isOpen) => {
    if (!isOpen) {
      paginated.value = false;
      window.removeEventListener('resize', handleResize);
      return;
    }
    currentPage.value = 0;
    paginated.value = false;
    await nextTick();
    runAutoPaginate();
    if (presentation.initialQuery) {
      const matchIndex = findSlideIndexContaining(presentation.pages, presentation.initialQuery);
      if (matchIndex !== -1) currentPage.value = matchIndex;
    }
    paginated.value = true;
    window.addEventListener('resize', handleResize);
  },
);

// Running page number across every merged deck, e.g. deck 2's page 1 after a
// 3-page deck 1 is global page 4 — not deck-local page 1.
const globalPageNumber = computed(() => presentation.pagesBeforeCurrentDeck + currentPage.value + 1);

// Each page's own <h1> (if any) is shown in the topbar instead of inline in
// the slide body, so it stays put while the body scrolls/paginates.
const currentSlideTitle = computed(() => {
  const html = presentation.pages[currentPage.value];
  const match = html?.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  return match ? match[1] : '';
});

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

function handleKeydown(e) {
  if (!presentation.isOpen) return;
  if (e.key === 'ArrowRight') next();
  else if (e.key === 'ArrowLeft') prev();
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
});
onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
  window.removeEventListener('resize', handleResize);
  clearTimeout(resizeTimer);
  document.body.style.overflow = 'auto';
});
</script>

<template>
  <div v-if="presentation.isOpen" class="presentation-shell fixed inset-0 z-50 flex flex-col">
    <div class="presentation-topbar flex justify-between items-center px-6 py-1.5 border-b">
      <div class="flex items-center space-x-3">
        <span class="presentation-title font-medium">{{ presentation.title }}</span>
        <span v-if="currentSlideTitle" class="presentation-title-sep">›</span>
        <span
          v-if="currentSlideTitle"
          class="presentation-title presentation-slide-title font-medium"
          v-html="currentSlideTitle"
        ></span>
      </div>
      <div class="flex items-center space-x-4">
        <button
          v-if="presentation.onEdit"
          class="presentation-btn flex items-center px-3 py-1 rounded-full text-sm font-medium"
          @click="handleEdit"
        >
          <Pencil class="w-4 h-4 mr-1.5" />
          編輯內容
        </button>
        <button class="presentation-icon-btn p-1.5 rounded-full" @click="presentation.close">
          <X class="w-5 h-5" />
        </button>
      </div>
    </div>

    <div ref="stageRef" class="presentation-stage flex-1 relative overflow-hidden">
      <Transition v-if="paginated" name="slide-fade" mode="out-in">
        <div
          :key="currentPage"
          class="presentation-slide"
          v-html="presentation.pages[currentPage]"
          @click="handleSlideClick"
        ></div>
      </Transition>
    </div>

    <div class="presentation-navbar flex items-center justify-between px-6 py-1.5 border-t">
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
