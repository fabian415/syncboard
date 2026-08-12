import { defineStore } from 'pinia';
import * as membersApi from '../api/members.js';

export const useMemberReportStore = defineStore('memberReport', {
  state: () => ({
    userId: null,
    periodStart: null,
    markdown: '',
    projects: [],
    updatedAt: null,
    isLoading: false,
    isSaving: false,
    isDistributing: false,
    isGeneratingSample: false,
    error: '',
    distributeResult: null,
  }),
  actions: {
    async load(userId, periodStart) {
      this.isLoading = true;
      this.error = '';
      this.distributeResult = null;
      try {
        const report = await membersApi.getPersonalReport(userId, periodStart);
        this.userId = userId;
        this.periodStart = periodStart;
        this.markdown = report.markdown;
        this.projects = report.projects;
        this.updatedAt = report.updatedAt;
      } catch (err) {
        this.error = err.response?.data?.error || '載入報告失敗';
      } finally {
        this.isLoading = false;
      }
    },
    async saveMarkdown(markdown) {
      this.isSaving = true;
      this.error = '';
      try {
        const result = await membersApi.savePersonalMarkdown(this.userId, this.periodStart, markdown);
        this.markdown = markdown;
        this.updatedAt = result.updatedAt;
      } catch (err) {
        this.error = err.response?.data?.error || '儲存失敗';
        throw err;
      } finally {
        this.isSaving = false;
      }
    },
    async generateSample() {
      this.isGeneratingSample = true;
      this.error = '';
      try {
        return await membersApi.generateSampleReport(this.userId, this.periodStart);
      } catch (err) {
        this.error = err.response?.data?.error || 'AI 生成範例內容失敗';
        throw err;
      } finally {
        this.isGeneratingSample = false;
      }
    },
    async distribute() {
      this.isDistributing = true;
      this.error = '';
      this.distributeResult = null;
      try {
        const result = await membersApi.distributeReport(this.userId, this.periodStart);
        this.distributeResult = result;
        return result;
      } catch (err) {
        this.error = err.response?.data?.error || 'AI Refactor 失敗';
        throw err;
      } finally {
        this.isDistributing = false;
      }
    },
  },
});
