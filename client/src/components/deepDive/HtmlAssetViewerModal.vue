<script setup>
import { ref, watch, onUnmounted, nextTick } from 'vue';
import { X } from 'lucide-vue-next';

const props = defineProps({
  asset: { type: Object, default: null },
});
const emit = defineEmits(['close']);

const rootRef = ref(null);
const iframeRef = ref(null);

// Keys the uploaded deck's own script is expected to handle for slide nav.
const NAV_KEYS = new Set(['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', ' ', 'Home', 'End']);

// Uploaded HTML is untrusted content — unlike the AI-generated slide
// fragments played via v-html elsewhere in this app, it must never share
// this page's DOM/CSS/JS context. sandbox="allow-scripts" (without
// allow-same-origin) lets the deck's own scripts run but keeps it on an
// opaque origin that can't reach this app's cookies/localStorage/parent
// window — expects a self-contained single-file HTML deck.
//
// That isolation is also why we can't just iframe.focus() our way to
// working arrow keys: an opaque-origin sandboxed frame runs in its own
// Chromium render process, and handing real keyboard-input routing to
// another process is an async, best-effort step a script-triggered
// focus() call doesn't reliably win — some Chrome installs honor it, some
// silently don't, with no way to detect which from here. (Tried serving
// decks from a second, genuinely separate origin so allow-same-origin
// could be added safely — still an out-of-process frame either way, so it
// didn't fix the underlying race. Reverted.)
//
// Rather than fight for iframe focus, lean into the failure mode: our own
// page keeps keyboard focus by default, so listen here and forward nav
// keys into the deck via postMessage. The server injects a small shim into
// every served HTML asset (see deepDiveAssetsMiddleware) that re-dispatches
// them as a normal `keydown` inside the deck's own document, which its
// existing key handler picks up same as a real keypress. If the user
// clicks directly into the iframe, real focus (and real keydown) moves
// there instead and the deck's own listener handles it natively — this
// forwarding just stays quiet in that case.
function forwardKeyToDeck(e) {
  if (!props.asset || !NAV_KEYS.has(e.key)) return;
  // Let a focused button (e.g. the close button below) keep its native
  // Space/Enter activation instead of hijacking it as a slide-nav key.
  if (e.target?.closest?.('button')) return;
  if (!iframeRef.value?.contentWindow) return;
  e.preventDefault();
  iframeRef.value.contentWindow.postMessage({ type: 'syncboard:key', key: e.key, code: e.code }, '*');
}
window.addEventListener('keydown', forwardKeyToDeck);

watch(
  () => props.asset,
  async (asset) => {
    document.body.style.overflow = asset ? 'hidden' : 'auto';
    if (!asset) return;

    await nextTick();
    // Real browser Fullscreen API, not just a fixed-position overlay: this
    // also makes ESC close the deck reliably. The browser's native
    // "ESC exits fullscreen" handling is intercepted at the UA level
    // before any page script sees it, so it fires regardless of which
    // frame currently holds keyboard focus.
    try {
      await rootRef.value?.requestFullscreen?.();
    } catch {
      // Fullscreen can be denied (no user-activation left, disabled by
      // embedder policy, etc.) — the fixed inset-0 overlay below still
      // covers the viewport, so playback isn't blocked either way.
    }
  },
);

function handleFullscreenChange() {
  if (!document.fullscreenElement && props.asset) emit('close');
}
document.addEventListener('fullscreenchange', handleFullscreenChange);
onUnmounted(() => {
  document.removeEventListener('fullscreenchange', handleFullscreenChange);
  window.removeEventListener('keydown', forwardKeyToDeck);
});

function close() {
  if (document.fullscreenElement) document.exitFullscreen();
  emit('close');
}
</script>

<template>
  <div v-if="asset" ref="rootRef" class="fixed inset-0 z-50 flex flex-col bg-black/80">
    <div class="flex items-center justify-between px-6 py-2 bg-gray-900 text-white shrink-0">
      <span class="text-sm font-medium truncate">{{ asset.originalName }}</span>
      <button class="p-1.5 rounded-full hover:bg-white/10" title="關閉(或按 Esc)" @click="close">
        <X class="w-5 h-5" />
      </button>
    </div>
    <div class="flex-1 relative min-h-0">
      <iframe
        ref="iframeRef"
        :src="asset.url"
        sandbox="allow-scripts"
        class="w-full h-full bg-white border-0"
      ></iframe>
    </div>
  </div>
</template>
