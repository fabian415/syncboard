import { defineStore } from 'pinia';
import { filterMeaningfulSlides } from '../utils/slides.js';

export const usePresentationStore = defineStore('presentation', {
  state: () => ({
    isOpen: false,
    decks: [],
    deckIndex: 0,
    title: '',
    onEdit: null,
  }),
  getters: {
    pages: (state) => state.decks[state.deckIndex]?.pages ?? [],
    deckCount: (state) => state.decks.length,
    hasPrevDeck: (state) => state.deckIndex > 0,
    hasNextDeck: (state) => state.deckIndex < state.decks.length - 1,
  },
  actions: {
    // Single-deck convenience wrapper kept for existing callers (still supports onEdit).
    open(pages, title, onEdit = null) {
      this.openQueue([{ title, pages }], { onEdit });
    },
    openQueue(decks, { onEdit = null } = {}) {
      this.decks = (decks ?? [])
        .map((deck) => ({ title: deck.title, pages: filterMeaningfulSlides(deck.pages ?? []) }))
        .filter((deck) => deck.pages.length > 0);
      this.deckIndex = 0;
      this.title = this.decks[0]?.title ?? '';
      this.onEdit = onEdit;
      this.isOpen = true;
      // Request fullscreen synchronously, in the same call stack as the click
      // that triggered open() — deferring it (e.g. via a watcher + nextTick)
      // can fall outside the browser's user-activation window and get silently
      // denied, which leaves the deck open but never actually fullscreen.
      document.documentElement.requestFullscreen?.().catch(() => {});
    },
    goToDeck(index) {
      if (index < 0 || index >= this.decks.length) return;
      this.deckIndex = index;
      this.title = this.decks[index]?.title ?? '';
    },
    close() {
      this.isOpen = false;
      this.onEdit = null;
    },
  },
});
