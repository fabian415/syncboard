import { createRouter, createWebHistory } from 'vue-router';
import MainLayout from '../layouts/MainLayout.vue';
import HomeView from '../views/HomeView.vue';
import ProjectListView from '../views/ProjectListView.vue';
import ProjectDetailView from '../views/ProjectDetailView.vue';
import MemberEditorView from '../views/MemberEditorView.vue';
import MemberListView from '../views/MemberListView.vue';
import MyReportView from '../views/MyReportView.vue';
import MeetingStatusView from '../views/MeetingStatusView.vue';
import MeetingStatusProjectView from '../views/MeetingStatusProjectView.vue';
import MeetingStatusSectionEditorView from '../views/MeetingStatusSectionEditorView.vue';
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
      { path: 'meeting-status', name: 'meeting-status', component: MeetingStatusView },
      { path: 'meeting-status/follow-up', name: 'meeting-status-follow-up', component: MeetingStatusSectionEditorView },
      {
        path: 'meeting-status/projects/:projectId',
        name: 'meeting-status-project',
        component: MeetingStatusProjectView,
      },
      {
        path: 'meeting-status/projects/:projectId/edit',
        name: 'meeting-status-project-edit',
        component: MeetingStatusSectionEditorView,
      },
      { path: 'release-notes', name: 'release-notes', component: ReleaseNotesView },
    ],
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});
