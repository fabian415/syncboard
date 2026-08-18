<script setup>
import { ref, watch, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { Search } from 'lucide-vue-next';
import * as searchApi from '../../api/search.js';
import * as reportsApi from '../../api/reports.js';
import * as meetingStatusApi from '../../api/meetingStatus.js';
import { usePresentationStore } from '../../stores/presentation.js';

const router = useRouter();
const presentation = usePresentationStore();

const query = ref('');
const results = ref([]);
const isOpen = ref(false);
const isLoading = ref(false);
const isOpening = ref(false);

let debounceTimer = null;
let requestId = 0;

async function runSearch(trimmed, thisRequestId) {
  try {
    const data = await searchApi.search(trimmed);
    if (thisRequestId !== requestId) return;
    results.value = data;
  } catch {
    if (thisRequestId !== requestId) return;
    results.value = [];
  } finally {
    if (thisRequestId === requestId) isLoading.value = false;
  }
}

watch(query, (value) => {
  clearTimeout(debounceTimer);
  const trimmed = value.trim();
  if (!trimmed) {
    results.value = [];
    isLoading.value = false;
    isOpen.value = false;
    return;
  }
  isOpen.value = true;
  isLoading.value = true;
  requestId += 1;
  const thisRequestId = requestId;
  debounceTimer = setTimeout(() => runSearch(trimmed, thisRequestId), 250);
});

onBeforeUnmount(() => clearTimeout(debounceTimer));

function closeDropdown() {
  isOpen.value = false;
}

// Splits a snippet into plain/matched runs so the template can wrap only the
// matched runs in <mark>, keeping the rest as safely-escaped text nodes.
function highlightSegments(text) {
  const q = query.value.trim();
  if (!q) return [{ text, match: false }];
  const lower = text.toLowerCase();
  const lowerQuery = q.toLowerCase();
  const segments = [];
  let start = 0;
  let idx = lower.indexOf(lowerQuery, start);
  while (idx !== -1) {
    if (idx > start) segments.push({ text: text.slice(start, idx), match: false });
    segments.push({ text: text.slice(idx, idx + q.length), match: true });
    start = idx + q.length;
    idx = lower.indexOf(lowerQuery, start);
  }
  if (start < text.length) segments.push({ text: text.slice(start), match: false });
  return segments;
}

async function selectResult(result) {
  if (isOpening.value) return;
  isOpening.value = true;
  const activeQuery = query.value.trim();
  try {
    if (result.type === 'report') {
      const report = await reportsApi.getMemberReport(result.projectId, result.userId, result.date);
      if (!report.htmlPages) return;
      presentation.open(
        report.htmlPages,
        result.title,
        () => router.push(`/projects/${result.projectId}/members/${result.userId}?period=${result.date}`),
        { query: activeQuery },
      );
    } else if (result.type === 'section') {
      const section = await meetingStatusApi.getSectionPresentation(result.date, result.sectionKey);
      if (!section.pages) return;
      const isFollowUp = result.sectionKey === 'follow-up';
      const onEdit = isFollowUp
        ? () => router.push(`/meeting-status/follow-up?period=${result.date}`)
        : () => router.push(`/meeting-status/projects/${result.projectId}/edit?period=${result.date}`);
      presentation.open(section.pages, result.title, onEdit, { query: activeQuery });
    } else {
      const meeting = await meetingStatusApi.getPresentation(result.date);
      if (!meeting.pages) return;
      presentation.open(meeting.pages, result.title, null, { query: activeQuery });
    }
    closeDropdown();
    query.value = '';
    results.value = [];
  } finally {
    isOpening.value = false;
  }
}
</script>

<template>
  <div class="relative w-full">
    <div class="relative">
      <Search class="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      <input
        v-model="query"
        type="text"
        placeholder="搜尋投影片內容..."
        class="w-full pl-9 pr-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
        @focus="query.trim() && (isOpen = true)"
        @keydown.escape="closeDropdown"
      />
    </div>

    <template v-if="isOpen">
      <div class="fixed inset-0 z-10" @click="closeDropdown"></div>
      <div
        class="absolute left-0 right-0 mt-1 max-h-96 overflow-y-auto bg-white rounded-lg border border-gray-200 shadow-lg z-20 py-1"
      >
        <div v-if="isLoading" class="px-4 py-3 text-sm text-gray-400">搜尋中...</div>
        <div v-else-if="results.length === 0" class="px-4 py-3 text-sm text-gray-400">
          找不到符合「{{ query.trim() }}」的投影片
        </div>
        <button
          v-for="(result, i) in results"
          :key="i"
          type="button"
          class="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 disabled:opacity-50"
          :disabled="isOpening"
          @click="selectResult(result)"
        >
          <div class="flex items-center justify-between gap-2">
            <span class="text-sm font-medium text-gray-900 truncate">{{ result.title }}</span>
            <span class="text-xs text-gray-400 shrink-0">{{ result.subtitle }}</span>
          </div>
          <p class="text-xs text-gray-500 mt-0.5 line-clamp-2">
            <template v-for="(seg, si) in highlightSegments(result.snippet)" :key="si"
              ><mark v-if="seg.match" class="bg-yellow-200 text-gray-900 rounded-sm">{{ seg.text }}</mark
              ><template v-else>{{ seg.text }}</template></template
            >
          </p>
        </button>
      </div>
    </template>
  </div>
</template>
