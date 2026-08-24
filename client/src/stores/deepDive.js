import { defineStore } from 'pinia';
import * as deepDiveApi from '../api/deepDive.js';

const POLL_INTERVAL_MS = 4000;

export const useDeepDiveStore = defineStore('deepDive', {
  state: () => ({
    date: null,
    assets: [],
    isLoading: false,
    error: '',
    pollTimer: null,
  }),
  getters: {
    hasAssets: (state) => state.assets.length > 0,
    byType: (state) => (assetType) => state.assets.filter((a) => a.assetType === assetType),
  },
  actions: {
    async loadAssets(date) {
      this.isLoading = true;
      this.error = '';
      try {
        this.date = date;
        this.assets = await deepDiveApi.listAssets(date);
      } catch (err) {
        this.error = err.response?.data?.error || '載入 Deep Dive 資源失敗';
      } finally {
        this.isLoading = false;
      }
    },
    async deleteAsset(date, assetId) {
      this.error = '';
      try {
        await deepDiveApi.deleteAsset(date, assetId);
        this.assets = this.assets.filter((a) => a.id !== assetId);
      } catch (err) {
        this.error = err.response?.data?.error || '刪除失敗';
        throw err;
      }
    },
    // PPTX conversion runs async server-side — while any asset is still
    // PROCESSING, poll on a timer (this app has no websocket/push channel)
    // until every asset has settled into READY/FAILED.
    startPolling(date) {
      this.stopPolling();
      this.pollTimer = setInterval(async () => {
        if (!this.assets.some((a) => a.status === 'PROCESSING')) {
          this.stopPolling();
          return;
        }
        try {
          this.assets = await deepDiveApi.listAssets(date);
        } catch {
          // Transient errors during background polling are ignored —
          // loadAssets()'s own error handling covers user-initiated loads.
        }
      }, POLL_INTERVAL_MS);
    },
    stopPolling() {
      if (this.pollTimer) {
        clearInterval(this.pollTimer);
        this.pollTimer = null;
      }
    },
  },
});
