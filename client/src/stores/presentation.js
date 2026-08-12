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
    },
    close() {
      this.isOpen = false;
      this.onEdit = null;
    },
  },
});
