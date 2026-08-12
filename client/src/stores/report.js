import { defineStore } from 'pinia';
import * as reportsApi from '../api/reports.js';

export const useReportStore = defineStore('report', {
  state: () => ({
    projectId: null,
    userId: null,
    date: null,
    markdown: '',
    htmlPages: null,
    status: 'DRAFTING',
    submittedAt: null,
    isLoading: false,
    isSaving: false,
    error: '',
  }),
  actions: {
    async load(projectId, userId, date) {
      this.isLoading = true;
      this.error = '';
      try {
        const report = await reportsApi.getMemberReport(projectId, userId, date);
        this.projectId = projectId;
        this.userId = userId;
        this.date = date;
        this.markdown = report.markdown;
        this.htmlPages = report.htmlPages;
        this.status = report.status;
        this.submittedAt = report.submittedAt;
      } catch (err) {
        this.error = err.response?.data?.error || '載入報告失敗';
      } finally {
        this.isLoading = false;
      }
    },
    async saveHtml(html) {
      this.error = '';
      try {
        const pages = await reportsApi.saveHtml(this.projectId, this.userId, this.date, html);
        this.htmlPages = pages;
        return pages;
      } catch (err) {
        this.error = err.response?.data?.error || 'HTML 儲存失敗';
        throw err;
      }
    },
  },
});
