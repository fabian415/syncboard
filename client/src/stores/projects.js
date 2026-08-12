import { defineStore } from 'pinia';
import * as projectsApi from '../api/projects.js';

export const useProjectsStore = defineStore('projects', {
  state: () => ({
    list: [],
    detail: null,
    isLoading: false,
    error: '',
  }),
  actions: {
    async loadList(date) {
      this.isLoading = true;
      this.error = '';
      try {
        this.list = await projectsApi.listProjects(date);
      } catch (err) {
        this.error = err.response?.data?.error || '載入專案列表失敗';
      } finally {
        this.isLoading = false;
      }
    },
    async loadDetail(projectId, date) {
      this.isLoading = true;
      this.error = '';
      try {
        this.detail = await projectsApi.getProject(projectId, date);
      } catch (err) {
        this.error = err.response?.data?.error || '載入專案詳情失敗';
      } finally {
        this.isLoading = false;
      }
    },
  },
});
