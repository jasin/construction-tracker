// router.js
import { createRouter, createWebHistory } from 'vue-router';
import { requireAuth, requireRole, redirectIfAuthenticated } from './guards';
import { useProjectStore, useAuthStore } from '@/stores';

// Existing components
import ProjectDetailView from '@/views/projects/ProjectDetailView.vue';
import LoginPage from '@/views/auth/LoginView.vue';
import UserDashboard from '@/views/dashboard/DashboardView.vue';
import TasksPage from '@/views/tasks/TaskListView.vue';
import ClientsPage from '@/views/clients/ClientListView.vue';
import DocumentsView from '@/views/documents/DocumentsView.vue';
import UserManagement from '@/views/admin/UserManagementView.vue';

// Placeholder component for routes that don't have components yet
const PlaceholderPage = {
  template: `
    <div class="h-full flex flex-col bg-white">
      <div class="bg-white border-b border-gray-200 px-6 py-4 shrink-0">
        <h1 class="text-2xl font-bold text-gray-900">{{ title }}</h1>
        <p class="text-sm text-gray-500 mt-1">{{ description }}</p>
      </div>
      <div class="flex-1 flex items-center justify-center">
        <div class="text-center">
          <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14-7l2 2-2 2m0-4H5m14 12l2 2-2 2m0-4H5"></path>
          </svg>
          <h3 class="mt-2 text-sm font-medium text-gray-900">Coming Soon</h3>
          <p class="mt-1 text-sm text-gray-500">This feature is under development.</p>
        </div>
      </div>
    </div>
  `,
  props: ['title', 'description'],
};

const routes = [
  // Public routes
  {
    path: '/login',
    name: 'Login',
    component: LoginPage,
    beforeEnter: redirectIfAuthenticated,
  },

  // Protected routes
  {
    path: '/',
    name: 'User Dashboard',
    component: UserDashboard,
    beforeEnter: requireAuth,
  },

  // Project routes
  {
    path: '/project/:projectId',
    name: 'ProjectDetail',
    component: ProjectDetailView,
    props: (route) => ({ projectId: route.params.projectId }),
    beforeEnter: requireAuth,
  },
  {
    path: '/project/:projectId/documents',
    name: 'ProjectDocuments',
    component: () => import('@/views/documents/DocumentsView.vue'),
    props: true,
    beforeEnter: requireAuth,
  },
  {
    path: '/project/:projectId/settings',
    name: 'ProjectSettings',
    //component: () => import('@/views/projects/ProjectSettings.vue'),
    props: true,
    beforeEnter: requireAuth,
  },

  // User management - Admin only
  {
    path: '/users',
    name: 'UserManagement',
    component: UserManagement,
    beforeEnter: requireRole(['admin']),
  },

  // Tasks - Single unified page
  {
    path: '/tasks',
    name: 'Tasks',
    component: TasksPage,
    beforeEnter: requireAuth,
  },

  // Clients - Single unified page
  {
    path: '/clients',
    name: 'Clients',
    component: ClientsPage,
    beforeEnter: requireAuth,
  },

  // Documents routes - ALL USE THE UNIFIED VIEW
  {
    path: '/documents',
    name: 'AllDocuments',
    component: DocumentsView,
    beforeEnter: requireAuth,
    props: {
      mode: 'search',
      allowUpload: false,
      allowExport: true,
    },
    meta: {
      title: 'All Documents',
    },
  },
  {
    path: '/documents/search',
    name: 'DocumentSearch',
    component: DocumentsView,
    beforeEnter: requireAuth,
    props: {
      mode: 'search',
      allowUpload: false,
      allowExport: true,
    },
    meta: {
      title: 'Document Search',
    },
  },
  {
    path: '/documents/:projectId/manage',
    name: 'DocumentManage',
    component: DocumentsView,
    beforeEnter: requireAuth,
    props: (route) => ({
      projectId: route.params.projectId,
      mode: 'manage',
      allowUpload: true,
      allowExport: true,
    }),
    meta: {
      title: 'Manage Documents',
    },
  },

  // Reports routes
  {
    path: '/reports/project-status',
    name: 'ProjectStatusReport',
    component: PlaceholderPage,
    beforeEnter: requireAuth,
    props: {
      title: 'Project Status Report',
      description: 'Overview of all project statuses',
    },
  },
  {
    path: '/reports/financial',
    name: 'FinancialReport',
    component: PlaceholderPage,
    beforeEnter: requireAuth,
    props: {
      title: 'Financial Report',
      description: 'Project costs and financial overview',
    },
  },
  {
    path: '/reports/time-tracking',
    name: 'TimeTrackingReport',
    component: PlaceholderPage,
    beforeEnter: requireAuth,
    props: {
      title: 'Time Tracking Report',
      description: 'Time spent on projects and tasks',
    },
  },

  // Settings
  {
    path: '/settings',
    name: 'Settings',
    component: PlaceholderPage,
    beforeEnter: requireAuth,
    props: {
      title: 'Settings',
      description: 'Application and user preferences',
    },
  },

  // Error pages
  {
    path: '/unauthorized',
    name: 'Unauthorized',
    component: PlaceholderPage,
    props: {
      title: 'Unauthorized',
      description: 'You do not have permission to access this page',
    },
  },

  // Catch all - redirect to home
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// ENHANCED: Global guard to sync URL → Store for external navigation only
// This handles: back/forward buttons, bookmarks, direct URL access
// It does NOT trigger when store pushes URL (prevents loops)
router.afterEach(async (to, from) => {
  const projectStore = useProjectStore();
  const authStore = useAuthStore();

  console.log('Router afterEach: Navigation from', from.path, 'to', to.path);

  // Skip if not authenticated (guard already redirected to login)
  if (!authStore.isAuthenticated) {
    console.log('Router: Not authenticated, skipping sync');
    return;
  }

  // Skip if store operation is in progress (prevents loop from store's router.push)
  if (projectStore.isSetting || projectStore.isResetting) {
    console.log('Router: Store operation in progress, skipping sync to prevent loop');
    return;
  }

  const urlProjectId = to.params.projectId ?? null;
  const storeProjectId = projectStore.activeProjectId;

  // Case 1: URL has project but store doesn't match → Sync store to URL
  if (urlProjectId && urlProjectId !== storeProjectId) {
    console.log('Router: Syncing store to URL project:', urlProjectId);
    try {
      await projectStore.setActiveProject(urlProjectId);
      console.log('✅ Router: Store synced to URL');
    } catch (error) {
      console.error('Router: Failed to sync store to URL:', error);
      // Optionally redirect to dashboard on error
      router.replace('/');
    }
  }
  // Case 2: URL has no project but store has one → Clear store
  else if (!urlProjectId && storeProjectId) {
    console.log('Router: Syncing store to dashboard (clearing active project)');
    try {
      // Pass false to prevent URL push (we're already at the target URL)
      await projectStore.resetActiveProject(false);
      console.log('✅ Router: Store cleared for dashboard');
    } catch (error) {
      console.error('Router: Failed to clear store:', error);
    }
  }
  // Case 3: URL and store already match → No action needed
  else {
    console.log('Router: URL and store already in sync');
  }
});

export default router;
