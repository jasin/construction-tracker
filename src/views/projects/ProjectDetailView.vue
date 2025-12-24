<template>
  <div class="project-detail-view">
    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <ProgressSpinner style="width: 50px; height: 50px" />
      <p class="mt-4 text-surface-600">Loading project...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error && !currentProject?.id" class="error-state">
      <div class="error-card">
        <i class="pi pi-exclamation-triangle text-red-500 text-4xl mb-4"></i>
        <h2 class="text-lg font-semibold text-red-900 mb-2">Error Loading Project</h2>
        <p class="text-red-700 mb-4">{{ error }}</p>
        <Button label="Retry" severity="danger" outlined @click="initializeProject" />
      </div>
    </div>

    <!-- Main Content -->
    <div v-else-if="currentProject?.id" class="project-content">
      <!-- Mobile Header - Collapsible -->
      <div class="mobile-header">
        <div class="mobile-header-content" :class="{ collapsed: !headerExpanded }">
          <div class="flex justify-between items-start">
            <div class="flex-1 min-w-0">
              <h1 class="project-title">
                {{ currentProject.job_number }} - {{ currentProject.name }}
              </h1>
              <div class="project-meta">
                <Tag
                  :value="formatPhase(currentProject.phase)"
                  :severity="getPhaseSeverity(currentProject.phase)"
                  size="small"
                />
                <span class="project-cost">{{ formatCurrency(currentProject.cost) }}</span>
              </div>
            </div>
            <Button
              :icon="headerExpanded ? 'pi pi-chevron-up' : 'pi pi-chevron-down'"
              text
              rounded
              @click="headerExpanded = !headerExpanded"
              class="mobile-toggle"
            />
          </div>

          <!-- Expanded Header Content -->
          <div v-show="headerExpanded" class="expanded-content">
            <div class="project-info-grid">
              <div v-if="currentProject.client" class="info-item">
                <i class="pi pi-building"></i>
                <span>{{ currentProject.client }}</span>
              </div>
              <div v-if="currentProject.project_manager" class="info-item">
                <i class="pi pi-user"></i>
                <span>PM: {{ currentProject.project_manager }}</span>
              </div>
              <div v-if="currentProject.superintendent" class="info-item">
                <i class="pi pi-hard-hat"></i>
                <span>Super: {{ currentProject.superintendent }}</span>
              </div>
              <div v-if="currentProject.start_date" class="info-item">
                <i class="pi pi-calendar"></i>
                <span>Start: {{ formatDate(currentProject.start_date) }}</span>
              </div>
            </div>

            <div class="header-actions">
              <Button
                icon="pi pi-pencil"
                label="Edit"
                severity="secondary"
                outlined
                size="small"
                @click="openModal('projectDialog', { mode: 'edit' })"
                :disabled="!permissions.canManageProject"
              />
              <Button
                icon="pi pi-cog"
                label="Settings"
                severity="secondary"
                outlined
                size="small"
                @click="goToSettings"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Desktop Header -->
      <div class="desktop-header">
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <h1 class="project-title">
              {{ currentProject.job_number }} - {{ currentProject.name }}
            </h1>
            <div class="project-info-row">
              <div v-if="currentProject.client" class="info-item">
                <i class="pi pi-building"></i>
                <span>{{ currentProject.client }}</span>
              </div>
              <div v-if="currentProject.project_manager" class="info-item">
                <i class="pi pi-user"></i>
                <span>PM: {{ currentProject.project_manager }}</span>
              </div>
              <div v-if="currentProject.superintendent" class="info-item">
                <i class="pi pi-hard-hat"></i>
                <span>Super: {{ currentProject.superintendent }}</span>
              </div>
            </div>
            <div class="project-meta-row">
              <Tag
                :value="formatPhase(currentProject.phase)"
                :severity="getPhaseSeverity(currentProject.phase)"
              />
              <span class="project-cost">{{ formatCurrency(currentProject.cost) }}</span>
              <Tag
                :value="currentProject.contract_signed ? 'Contract Signed' : 'Contract Pending'"
                :severity="currentProject.contract_signed ? 'success' : 'warn'"
                size="small"
              />
              <div v-if="currentProject.start_date" class="date-info">
                <span class="font-medium">Start:</span> {{ formatDate(currentProject.start_date) }}
              </div>
              <div v-if="currentProject.end_date" class="date-info">
                <span class="font-medium">End:</span> {{ formatDate(currentProject.end_date) }}
              </div>
            </div>
          </div>

          <div class="header-action-buttons">
            <Button
              icon="pi pi-pencil"
              severity="secondary"
              outlined
              @click="openModal('projectDialog', { mode: 'edit' })"
              :disabled="!permissions.canManageProject"
              v-tooltip.bottom="'Edit Project'"
            />
            <Button
              icon="pi pi-cog"
              severity="secondary"
              outlined
              @click="goToSettings"
              v-tooltip.bottom="'Settings'"
            />
            <Button
              icon="pi pi-bell"
              severity="secondary"
              outlined
              :badge="recentActivities.length > 0 ? recentActivities.length.toString() : '0'"
              badgeSeverity="info"
              @click="openModal('activityFlyout')"
              v-tooltip.bottom="'Activity'"
            />
          </div>
        </div>

        <!-- Fallback Banner -->
        <div v-if="currentProject && !currentProject.loadedFully" class="fallback-banner">
          <div class="flex items-center gap-2">
            <i class="pi pi-info-circle"></i>
            <span>Using partial data. Full details may load shortly.</span>
            <Button label="Retry" size="small" text class="ml-auto" @click="retryFullLoad" />
          </div>
        </div>
      </div>

      <!-- Priority Alert Banner -->
      <div v-if="priorityItems.length > 0" class="priority-banner">
        <div class="flex items-start gap-3">
          <i class="pi pi-exclamation-triangle text-xl"></i>
          <div class="flex-1">
            <h3 class="font-semibold">Attention Required</h3>
            <p class="banner-text">
              {{ priorityItems.length }} item{{ priorityItems.length > 1 ? 's' : '' }} need
              immediate attention
            </p>
            <div class="priority-items">
              <div
                v-for="item in priorityItems.slice(0, 3)"
                :key="item.item.id"
                class="priority-item"
              >
                <span class="font-medium capitalize">{{ item.type }}:</span>
                {{ item.item.title || item.item.name }}
                <span class="priority-reason">({{ item.reason.replace('_', ' ') }})</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Content Area - Desktop: Two Rows, Mobile: Tabs -->
      <div class="main-content-area">
        <!-- Mobile: Tasks Section (Before Tabs) -->
        <div class="mobile-tasks-section">
          <div class="mobile-section-card">
            <div class="mobile-section-header">
              <div class="card-header-title">
                <h2 class="card-title">Tasks</h2>
                <Badge v-if="unreadTaskCount > 0" :value="unreadTaskCount" severity="success" />
              </div>
            </div>
            <div class="mobile-section-content">
              <div v-if="tasks.length === 0" class="empty-state-small">
                <i class="pi pi-calendar text-3xl mb-2"></i>
                <p class="text-sm">No tasks yet</p>
                <p class="text-xs text-surface-500">Right-click to create</p>
              </div>
              <div v-else class="task-list">
                <div
                  v-for="task in tasks.slice(0, 5)"
                  :key="task.id"
                  class="task-item"
                  @click="editTask(task)"
                >
                  <div class="flex items-center gap-3 flex-1 min-w-0">
                    <div class="priority-dot" :class="getPriorityColor(task.priority)"></div>
                    <div class="flex-1 min-w-0">
                      <p class="task-title">{{ task.title }}</p>
                      <p class="task-meta">
                        {{ task.assignedToName || 'Unassigned' }} • Due
                        {{ formatDate(task.dueDate) }}
                      </p>
                    </div>
                  </div>
                  <Tag
                    :value="formatTaskStatus(task.status)"
                    :severity="getStatusSeverity(task.status)"
                    size="small"
                  />
                </div>
                <div v-if="tasks.length > 5" class="show-more">
                  <Button
                    :label="`View All ${tasks.length} Tasks`"
                    link
                    size="small"
                    icon="pi pi-arrow-right"
                    iconPos="right"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Mobile: Tabbed Interface -->
        <div class="mobile-tabs">
          <TabView v-model:activeIndex="activeTabIndex" scrollable>
            <TabPanel>
              <template #header>
                <div class="tab-header-label">
                  <span>RFIs</span>
                  <Badge v-if="unreadRFICount > 0" :value="unreadRFICount" severity="success" />
                </div>
              </template>
              <div class="tab-content">
                <RFIList
                  :rfis="rfis"
                  :loading="loading"
                  :project-id="projectId"
                  :is-item-unread="checkIfRFIUnread"
                  :on-item-expanded="handleRFIExpanded"
                  title=""
                  @edit-rfi="handleEditRFI"
                  @delete-rfi="handleDeleteRFI"
                />
              </div>
            </TabPanel>

            <TabPanel>
              <template #header>
                <div class="tab-header-label">
                  <span>Submittals</span>
                  <Badge
                    v-if="unreadSubmittalCount > 0"
                    :value="unreadSubmittalCount"
                    severity="success"
                  />
                </div>
              </template>
              <div class="tab-content">
                <SubmittalList
                  :submittals="submittals"
                  :loading="loading"
                  :project-id="projectId"
                  :on-item-expanded="handleSubmittalExpanded"
                  title=""
                  @edit-submittal="handleEditSubmittal"
                  @delete-submittal="handleDeleteSubmittal"
                />
              </div>
            </TabPanel>

            <TabPanel>
              <template #header>
                <div class="tab-header-label">
                  <span>Change Orders</span>
                  <Badge
                    v-if="unreadChangeOrderCount > 0"
                    :value="unreadChangeOrderCount"
                    severity="success"
                  />
                </div>
              </template>
              <div class="tab-content">
                <ChangeOrderList
                  :changeOrders="changeOrders"
                  :loading="loading"
                  :project-id="projectId"
                  :on-item-expanded="handleChangeOrderExpanded"
                  title=""
                  @edit-change-order="handleEditChangeOrder"
                  @delete-change-order="handleDeleteChangeOrder"
                />
              </div>
            </TabPanel>
          </TabView>
        </div>

        <!-- Desktop: Two-Row Layout -->
        <div class="desktop-layout">
          <!-- Row 1: RFIs, Submittals, Change Orders -->
          <div class="desktop-row-1">
            <div class="content-card">
              <div class="card-header">
                <div class="card-header-title">
                  <h2 class="card-title">RFIs</h2>
                  <Badge v-if="unreadRFICount > 0" :value="unreadRFICount" severity="success" />
                </div>
              </div>
              <div class="card-content">
                <RFIList
                  :rfis="rfis"
                  :loading="loading"
                  :project-id="projectId"
                  :is-item-unread="checkIfRFIUnread"
                  :on-item-expanded="handleRFIExpanded"
                  title=""
                  @edit-rfi="handleEditRFI"
                  @delete-rfi="handleDeleteRFI"
                />
              </div>
            </div>

            <div class="content-card">
              <div class="card-header">
                <div class="card-header-title">
                  <h2 class="card-title">Submittals</h2>
                  <Badge
                    v-if="unreadSubmittalCount > 0"
                    :value="unreadSubmittalCount"
                    severity="success"
                  />
                </div>
              </div>
              <div class="card-content">
                <SubmittalList
                  :submittals="submittals"
                  :loading="loading"
                  :project-id="projectId"
                  :on-item-expanded="handleSubmittalExpanded"
                  title=""
                  @edit-submittal="handleEditSubmittal"
                  @delete-submittal="handleDeleteSubmittal"
                />
              </div>
            </div>

            <div class="content-card">
              <div class="card-header">
                <div class="card-header-title">
                  <h2 class="card-title">Change Orders</h2>
                  <Badge
                    v-if="unreadChangeOrderCount > 0"
                    :value="unreadChangeOrderCount"
                    severity="success"
                  />
                </div>
              </div>
              <div class="card-content">
                <ChangeOrderList
                  :changeOrders="changeOrders"
                  :loading="loading"
                  :project-id="projectId"
                  :on-item-expanded="handleChangeOrderExpanded"
                  title=""
                  @edit-change-order="handleEditChangeOrder"
                  @delete-change-order="handleDeleteChangeOrder"
                />
              </div>
            </div>
          </div>

          <!-- Row 2: Documents and Tasks/Activity -->
          <div class="desktop-row-2">
            <div class="content-card documents-card">
              <div class="card-header">
                <div class="card-header-title">
                  <h2 class="card-title">Documents</h2>
                  <Badge
                    v-if="unreadDocumentCount > 0"
                    :value="unreadDocumentCount"
                    severity="success"
                  />
                </div>
              </div>
              <div class="card-content scrollable">
                <DocumentGrid
                  :documents="documents"
                  :projects="[currentProject]"
                  :project-id="projectId"
                  :on-item-clicked="handleDocumentClicked"
                  @document-click="handleDocumentClick"
                  @document-action="handleDocumentAction"
                />
              </div>
            </div>

            <div class="content-card tasks-activity-card">
              <TabView>
                <TabPanel>
                  <template #header>
                    <div class="tab-header-label compact">
                      <span>Tasks</span>
                      <Badge
                        v-if="unreadTaskCount > 0"
                        :value="unreadTaskCount"
                        severity="success"
                        size="small"
                      />
                    </div>
                  </template>
                  <div v-if="tasks.length === 0" class="empty-state-small">
                    <i class="pi pi-calendar text-3xl mb-2"></i>
                    <p class="text-sm">No tasks yet</p>
                    <p class="text-xs text-surface-500">Right-click to create</p>
                  </div>
                  <div v-else class="task-list">
                    <div
                      v-for="task in tasks"
                      :key="task.id"
                      class="task-item"
                      @click="editTask(task)"
                    >
                      <div class="flex items-center gap-3 flex-1 min-w-0">
                        <div class="priority-dot" :class="getPriorityColor(task.priority)"></div>
                        <div class="flex-1 min-w-0">
                          <p class="task-title">{{ task.title }}</p>
                          <p class="task-meta">
                            {{ task.assignedToName || 'Unassigned' }} •
                            {{ formatDate(task.dueDate) }}
                          </p>
                        </div>
                      </div>
                      <Tag
                        :value="formatTaskStatus(task.status)"
                        :severity="getStatusSeverity(task.status)"
                        size="small"
                      />
                    </div>
                  </div>
                </TabPanel>

                <TabPanel>
                  <template #header>
                    <div class="tab-header-label compact">
                      <span>Activity</span>
                      <Badge
                        v-if="todaysActivityCount > 0"
                        :value="todaysActivityCount"
                        severity="warn"
                        size="small"
                      />
                    </div>
                  </template>
                  <div v-if="recentActivities.length === 0" class="empty-state-small">
                    <i class="pi pi-clock text-3xl mb-2"></i>
                    <p class="text-sm">No activity yet</p>
                  </div>
                  <div v-else class="activity-list">
                    <div
                      v-for="activity in recentActivities.slice(0, 20)"
                      :key="activity.id"
                      class="activity-item"
                    >
                      <div class="activity-dot"></div>
                      <div class="flex-1 min-w-0">
                        <p class="activity-description">{{ activity.description }}</p>
                        <p class="activity-meta">
                          {{ activity.userName }} • {{ formatTimeAgo(activity.timestamp) }}
                        </p>
                      </div>
                    </div>
                  </div>
                </TabPanel>
              </TabView>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { Button, Tag, TabView, TabPanel, ProgressSpinner, Badge } from 'primevue';
import { useProject } from '@/composables/useProject';
import { useProjectStore } from '@/stores/project';
import { useUIStore } from '@/stores/ui';
import { useAuthStore } from '@/stores/auth';
import { useUserActivity } from '@/composables/useUserActivity';
import {
  formatDate,
  formatTimeAgo,
  formatCurrency,
  formatPhase,
  formatTaskStatus,
} from '@/utils/index';
import RFIList from '@/components/lists/RFIList.vue';
import SubmittalList from '@/components/lists/SubmittalList.vue';
import ChangeOrderList from '@/components/lists/ChangeOrderList.vue';
import DocumentGrid from '@/components/widgets/DocumentGrid.vue';

// Props
const props = defineProps({
  projectId: {
    type: String,
    required: true,
  },
});

const router = useRouter();
const uiStore = useUIStore();
const authStore = useAuthStore();
const { setActiveTab, openModal } = uiStore;
const toast = useToast();

// Local state
const headerExpanded = ref(false);
const activeTabIndex = ref(0);

// User activity tracking
const {
  loadProjectActivity,
  updateSectionVisit,
  markItemAsRead,
  isItemUnread,
  getUnreadCount,
  lastSectionVisits,
  readItems,
} = useUserActivity();

// Project composable
const {
  currentProject,
  loading,
  error,
  rfis,
  submittals,
  changeOrders,
  tasks,
  documents,
  recentActivities,
  permissions,
  quickStats,
  priorityItems,
  pendingRFIs,
  pendingSubmittals,
  pendingChangeOrders,
  initializeProject,
  cleanupProject,
} = useProject(props.projectId);

// Compute unread counts using user activity tracking
const unreadRFICount = computed(() => {
  if (!props.projectId || !rfis.value || rfis.value.length === 0) return 0;

  const projectReadItems = readItems.value[props.projectId] || {};

  // Count items that have NOT been specifically read by this user
  const unreadItems = rfis.value.filter((rfi) => {
    const itemKey = `rfi_${rfi.id}`;
    return !projectReadItems[itemKey];
  });

  return unreadItems.length;
});

// Compute unread counts for submittals
const unreadSubmittalCount = computed(() => {
  if (!props.projectId || !submittals.value || submittals.value.length === 0) return 0;

  const projectReadItems = readItems.value[props.projectId] || {};

  const unreadItems = submittals.value.filter((submittal) => {
    const itemKey = `submittal_${submittal.id}`;
    return !projectReadItems[itemKey];
  });

  return unreadItems.length;
});

// Compute unread counts for change orders
const unreadChangeOrderCount = computed(() => {
  if (!props.projectId || !changeOrders.value || changeOrders.value.length === 0) return 0;

  const projectReadItems = readItems.value[props.projectId] || {};

  const unreadItems = changeOrders.value.filter((changeOrder) => {
    const itemKey = `changeOrder_${changeOrder.id}`;
    return !projectReadItems[itemKey];
  });

  return unreadItems.length;
});

// Compute unread counts for tasks
const unreadTaskCount = computed(() => {
  if (!props.projectId || !tasks.value || tasks.value.length === 0) return 0;

  const projectReadItems = readItems.value[props.projectId] || {};

  // Count items that have NOT been specifically read by this user
  // Don't use section visit - only item-level tracking matters
  const unreadItems = tasks.value.filter((task) => {
    const itemKey = `task_${task.id}`;
    return !projectReadItems[itemKey]; // Unread if not in readItems
  });

  return unreadItems.length;
});

// Compute unread counts for documents
const unreadDocumentCount = computed(() => {
  if (!props.projectId || !documents.value || documents.value.length === 0) return 0;

  const projectReadItems = readItems.value[props.projectId] || {};

  const unreadItems = documents.value.filter((document) => {
    const itemKey = `document_${document.id}`;
    return !projectReadItems[itemKey];
  });

  return unreadItems.length;
});

const todaysActivityCount = computed(() => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return recentActivities.value.filter((activity) => {
    const activityDate = new Date(activity.timestamp);
    activityDate.setHours(0, 0, 0, 0);
    return activityDate.getTime() === today.getTime();
  }).length;
});

// Helper functions
const getPhaseSeverity = (phase) => {
  const map = {
    'pre-construction': 'warn',
    construction: 'info',
    'close-out': 'success',
    complete: 'success',
  };
  return map[phase] || 'secondary';
};

const getStatusSeverity = (status) => {
  const map = {
    todo: 'secondary',
    'in-progress': 'info',
    complete: 'success',
    'on-hold': 'warn',
  };
  return map[status] || 'secondary';
};

const getPriorityColor = (priority) => {
  const map = {
    critical: 'bg-red-500',
    high: 'bg-red-500',
    medium: 'bg-yellow-500',
    low: 'bg-green-500',
  };
  return map[priority] || 'bg-gray-400';
};

// Actions
const goToSettings = () => {
  router.push(`/project/${props.projectId}/settings`);
};

const retryFullLoad = async () => {
  try {
    const projectStore = useProjectStore();
    await projectStore.loadProject(props.projectId);
    if (!projectStore.currentProject?.id) {
      const fallback = projectStore.getProjectById(props.projectId) || projectStore.activeProject;
      if (fallback) {
        projectStore.currentProject = { ...fallback, loadedFully: false };
        toast.add({ severity: 'warn', detail: 'Used cached data', life: 3000 });
      }
    } else {
      toast.add({ severity: 'success', detail: 'Full details reloaded', life: 3000 });
    }
  } catch (err) {
    console.error('Retry failed:', err);
    toast.add({ severity: 'error', detail: 'Retry failed – check connection', life: 3000 });
  }
};

const editTask = async (task) => {
  uiStore.openModal('taskDialog', { task });

  // Mark task as read when opened
  if (props.projectId && task.id) {
    await markItemAsRead(props.projectId, 'task', task.id);
  }
};

// User activity handlers
const handleRFIExpanded = async (rfi) => {
  if (props.projectId && rfi.id) {
    await markItemAsRead(props.projectId, 'rfi', rfi.id);
  }
};

const checkIfRFIUnread = (rfi) => {
  if (!props.projectId || !rfi) return false;
  return isItemUnread(rfi, props.projectId, 'rfi', 'rfis');
};

// Submittal handlers
const handleSubmittalExpanded = async (submittal) => {
  if (props.projectId && submittal.id) {
    await markItemAsRead(props.projectId, 'submittal', submittal.id);
  }
};

// Change Order handlers
const handleChangeOrderExpanded = async (changeOrder) => {
  if (props.projectId && changeOrder.id) {
    await markItemAsRead(props.projectId, 'changeOrder', changeOrder.id);
  }
};

// Document handlers
const handleDocumentClicked = async (document) => {
  if (props.projectId && document.id) {
    await markItemAsRead(props.projectId, 'document', document.id);
  }
};

// Entity handlers
const handleEditRFI = (rfi) => {
  openModal('rfiDialog', { mode: 'edit', rfi });
};

const handleDeleteRFI = (rfi) => {
  console.log('Delete RFI:', rfi);
};

const handleEditSubmittal = (submittal) => {
  openModal('submittalDialog', { mode: 'edit', submittal });
};

const handleDeleteSubmittal = (submittal) => {
  console.log('Delete Submittal:', submittal);
};

const handleEditChangeOrder = (changeOrder) => {
  openModal('changeOrderDialog', { mode: 'edit', changeOrder });
};

const handleDeleteChangeOrder = (changeOrder) => {
  console.log('Delete Change Order:', changeOrder);
};

const handleDocumentClick = (document) => {
  console.log('Document clicked:', document);
};

const handleDocumentAction = ({ action, document }) => {
  console.log('Document action:', action, document);
};

// Lifecycle
onMounted(async () => {
  console.log('[DEBUG] onMounted - projectId:', props.projectId);
  await initializeProject();

  console.log('[DEBUG] After initializeProject - rfis:', rfis.value);

  // Load user activity data for notification badges for all sections
  if (props.projectId) {
    await loadProjectActivity(props.projectId, [
      'rfis',
      'submittals',
      'changeOrders',
      'tasks',
      'documents',
    ]);
    console.log('[DEBUG] After loadProjectActivity - readItems:', readItems.value);
  }
});

onBeforeUnmount(() => {
  cleanupProject();
});

watch(
  () => props.projectId,
  (newProjectId, oldProjectId) => {
    if (newProjectId !== oldProjectId) {
      cleanupProject();
      initializeProject();
    }
  }
);
</script>

<style scoped>
.project-detail-view {
  min-height: 100vh;
  background: var(--p-surface-50);
}

/* Loading & Error States */
.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  text-align: center;
}

.error-card {
  background: var(--p-red-50);
  border: 1px solid var(--p-red-200);
  border-radius: 0.5rem;
  padding: 2rem;
  max-width: 28rem;
}

/* Project Content */
.project-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
}

/* Mobile Header */
.mobile-header {
  display: block;
  background: var(--p-surface-0);
  border: 1px solid var(--p-surface-200);
  border-radius: 0.5rem;
  overflow: hidden;
}

.mobile-header-content {
  padding: 1rem;
}

.mobile-header-content.collapsed .expanded-content {
  display: none;
}

.project-title {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--p-surface-900);
  margin-bottom: 0.5rem;
  line-height: 1.3;
}

.project-meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.project-cost {
  font-size: 1rem;
  font-weight: 600;
  color: var(--p-green-600);
}

.expanded-content {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--p-surface-200);
}

.project-info-grid {
  display: grid;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--p-surface-700);
}

.info-item i {
  color: var(--p-surface-500);
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.mobile-toggle {
  flex-shrink: 0;
}

/* Desktop Header */
.desktop-header {
  display: none;
  background: var(--p-surface-0);
  border: 1px solid var(--p-surface-200);
  border-radius: 0.5rem;
  padding: 1.5rem;
}

.project-info-row {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  margin-top: 0.5rem;
}

.project-meta-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 1rem;
}

.date-info {
  font-size: 0.875rem;
  color: var(--p-surface-700);
}

.header-action-buttons {
  display: flex;
  gap: 0.5rem;
}

.fallback-banner {
  background: var(--p-yellow-50);
  border: 1px solid var(--p-yellow-200);
  border-radius: 0.5rem;
  padding: 1rem;
  margin-top: 1rem;
  color: var(--p-yellow-800);
}

/* Priority Banner */
.priority-banner {
  background: var(--p-amber-50);
  border: 1px solid var(--p-amber-200);
  border-radius: 0.5rem;
  padding: 1rem;
}

.priority-banner i {
  color: var(--p-amber-600);
}

.priority-banner h3 {
  color: var(--p-amber-900);
}

.banner-text {
  font-size: 0.875rem;
  color: var(--p-amber-800);
  margin-top: 0.25rem;
}

.priority-items {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-top: 0.5rem;
}

.priority-item {
  font-size: 0.875rem;
  color: var(--p-amber-800);
}

.priority-reason {
  color: var(--p-amber-600);
}

/* Main Content Area */
.main-content-area {
  flex: 1;
}

/* Mobile Tasks Section */
.mobile-tasks-section {
  display: block;
  margin-bottom: 1rem;
}

.mobile-section-card {
  background: var(--p-surface-0);
  border: 1px solid var(--p-surface-200);
  border-radius: 0.5rem;
  overflow: hidden;
}

.mobile-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid var(--p-surface-200);
}

.mobile-section-content {
  padding: 1rem;
}

.show-more {
  text-align: center;
  padding-top: 0.75rem;
  border-top: 1px solid var(--p-surface-200);
  margin-top: 0.75rem;
}

/* Mobile Tabs */
.mobile-tabs {
  display: block;
}

.tab-header-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.tab-header-label.compact {
  gap: 0.375rem;
  font-size: 0.875rem;
}

.tab-content {
  padding: 1rem 0;
}

.tab-actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 1rem;
}

/* Desktop Layout */
.desktop-layout {
  display: none;
}

.desktop-row-1,
.desktop-row-2 {
  display: grid;
  gap: 1rem;
  margin-bottom: 1rem;
}

.desktop-row-1 {
  grid-template-columns: repeat(3, 1fr);
}

.desktop-row-2 {
  grid-template-columns: 2fr 1fr;
}

.content-card {
  background: var(--p-surface-0);
  border: 1px solid var(--p-surface-200);
  border-radius: 0.5rem;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  max-height: 600px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid var(--p-surface-200);
}

.card-header-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.card-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--p-surface-900);
}

.card-content {
  flex: 1;
  overflow: hidden;
  padding: 0.5rem;
}

.card-content.scrollable {
  overflow-y: auto;
}

.card-header-inline {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--p-surface-200);
  margin-bottom: 0.5rem;
}

/* Task List */
.task-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.task-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem;
  border: 1px solid var(--p-surface-200);
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
}

.task-item:hover {
  background: var(--p-surface-50);
  border-color: var(--p-surface-300);
}

.priority-dot {
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 50%;
  flex-shrink: 0;
}

.task-title {
  font-weight: 500;
  color: var(--p-surface-900);
  font-size: 0.875rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-meta {
  font-size: 0.75rem;
  color: var(--p-surface-600);
  margin-top: 0.25rem;
}

/* Activity List */
.activity-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.5rem;
}

.activity-item {
  display: flex;
  gap: 0.75rem;
}

.activity-dot {
  width: 0.5rem;
  height: 0.5rem;
  background: var(--p-blue-400);
  border-radius: 50%;
  margin-top: 0.25rem;
  flex-shrink: 0;
}

.activity-description {
  font-size: 0.875rem;
  color: var(--p-surface-800);
}

.activity-meta {
  font-size: 0.75rem;
  color: var(--p-surface-600);
  margin-top: 0.25rem;
}

/* Empty States */
.empty-state,
.empty-state-small {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  text-align: center;
  color: var(--p-surface-500);
}

.empty-state-small {
  padding: 2rem 1rem;
}

/* Desktop Breakpoint */
@media (min-width: 768px) {
  .project-content {
    padding: 1.5rem;
    gap: 1.5rem;
  }

  .mobile-header {
    display: none;
  }

  .desktop-header {
    display: block;
  }

  .project-title {
    font-size: 1.5rem;
  }

  .mobile-tasks-section {
    display: none;
  }

  .mobile-tabs {
    display: none;
  }

  .desktop-layout {
    display: block;
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .project-detail-view {
    background: var(--p-surface-900);
  }

  .error-card {
    background: rgba(239, 68, 68, 0.1);
  }
}
</style>
