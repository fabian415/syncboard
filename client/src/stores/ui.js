import { defineStore } from 'pinia';

export const useUiStore = defineStore('ui', {
  state: () => ({
    isLoading: false,
    message: '',
  }),
  actions: {
    start(message) {
      this.message = message;
      this.isLoading = true;
    },
    stop() {
      this.isLoading = false;
      this.message = '';
    },
  },
});
