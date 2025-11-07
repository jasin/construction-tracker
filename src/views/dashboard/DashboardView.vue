<template>
  <div class="min-h-screen bg-surface-ground p-6">
    <div v-if="loading" class="flex justify-center py-12">
      <ProgressSpinner />
    </div>
    <div v-else>
      <h1 class="text-2xl font-bold text-surface-900 mb-2">Construction Overview</h1>
      <p class="text-surface-600 mb-6">
        Monitor active projects, track progress, and manage construction operations
      </p>

      <!-- User Tasks Section -->
      <div class="mb-8">
        <Card>
          <template #header>
            <div class="flex justify-between items-center p-4 pb-0">
              <h3 class="text-lg font-semibold text-surface-900">My Tasks</h3>
            </div>
          </template>
          <template #content>
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
          </template>
        </Card>
      </div>

      <!-- Active Projects Section -->
      <h2 class="text-xl font-semibold text-surface-900 mb-4">Recent Project Activity</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <Card
          v-for="project in activeProjects"
          :key="project.id"
          class="cursor-pointer hover:shadow-md transition-shadow"
          @click="handleProjectClick(project)"
        >
          <template #header>
            <div class="p-4 pb-0">
              <div class="flex justify-between items-start">
                <h3 class="font-medium text-surface-900">
                  {{ project.jobNumber }} {{ project.name }}
                </h3>
                <i class="pi pi-chevron-down text-surface-600"></i>
              </div>
              <p class="text-sm text-surface-600 mt-1">
                {{ project.changes }} recent change{{ project.changes !== 1 ? 's' : '' }}
              </p>
            </div>
          </template>
          <template #content>
            <div class="p-4 pt-0">
              <h4 class="text-sm font-semibold text-surface-900 mb-2">Construction Updates</h4>
              <ul class="space-y-2 mb-4">
                <li
                  v-for="update in project.updates"
                  :key="update.id"
                  class="flex items-start gap-2 text-sm text-surface-600"
                >
                  <span
                    class="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs"
                    :class="getActivityIconClass(update.action)"
                  >
                    <i :class="getActivityIcon(update.action)"></i>
                  </span>
                  <span
                    >{{ update.description }}
                    <span class="text-surface-500">{{
                      formatTimeAgo(update.timestamp)
                    }}</span></span
                  >
                </li>
                <li v-if="!project.updates.length" class="text-sm text-surface-500">
                  No recent updates
                </li>
              </ul>
              <h4 class="text-sm font-semibold text-surface-900 mb-2">Documents</h4>
              <ul class="space-y-2">
                <li
                  v-for="doc in project.documents"
                  :key="doc.id"
                  class="flex items-start gap-2 text-sm text-surface-600"
                >
                  <span
                    class="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs"
                    :class="getActivityIconClass(doc.action)"
                  >
                    <i :class="getActivityIcon(doc.action)"></i>
                  </span>
                  <span
                    >{{ doc.description }}
                    <span class="text-surface-500">{{ formatTimeAgo(doc.timestamp) }}</span></span
                  >
                </li>
                <li v-if="!project.documents.length" class="text-sm text-surface-500">
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

import Card from 'primevue/card';

import ProgressSpinner from 'primevue/progressspinner';
import ActivityService from '@/services/logging/ActivityService';
import { ACTIVITY_CATEGORIES } from '@/constants/activityActions';

import { useProjectStore } from '@/stores/project';
import { useTaskStore } from '@/stores/task';

import TaskList from '@/components/lists/TaskList.vue';
import TaskDialog from '@/components/forms/TaskDialog.vue';

const toast = useToast();

const projectStore = useProjectStore();
const taskStore = useTaskStore();

const loading = ref(true);

const activities = ref([]);
let activityUnsubscribe = null;

// Task dialog state
const taskDialogVisible = ref(false);
const selectedTask = ref(null);

/**
 * Computes grouped activities by projectId.
 * @returns {Object} Map of projectId to array of activities.
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
 * Only includes projects with meaningful activity (category='change').
 * No time-based filtering - shows most recent changes regardless of when they occurred.
 * @returns {Array} Array of enhanced project objects from store.
 */
const activeProjects = computed(() => {
  const storeProjects = projectStore.activeProjects; // Use store as single source (reactive)
  return storeProjects
    .map((project) => {
      const projActivities = groupedActivities.value[project.id] || [];
      if (!projActivities.length) return null;

      const lastTimestamp = Math.max(...projActivities.map((a) => new Date(a.timestamp).getTime()));
      const activityCount = projActivities.length; // Total meaningful changes for this project
      const changes = projActivities.length; // All activities are meaningful changes now

      const updates = projActivities
        .filter((a) =>
          ['created_rfi', 'created_submittal', 'created_change_order'].includes(a.action)
        )
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 3); // Limit to top 3 updates

      const documents = projActivities
        .filter((a) => a.action === 'uploaded_document')
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 2); // Limit to top 2 documents

      return { ...project, lastTimestamp, activityCount, changes, updates, documents };
    })
    .filter(Boolean)
    .sort((a, b) => b.lastTimestamp - a.lastTimestamp || b.activityCount - a.activityCount)
    .slice(0, 4); // Top 4 projects with most recent meaningful changes
});

/**
 * Loads dashboard data from store (single source, reactive).
 * @async
 */
const loadData = () => {
  loading.value = false;
};

/**
 * Sets up realtime subscription to meaningful activity changes only.
 * Queries by category='change' to exclude view-only activities like 'project_selected'.
 * Shows most recent meaningful changes across ALL projects (no time limit).
 */
const setupActivitySubscription = () => {
  activityUnsubscribe = ActivityService.subscribeToActivitiesByCategory(
    ACTIVITY_CATEGORIES.CHANGE,
    { limit: 200 }, // Get last 200 meaningful changes (more than enough for 4 projects)
    (updatedActivities) => {
      activities.value = updatedActivities;
      console.log('Dashboard meaningful activities updated:', updatedActivities.length);
    }
  );
};

/**
 * Formats a timestamp as relative time ago.
 * @param {string|Date} timestamp - The timestamp to format.
 * @returns {string} Formatted relative time.
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
 * Gets the CSS class for an activity icon based on action.
 * @param {string} action - The activity action.
 * @returns {string} CSS classes.
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
 * @param {string} action - The activity action.
 * @returns {string} Icon class.
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
 * SIMPLIFIED: Handle project click - only call store, it handles URL
 * @param {Object} project - The project to select
 */
const handleProjectClick = async (project) => {
  console.log('DashboardView: Selecting project:', project.id);
  // Store handles both state AND URL update
  await projectStore.selectProject(project);
  // That's it! No manual router.push needed
};

/**
 * Handle task click - open task dialog for editing
 * @param {Object} task - The task to edit
 */
const handleTaskClick = (task) => {
  console.log('DashboardView: Task clicked:', task.id);
  selectedTask.value = task;
  taskDialogVisible.value = true;
};

/**
 * Handle create task - open task dialog for new task
 */
const handleCreateTask = () => {
  console.log('DashboardView: Creating new task');
  selectedTask.value = null;
  taskDialogVisible.value = true;
};

/**
 * Handle toggle task completion
 * @param {Object} task - The task to toggle
 */
const handleToggleComplete = async (task) => {
  console.log('DashboardView: Toggling task completion:', task.id);

  try {
    if (task.status === 'complete') {
      // Reopen the task
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
      // Mark as complete - this will trigger dependency validation in TaskRepository
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
    console.error('Error toggling task completion:', error);

    // Show error toast with the validation message
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
 * @param {Object} task - The saved task
 */
const handleTaskSaved = (task) => {
  console.log('DashboardView: Task saved:', task);
  taskDialogVisible.value = false;
  selectedTask.value = null;
  // Task subscriptions will auto-update the list
};

/**
 * Handle status change from TaskList
 * @param {Object} payload - { task, newStatus }
 */
const handleStatusChange = async ({ task, newStatus }) => {
  console.log('DashboardView: Changing task status:', task.id, 'to', newStatus);

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
    console.error('Error changing task status:', error);

    toast.add({
      severity: 'error',
      summary: 'Status Change Failed',
      detail: error.message || 'An error occurred while updating the task status',
      life: 6000,
    });
  }
};

/**
 * Handle edit task from TaskList hover action
 * @param {Object} task - The task to edit
 */
const handleEditTask = (task) => {
  console.log('DashboardView: Editing task:', task.id);
  selectedTask.value = task;
  taskDialogVisible.value = true;
};

/**
 * Handle delete task from TaskList hover action
 * @param {Object} task - The task to delete
 */
const handleDeleteTask = async (task) => {
  console.log('DashboardView: Deleting task:', task.id);

  // Show confirmation dialog
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
    console.error('Error deleting task:', error);

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

  // Initialize user tasks subscription
  taskStore.initializeUserTasksSubscription();
});

onUnmounted(() => {
  if (activityUnsubscribe) {
    activityUnsubscribe();
  }

  // Cleanup task subscriptions
  taskStore.cleanupUserTasksSubscription();
});
</script>

<style scoped>
.space-y-6 > * + * {
  margin-top: 1.5rem;
}

.space-y-3 > * + * {
  margin-top: 0.75rem;
}

.settings-section {
  padding: 0.5rem 0;
}
</style>
