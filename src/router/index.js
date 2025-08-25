// router.js
import { createRouter, createWebHistory } from 'vue-router'
import { requireAuth, requireRole, redirectIfAuthenticated } from './guards'

// Existing components
import ProjectDashboard from '@/views/projects/ProjectDetailView.vue'
import LoginPage from '@/views/auth/LoginView.vue'
import UserDashboard from '@/views/dashboard/DashboardView.vue'
import TasksPage from '@/views/tasks/TaskListView.vue'
import ClientsPage from '@/views/clients/ClientListView.vue'
import DocumentsView from '@/views/documents/DocumentsView.vue'
import UserManagement from '@/views/admin/UserManagementView.vue'

// Placeholder component for routes that don't have components yet
const PlaceholderPage = {
  template: `
    <div class="h-full flex flex-col bg-white">
      <div class="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
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
}

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
    name: 'ProjectDashboard',
    component: ProjectDashboard,
    props: true,
    beforeEnter: requireAuth,
  },
  {
    path: '/project/:projectId/documents',
    name: 'ProjectDocuments',
    component: () => import('@/views/documents/DocumentsView.vue'),
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
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
