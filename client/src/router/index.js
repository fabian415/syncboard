import { createRouter, createWebHistory } from 'vue-router';
import MainLayout from '../layouts/MainLayout.vue';
import HomeView from '../views/HomeView.vue';
import ProjectListView from '../views/ProjectListView.vue';
import ProjectDetailView from '../views/ProjectDetailView.vue';
import MemberEditorView from '../views/MemberEditorView.vue';
import MemberListView from '../views/MemberListView.vue';
import MyReportView from '../views/MyReportView.vue';
import ReleaseNotesView from '../views/ReleaseNotesView.vue';

const routes = [
  {
    path: '/',
    component: MainLayout,
    children: [
      { path: '', name: 'home', component: HomeView },
      { path: 'projects', name: 'projects', component: ProjectListView },
      { path: 'projects/:projectId', name: 'project-detail', component: ProjectDetailView },
      { path: 'projects/:projectId/members/:userId', name: 'member-editor', component: MemberEditorView },
      { path: 'members', name: 'members', component: MemberListView },
      { path: 'members/:userId/report', name: 'my-report', component: MyReportView },
      { path: 'release-notes', name: 'release-notes', component: ReleaseNotesView },
    ],
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});
