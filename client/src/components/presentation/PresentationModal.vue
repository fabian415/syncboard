<script setup>
import { computed, ref, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { X, Pencil, PanelLeftClose, PanelLeftOpen, Check } from 'lucide-vue-next';
import { usePresentationStore } from '../../stores/presentation.js';
import { findSlideIndexContaining } from '../../utils/slides.js';

const presentation = usePresentationStore();
const currentPage = ref(0);
const stageRef = ref(null);
// Gates slide rendering until the first auto-pagination pass has run, so the
// viewer never flashes unpaginated (potentially overflowing) content.
const paginated = ref(false);

// Persistent agenda panel — stays mounted across slide/deck changes so
// presenters and audience always know who's up now and who's next.
const outlineOpen = ref(true);
const outlineItemRefs = ref([]);
function setOutlineItemRef(el, index) {
  if (el) outlineItemRefs.value[index] = el;
}
async function toggleOutline() {
  outlineOpen.value = !outlineOpen.value;
  // The stage width changes with the sidebar, so re-run pagination against
  // the new viewport size (same reasoning as the window-resize handler).
  await nextTick();
  runAutoPaginate();
}

// Deck titles come in two shapes: "Physical AI－Alex" (project－presenter,
// used by a project's member playlist) and "Physical AI－Product Overall
// Status" (project－fixed section label, used by the Follow-up queue).
// Whichever half repeats identically across every splittable deck is the
// redundant one: a shared prefix gets hoisted into the panel's header, a
// shared suffix just gets dropped so each row shows only the project name.
const DECK_TITLE_SEP = '－';
function splitDeckTitle(title) {
  const idx = title.indexOf(DECK_TITLE_SEP);
  return idx === -1 ? null : [title.slice(0, idx), title.slice(idx + DECK_TITLE_SEP.length)];
}
const outlineSplit = computed(() => {
  const decks = presentation.decks;
  if (decks.length < 2) return { mode: 'none' };
  const splittable = decks.map((deck) => splitDeckTitle(deck.title)).filter(Boolean);
  if (splittable.length < 2) return { mode: 'none' };
  const [firstPrefix, firstSuffix] = splittable[0];
  if (splittable.every(([prefix]) => prefix === firstPrefix)) return { mode: 'prefix', value: firstPrefix };
  if (splittable.every(([, suffix]) => suffix === firstSuffix)) return { mode: 'suffix', value: firstSuffix };
  return { mode: 'none' };
});
const outlineContext = computed(() => (outlineSplit.value.mode === 'prefix' ? outlineSplit.value.value : ''));
function outlineRowTitle(deck) {
  const parts = splitDeckTitle(deck.title);
  if (!parts) return deck.title;
  const mode = outlineSplit.value.mode;
  if (mode === 'prefix') return parts[1];
  if (mode === 'suffix') return parts[0];
  return deck.title;
}

// Re-pagination is skipped when the measured size hasn't actually changed.
// Without this, opening the modal sets body.style.overflow: hidden, which
// removes the page's scrollbar and widens the viewport — firing a native
// window 'resize' event ~150ms later that re-ran pagination against the
// same final size anyway. That redundant pass replaced presentation.decks
// (new page strings) right as the first next()/prev() transition was
// in flight, which is what ate the page-1-to-2 slide animation.
let lastPaginateSize = null;
function runAutoPaginate() {
  const stage = stageRef.value;
  if (!stage) return;
  const width = stage.clientWidth;
  const height = stage.clientHeight;
  if (lastPaginateSize && lastPaginateSize.width === width && lastPaginateSize.height === height) return;
  lastPaginateSize = { width, height };
  presentation.autoPaginate({ width, height });
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

function jumpToDeck(index) {
  if (index === presentation.deckIndex) return;
  presentation.goToDeck(index);
  currentPage.value = 0;
}

// Keeps the current deck's outline entry scrolled into view as playback
// advances through a long agenda, without yanking focus on manual jumps.
watch(
  () => presentation.deckIndex,
  async () => {
    await nextTick();
    outlineItemRefs.value[presentation.deckIndex]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  },
);

watch(
  () => presentation.isOpen,
  async (isOpen) => {
    if (!isOpen) {
      paginated.value = false;
      window.removeEventListener('resize', handleResize);
      return;
    }
    currentPage.value = 0;
    outlineItemRefs.value = [];
    paginated.value = false;
    lastPaginateSize = null;
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

// The topbar shows the deck title trimmed to just its project/section
// context when the outline is already spelling out who's presenting
// (deck.title's own "－name" suffix), so the two don't repeat each other.
const topbarTitle = computed(() => outlineContext.value || presentation.title);

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
        <button
          v-if="presentation.decks.length > 1"
          class="presentation-icon-btn p-1.5 rounded-full"
          :title="outlineOpen ? '隱藏議程大綱' : '顯示議程大綱'"
          @click="toggleOutline"
        >
          <PanelLeftClose v-if="outlineOpen" class="w-4 h-4" />
          <PanelLeftOpen v-else class="w-4 h-4" />
        </button>
        <span class="presentation-title font-medium">{{ topbarTitle }}</span>
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

    <div class="presentation-body flex-1 flex min-h-0">
      <aside v-if="outlineOpen && presentation.decks.length > 1" class="presentation-outline shrink-0">
        <div class="presentation-outline-header">
          <div class="presentation-outline-eyebrow">Outline</div>
          <!-- <div v-if="outlineContext" class="presentation-outline-context">{{ outlineContext }}</div> -->
        </div>
        <ol class="presentation-outline-list">
          <li
            v-for="(deck, index) in presentation.decks"
            :key="index"
            :ref="(el) => setOutlineItemRef(el, index)"
            class="presentation-outline-item"
            :class="{
              'is-current': index === presentation.deckIndex,
              'is-done': index < presentation.deckIndex,
              'is-next': index === presentation.deckIndex + 1,
            }"
            @click="jumpToDeck(index)"
          >
            <span class="presentation-outline-index">
              <Check v-if="index < presentation.deckIndex" class="w-3 h-3" />
              <template v-else>{{ index + 1 }}</template>
            </span>
            <div class="presentation-outline-text">
              <div class="presentation-outline-title">{{ outlineRowTitle(deck) }}</div>
              <div v-if="index === presentation.deckIndex" class="presentation-outline-meta">
                第 {{ currentPage + 1 }}/{{ presentation.pages.length }} 頁
              </div>
              <div v-else-if="index === presentation.deckIndex + 1" class="presentation-outline-meta presentation-outline-next">
                接下來
              </div>
            </div>
          </li>
        </ol>
      </aside>

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
