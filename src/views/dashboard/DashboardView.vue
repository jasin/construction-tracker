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
          icon="pi pi-file"
          label="Documents"
          @click="openMobileSection('documents')"
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
                {{ project.job_number }} {{ project.name }}
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
      v-else-if="isMobile && uiStore.mobileActiveSection === 'rfis'"
      title="RFIs"
      @back="closeMobileSection"
    >
      <RFIList
        :rfis="rfiStore.userRFIs"
        :loading="rfiStore.userRFIsLoading"
        title=""
        @create-rfi="handleCreateRFI"
        @rfi-click="handleRFIClick"
        @edit-rfi="handleEditRFI"
      />
    </DashboardMobileSection>

    <DashboardMobileSection
      v-else-if="isMobile && uiStore.mobileActiveSection === 'submittals'"
      title="Submittals"
      @back="closeMobileSection"
    >
      <SubmittalList
        :submittals="submittalStore.userSubmittals"
        :loading="submittalStore.userSubmittalsLoading"
        title=""
        @create-submittal="handleCreateSubmittal"
        @submittal-click="handleSubmittalClick"
        @edit-submittal="handleEditSubmittal"
        @delete-submittal="handleDeleteSubmittal"
      />
    </DashboardMobileSection>

    <DashboardMobileSection
      v-else-if="isMobile && uiStore.mobileActiveSection === 'changeOrders'"
      title="Change Orders"
      @back="closeMobileSection"
    >
      <ChangeOrderList
        :change-orders="changeOrderStore.userChangeOrders"
        :loading="changeOrderStore.userChangeOrdersLoading"
        title=""
        @create-change-order="handleCreateChangeOrder"
        @change-order-click="handleChangeOrderClick"
        @edit-change-order="handleEditChangeOrder"
        @delete-change-order="handleDeleteChangeOrder"
      />
    </DashboardMobileSection>

    <DashboardMobileSection
      v-else-if="isMobile && uiStore.mobileActiveSection === 'documents'"
      title="Documents"
      @back="closeMobileSection"
    >
      <DocumentList
        :documents="documentStore.userRecentDocuments"
        :loading="documentStore.userDocumentsLoading"
        :projects="projectStore.projects"
        title=""
        @create-document="handleCreateDocument"
        @document-click="handleDocumentClick"
        @view-document="handleViewDocument"
        @edit-document="handleEditDocument"
        @delete-document="handleDeleteDocument"
      />
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

      <!-- Row 1: Tasks and Documents (Full Width) -->
      <div class="mb-6">
        <div class="grid grid-cols-1 md:grid-cols-12 gap-4 dashboard-row-1">
          <div class="col-span-1 md:col-span-6 dashboard-component-wrapper">
            <TaskList
              :tasks="taskStore.userTasks"
              :loading="taskStore.userTasksLoading"
              title="Tasks"
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
          <div class="col-span-1 md:col-span-6 dashboard-component-wrapper">
            <DocumentList
              :documents="documentStore.userRecentDocuments"
              :loading="documentStore.userDocumentsLoading"
              :projects="projectStore.projects"
              title="Documents"
              @create-document="handleCreateDocument"
              @document-click="handleDocumentClick"
              @view-document="handleViewDocument"
              @edit-document="handleEditDocument"
              @delete-document="handleDeleteDocument"
            />
          </div>
        </div>
      </div>

      <!-- Row 2: Submittals, RFIs, Change Orders (12-Column Layout) -->
      <div class="mb-6">
        <div class="grid grid-cols-1 md:grid-cols-12 gap-4 dashboard-row-2">
          <div class="col-span-1 md:col-span-4 dashboard-component-wrapper">
            <SubmittalList
              :submittals="submittalStore.userSubmittals"
              :loading="submittalStore.userSubmittalsLoading"
              title="Submittals"
              @create-submittal="handleCreateSubmittal"
              @submittal-click="handleSubmittalClick"
              @edit-submittal="handleEditSubmittal"
              @delete-submittal="handleDeleteSubmittal"
            />
          </div>
          <div class="col-span-1 md:col-span-4 dashboard-component-wrapper">
            <RFIList
              :rfis="rfiStore.userRFIs"
              :loading="rfiStore.userRFIsLoading"
              title="Request Information"
              @create-rfi="handleCreateRFI"
              @rfi-click="handleRFIClick"
              @edit-rfi="handleEditRFI"
            />
          </div>
          <div class="col-span-1 md:col-span-4 dashboard-component-wrapper">
            <ChangeOrderList
              :change-orders="changeOrderStore.userChangeOrders"
              :loading="changeOrderStore.userChangeOrdersLoading"
              title="Change Orders"
              @create-change-order="handleCreateChangeOrder"
              @change-order-click="handleChangeOrderClick"
              @edit-change-order="handleEditChangeOrder"
              @delete-change-order="handleDeleteChangeOrder"
            />
          </div>
        </div>
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
                  {{ project.job_number }} {{ project.name }}
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

    <!-- Submittal Dialog -->
    <SubmittalDialog
      v-model:visible="submittalDialogVisible"
      :submittal="selectedSubmittal"
      :project-id="null"
      @submittal-saved="handleSubmittalSaved"
    />

    <!-- Change Order Dialog -->
    <ChangeOrderDialog
      v-model:visible="changeOrderDialogVisible"
      :change-order="selectedChangeOrder"
      :project-id="null"
      @change-order-saved="handleChangeOrderSaved"
    />

    <!-- Document Dialog -->
    <DocumentDialog
      v-model:visible="documentDialogVisible"
      :document="selectedDocument"
      :project-id="null"
      @document-saved="handleDocumentSaved"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useWindowSize } from '@vueuse/core';

import Card from 'primevue/card';
import ProgressSpinner from 'primevue/progressspinner';

import { useActivityStore } from '@/stores/activity';
import { ACTIVITY_CATEGORIES } from '@/constants/activityActions';

import { useProjectStore } from '@/stores/project';
import { useTaskStore } from '@/stores/task';
import { useRFIStore } from '@/stores/rfi';
import { useSubmittalStore } from '@/stores/submittal';
import { useChangeOrderStore } from '@/stores/changeOrder';
import { useDocumentStore } from '@/stores/document';
import { useUIStore } from '@/stores/ui';

import TaskList from '@/components/lists/TaskList.vue';
import TaskDialog from '@/components/forms/TaskDialog.vue';
import SubmittalDialog from '@/components/forms/SubmittalDialog.vue';
import ChangeOrderList from '@/components/lists/ChangeOrderList.vue';
import ChangeOrderDialog from '@/components/forms/ChangeOrderDialog.vue';
import DocumentList from '@/components/lists/DocumentList.vue';
import DocumentDialog from '@/components/forms/DocumentDialog.vue';
import RFIList from '@/components/lists/RFIList.vue';
import SubmittalList from '@/components/lists/SubmittalList.vue';
import DashboardSectionButton from '@/components/dashboard/DashboardSectionButton.vue';
import DashboardMobileSection from '@/components/dashboard/DashboardMobileSection.vue';

const emit = defineEmits(['open-rfi-dialog']);

const toast = useToast();
const { width } = useWindowSize();

const projectStore = useProjectStore();
const taskStore = useTaskStore();
const rfiStore = useRFIStore();
const submittalStore = useSubmittalStore();
const changeOrderStore = useChangeOrderStore();
const documentStore = useDocumentStore();
const activityStore = useActivityStore();
const uiStore = useUIStore();

const loading = ref(true);
const activities = ref([]);

// Task dialog state
const taskDialogVisible = ref(false);
const selectedTask = ref(null);

// Submittal dialog state
const submittalDialogVisible = ref(false);
const selectedSubmittal = ref(null);

// Change Order dialog state
const changeOrderDialogVisible = ref(false);
const selectedChangeOrder = ref(null);

// Document dialog state
const documentDialogVisible = ref(false);
const selectedDocument = ref(null);

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

// Dynamic column span class for TaskList
// TaskList will span N columns within the 4-column grid
const getTaskListSpanClass = computed(() => {
  const cols = uiStore.taskListColumns;
  const classMap = {
    1: 'col-span-1 md:col-span-1',
    2: 'col-span-1 md:col-span-2',
    3: 'col-span-1 md:col-span-3',
    4: 'col-span-1 md:col-span-4',
  };
  return classMap[cols] || 'col-span-1 md:col-span-1';
});

/**
 * Computes grouped activities by projectId.
 */
const groupedActivities = computed(() => {
  return activities.value.reduce((acc, activity) => {
    const pid = activity.project_id;
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
const setupActivitySubscription = async () => {
  // Load recent activities from the activity store
  await activityStore.loadRecentActivities(200);

  // Use the activities from the store (it has real-time subscriptions built in)
  activities.value = activityStore.activities;
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
    documents: 'Documents',
    activity: 'Activity Log',
  };
  return titles[sectionName] || 'Section';
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

/**
 * Handle RFI actions
 */
const handleCreateRFI = () => {
  emit('open-rfi-dialog', null);
};

const handleRFIClick = (rfi) => {
  // TODO: Open RFI detail view/edit dialog
  console.log('RFI clicked:', rfi);
  emit('open-rfi-dialog', rfi);
};

const handleEditRFI = (rfi) => {
  emit('open-rfi-dialog', rfi);
};

/**
 * Handle Submittal actions
 */
const handleCreateSubmittal = () => {
  selectedSubmittal.value = null;
  submittalDialogVisible.value = true;
};

const handleSubmittalClick = (submittal) => {
  selectedSubmittal.value = submittal;
  submittalDialogVisible.value = true;
};

const handleEditSubmittal = (submittal) => {
  selectedSubmittal.value = submittal;
  submittalDialogVisible.value = true;
};

const handleDeleteSubmittal = async (submittal) => {
  // TODO: Implement submittal deletion
  console.log('Delete submittal:', submittal);
};

/**
 * Handle submittal saved from dialog
 */
const handleSubmittalSaved = () => {
  submittalDialogVisible.value = false;
  selectedSubmittal.value = null;
};

/**
 * Handle Change Order actions
 */
const handleCreateChangeOrder = () => {
  selectedChangeOrder.value = null;
  changeOrderDialogVisible.value = true;
};

const handleChangeOrderClick = (changeOrder) => {
  selectedChangeOrder.value = changeOrder;
  changeOrderDialogVisible.value = true;
};

const handleEditChangeOrder = (changeOrder) => {
  selectedChangeOrder.value = changeOrder;
  changeOrderDialogVisible.value = true;
};

const handleDeleteChangeOrder = async (changeOrder) => {
  if (!confirm(`Are you sure you want to delete change order "${changeOrder.title}"?`)) {
    return;
  }

  try {
    await changeOrderStore.deleteChangeOrder(changeOrder.id);
    toast.add({
      severity: 'success',
      summary: 'Change Order Deleted',
      detail: `"${changeOrder.title}" has been deleted`,
      life: 3000,
    });
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Delete Failed',
      detail: error.message || 'An error occurred while deleting the change order',
      life: 5000,
    });
  }
};

/**
 * Handle change order saved from dialog
 */
const handleChangeOrderSaved = () => {
  changeOrderDialogVisible.value = false;
  selectedChangeOrder.value = null;
};

/**
 * Handle Document actions
 */
const handleCreateDocument = () => {
  selectedDocument.value = null;
  documentDialogVisible.value = true;
};

const handleDocumentClick = (document) => {
  selectedDocument.value = document;
  documentDialogVisible.value = true;
};

const handleViewDocument = (document) => {
  // Open document in new tab if it has a Google Drive link
  if (document.googleDriveLink) {
    window.open(document.googleDriveLink, '_blank');
  } else if (document.googleDriveFileId) {
    window.open(`https://drive.google.com/file/d/${document.googleDriveFileId}/view`, '_blank');
  } else {
    toast.add({
      severity: 'info',
      summary: 'No Link Available',
      detail: 'This document does not have a Google Drive link',
      life: 3000,
    });
  }
};

const handleEditDocument = (document) => {
  selectedDocument.value = document;
  documentDialogVisible.value = true;
};

const handleDeleteDocument = async (document) => {
  if (!confirm(`Are you sure you want to delete document "${document.name}"?`)) {
    return;
  }

  try {
    await documentStore.deleteDocument(document.id);
    toast.add({
      severity: 'success',
      summary: 'Document Deleted',
      detail: `"${document.name}" has been deleted`,
      life: 3000,
    });
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Delete Failed',
      detail: error.message || 'An error occurred while deleting the document',
      life: 5000,
    });
  }
};

/**
 * Handle document saved from dialog
 */
const handleDocumentSaved = () => {
  documentDialogVisible.value = false;
  selectedDocument.value = null;
};

onMounted(async () => {
  loadData();
  setupActivitySubscription();
  taskStore.initializeUserTasksSubscription();
  rfiStore.initializeUserRFIsSubscription();
  submittalStore.initializeUserSubmittalsSubscription();
  changeOrderStore.initializeUserChangeOrdersSubscription();
  documentStore.initializeUserDocumentsSubscription();
});

onUnmounted(() => {
  // Activity store manages its own subscriptions
  taskStore.cleanupUserTasksSubscription();
  rfiStore.cleanupUserRFIsSubscription();
  submittalStore.cleanupUserSubmittalsSubscription();
  changeOrderStore.cleanupUserChangeOrdersSubscription();
  documentStore.cleanupUserDocumentsSubscription();
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

/* Dashboard row height constraints */
.dashboard-row-1 {
  height: 300px;
  min-height: 300px;
}

.dashboard-row-2 {
  height: 300px;
  min-height: 300px;
}

/* Component wrapper with overflow handling */
.dashboard-component-wrapper {
  display: flex;
  flex-direction: column;
  min-height: 0;
  max-height: 300px;
  overflow: hidden;
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
