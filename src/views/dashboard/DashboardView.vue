<template>
  <div class="dashboard-container">
    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center py-12">
      <ProgressSpinner />
    </div>

    <!-- Mobile View: 2-Column Button Layout -->
    <div v-else-if="isMobile && !uiStore.mobileActiveSection" class="mobile-dashboard">
      <!-- Header -->
      <div class="mobile-header">
        <h1 class="text-lg font-bold">Dashboard</h1>
      </div>

      <!-- 2-Column Button Grid -->
      <div class="mobile-section-grid">
        <DashboardSectionButton
          icon="pi pi-list-check"
          label="My Tasks"
          :badge="taskStore.userTasks.length || null"
          @click="openMobileSection('tasks')"
        />
        <DashboardSectionButton
          icon="pi pi-briefcase"
          label="Active Projects"
          :badge="activeProjects.length || null"
          @click="openMobileSection('projects')"
        />
        <DashboardSectionButton
          icon="pi pi-question-circle"
          label="RFIs"
          @click="openMobileSection('rfis')"
        />
        <DashboardSectionButton
          icon="pi pi-file-check"
          label="Submittals"
          @click="openMobileSection('submittals')"
        />
        <DashboardSectionButton
          icon="pi pi-file-edit"
          label="Change Orders"
          @click="openMobileSection('changeOrders')"
        />
        <DashboardSectionButton
          icon="pi pi-clock"
          label="Activity"
          @click="openMobileSection('activity')"
        />
      </div>
    </div>

    <!-- Mobile Section Views -->
    <DashboardMobileSection
      v-else-if="isMobile && uiStore.mobileActiveSection === 'tasks'"
      title="My Tasks"
      @back="closeMobileSection"
    >
      <TaskList
        :tasks="taskStore.userTasks"
        :loading="taskStore.userTasksLoading"
        title=""
        empty-message="No tasks assigned to you"
        :show-create-button="true"
        :show-project-name="true"
        sort-by="priority"
        :filter-completed-tasks="true"
        @task-click="handleTaskClick"
        @create-task="handleCreateTask"
        @toggle-complete="handleToggleComplete"
        @status-change="handleStatusChange"
        @edit-task="handleEditTask"
        @delete-task="handleDeleteTask"
      />
    </DashboardMobileSection>

    <DashboardMobileSection
      v-else-if="isMobile && uiStore.mobileActiveSection === 'projects'"
      title="Active Projects"
      @back="closeMobileSection"
    >
      <div class="space-y-2">
        <Card
          v-for="project in activeProjects"
          :key="project.id"
          class="cursor-pointer hover:shadow-md transition-shadow"
          @click="handleProjectClick(project)"
        >
          <template #content>
            <div class="p-2">
              <h3 class="font-semibold text-base mb-1">
                {{ project.jobNumber }} {{ project.name }}
              </h3>
              <p class="text-xs text-surface-600 mb-2">
                {{ project.changes }} recent change{{ project.changes !== 1 ? 's' : '' }}
              </p>
              <div class="text-xs text-surface-500">
                Last activity: {{ formatTimeAgo(project.lastTimestamp) }}
              </div>
            </div>
          </template>
        </Card>
        <div v-if="!activeProjects.length" class="text-center py-8 text-surface-600 text-sm">
          No active projects with recent activity
        </div>
      </div>
    </DashboardMobileSection>

    <DashboardMobileSection
      v-else-if="isMobile && uiStore.mobileActiveSection"
      :title="getMobileSectionTitle(uiStore.mobileActiveSection)"
      @back="closeMobileSection"
    >
      <div class="text-center py-8 text-surface-600 text-sm">
        Coming soon: {{ getMobileSectionTitle(uiStore.mobileActiveSection) }}
      </div>
    </DashboardMobileSection>

    <!-- Desktop View: Configurable Columns -->
    <div v-else class="desktop-dashboard">
      <!-- Header -->
      <div class="desktop-header">
        <div>
          <h1 class="text-2xl font-bold text-surface-900 mb-1">Construction Overview</h1>
          <p class="text-surface-600 text-sm">
            Monitor active projects, track progress, and manage construction operations
          </p>
        </div>
      </div>

      <!-- My Tasks Section -->
      <div class="mb-6">
        <h3 class="text-base font-semibold text-surface-900 mb-3">My Tasks</h3>
        <TaskList
          :tasks="taskStore.userTasks"
          :loading="taskStore.userTasksLoading"
          title=""
          empty-message="No tasks assigned to you"
          :show-create-button="true"
          :show-project-name="true"
          sort-by="priority"
          :filter-completed-tasks="true"
          @task-click="handleTaskClick"
          @create-task="handleCreateTask"
          @toggle-complete="handleToggleComplete"
          @status-change="handleStatusChange"
          @edit-task="handleEditTask"
          @delete-task="handleDeleteTask"
        />
      </div>

      <!-- Recent Project Activity Section -->
      <h2 class="text-lg font-semibold text-surface-900 mb-3">Recent Project Activity</h2>
      <div class="desktop-projects-grid" :class="getGridClass">
        <Card
          v-for="project in activeProjects"
          :key="project.id"
          class="cursor-pointer hover:shadow-md transition-shadow"
          @click="handleProjectClick(project)"
        >
          <template #header>
            <div class="p-3 pb-0">
              <div class="flex justify-between items-start">
                <h3 class="font-medium text-surface-900 text-sm">
                  {{ project.jobNumber }} {{ project.name }}
                </h3>
                <i class="pi pi-chevron-right text-surface-600 text-xs"></i>
              </div>
              <p class="text-xs text-surface-600 mt-1">
                {{ project.changes }} recent change{{ project.changes !== 1 ? 's' : '' }}
              </p>
            </div>
          </template>
          <template #content>
            <div class="p-3 pt-0">
              <h4 class="text-xs font-semibold text-surface-900 mb-2">Construction Updates</h4>
              <ul class="space-y-1.5 mb-3">
                <li
                  v-for="update in project.updates"
                  :key="update.id"
                  class="flex items-start gap-1.5 text-xs text-surface-600"
                >
                  <span
                    class="shrink-0 w-4 h-4 rounded-full flex items-center justify-center"
                    :class="getActivityIconClass(update.action)"
                  >
                    <i :class="getActivityIcon(update.action)" class="text-[10px]"></i>
                  </span>
                  <span class="flex-1 leading-tight">
                    {{ update.description }}
                    <span class="text-surface-500 block">{{
                      formatTimeAgo(update.timestamp)
                    }}</span>
                  </span>
                </li>
                <li v-if="!project.updates.length" class="text-xs text-surface-500">
                  No recent updates
                </li>
              </ul>
              <h4 class="text-xs font-semibold text-surface-900 mb-2">Documents</h4>
              <ul class="space-y-1.5">
                <li
                  v-for="doc in project.documents"
                  :key="doc.id"
                  class="flex items-start gap-1.5 text-xs text-surface-600"
                >
                  <span
                    class="shrink-0 w-4 h-4 rounded-full flex items-center justify-center"
                    :class="getActivityIconClass(doc.action)"
                  >
                    <i :class="getActivityIcon(doc.action)" class="text-[10px]"></i>
                  </span>
                  <span class="flex-1 leading-tight">
                    {{ doc.description }}
                    <span class="text-surface-500 block">{{ formatTimeAgo(doc.timestamp) }}</span>
                  </span>
                </li>
                <li v-if="!project.documents.length" class="text-xs text-surface-500">
                  No recent documents
                </li>
              </ul>
            </div>
          </template>
        </Card>
      </div>
      <div v-if="!activeProjects.length" class="text-center py-8 text-surface-600">
        No active projects with recent activity
      </div>
    </div>

    <!-- Task Dialog -->
    <TaskDialog
      v-model:visible="taskDialogVisible"
      :task="selectedTask"
      :project-id="null"
      @task-saved="handleTaskSaved"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useWindowSize } from '@vueuse/core';

import Card from 'primevue/card';
import ProgressSpinner from 'primevue/progressspinner';

import ActivityService from '@/services/logging/ActivityService';
import { ACTIVITY_CATEGORIES } from '@/constants/activityActions';

import { useProjectStore } from '@/stores/project';
import { useTaskStore } from '@/stores/task';
import { useUIStore } from '@/stores/ui';

import TaskList from '@/components/lists/TaskList.vue';
import TaskDialog from '@/components/forms/TaskDialog.vue';
import DashboardSectionButton from '@/components/dashboard/DashboardSectionButton.vue';
import DashboardMobileSection from '@/components/dashboard/DashboardMobileSection.vue';

const toast = useToast();
const { width } = useWindowSize();

const projectStore = useProjectStore();
const taskStore = useTaskStore();
const uiStore = useUIStore();

const loading = ref(true);
const activities = ref([]);
let activityUnsubscribe = null;

// Task dialog state
const taskDialogVisible = ref(false);
const selectedTask = ref(null);

// Responsive breakpoint
const isMobile = computed(() => width.value < 768);

// Dynamic grid class based on column selection
// Tailwind needs full class names for purging, can't use dynamic interpolation
const getGridClass = computed(() => {
  const cols = uiStore.dashboardColumns;
  const classMap = {
    1: 'grid-cols-1 md:grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-4',
  };
  return classMap[cols] || 'grid-cols-1 md:grid-cols-4';
});

/**
 * Computes grouped activities by projectId.
 */
const groupedActivities = computed(() => {
  return activities.value.reduce((acc, activity) => {
    const pid = activity.projectId;
    if (!acc[pid]) acc[pid] = [];
    acc[pid].push(activity);
    return acc;
  }, {});
});

/**
 * Computes the top 4 projects with the most recent meaningful changes.
 */
const activeProjects = computed(() => {
  const storeProjects = projectStore.activeProjects;
  return storeProjects
    .map((project) => {
      const projActivities = groupedActivities.value[project.id] || [];
      if (!projActivities.length) return null;

      const lastTimestamp = Math.max(...projActivities.map((a) => new Date(a.timestamp).getTime()));
      const activityCount = projActivities.length;
      const changes = projActivities.length;

      const updates = projActivities
        .filter((a) =>
          ['created_rfi', 'created_submittal', 'created_change_order'].includes(a.action)
        )
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 3);

      const documents = projActivities
        .filter((a) => a.action === 'uploaded_document')
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 2);

      return { ...project, lastTimestamp, activityCount, changes, updates, documents };
    })
    .filter(Boolean)
    .sort((a, b) => b.lastTimestamp - a.lastTimestamp || b.activityCount - a.activityCount)
    .slice(0, isMobile.value ? 10 : 8); // Show more on mobile list view
});

/**
 * Loads dashboard data.
 */
const loadData = () => {
  loading.value = false;
};

/**
 * Sets up realtime subscription to meaningful activity changes.
 */
const setupActivitySubscription = () => {
  activityUnsubscribe = ActivityService.subscribeToActivitiesByCategory(
    ACTIVITY_CATEGORIES.CHANGE,
    { limit: 200 },
    (updatedActivities) => {
      activities.value = updatedActivities;
    }
  );
};

/**
 * Mobile navigation handlers
 */
const openMobileSection = (sectionName) => {
  uiStore.setMobileActiveSection(sectionName);
};

const closeMobileSection = () => {
  uiStore.resetMobileSection();
};

const getMobileSectionTitle = (sectionName) => {
  const titles = {
    tasks: 'My Tasks',
    projects: 'Active Projects',
    rfis: 'RFIs',
    submittals: 'Submittals',
    changeOrders: 'Change Orders',
    activity: 'Activity Log',
  };
  return titles[sectionName] || sectionName;
};

/**
 * Formats a timestamp as relative time ago.
 */
const formatTimeAgo = (timestamp) => {
  if (!timestamp) return 'Unknown';
  const now = new Date();
  const time = new Date(timestamp);
  const diffInMs = now - time;
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  if (diffInHours < 24) return `${diffInHours}h ago`;
  if (diffInDays < 7) return `${diffInDays}d ago`;
  return time.toLocaleDateString();
};

/**
 * Gets the CSS class for an activity icon.
 */
const getActivityIconClass = (action) => {
  const classMap = {
    created_rfi: 'bg-orange-100 text-orange-700',
    created_submittal: 'bg-green-100 text-green-700',
    created_change_order: 'bg-yellow-100 text-yellow-700',
    uploaded_document: 'bg-pink-100 text-pink-700',
  };
  return classMap[action] || 'bg-surface-100 text-surface-600';
};

/**
 * Gets the PrimeIcon class for an activity.
 */
const getActivityIcon = (action) => {
  const iconMap = {
    created_rfi: 'pi pi-question-circle',
    created_submittal: 'pi pi-file-check',
    created_change_order: 'pi pi-file-edit',
    uploaded_document: 'pi pi-file',
  };
  return iconMap[action] || 'pi pi-circle';
};

/**
 * Handle project click
 */
const handleProjectClick = async (project) => {
  await projectStore.selectProject(project);
};

/**
 * Handle task click
 */
const handleTaskClick = (task) => {
  selectedTask.value = task;
  taskDialogVisible.value = true;
};

/**
 * Handle create task
 */
const handleCreateTask = () => {
  selectedTask.value = null;
  taskDialogVisible.value = true;
};

/**
 * Handle toggle task completion
 */
const handleToggleComplete = async (task) => {
  try {
    if (task.status === 'complete') {
      const result = await taskStore.reopenTask(task.id);
      if (result) {
        toast.add({
          severity: 'success',
          summary: 'Task Reopened',
          detail: `"${task.title}" has been reopened`,
          life: 3000,
        });
      }
    } else {
      const result = await taskStore.completeTask(task.id);
      if (result) {
        toast.add({
          severity: 'success',
          summary: 'Task Completed',
          detail: `"${task.title}" has been marked as complete`,
          life: 3000,
        });
      }
    }
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Cannot Complete Task',
      detail: error.message || 'An error occurred while updating the task',
      life: 6000,
    });
  }
};

/**
 * Handle task saved from dialog
 */
const handleTaskSaved = () => {
  taskDialogVisible.value = false;
  selectedTask.value = null;
};

/**
 * Handle status change from TaskList
 */
const handleStatusChange = async ({ task, newStatus }) => {
  try {
    const result = await taskStore.updateTask(task.id, { status: newStatus });
    if (result) {
      toast.add({
        severity: 'success',
        summary: 'Status Updated',
        detail: `"${task.title}" status changed to ${newStatus}`,
        life: 3000,
      });
    }
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Status Change Failed',
      detail: error.message || 'An error occurred while updating the task status',
      life: 6000,
    });
  }
};

/**
 * Handle edit task
 */
const handleEditTask = (task) => {
  selectedTask.value = task;
  taskDialogVisible.value = true;
};

/**
 * Handle delete task
 */
const handleDeleteTask = async (task) => {
  if (!confirm(`Are you sure you want to delete "${task.title}"?`)) {
    return;
  }

  try {
    const result = await taskStore.deleteTask(task.id);
    if (result) {
      toast.add({
        severity: 'success',
        summary: 'Task Deleted',
        detail: `"${task.title}" has been deleted`,
        life: 3000,
      });
    }
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Delete Failed',
      detail: error.message || 'An error occurred while deleting the task',
      life: 5000,
    });
  }
};

onMounted(async () => {
  loadData();
  setupActivitySubscription();
  taskStore.initializeUserTasksSubscription();
});

onUnmounted(() => {
  if (activityUnsubscribe) {
    activityUnsubscribe();
  }
  taskStore.cleanupUserTasksSubscription();
  uiStore.resetMobileSection();
});
</script>

<style scoped>
.dashboard-container {
  min-height: 100vh;
  background: var(--p-surface-ground);
}

/* Mobile Dashboard */
.mobile-dashboard {
  display: flex;
  flex-direction: column;
  padding: 0.75rem;
  gap: 0.75rem;
}

.mobile-header {
  padding: 0.5rem 0;
}

.mobile-section-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
}

/* Desktop Dashboard */
.desktop-dashboard {
  padding: 1.5rem;
}

.desktop-header {
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 1.5rem;
}

.desktop-projects-grid {
  display: grid;
  gap: 1rem;
}

/* Tailwind-style spacing utilities */
.space-y-1\.5 > * + * {
  margin-top: 0.375rem;
}

.space-y-2 > * + * {
  margin-top: 0.5rem;
}

/* Responsive adjustments */
@media (max-width: 767px) {
  .desktop-dashboard {
    display: none;
  }
}

@media (min-width: 768px) {
  .mobile-dashboard {
    display: none;
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .dashboard-container {
    background: var(--p-surface-900);
  }
}

/* Remove main padding on mobile for full-width layout */
@media (max-width: 767px) {
  :global(main) {
    padding: 0 !important;
  }
}
</style>
