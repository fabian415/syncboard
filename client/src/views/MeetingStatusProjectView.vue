<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ArrowLeft, Users, FileText, Clock, Pencil, Code2, CheckCircle2 } from 'lucide-vue-next';
import { useMeetingStatusStore } from '../stores/meetingStatus.js';
import { useProjectsStore } from '../stores/projects.js';
import { usePresentationStore } from '../stores/presentation.js';
import * as reportsApi from '../api/reports.js';
import { todayISO } from '../utils/date.js';
import MemberReportRow from '../components/manager/MemberReportRow.vue';

const route = useRoute();
const router = useRouter();
const meetingStatus = useMeetingStatusStore();
const projects = useProjectsStore();
const presentation = usePresentationStore();

const PERIOD_RE = /^\d{4}-\d{2}-\d{2}$/;
const date = PERIOD_RE.test(route.query.period) ? route.query.period : todayISO();
const projectId = route.params.projectId;
const sectionKey = `project-${projectId}`;

const isLoading = ref(true);
const memberError = ref('');

const uploadedMembers = computed(() => (projects.detail?.members ?? []).filter((m) => m.updatedAt != null));
const sectionHasContent = computed(() => !!meetingStatus.section?.markdown?.trim());
const sectionUpdatedAt = computed(() => meetingStatus.section?.updatedAt ?? null);

onMounted(async () => {
  try {
    await Promise.all([projects.loadDetail(projectId, date), meetingStatus.loadSection(date, sectionKey)]);
  } finally {
    isLoading.value = false;
  }
});

function goBack() {
  router.push(`/meeting-status?period=${date}`);
}

function openEditor() {
  router.push(`/meeting-status/projects/${projectId}/edit?period=${date}`);
}

function openHtmlEditor() {
  router.push(`/meeting-status/projects/${projectId}/edit?period=${date}&html=1`);
}

function playPresentation() {
  if (!meetingStatus.sectionHtmlPages) return;
  presentation.open(meetingStatus.sectionHtmlPages, `${projects.detail?.name}｜${date}`, openHtmlEditor, {
    editLabel: '編輯HTML內容',
  });
}

async function previewMember(member) {
  memberError.value = '';
  try {
    const { htmlPages } = await reportsApi.getMemberReport(projectId, member.userId, date);
    presentation.open(htmlPages, `${member.name} 的簡報`, () =>
      router.push(`/projects/${projectId}/members/${member.userId}?tab=html&period=${date}`),
    );
  } catch (err) {
    memberError.value = err.response?.data?.error || '載入簡報失敗';
  }
}

function editMember(member) {
  router.push(`/projects/${projectId}/members/${member.userId}?period=${date}`);
}
</script>

<template>
  <div v-if="isLoading" class="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
    <p class="text-sm text-gray-500">載入中...</p>
  </div>

  <div v-else class="space-y-6">
    <div>
      <button class="flex items-center text-xs text-gray-500 hover:text-blue-600 transition-colors mb-2" @click="goBack">
        <ArrowLeft class="w-3.5 h-3.5 mr-1.5" />
        返回整體進度
      </button>
      <h1 class="text-lg font-bold text-gray-900">{{ projects.detail?.name }}｜{{ date }}</h1>
    </div>

    <p v-if="projects.error || meetingStatus.error" class="text-sm text-red-600">{{ projects.error || meetingStatus.error }}</p>

    <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div class="p-5 flex items-center justify-between">
        <div class="flex items-center space-x-4 text-left">
          <div class="h-10 w-10 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 flex items-center justify-center text-blue-600">
            <FileText class="w-5 h-5" />
          </div>
          <div>
            <h4 class="text-base font-bold text-gray-900">專案進度</h4>
            <div class="flex items-center text-sm text-gray-500 mt-0.5">
              <Clock class="w-3.5 h-3.5 mr-1" />
              <span>{{ sectionUpdatedAt ? new Date(sectionUpdatedAt).toLocaleString() : '尚未填寫' }}</span>
            </div>
          </div>
        </div>

        <div class="flex items-center space-x-4">
          <span
            v-if="sectionHasContent"
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
          <button
            class="px-4 py-2 border rounded-lg text-sm font-medium transition-colors"
            :class="
              meetingStatus.sectionHtmlPages
                ? 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                : 'border-transparent text-gray-400 bg-gray-50 cursor-default'
            "
            :disabled="!meetingStatus.sectionHtmlPages"
            @click="playPresentation"
          >
            簡報放映
          </button>
          <button
            class="flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            @click="openEditor"
          >
            <Pencil class="w-3.5 h-3.5 mr-1.5" />
            編輯內容
          </button>
          <button
            class="flex items-center px-4 py-2 border rounded-lg text-sm font-medium transition-colors"
            :class="
              meetingStatus.sectionHtmlPages
                ? 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                : 'border-transparent text-gray-400 bg-gray-50 cursor-default'
            "
            :disabled="!meetingStatus.sectionHtmlPages"
            @click="openHtmlEditor"
          >
            <Code2 class="w-3.5 h-3.5 mr-1.5" />
            編輯HTML內容
          </button>
        </div>
      </div>
    </div>

    <div>
      <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center">
        <Users class="w-5 h-5 mr-2 text-gray-500" />
        團隊成員報告
      </h3>
      <p v-if="memberError" class="text-sm text-red-600 mb-2">{{ memberError }}</p>
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
  </div>
</template>
