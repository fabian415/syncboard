<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ArrowLeft, Users, Pencil } from 'lucide-vue-next';
import { useProjectsStore } from '../stores/projects.js';
import { usePresentationStore } from '../stores/presentation.js';
import { useUiStore } from '../stores/ui.js';
import * as combinedApi from '../api/combined.js';
import * as reportsApi from '../api/reports.js';
import { todayISO, coverageStartFor } from '../utils/date.js';
import { serializeSlides } from '../utils/slides.js';
import CombineBanner from '../components/manager/CombineBanner.vue';
import MemberReportRow from '../components/manager/MemberReportRow.vue';
import HtmlSourceEditor from '../components/rd/HtmlSourceEditor.vue';

const route = useRoute();
const router = useRouter();
const projects = useProjectsStore();
const presentation = usePresentationStore();
const ui = useUiStore();

const PERIOD_RE = /^\d{4}-\d{2}-\d{2}$/;
const date = PERIOD_RE.test(route.query.period) ? route.query.period : todayISO();
const coverageStart = coverageStartFor(date);
const projectId = route.params.projectId;
const combinedPages = ref(null);
const combinedError = ref('');

const showCombinedEditor = ref(false);
const combinedHtmlDraft = ref('');
const combinedSaveMessage = ref('');
const isSavingCombined = ref(false);

const members = computed(() => projects.detail?.members ?? []);
const uploadedMembers = computed(() => members.value.filter((m) => m.updatedAt != null));
const submittedCount = computed(() => members.value.filter((m) => m.status === 'SUBMITTED').length);

onMounted(async () => {
  await projects.loadDetail(projectId, date);
  const combined = await combinedApi.getCombined(projectId, date);
  combinedPages.value = combined.pages;
});

function openCombinedEditor() {
  combinedHtmlDraft.value = combinedPages.value ? serializeSlides(combinedPages.value) : '';
  showCombinedEditor.value = true;
}

async function saveCombinedHtml() {
  isSavingCombined.value = true;
  combinedSaveMessage.value = '';
  combinedError.value = '';
  try {
    combinedPages.value = await combinedApi.saveCombinedHtml(projectId, date, combinedHtmlDraft.value);
    combinedSaveMessage.value = '已儲存';
    setTimeout(() => (combinedSaveMessage.value = ''), 2000);
  } catch (err) {
    combinedError.value = err.response?.data?.error || '儲存失敗';
  } finally {
    isSavingCombined.value = false;
  }
}

function playCombined() {
  if (!combinedPages.value) return;
  presentation.open(combinedPages.value, `專案彙總報告 - ${projects.detail?.name}`, openCombinedEditor);
}

async function regenerateCombined() {
  if (ui.isLoading) return;
  combinedError.value = '';
  ui.start('🧠 AI 正在統整所有成員進度，生成專案總結...');
  try {
    combinedPages.value = await combinedApi.combineProject(projectId, date);
    presentation.open(combinedPages.value, `專案彙總報告 - ${projects.detail?.name}`, openCombinedEditor);
  } catch (err) {
    combinedError.value = err.response?.data?.error || '彙整失敗';
  } finally {
    ui.stop();
  }
}

async function previewMember(member) {
  try {
    const { htmlPages } = await reportsApi.getMemberReport(projectId, member.userId, date);
    presentation.open(htmlPages, `${member.name} 的簡報`, () =>
      router.push(`/projects/${projectId}/members/${member.userId}?tab=html&period=${date}`),
    );
  } catch (err) {
    combinedError.value = err.response?.data?.error || '載入簡報失敗';
  }
}

function editMember(member) {
  router.push(`/projects/${projectId}/members/${member.userId}?period=${date}`);
}
</script>

<template>
  <div class="space-y-8">
    <div class="flex items-center space-x-4">
      <button class="p-2 -ml-2 rounded-full hover:bg-gray-200 text-gray-600 transition-colors" @click="router.push(`/projects?period=${date}`)">
        <ArrowLeft class="w-5 h-5" />
      </button>
      <div>
        <h1 class="text-2xl font-bold text-gray-900 flex items-center">
          {{ projects.detail?.name }}
          <span class="text-gray-400 mx-2">|</span>
          {{ coverageStart }} ~ {{ date }} 進度
        </h1>
      </div>
    </div>

    <p v-if="projects.error || combinedError" class="text-sm text-red-600">{{ projects.error || combinedError }}</p>

    <p v-if="projects.isLoading && !projects.detail" class="text-sm text-gray-500">載入中...</p>

    <template v-if="projects.detail">
      <div class="space-y-3">
        <CombineBanner
          :has-pages="!!combinedPages"
          :submitted-count="submittedCount"
          :disabled="ui.isLoading"
          @play="playCombined"
          @regenerate="regenerateCombined"
        />
        <button
          v-if="combinedPages && !showCombinedEditor"
          class="flex items-center text-sm text-gray-500 hover:text-blue-600 transition-colors"
          @click="openCombinedEditor"
        >
          <Pencil class="w-3.5 h-3.5 mr-1.5" />
          編輯彙總簡報 HTML
        </button>

        <div v-if="showCombinedEditor" class="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-3">
          <div class="flex items-center justify-between">
            <h4 class="text-sm font-bold text-gray-700">編輯彙總簡報 HTML</h4>
            <div class="flex items-center space-x-3">
              <span v-if="combinedSaveMessage" class="text-sm text-green-600">{{ combinedSaveMessage }}</span>
              <button
                class="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 text-sm font-medium disabled:opacity-60"
                :disabled="isSavingCombined"
                @click="saveCombinedHtml"
              >
                {{ isSavingCombined ? '儲存中...' : '儲存' }}
              </button>
              <button
                class="px-3 py-1.5 rounded-lg text-gray-500 hover:text-gray-700 text-sm font-medium"
                @click="showCombinedEditor = false"
              >
                收合
              </button>
            </div>
          </div>
          <HtmlSourceEditor v-model="combinedHtmlDraft" />
        </div>
      </div>

      <div>
        <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center">
          <Users class="w-5 h-5 mr-2 text-gray-500" />
          團隊成員報告詳情
        </h3>
        <div v-if="uploadedMembers.length === 0" class="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-sm text-gray-500">
          目前還沒有成員上傳本期報告。
        </div>
        <div v-else class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div class="grid grid-cols-1 divide-y divide-gray-200">
            <MemberReportRow
              v-for="member in uploadedMembers"
              :key="member.userId"
              :member="member"
              @preview="previewMember"
              @edit="editMember"
            />
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
