import { defineStore } from 'pinia';

const STORAGE_KEY = 'syncboard.showcase.playedItems';

function loadPlayed() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function persist(played) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(played));
  } catch {
    // localStorage unavailable (private mode, quota) — playback tracking just won't persist
  }
}

function keyFor(date, itemKey) {
  return `${date}|${itemKey}`;
}

// Tracks which showcase items (Follow-up / each project) have been played
// through to their last slide, per meeting date. Browser-local only (localStorage) —
// this is presentation-viewing state for the presenter, not data worth syncing to the DB.
export const usePlaybackStore = defineStore('playback', {
  state: () => ({
    played: loadPlayed(),
  }),
  actions: {
    isPlayed(date, itemKey) {
      return Boolean(this.played[keyFor(date, itemKey)]);
    },
    markPlayed(date, itemKey) {
      const key = keyFor(date, itemKey);
      if (this.played[key]) return;
      this.played = { ...this.played, [key]: true };
      persist(this.played);
    },
    resetAll() {
      this.played = {};
      persist(this.played);
    },
  },
});
