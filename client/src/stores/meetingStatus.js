import { defineStore } from 'pinia';
import * as meetingStatusApi from '../api/meetingStatus.js';

export const useMeetingStatusStore = defineStore('meetingStatus', {
  state: () => ({
    date: null,
    overview: null,
    htmlPages: null,
    presentationUpdatedAt: null,
    section: null,
    sectionHtmlPages: null,
    sectionPresentationUpdatedAt: null,
    isLoading: false,
    isSaving: false,
    error: '',
  }),
  actions: {
    async loadOverview(date) {
      this.isLoading = true;
      this.error = '';
      try {
        const [overview, presentation] = await Promise.all([
          meetingStatusApi.getOverview(date),
          meetingStatusApi.getPresentation(date),
        ]);
        this.date = date;
        this.overview = overview;
        this.htmlPages = presentation.pages;
        this.presentationUpdatedAt = presentation.updatedAt;
      } catch (err) {
        this.error = err.response?.data?.error || '載入整體進度失敗';
      } finally {
        this.isLoading = false;
      }
    },
    async saveHeader(date, header) {
      this.isSaving = true;
      this.error = '';
      try {
        await meetingStatusApi.saveHeader(date, header);
        if (this.overview) this.overview.header = { ...this.overview.header, ...header };
      } catch (err) {
        this.error = err.response?.data?.error || '儲存失敗';
        throw err;
      } finally {
        this.isSaving = false;
      }
    },
    async loadSection(date, sectionKey) {
      this.isLoading = true;
      this.error = '';
      this.section = null;
      this.sectionHtmlPages = null;
      this.sectionPresentationUpdatedAt = null;
      try {
        const hasSlides = sectionKey.startsWith('project-') || sectionKey === 'follow-up';
        const [section, presentation] = await Promise.all([
          meetingStatusApi.getSection(date, sectionKey),
          hasSlides ? meetingStatusApi.getSectionPresentation(date, sectionKey) : Promise.resolve(null),
        ]);
        this.section = section;
        if (presentation) {
          this.sectionHtmlPages = presentation.pages;
          this.sectionPresentationUpdatedAt = presentation.updatedAt;
        }
      } catch (err) {
        this.error = err.response?.data?.error || '載入內容失敗';
      } finally {
        this.isLoading = false;
      }
    },
    async saveSection(date, sectionKey, markdown) {
      this.isSaving = true;
      this.error = '';
      try {
        const result = await meetingStatusApi.saveSection(date, sectionKey, markdown);
        this.section = { markdown, updatedAt: result.updatedAt };
      } catch (err) {
        this.error = err.response?.data?.error || '儲存失敗';
        throw err;
      } finally {
        this.isSaving = false;
      }
    },
    async refactorSection(date, sectionKey) {
      this.error = '';
      try {
        const result = await meetingStatusApi.refactorSection(date, sectionKey);
        this.sectionHtmlPages = result.pages;
        this.sectionPresentationUpdatedAt = result.updatedAt;
        return result.pages;
      } catch (err) {
        this.error = err.response?.data?.error || 'AI 產生投影片失敗';
        throw err;
      }
    },
    async saveSectionHtml(date, sectionKey, html) {
      this.error = '';
      try {
        const result = await meetingStatusApi.saveSectionHtml(date, sectionKey, html);
        this.sectionHtmlPages = result.pages;
        this.sectionPresentationUpdatedAt = result.updatedAt;
        return result.pages;
      } catch (err) {
        this.error = err.response?.data?.error || 'HTML 儲存失敗';
        throw err;
      }
    },
    async refactor(date) {
      this.error = '';
      try {
        this.htmlPages = await meetingStatusApi.refactor(date);
        return this.htmlPages;
      } catch (err) {
        this.error = err.response?.data?.error || 'AI 產生簡報失敗';
        throw err;
      }
    },
    async saveHtml(date, html) {
      this.error = '';
      try {
        this.htmlPages = await meetingStatusApi.saveHtml(date, html);
        return this.htmlPages;
      } catch (err) {
        this.error = err.response?.data?.error || 'HTML 儲存失敗';
        throw err;
      }
    },
  },
});
