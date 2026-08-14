import { defineStore } from 'pinia';
import * as meetingStatusApi from '../api/meetingStatus.js';

export const useMeetingStatusStore = defineStore('meetingStatus', {
  state: () => ({
    date: null,
    markdown: '',
    htmlPages: null,
    updatedAt: null,
    isLoading: false,
    isSaving: false,
    error: '',
  }),
  actions: {
    async load(date) {
      this.isLoading = true;
      this.error = '';
      try {
        const report = await meetingStatusApi.getMeetingStatus(date);
        this.date = date;
        this.markdown = report.markdown;
        this.htmlPages = report.pages;
        this.updatedAt = report.updatedAt;
      } catch (err) {
        this.error = err.response?.data?.error || '載入會議總覽失敗';
      } finally {
        this.isLoading = false;
      }
    },
    async saveMarkdown(markdown) {
      this.isSaving = true;
      this.error = '';
      try {
        const result = await meetingStatusApi.saveMarkdown(this.date, markdown);
        this.markdown = markdown;
        this.updatedAt = result.updatedAt;
      } catch (err) {
        this.error = err.response?.data?.error || '儲存失敗';
        throw err;
      } finally {
        this.isSaving = false;
      }
    },
    async refactor() {
      this.error = '';
      try {
        this.htmlPages = await meetingStatusApi.refactor(this.date);
        return this.htmlPages;
      } catch (err) {
        this.error = err.response?.data?.error || 'AI 產生簡報失敗';
        throw err;
      }
    },
    async saveHtml(html) {
      this.error = '';
      try {
        this.htmlPages = await meetingStatusApi.saveHtml(this.date, html);
        return this.htmlPages;
      } catch (err) {
        this.error = err.response?.data?.error || 'HTML 儲存失敗';
        throw err;
      }
    },
  },
});
