<script setup>
import { ref, reactive, computed, nextTick, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Upload as TusUpload } from 'tus-js-client';
import {
  ArrowLeft,
  UploadCloud,
  FileCode,
  Image as ImageIcon,
  Film,
  Presentation,
  Pause,
  Play,
  X,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Link2,
  Code2,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
} from 'lucide-vue-next';
import { useDeepDiveStore } from '../stores/deepDive.js';
import { TUS_UPLOAD_ENDPOINT } from '../api/deepDive.js';
import { todayISO } from '../utils/date.js';

const route = useRoute();
const router = useRouter();
const deepDive = useDeepDiveStore();

const PERIOD_RE = /^\d{4}-\d{2}-\d{2}$/;
const date = PERIOD_RE.test(route.query.period) ? route.query.period : todayISO();

const isInitialLoading = ref(true);
const isDragging = ref(false);
const fileInput = ref(null);
const copiedAssetId = ref(null);
const copiedMarkdownAssetId = ref(null);
const lightboxIndex = ref(null);
const lightboxRootRef = ref(null);
const currentLightboxAsset = computed(() =>
  lightboxIndex.value !== null ? deepDive.byType('IMAGE')[lightboxIndex.value] : null,
);

const EXT_TO_TYPE = {
  html: 'HTML',
  htm: 'HTML',
  png: 'IMAGE',
  jpg: 'IMAGE',
  jpeg: 'IMAGE',
  gif: 'IMAGE',
  webp: 'IMAGE',
  mp4: 'VIDEO',
  webm: 'VIDEO',
  m4v: 'VIDEO',
  mov: 'VIDEO',
  pptx: 'PPTX',
};
const TYPE_META = {
  HTML: { label: 'HTML', icon: FileCode },
  IMAGE: { label: '圖片', icon: ImageIcon },
  VIDEO: { label: '影片', icon: Film },
  PPTX: { label: 'PPTX', icon: Presentation },
};

// In-flight uploads keyed by a local id, separate from deepDive.assets
// (which only reflects uploads the server has already finalized).
const uploads = reactive([]);
let nextUploadKey = 0;

onMounted(async () => {
  try {
    await deepDive.loadAssets(date);
    deepDive.startPolling(date);
  } finally {
    isInitialLoading.value = false;
  }
});
onUnmounted(() => {
  deepDive.stopPolling();
});

function assetTypeForFile(file) {
  const ext = file.name.split('.').pop()?.toLowerCase();
  return EXT_TO_TYPE[ext] || null;
}

function triggerFilePicker() {
  fileInput.value?.click();
}

function handleFileInputChange(e) {
  addFiles(Array.from(e.target.files || []));
  e.target.value = '';
}

function handleDrop(e) {
  isDragging.value = false;
  addFiles(Array.from(e.dataTransfer?.files || []));
}

function addFiles(files) {
  for (const file of files) {
    const assetType = assetTypeForFile(file);
    const entry = reactive({
      key: nextUploadKey++,
      file,
      assetType,
      progress: 0,
      status: assetType ? 'uploading' : 'error',
      errorMessage: assetType ? '' : '不支援的檔案類型（僅支援 HTML／圖片／影片／PPTX）',
      tusUpload: null,
    });
    uploads.push(entry);
    if (assetType) startUpload(entry);
  }
}

function startUpload(entry) {
  const upload = new TusUpload(entry.file, {
    endpoint: TUS_UPLOAD_ENDPOINT,
    chunkSize: 5 * 1024 * 1024,
    retryDelays: [0, 1000, 3000, 5000],
    metadata: {
      filename: entry.file.name,
      filetype: entry.file.type || 'application/octet-stream',
      meetingDate: date,
      assetType: entry.assetType,
    },
    onProgress(bytesSent, bytesTotal) {
      entry.progress = bytesTotal > 0 ? Math.round((bytesSent / bytesTotal) * 100) : 0;
    },
    onSuccess() {
      entry.status = 'done';
      entry.progress = 100;
      deepDive.loadAssets(date).then(() => deepDive.startPolling(date));
    },
    onError(err) {
      entry.status = 'error';
      entry.errorMessage = err.message || '上傳失敗';
    },
  });
  entry.tusUpload = upload;

  // Resume-across-reload: tus-js-client fingerprints the file+options and
  // persists progress in localStorage, so a matching previous (incomplete)
  // upload for the same file picks up from its last accepted byte offset
  // instead of restarting from zero.
  upload.findPreviousUploads().then((previousUploads) => {
    if (previousUploads.length > 0) upload.resumeFromPreviousUpload(previousUploads[0]);
    upload.start();
  });
}

function pauseUpload(entry) {
  entry.tusUpload?.abort();
  entry.status = 'paused';
}

function resumeUpload(entry) {
  entry.status = 'uploading';
  entry.tusUpload?.start();
}

function cancelUpload(entry) {
  entry.tusUpload?.abort(true);
  const idx = uploads.indexOf(entry);
  if (idx !== -1) uploads.splice(idx, 1);
}

function dismissUpload(entry) {
  const idx = uploads.indexOf(entry);
  if (idx !== -1) uploads.splice(idx, 1);
}

async function removeAsset(asset) {
  if (!confirm(`確定要刪除「${asset.originalName}」嗎？`)) return;
  try {
    await deepDive.deleteAsset(date, asset.id);
  } catch {
    // deepDive.error already set for display
  }
}

async function openLightbox(index) {
  lightboxIndex.value = index;
  await nextTick();
  // Real browser Fullscreen API — same reasoning as HtmlAssetViewerModal:
  // makes ESC close the viewer reliably via the UA-level fullscreen
  // shortcut, not just a fixed-position overlay.
  try {
    await lightboxRootRef.value?.requestFullscreen?.();
  } catch {
    // Denied (no user-activation left, disabled by embedder policy, etc.)
    // — the fixed inset-0 overlay below still covers the viewport.
  }
}
function closeLightbox() {
  if (document.fullscreenElement) document.exitFullscreen();
  lightboxIndex.value = null;
}
function handleLightboxFullscreenChange() {
  if (!document.fullscreenElement && lightboxIndex.value !== null) lightboxIndex.value = null;
}
document.addEventListener('fullscreenchange', handleLightboxFullscreenChange);
onUnmounted(() => {
  document.removeEventListener('fullscreenchange', handleLightboxFullscreenChange);
});

function lightboxPrev() {
  if (lightboxIndex.value > 0) lightboxIndex.value -= 1;
}
function lightboxNext() {
  const images = deepDive.byType('IMAGE');
  if (lightboxIndex.value < images.length - 1) lightboxIndex.value += 1;
}

function absoluteUrl(asset) {
  return asset ? window.location.origin + asset.url : '';
}

// navigator.clipboard is only defined in a secure context (https, or
// localhost) — this app is commonly reached over plain http via a LAN IP,
// where it's undefined and writeText() would throw silently. Fall back to
// the old execCommand('copy') trick via a hidden textarea in that case.
async function copyToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fall through to the execCommand fallback below
    }
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  document.body.removeChild(textarea);
  return ok;
}

async function copyLink(asset) {
  await copyToClipboard(absoluteUrl(asset));
  copiedAssetId.value = asset.id;
  setTimeout(() => {
    if (copiedAssetId.value === asset.id) copiedAssetId.value = null;
  }, 1500);
}

// The report Markdown's own video syntax (see personalReportTemplate.js and
// the AI layout prompts) — copied ready to paste into a report so the
// presenter never has to hand-assemble it around the raw link.
async function copyVideoMarkdown(asset) {
  const title = asset.originalName.replace(/\.[^.]+$/, '') || '影片';
  await copyToClipboard(`!video[${title}](${absoluteUrl(asset)})`);
  copiedMarkdownAssetId.value = asset.id;
  setTimeout(() => {
    if (copiedMarkdownAssetId.value === asset.id) copiedMarkdownAssetId.value = null;
  }, 1500);
}

function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function goBack() {
  router.push(`/meeting-status?period=${date}`);
}
</script>

<template>
  <div v-if="isInitialLoading" class="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
    <p class="text-sm text-gray-500">載入中...</p>
  </div>

  <div v-else class="space-y-6">
    <div>
      <button class="flex items-center text-xs text-gray-500 hover:text-blue-600 transition-colors mb-2" @click="goBack">
        <ArrowLeft class="w-3.5 h-3.5 mr-1.5" />
        返回整體進度
      </button>
      <h1 class="text-lg font-bold text-gray-900">Deep Dive & 技術分享｜{{ date }}</h1>
      <p class="mt-1 text-sm text-gray-500">
        上傳 HTML、圖片、影片、PPTX 檔案，稍後可在成果展示中瀏覽與播放；圖片與影片也可複製連結貼進雙週報。
      </p>
    </div>

    <p v-if="deepDive.error" class="text-sm text-red-600">{{ deepDive.error }}</p>

    <div
      class="rounded-xl border-2 border-dashed p-10 text-center transition-colors cursor-pointer"
      :class="isDragging ? 'border-blue-400 bg-blue-50' : 'border-gray-300 bg-white hover:border-blue-300'"
      @click="triggerFilePicker"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="handleDrop"
    >
      <UploadCloud class="w-8 h-8 mx-auto text-gray-400 mb-2" />
      <p class="text-sm text-gray-600">拖拉檔案到這裡，或點擊選擇檔案</p>
      <p class="mt-1 text-xs text-gray-400">
        支援 .html / .png .jpg .gif .webp / .mp4 .webm .m4v .mov / .pptx，支援大檔案續傳
      </p>
      <p class="mt-0.5 text-xs text-gray-400">影片建議用 mp4 (H.264) 或 webm，瀏覽器相容性最好</p>
      <input ref="fileInput" type="file" multiple class="hidden" @change="handleFileInputChange" />
    </div>

    <div v-if="uploads.length > 0" class="space-y-2">
      <div
        v-for="entry in uploads"
        :key="entry.key"
        class="bg-white rounded-lg border border-gray-200 p-3 flex items-center gap-3"
      >
        <component :is="TYPE_META[entry.assetType]?.icon || FileCode" class="w-5 h-5 text-gray-400 shrink-0" />
        <div class="min-w-0 flex-1">
          <p class="text-sm text-gray-800 truncate">{{ entry.file.name }}</p>
          <div v-if="entry.status === 'error'" class="text-xs text-red-600 mt-0.5">{{ entry.errorMessage }}</div>
          <div v-else class="w-full bg-gray-100 rounded-full h-1.5 mt-1.5">
            <div
              class="h-1.5 rounded-full transition-all"
              :class="entry.status === 'done' ? 'bg-green-500' : 'bg-blue-500'"
              :style="{ width: `${entry.progress}%` }"
            ></div>
          </div>
        </div>
        <span v-if="entry.status === 'done'" class="text-green-600 shrink-0"><CheckCircle2 class="w-4 h-4" /></span>
        <template v-else-if="entry.status !== 'error'">
          <button
            class="p-1.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 shrink-0"
            :title="entry.status === 'paused' ? '繼續' : '暫停'"
            @click="entry.status === 'paused' ? resumeUpload(entry) : pauseUpload(entry)"
          >
            <Play v-if="entry.status === 'paused'" class="w-4 h-4" />
            <Pause v-else class="w-4 h-4" />
          </button>
          <button class="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 shrink-0" title="取消" @click="cancelUpload(entry)">
            <X class="w-4 h-4" />
          </button>
        </template>
        <button v-else class="p-1.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 shrink-0" title="關閉" @click="dismissUpload(entry)">
          <X class="w-4 h-4" />
        </button>
      </div>
    </div>

    <div v-for="type in ['HTML', 'IMAGE', 'VIDEO', 'PPTX']" :key="type">
      <h3 class="text-sm font-bold text-gray-700 mb-2 flex items-center">
        <component :is="TYPE_META[type].icon" class="w-4 h-4 mr-1.5 text-gray-400" />
        {{ TYPE_META[type].label }}
      </h3>
      <div v-if="deepDive.byType(type).length === 0" class="text-xs text-gray-400 mb-4">尚未上傳</div>

      <div v-else-if="type === 'IMAGE'" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
        <div
          v-for="(asset, index) in deepDive.byType('IMAGE')"
          :key="asset.id"
          class="bg-white rounded-xl border border-gray-200 overflow-hidden group"
        >
          <button type="button" class="block w-full aspect-video bg-gray-50" @click="openLightbox(index)">
            <img :src="asset.url" :alt="asset.originalName" class="w-full h-full object-cover" />
          </button>
          <div class="p-2 flex items-center gap-1">
            <span class="text-xs text-gray-600 truncate flex-1">{{ asset.originalName }}</span>
            <button
              type="button"
              class="p-1 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 shrink-0"
              title="複製連結"
              @click="copyLink(asset)"
            >
              <Check v-if="copiedAssetId === asset.id" class="w-3.5 h-3.5 text-green-600" />
              <Link2 v-else class="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              class="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 shrink-0"
              title="刪除"
              @click="removeAsset(asset)"
            >
              <Trash2 class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <!-- Videos are served straight off the static mount (Range-capable), so a
           real <video> element doubles as the thumbnail and the preview player. -->
      <div v-else-if="type === 'VIDEO'" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        <div
          v-for="asset in deepDive.byType('VIDEO')"
          :key="asset.id"
          class="bg-white rounded-xl border border-gray-200 overflow-hidden"
        >
          <video
            :src="asset.url"
            controls
            preload="metadata"
            playsinline
            class="block w-full aspect-video bg-black"
          ></video>
          <div class="p-2 flex items-center gap-1">
            <div class="min-w-0 flex-1">
              <p class="text-xs text-gray-600 truncate">{{ asset.originalName }}</p>
              <p class="text-[11px] text-gray-400">{{ formatSize(asset.sizeBytes) }}</p>
            </div>
            <button
              type="button"
              class="p-1 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 shrink-0"
              title="複製 Markdown 語法（貼進報告即可）"
              @click="copyVideoMarkdown(asset)"
            >
              <Check v-if="copiedMarkdownAssetId === asset.id" class="w-3.5 h-3.5 text-green-600" />
              <Code2 v-else class="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              class="p-1 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 shrink-0"
              title="複製連結"
              @click="copyLink(asset)"
            >
              <Check v-if="copiedAssetId === asset.id" class="w-3.5 h-3.5 text-green-600" />
              <Link2 v-else class="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              class="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 shrink-0"
              title="刪除"
              @click="removeAsset(asset)"
            >
              <Trash2 class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div v-else class="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 mb-4">
        <div v-for="asset in deepDive.byType(type)" :key="asset.id" class="p-3 flex items-center gap-3">
          <div class="min-w-0 flex-1">
            <p class="text-sm text-gray-800 truncate">{{ asset.originalName }}</p>
            <p class="text-xs text-gray-400 mt-0.5">
              {{ formatSize(asset.sizeBytes) }}
              <span v-if="type === 'PPTX' && asset.status === 'READY'"> ・ {{ asset.slideCount }} 頁</span>
            </p>
            <p v-if="asset.status === 'FAILED'" class="text-xs text-red-600 mt-0.5">{{ asset.errorMessage || '轉換失敗' }}</p>
          </div>
          <span v-if="asset.status === 'PROCESSING'" class="flex items-center text-xs text-blue-600 shrink-0">
            <Loader2 class="w-3.5 h-3.5 mr-1 animate-spin" />轉換中
          </span>
          <span v-else-if="asset.status === 'FAILED'" class="text-red-500 shrink-0"><AlertCircle class="w-4 h-4" /></span>
          <span v-else class="text-green-600 shrink-0"><CheckCircle2 class="w-4 h-4" /></span>
          <a
            v-if="asset.url"
            :href="asset.url"
            :download="asset.originalName"
            class="p-1.5 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 shrink-0"
            title="下載"
          >
            <Download class="w-4 h-4" />
          </a>
          <button class="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 shrink-0" title="刪除" @click="removeAsset(asset)">
            <Trash2 class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>

    <div v-if="lightboxIndex !== null" ref="lightboxRootRef" class="fixed inset-0 z-50 flex flex-col bg-black">
      <div class="flex items-center gap-3 px-6 py-2 bg-gray-900 text-white shrink-0">
        <span class="text-sm font-medium truncate shrink-0 max-w-[30%]">{{ currentLightboxAsset?.originalName }}</span>
        <input
          type="text"
          readonly
          class="flex-1 min-w-0 bg-gray-800 text-gray-300 text-xs px-2 py-1.5 rounded border border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          :value="absoluteUrl(currentLightboxAsset)"
          @click="$event.target.select()"
        />
        <button
          class="p-1.5 rounded hover:bg-white/10 shrink-0"
          title="複製連結"
          @click="copyLink(currentLightboxAsset)"
        >
          <Check v-if="copiedAssetId === currentLightboxAsset?.id" class="w-4 h-4 text-green-400" />
          <Link2 v-else class="w-4 h-4" />
        </button>
        <button class="p-1.5 rounded-full hover:bg-white/10 shrink-0" title="關閉(或按 Esc)" @click="closeLightbox">
          <X class="w-5 h-5" />
        </button>
      </div>
      <div class="flex-1 relative min-h-0 flex items-center justify-center" @click="closeLightbox">
        <button
          v-if="lightboxIndex > 0"
          class="absolute left-4 p-2 rounded-full text-white hover:bg-white/10"
          @click.stop="lightboxPrev"
        >
          <ChevronLeft class="w-6 h-6" />
        </button>
        <img :src="currentLightboxAsset?.url" class="max-w-full max-h-full object-contain" @click.stop />
        <button
          v-if="lightboxIndex < deepDive.byType('IMAGE').length - 1"
          class="absolute right-4 p-2 rounded-full text-white hover:bg-white/10"
          @click.stop="lightboxNext"
        >
          <ChevronRight class="w-6 h-6" />
        </button>
      </div>
    </div>
  </div>
</template>
