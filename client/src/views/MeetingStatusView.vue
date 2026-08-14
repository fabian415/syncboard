<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { CalendarClock, Sparkles, PlayCircle, Pencil } from 'lucide-vue-next';
import { useMeetingStatusStore } from '../stores/meetingStatus.js';
import { usePresentationStore } from '../stores/presentation.js';
import { useUiStore } from '../stores/ui.js';
import { todayISO } from '../utils/date.js';
import { serializeSlides } from '../utils/slides.js';
import { buildMeetingStatusTemplate } from '../constants/meetingStatusTemplate.js';
import MarkdownEditor from '../components/rd/MarkdownEditor.vue';
import HtmlSourceEditor from '../components/rd/HtmlSourceEditor.vue';

const route = useRoute();
const meetingStatus = useMeetingStatusStore();
const presentation = usePresentationStore();
const ui = useUiStore();

const PERIOD_RE = /^\d{4}-\d{2}-\d{2}$/;
const date = PERIOD_RE.test(route.query.period) ? route.query.period : todayISO();

const draft = ref('');
const saveMessage = ref('');
const isInitialLoading = ref(true);
const showHtmlEditor = ref(false);
const htmlDraft = ref('');
const htmlSaveMessage = ref('');
const isSavingHtml = ref(false);

const hasUnsavedChanges = computed(() => draft.value !== meetingStatus.markdown);

onMounted(async () => {
  try {
    await meetingStatus.load(date);
    draft.value = meetingStatus.markdown || buildMeetingStatusTemplate({ date });
    if (meetingStatus.htmlPages) htmlDraft.value = serializeSlides(meetingStatus.htmlPages);
  } finally {
    isInitialLoading.value = false;
  }
});

watch(
  () => meetingStatus.htmlPages,
  (pages) => {
    htmlDraft.value = pages ? serializeSlides(pages) : '';
  },
);

async function handleSave() {
  saveMessage.value = '';
  try {
    await meetingStatus.saveMarkdown(draft.value);
    saveMessage.value = '已儲存';
    setTimeout(() => (saveMessage.value = ''), 2000);
  } catch {
    // meetingStatus.error already set for display
  }
}

function openHtmlEditor() {
  htmlDraft.value = meetingStatus.htmlPages ? serializeSlides(meetingStatus.htmlPages) : '';
  showHtmlEditor.value = true;
}

async function saveHtmlDraft() {
  isSavingHtml.value = true;
  htmlSaveMessage.value = '';
  try {
    await meetingStatus.saveHtml(htmlDraft.value);
    htmlSaveMessage.value = '已儲存';
    setTimeout(() => (htmlSaveMessage.value = ''), 2000);
  } catch {
    // meetingStatus.error already set for display
  } finally {
    isSavingHtml.value = false;
  }
}

function playPresentation() {
  if (!meetingStatus.htmlPages) return;
  presentation.open(meetingStatus.htmlPages, `會議總覽簡報｜${date}`, openHtmlEditor);
}

async function handleGenerate() {
  if (ui.isLoading) return;
  ui.start('✨ AI 正在依會議總覽整理簡報...');
  try {
    await meetingStatus.saveMarkdown(draft.value);
    const pages = await meetingStatus.refactor();
    presentation.open(pages, `會議總覽簡報｜${date}`, openHtmlEditor);
  } catch {
    // meetingStatus.error already set for display
  } finally {
    ui.stop();
  }
}
</script>

<template>
  <div v-if="isInitialLoading" class="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
    <p class="text-sm text-gray-500">載入中...</p>
  </div>

  <div v-else class="h-[calc(100vh-8rem)] flex flex-col space-y-3">
    <div class="flex items-center justify-between flex-wrap gap-2">
      <h1 class="text-lg font-bold text-gray-900 flex items-center">
        <CalendarClock class="w-5 h-5 mr-2 text-gray-400" />
        會議總覽｜{{ date }}
      </h1>

      <div class="flex items-center gap-2">
        <span v-if="saveMessage" class="text-xs text-green-600">{{ saveMessage }}</span>
        <span v-if="meetingStatus.error" class="text-xs text-red-600">{{ meetingStatus.error }}</span>

        <button
          v-if="meetingStatus.htmlPages"
          class="flex items-center px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 font-medium text-xs"
          @click="playPresentation"
        >
          <PlayCircle class="w-3.5 h-3.5 mr-1.5" />
          預覽簡報
        </button>

        <button
          class="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 font-medium text-xs disabled:opacity-60"
          :disabled="meetingStatus.isSaving || ui.isLoading"
          @click="handleSave"
        >
          {{ meetingStatus.isSaving ? '儲存中...' : '儲存' }}
        </button>

        <button
          class="relative group overflow-hidden rounded-lg p-[1.5px] disabled:opacity-60 disabled:pointer-events-none"
          :disabled="ui.isLoading"
          @click="handleGenerate"
        >
          <span class="absolute inset-0 bg-gradient-to-r from-blue-500 via-teal-500 to-green-500 rounded-lg opacity-70 group-hover:opacity-100 transition-opacity duration-300 animate-pulse"></span>
          <div class="relative flex items-center px-3.5 py-1.5 bg-white rounded-md group-hover:bg-opacity-95 transition-all duration-300">
            <Sparkles class="w-4 h-4 mr-1.5 text-teal-600 group-hover:scale-110 transition-transform" />
            <span class="font-bold text-sm bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-teal-600">
              AI 產生會議簡報
            </span>
          </div>
        </button>
      </div>
    </div>

    <p v-if="hasUnsavedChanges" class="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
      有尚未儲存的變更，簡報預覽可能還是舊內容；按「AI 產生會議簡報」會先自動儲存草稿再重新產生。
    </p>

    <button
      v-if="meetingStatus.htmlPages && !showHtmlEditor"
      class="flex items-center text-xs text-gray-500 hover:text-blue-600 transition-colors self-start"
      @click="openHtmlEditor"
    >
      <Pencil class="w-3.5 h-3.5 mr-1.5" />
      編輯簡報 HTML
    </button>

    <div v-if="showHtmlEditor" class="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-3">
      <div class="flex items-center justify-between">
        <h4 class="text-sm font-bold text-gray-700">編輯簡報 HTML</h4>
        <div class="flex items-center space-x-3">
          <span v-if="htmlSaveMessage" class="text-sm text-green-600">{{ htmlSaveMessage }}</span>
          <button
            class="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 text-sm font-medium disabled:opacity-60"
            :disabled="isSavingHtml"
            @click="saveHtmlDraft"
          >
            {{ isSavingHtml ? '儲存中...' : '儲存' }}
          </button>
          <button class="px-3 py-1.5 rounded-lg text-gray-500 hover:text-gray-700 text-sm font-medium" @click="showHtmlEditor = false">
            收合
          </button>
        </div>
      </div>
      <HtmlSourceEditor v-model="htmlDraft" />
    </div>

    <MarkdownEditor v-model="draft" />
  </div>
</template>
