import { defineStore } from 'pinia';
import { filterMeaningfulSlides, autoPaginateHtml } from '../utils/slides.js';

export const usePresentationStore = defineStore('presentation', {
  state: () => ({
    isOpen: false,
    // Decks as generated/stored — one page per section, before any
    // overflow-driven splitting. Kept so autoPaginate can be re-run from
    // scratch (e.g. on resize) without compounding splits.
    rawDecks: [],
    decks: [],
    deckIndex: 0,
    title: '',
    onEdit: null,
    editLabel: '編輯內容',
    // Search keyword to land on when opening, if any — PresentationModal
    // resolves this to a page index itself once pages are paginated.
    initialQuery: '',
  }),
  getters: {
    pages: (state) => state.decks[state.deckIndex]?.pages ?? [],
    deckCount: (state) => state.decks.length,
    hasPrevDeck: (state) => state.deckIndex > 0,
    hasNextDeck: (state) => state.deckIndex < state.decks.length - 1,
    // Total slide count across every merged deck in the queue, not just the current deck.
    totalPages: (state) => state.decks.reduce((sum, deck) => sum + deck.pages.length, 0),
    // Number of pages in decks before the current one, used to compute the running page index.
    pagesBeforeCurrentDeck: (state) =>
      state.decks.slice(0, state.deckIndex).reduce((sum, deck) => sum + deck.pages.length, 0),
  },
  actions: {
    // Single-deck convenience wrapper kept for existing callers (still supports onEdit).
    open(pages, title, onEdit = null, { query = '', editLabel = '編輯內容' } = {}) {
      this.openQueue([{ title, pages }], { onEdit, query, editLabel });
    },
    openQueue(decks, { onEdit = null, query = '', editLabel = '編輯內容' } = {}) {
      this.rawDecks = (decks ?? [])
        .map((deck) => ({ title: deck.title, pages: filterMeaningfulSlides(deck.pages ?? []) }))
        .filter((deck) => deck.pages.length > 0);
      this.decks = this.rawDecks;
      this.deckIndex = 0;
      this.title = this.decks[0]?.title ?? '';
      this.onEdit = onEdit;
      this.editLabel = editLabel;
      this.initialQuery = query;
      this.isOpen = true;
    },
    // Re-splits every deck's pages against the presentation viewport's real
    // rendered size, so content that overflows a slide gets pushed onto
    // extra pages instead of just scrolling. Always recomputes from
    // rawDecks so repeated calls (e.g. on window resize) don't compound.
    autoPaginate({ width, height }) {
      this.decks = this.rawDecks.map((deck) => ({
        title: deck.title,
        pages: deck.pages.flatMap((page) => autoPaginateHtml(page, { width, height })),
      }));
    },
    goToDeck(index) {
      if (index < 0 || index >= this.decks.length) return;
      this.deckIndex = index;
      this.title = this.decks[index]?.title ?? '';
    },
    close() {
      this.isOpen = false;
      this.onEdit = null;
      this.editLabel = '編輯內容';
    },
  },
});
