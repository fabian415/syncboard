<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ArrowLeft, Sparkles, PlayCircle, Pencil } from 'lucide-vue-next';
import { useMeetingStatusStore } from '../stores/meetingStatus.js';
import { useProjectsStore } from '../stores/projects.js';
import { usePresentationStore } from '../stores/presentation.js';
import { useUiStore } from '../stores/ui.js';
import { todayISO } from '../utils/date.js';
import { serializeSlides } from '../utils/slides.js';
import { buildFollowUpTemplate, buildProjectSectionTemplate } from '../constants/meetingStatusTemplate.js';
import MarkdownEditor from '../components/rd/MarkdownEditor.vue';
import HtmlSourceEditor from '../components/rd/HtmlSourceEditor.vue';

const route = useRoute();
const router = useRouter();
const meetingStatus = useMeetingStatusStore();
const projects = useProjectsStore();
const presentation = usePresentationStore();
const ui = useUiStore();

const PERIOD_RE = /^\d{4}-\d{2}-\d{2}$/;
const date = PERIOD_RE.test(route.query.period) ? route.query.period : todayISO();

const projectId = route.params.projectId ?? null;
const sectionKey = projectId ? `project-${projectId}` : 'follow-up';
const backTo = projectId ? `/meeting-status/projects/${projectId}?period=${date}` : `/meeting-status?period=${date}`;

const draft = ref('');
const isInitialLoading = ref(true);
const saveMessage = ref('');
const showHtmlEditor = ref(false);
const htmlDraft = ref('');
const htmlSaveMessage = ref('');
const isSavingHtml = ref(false);

const title = computed(() => (projectId ? projects.detail?.name ?? '' : 'Follow-up'));
// Landing here via a query-string ?html=1 link is permanently HTML-only (no
// way back to markdown short of leaving the page); toggling showHtmlEditor
// on from the in-page "編輯簡報 HTML" link/presentation callback is the same
// exclusive view but with a way back, since there's a markdown draft to return to.
const isHtmlOnlyMode = computed(() => !!route.query.html);
const htmlEditorActive = computed(() => isHtmlOnlyMode.value || showHtmlEditor.value);

onMounted(async () => {
  try {
    const tasks = [meetingStatus.loadSection(date, sectionKey)];
    if (projectId) tasks.push(projects.loadDetail(projectId, date));
    await Promise.all(tasks);

    if (meetingStatus.section?.markdown) {
      draft.value = meetingStatus.section.markdown;
    } else if (projectId) {
      draft.value = buildProjectSectionTemplate({ projectName: projects.detail?.name ?? '' });
    } else {
      draft.value = buildFollowUpTemplate();
    }
    if (meetingStatus.sectionHtmlPages) htmlDraft.value = serializeSlides(meetingStatus.sectionHtmlPages);
  } finally {
    isInitialLoading.value = false;
  }
});

watch(
  () => meetingStatus.sectionHtmlPages,
  (pages) => {
    htmlDraft.value = pages ? serializeSlides(pages) : '';
  },
);

async function handleSave() {
  saveMessage.value = '';
  try {
    await meetingStatus.saveSection(date, sectionKey, draft.value);
    saveMessage.value = '已儲存';
    setTimeout(() => (saveMessage.value = ''), 2000);
  } catch {
    // meetingStatus.error already set for display
  }
}

function openHtmlEditor() {
  htmlDraft.value = meetingStatus.sectionHtmlPages ? serializeSlides(meetingStatus.sectionHtmlPages) : '';
  showHtmlEditor.value = true;
}

async function saveHtmlDraft() {
  isSavingHtml.value = true;
  htmlSaveMessage.value = '';
  try {
    await meetingStatus.saveSectionHtml(date, sectionKey, htmlDraft.value);
    htmlSaveMessage.value = '已儲存';
    setTimeout(() => (htmlSaveMessage.value = ''), 2000);
  } catch {
    // meetingStatus.error already set for display
  } finally {
    isSavingHtml.value = false;
  }
}

function playPresentation() {
  if (!meetingStatus.sectionHtmlPages) return;
  presentation.open(meetingStatus.sectionHtmlPages, `${title.value}｜${date}`, openHtmlEditor, {
    editLabel: '編輯HTML內容',
  });
}

async function handleGenerate() {
  if (ui.isLoading) return;
  ui.start(projectId ? '✨ AI 正在整理這個專案的投影片...' : '✨ AI 正在整理 Follow-up 投影片...');
  try {
    await meetingStatus.saveSection(date, sectionKey, draft.value);
    const pages = await meetingStatus.refactorSection(date, sectionKey);
    presentation.open(pages, `${title.value}｜${date}`, openHtmlEditor, { editLabel: '編輯HTML內容' });
  } catch {
    // meetingStatus.error already set for display
  } finally {
    ui.stop();
  }
}

function goBack() {
  router.push(backTo);
}
</script>

<template>
  <div v-if="isInitialLoading" class="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
    <p class="text-sm text-gray-500">載入中...</p>
  </div>

  <div v-else class="flex-1 min-h-0 flex flex-col space-y-3">
    <div class="flex items-center justify-between flex-wrap gap-2">
      <div>
        <button class="flex items-center text-xs text-gray-500 hover:text-blue-600 transition-colors mb-2" @click="goBack">
          <ArrowLeft class="w-3.5 h-3.5 mr-1.5" />
          返回
        </button>
        <h1 class="text-lg font-bold text-gray-900">{{ title }}｜{{ date }}</h1>
      </div>
      <div class="flex items-center gap-2">
        <span v-if="htmlEditorActive ? htmlSaveMessage : saveMessage" class="text-xs text-green-600">
          {{ htmlEditorActive ? htmlSaveMessage : saveMessage }}
        </span>
        <span v-if="meetingStatus.error" class="text-xs text-red-600">{{ meetingStatus.error }}</span>

        <button
          v-if="meetingStatus.sectionHtmlPages"
          class="flex items-center px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 font-medium text-xs"
          @click="playPresentation"
        >
          <PlayCircle class="w-3.5 h-3.5 mr-1.5" />
          簡報放映
        </button>

        <button
          class="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 font-medium text-xs disabled:opacity-60"
          :disabled="htmlEditorActive ? isSavingHtml : meetingStatus.isSaving"
          @click="htmlEditorActive ? saveHtmlDraft() : handleSave()"
        >
          {{ (htmlEditorActive ? isSavingHtml : meetingStatus.isSaving) ? '儲存中...' : '儲存' }}
        </button>

        <button
          v-if="!htmlEditorActive"
          class="relative group overflow-hidden rounded-lg p-[1.5px] disabled:opacity-60 disabled:pointer-events-none"
          :disabled="ui.isLoading"
          @click="handleGenerate"
        >
          <span class="absolute inset-0 bg-gradient-to-r from-blue-500 via-teal-500 to-green-500 rounded-lg opacity-70 group-hover:opacity-100 transition-opacity duration-300 animate-pulse"></span>
          <div class="relative flex items-center px-3.5 py-1.5 bg-white rounded-md group-hover:bg-opacity-95 transition-all duration-300">
            <Sparkles class="w-4 h-4 mr-1.5 text-teal-600 group-hover:scale-110 transition-transform" />
            <span class="font-bold text-sm bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-teal-600">
              產生投影片
            </span>
          </div>
        </button>
      </div>
    </div>

    <template v-if="htmlEditorActive">
      <button
        v-if="!isHtmlOnlyMode"
        class="flex items-center text-xs text-gray-500 hover:text-blue-600 transition-colors self-start"
        @click="showHtmlEditor = false"
      >
        <ArrowLeft class="w-3.5 h-3.5 mr-1.5" />
        返回 Markdown 編輯
      </button>
      <div class="flex-1 min-h-0 flex flex-col">
        <HtmlSourceEditor v-model="htmlDraft" />
      </div>
    </template>

    <template v-else>
      <button
        v-if="meetingStatus.sectionHtmlPages"
        class="flex items-center text-xs text-gray-500 hover:text-blue-600 transition-colors self-start"
        @click="openHtmlEditor"
      >
        <Pencil class="w-3.5 h-3.5 mr-1.5" />
        編輯簡報 HTML
      </button>

      <div class="flex-1 min-h-0 flex flex-col">
        <MarkdownEditor v-model="draft" />
      </div>
    </template>
  </div>
</template>
