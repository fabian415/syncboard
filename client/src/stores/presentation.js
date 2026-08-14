import { defineStore } from 'pinia';
import { filterMeaningfulSlides } from '../utils/slides.js';

export const usePresentationStore = defineStore('presentation', {
  state: () => ({
    isOpen: false,
    pages: [],
    title: '',
    onEdit: null,
  }),
  actions: {
    open(pages, title, onEdit = null) {
      this.pages = filterMeaningfulSlides(pages ?? []);
      this.title = title;
      this.onEdit = onEdit;
      this.isOpen = true;
      // Request fullscreen synchronously, in the same call stack as the click
      // that triggered open() — deferring it (e.g. via a watcher + nextTick)
      // can fall outside the browser's user-activation window and get silently
      // denied, which leaves the deck open but never actually fullscreen.
      document.documentElement.requestFullscreen?.().catch(() => {});
    },
    close() {
      this.isOpen = false;
      this.onEdit = null;
    },
  },
});
