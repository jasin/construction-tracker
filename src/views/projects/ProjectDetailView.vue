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
                {{ currentProject.jobNumber }} - {{ currentProject.name }}
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
              <div v-if="currentProject.projectManager" class="info-item">
                <i class="pi pi-user"></i>
                <span>PM: {{ currentProject.projectManager }}</span>
              </div>
              <div v-if="currentProject.superintendent" class="info-item">
                <i class="pi pi-hard-hat"></i>
                <span>Super: {{ currentProject.superintendent }}</span>
              </div>
              <div v-if="currentProject.startDate" class="info-item">
                <i class="pi pi-calendar"></i>
                <span>Start: {{ formatDate(currentProject.startDate) }}</span>
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
              {{ currentProject.jobNumber }} - {{ currentProject.name }}
            </h1>
            <div class="project-info-row">
              <div v-if="currentProject.client" class="info-item">
                <i class="pi pi-building"></i>
                <span>{{ currentProject.client }}</span>
              </div>
              <div v-if="currentProject.projectManager" class="info-item">
                <i class="pi pi-user"></i>
                <span>PM: {{ currentProject.projectManager }}</span>
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
                :value="currentProject.contractSigned ? 'Contract Signed' : 'Contract Pending'"
                :severity="currentProject.contractSigned ? 'success' : 'warn'"
                size="small"
              />
              <div v-if="currentProject.startDate" class="date-info">
                <span class="font-medium">Start:</span> {{ formatDate(currentProject.startDate) }}
              </div>
              <div v-if="currentProject.endDate" class="date-info">
                <span class="font-medium">End:</span> {{ formatDate(currentProject.endDate) }}
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
                <Badge :value="tasks.length" severity="info" />
                <Badge
                  v-if="recentTaskCount > 0"
                  :value="`+${recentTaskCount} new`"
                  severity="success"
                />
              </div>
              <Button
                icon="pi pi-plus"
                severity="primary"
                size="small"
                @click="openModal('taskSlideOver')"
                v-tooltip.bottom="'Create Task'"
              />
            </div>
            <div class="mobile-section-content">
              <div v-if="tasks.length === 0" class="empty-state-small">
                <i class="pi pi-calendar text-3xl mb-2"></i>
                <p class="text-sm">No tasks yet</p>
                <Button
                  label="Create First Task"
                  size="small"
                  class="mt-2"
                  @click="openModal('taskSlideOver')"
                />
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
                  <Badge :value="rfis.length" severity="info" />
                  <Badge
                    v-if="recentRFICount > 0"
                    :value="`+${recentRFICount}`"
                    severity="success"
                  />
                </div>
              </template>
              <div class="tab-content">
                <div class="tab-actions">
                  <Button
                    icon="pi pi-plus"
                    label="New RFI"
                    severity="primary"
                    size="small"
                    @click="openModal('rfiDialog')"
                  />
                </div>
                <RFIList
                  :rfis="rfis"
                  :loading="loading"
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
                  <Badge :value="submittals.length" severity="info" />
                  <Badge
                    v-if="recentSubmittalCount > 0"
                    :value="`+${recentSubmittalCount}`"
                    severity="success"
                  />
                </div>
              </template>
              <div class="tab-content">
                <div class="tab-actions">
                  <Button
                    icon="pi pi-plus"
                    label="New Submittal"
                    severity="primary"
                    size="small"
                    @click="openModal('submittalDialog')"
                  />
                </div>
                <SubmittalList
                  :submittals="submittals"
                  :loading="loading"
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
                  <Badge :value="changeOrders.length" severity="info" />
                  <Badge
                    v-if="recentChangeOrderCount > 0"
                    :value="`+${recentChangeOrderCount}`"
                    severity="success"
                  />
                </div>
              </template>
              <div class="tab-content">
                <div class="tab-actions">
                  <Button
                    icon="pi pi-plus"
                    label="New CO"
                    severity="primary"
                    size="small"
                    @click="openModal('changeOrderDialog')"
                  />
                </div>
                <ChangeOrderList
                  :changeOrders="changeOrders"
                  :loading="loading"
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
                  <Badge :value="rfis.length" severity="info" />
                  <Badge
                    v-if="recentRFICount > 0"
                    :value="`+${recentRFICount} new`"
                    severity="success"
                  />
                </div>
                <Button
                  icon="pi pi-plus"
                  severity="primary"
                  size="small"
                  @click="openModal('rfiDialog')"
                  v-tooltip.bottom="'Create RFI'"
                />
              </div>
              <div class="card-content">
                <RFIList
                  :rfis="rfis"
                  :loading="loading"
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
                  <Badge :value="submittals.length" severity="info" />
                  <Badge
                    v-if="recentSubmittalCount > 0"
                    :value="`+${recentSubmittalCount} new`"
                    severity="success"
                  />
                </div>
                <Button
                  icon="pi pi-plus"
                  severity="primary"
                  size="small"
                  @click="openModal('submittalDialog')"
                  v-tooltip.bottom="'Create Submittal'"
                />
              </div>
              <div class="card-content">
                <SubmittalList
                  :submittals="submittals"
                  :loading="loading"
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
                  <Badge :value="changeOrders.length" severity="info" />
                  <Badge
                    v-if="recentChangeOrderCount > 0"
                    :value="`+${recentChangeOrderCount} new`"
                    severity="success"
                  />
                </div>
                <Button
                  icon="pi pi-plus"
                  severity="primary"
                  size="small"
                  @click="openModal('changeOrderDialog')"
                  v-tooltip.bottom="'Create Change Order'"
                />
              </div>
              <div class="card-content">
                <ChangeOrderList
                  :changeOrders="changeOrders"
                  :loading="loading"
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
                  <Badge :value="documents.length" severity="info" />
                  <Badge
                    v-if="recentDocumentCount > 0"
                    :value="`+${recentDocumentCount} new`"
                    severity="success"
                  />
                </div>
                <Button
                  icon="pi pi-upload"
                  severity="primary"
                  size="small"
                  @click="openModal('documentUploader')"
                  v-tooltip.bottom="'Upload Document'"
                />
              </div>
              <div class="card-content scrollable">
                <DocumentGrid
                  :documents="documents"
                  :projects="[currentProject]"
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
                      <Badge :value="tasks.length" severity="info" size="small" />
                      <Badge
                        v-if="recentTaskCount > 0"
                        :value="`+${recentTaskCount}`"
                        severity="success"
                        size="small"
                      />
                    </div>
                  </template>
                  <div class="card-header-inline">
                    <Button
                      icon="pi pi-plus"
                      label="Add Task"
                      severity="primary"
                      size="small"
                      text
                      @click="openModal('taskSlideOver')"
                    />
                  </div>
                  <div v-if="tasks.length === 0" class="empty-state-small">
                    <i class="pi pi-calendar text-3xl mb-2"></i>
                    <p class="text-sm">No tasks yet</p>
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

// Compute recent activity counts (items created/updated in last 24 hours)
const getRecentCount = (items, dateField = 'createdAt') => {
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  return items.filter((item) => {
    const itemDate = new Date(item[dateField]).getTime();
    return itemDate > oneDayAgo;
  }).length;
};

const recentRFICount = computed(() => getRecentCount(rfis.value));
const recentSubmittalCount = computed(() => getRecentCount(submittals.value));
const recentChangeOrderCount = computed(() => getRecentCount(changeOrders.value));
const recentDocumentCount = computed(() => getRecentCount(documents.value, 'uploadedAt'));
const recentTaskCount = computed(() => getRecentCount(tasks.value));

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

const editTask = (task) => {
  openModal('taskSlideOver', { task });
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
  await initializeProject();
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
