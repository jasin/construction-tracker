<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center h-screen">
      <div class="text-center">
        <i class="pi pi-spinner pi-spin text-4xl text-blue-500 mb-4"></i>
        <p class="text-lg text-gray-600">Loading project...</p>
      </div>
    </div>

    <!-- Error State (Temporarily commented out to show main content despite errors) -->
    <!--
    <div v-else-if="error" class="flex items-center justify-center h-screen">
      <div class="bg-red-50 border border-red-200 rounded-lg p-8 text-center max-w-md">
        <i class="pi pi-exclamation-triangle text-red-500 text-3xl mb-4"></i>
        <h2 class="text-lg font-semibold text-red-900 mb-2">Error Loading Project</h2>
        <p class="text-red-700">{{ error }}</p>
        <Button label="Retry" severity="danger" outlined class="mt-4" @click="initializeProject" />
      </div>
    </div>
    -->

    <!-- Main Content -->
    <div v-else class="space-y-6">
      <!-- Project Header -->
      <div class="bg-white shadow-sm border-b border-gray-200">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div class="flex justify-between items-start">
            <div>
              <h1 class="text-2xl font-bold text-gray-900">
                {{ currentProject?.jobNumber || '' }} - {{ currentProject?.name || '' }}
              </h1>
              <div class="mt-2 flex items-center gap-6 text-sm text-gray-600">
                <div v-if="currentProject?.projectManager" class="flex items-center gap-1">
                  <i class="pi pi-building"></i>
                  <span>{{ currentProject?.client }}</span>
                </div>
                <div v-if="currentProject?.superintendent" class="flex items-center gap-1">
                  <i class="pi pi-user"></i>
                  <span>PM: {{ currentProject?.projectManager }}</span>
                </div>
                <div v-if="currentProject?.superintendent" class="flex items-center gap-1">
                  <i class="pi pi-hard-hat"></i>
                  <span>Super: {{ currentProject?.superintendent }}</span>
                </div>
              </div>

              <!-- Fallback Banner for Partial Data -->
              <div
                v-if="currentProject && !currentProject?.loadedFully"
                class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4"
              >
                <div class="flex items-center gap-2 text-yellow-800">
                  <i class="pi pi-info-circle"></i>
                  <span>Using partial data. Full details may load shortly.</span>
                  <Button
                    label="Retry Full Load"
                    size="small"
                    text
                    class="ml-auto"
                    @click="retryFullLoad"
                  />
                </div>
              </div>
            </div>

            <div class="flex gap-2">
              <Button
                icon="pi pi-pencil"
                severity="secondary"
                outlined
                @click="openModal('projectDialog')"
                :disabled="!permissions.canManageProject"
              />
              <Button icon="pi pi-cog" severity="secondary" outlined @click="goToSettings" />
              <Button
                icon="pi pi-bell"
                severity="secondary"
                outlined
                :badge="recentActivities.length.toString()"
                badge-severity="info"
                @click="openModal('activityFlyout')"
              />
            </div>
          </div>

          <!-- Status Bar -->
          <div class="mt-4 flex gap-4 items-center">
            <Tag
              :value="formatPhase(currentProject.phase)"
              :severity="getPhaseSeverity(currentProject.phase)"
            />
            <span class="text-lg font-semibold text-green-600">
              {{ formatCurrency(currentProject.cost) }}
            </span>
            <Tag
              :value="currentProject.contractSigned ? 'Contract Signed' : 'Contract Pending'"
              :severity="currentProject.contractSigned ? 'success' : 'warning'"
            />
            <div v-if="currentProject.startDate" class="text-sm text-gray-600">
              <span class="font-medium">Start:</span> {{ formatDate(currentProject.startDate) }}
            </div>
            <div v-if="currentProject.endDate" class="text-sm text-gray-600">
              <span class="font-medium">End:</span> {{ formatDate(currentProject.endDate) }}
            </div>
          </div>
        </div>
      </div>

      <!-- Dashboard Content -->
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <!-- Priority Alert Banner -->
        <div
          v-if="priorityItems.length > 0"
          class="bg-amber-50 border border-amber-200 rounded-lg p-4"
        >
          <div class="flex items-start gap-3">
            <i class="pi pi-exclamation-triangle text-amber-600 text-lg mt-0.5"></i>
            <div class="flex-1">
              <h3 class="font-semibold text-amber-900">Attention Required</h3>
              <p class="text-amber-800 text-sm mt-1">
                You have {{ priorityItems.length }} items that need immediate attention
              </p>
              <div class="mt-2 space-y-1">
                <div
                  v-for="item in priorityItems.slice(0, 3)"
                  :key="item.item.id"
                  class="text-sm text-amber-800"
                >
                  <span class="font-medium capitalize">{{ item.type }}:</span>
                  {{ item.item.title || item.item.name }}
                  <span class="text-amber-600">({{ item.reason.replace('_', ' ') }})</span>
                </div>
              </div>
              <Button
                v-if="priorityItems.length > 3"
                label="View All Priority Items"
                link
                size="small"
                class="mt-2 text-amber-700"
                @click="setActiveTab('priority')"
              />
            </div>
          </div>
        </div>

        <!-- What's New Section -->
        <div
          v-if="todaysActivities.length > 0"
          class="bg-blue-50 border border-blue-200 rounded-lg p-4"
        >
          <div class="flex items-start gap-3">
            <i class="pi pi-clock text-blue-600 text-lg mt-0.5"></i>
            <div class="flex-1">
              <h3 class="font-semibold text-blue-900">What's New Today</h3>
              <div class="mt-2 space-y-2">
                <div
                  v-for="activity in todaysActivities.slice(0, 3)"
                  :key="activity.id"
                  class="text-sm text-blue-800 flex items-center gap-2"
                >
                  <span class="w-2 h-2 bg-blue-400 rounded-full"></span>
                  {{ activity.description }}
                  <span class="text-blue-600 text-xs">{{ formatTimeAgo(activity.timestamp) }}</span>
                </div>
              </div>
              <Button
                label="View All Activity"
                link
                size="small"
                class="mt-2 text-blue-700"
                @click="openModal('activityFlyout')"
              />
            </div>
          </div>
        </div>

        <!-- Main Dashboard Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Quick Stats Cards -->
          <div class="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
            <!-- RFIs Card -->
            <div
              class="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
            >
              <div class="p-4">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm font-medium text-gray-600">RFIs</p>
                    <p class="text-2xl font-bold text-gray-900">{{ quickStats.rfis }}</p>
                    <p v-if="pendingRFIs.length > 0" class="text-xs text-amber-600">
                      {{ pendingRFIs.length }} pending
                    </p>
                  </div>
                  <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <i class="pi pi-question-circle text-blue-600 text-xl"></i>
                  </div>
                </div>
                <Button
                  label="View RFIs"
                  link
                  size="small"
                  class="mt-2 w-full justify-center"
                  @click="setActiveTab('construction')"
                />
              </div>
            </div>

            <!-- Submittals Card -->
            <div
              class="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
            >
              <div class="p-4">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm font-medium text-gray-600">Submittals</p>
                    <p class="text-2xl font-bold text-gray-900">{{ quickStats.submittals }}</p>
                    <p v-if="pendingSubmittals.length > 0" class="text-xs text-amber-600">
                      {{ pendingSubmittals.length }} pending
                    </p>
                  </div>
                  <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <i class="pi pi-upload text-green-600 text-xl"></i>
                  </div>
                </div>
                <Button
                  label="View Submittals"
                  link
                  size="small"
                  class="mt-2 w-full justify-center"
                  @click="setActiveTab('construction')"
                  :disabled="!permissions.canViewSubmittals"
                />
              </div>
            </div>

            <!-- Change Orders Card -->
            <div
              class="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
            >
              <div class="p-4">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm font-medium text-gray-600">Change Orders</p>
                    <p class="text-2xl font-bold text-gray-900">{{ quickStats.changeOrders }}</p>
                    <p v-if="pendingChangeOrders.length > 0" class="text-xs text-amber-600">
                      {{ pendingChangeOrders.length }} pending
                    </p>
                  </div>
                  <div class="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <i class="pi pi-file-edit text-orange-600 text-xl"></i>
                  </div>
                </div>
                <Button
                  label="View Change Orders"
                  link
                  size="small"
                  class="mt-2 w-full justify-center"
                  @click="setActiveTab('construction')"
                  :disabled="!permissions.canManageChangeOrders"
                />
              </div>
            </div>
          </div>

          <!-- Team & Recent Activity -->
          <div class="space-y-4">
            <!-- Project Team -->
            <div class="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div class="px-4 py-3 border-b border-gray-200">
                <h3 class="font-semibold text-gray-900">Project Team</h3>
              </div>
              <div class="p-4 space-y-3">
                <div
                  v-for="member in projectTeam"
                  :key="member.name"
                  class="flex items-center gap-3"
                >
                  <div
                    :class="[
                      'w-10 h-10 rounded-full flex items-center justify-center',
                      `bg-${member.color}-100`,
                    ]"
                  >
                    <i :class="[`pi ${member.icon}`, `text-${member.color}-600`]"></i>
                  </div>
                  <div>
                    <p class="font-medium text-gray-900">{{ member.name }}</p>
                    <p class="text-sm text-gray-600">{{ member.role }}</p>
                  </div>
                </div>
                <div v-if="projectTeam.length === 0" class="text-center py-4 text-gray-500 text-sm">
                  No team members assigned
                </div>
              </div>
            </div>

            <!-- Recent Documents -->
            <div class="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div class="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                <h3 class="font-semibold text-gray-900">Recent Documents</h3>
                <Button
                  icon="pi pi-upload"
                  size="small"
                  severity="secondary"
                  text
                  @click="openModal('documentUploader')"
                />
              </div>
              <div class="p-4">
                <div
                  v-if="recentDocuments.length === 0"
                  class="text-center py-4 text-gray-500 text-sm"
                >
                  No documents uploaded yet
                </div>
                <div v-else class="space-y-2">
                  <div
                    v-for="doc in recentDocuments.slice(0, 3)"
                    :key="doc.id"
                    class="flex items-center gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer"
                  >
                    <i class="pi pi-file text-gray-600"></i>
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-medium text-gray-900 truncate">{{ doc.name }}</p>
                      <p class="text-xs text-gray-500">{{ formatTimeAgo(doc.uploadedAt) }}</p>
                    </div>
                  </div>
                </div>
                <Button
                  label="View All Documents"
                  link
                  size="small"
                  class="mt-2 w-full justify-center"
                  @click="setActiveTab('documents')"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Upcoming Tasks -->
        <div class="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div class="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
            <h3 class="font-semibold text-gray-900">Upcoming Tasks ({{ tasks.length }})</h3>
            <Button
              icon="pi pi-plus"
              size="small"
              severity="secondary"
              label="Add Task"
              @click="openModal('taskSlideOver')"
            />
          </div>
          <div class="p-4">
            <div v-if="tasks.length === 0" class="text-center py-8 text-gray-500">
              <i class="pi pi-calendar text-3xl mb-4"></i>
              <p class="text-sm">No tasks scheduled</p>
              <Button
                label="Create First Task"
                size="small"
                class="mt-2"
                @click="openModal('taskSlideOver')"
              />
            </div>
            <div v-else class="space-y-3">
              <div
                v-for="task in tasks.slice(0, 5)"
                :key="task.id"
                class="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                @click="editTask(task)"
              >
                <div class="flex items-center gap-3 flex-1">
                  <div class="w-3 h-3 rounded-full" :class="getPriorityColor(task.priority)"></div>
                  <div class="flex-1 min-w-0">
                    <p class="font-medium text-gray-900 truncate">{{ task.title }}</p>
                    <p class="text-sm text-gray-600">
                      {{ task.assignedTo }} • Due {{ formatDate(task.dueDate) }}
                    </p>
                  </div>
                </div>
                <Tag
                  :value="formatTaskStatus(task.status)"
                  :severity="getStatusSeverity(task.status)"
                  size="small"
                />
              </div>
              <div v-if="tasks.length > 5" class="text-center pt-2">
                <Button label="View All Tasks" link size="small" @click="setActiveTab('tasks')" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { Button, Tag } from 'primevue';
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

// Project composable - all the store logic is handled here
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

// Local computed properties
const projectTeam = computed(() => {
  const team = [];
  if (currentProject.value.projectManager) {
    team.push({
      name: currentProject.value.projectManager,
      role: 'Project Manager',
      icon: 'pi-user',
      color: 'blue',
    });
  }
  if (currentProject.value.superintendent) {
    team.push({
      name: currentProject.value.superintendent,
      role: 'Superintendent',
      icon: 'pi-hard-hat',
      color: 'yellow',
    });
  }
  if (currentProject.value.architect) {
    team.push({
      name: currentProject.value.architect,
      role: 'Architect',
      icon: 'pi-pencil',
      color: 'purple',
    });
  }
  return team;
});

const recentDocuments = computed(() => {
  return documents.value.slice(0, 5);
});

const todaysActivities = computed(() => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return recentActivities.value.filter((activity) => {
    const activityDate = new Date(activity.timestamp);
    activityDate.setHours(0, 0, 0, 0);
    return activityDate.getTime() === today.getTime();
  });
});

// Helper functions
const getPhaseSeverity = (phase) => {
  const map = {
    'pre-construction': 'warning',
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
    'on-hold': 'warning',
  };
  return map[status] || 'secondary';
};

const getPriorityColor = (priority) => {
  const map = {
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
      // Preserve fallback
      const fallback = projectStore.getProjectById(props.projectId) || projectStore.activeProject;
      if (fallback) {
        projectStore.currentProject = { ...fallback, loadedFully: false };
        console.log('Preserved fallback after null load for', props.projectId);
        toast.add({ severity: 'warning', detail: 'Used cached data', life: 3000 });
      }
    } else {
      toast.add({ severity: 'success', detail: 'Full details reloaded', life: 3000 });
    }
    console.log('Retry result:', projectStore.currentProject);
  } catch (err) {
    console.error('Retry failed:', err);
    toast.add({ severity: 'error', detail: 'Retry failed – check connection', life: 3000 });
  }
};

const editTask = (task) => {
  // Handle task editing
  console.log('Edit task:', task);
  openModal('taskSlideOver');
};

// Lifecycle
onMounted(async () => {
  console.log('🔍 Mounting ProjectDetailView for ID:', props.projectId);
  await initializeProject(); // Removed redundant setActiveProject; handled in composable

  console.log('📊 After init - currentProject:', currentProject.value);
  console.log('📊 loading:', loading.value, 'error:', error.value);
  console.log('📊 Tasks count:', tasks.value.length, 'RFIs:', rfis.value.length);
  console.log('📊 loadedFully:', currentProject.value?.loadedFully);
  console.log('Permissions:', permissions.value);
  console.log('User:', authStore.user);
});

onBeforeUnmount(() => {
  cleanupProject();
});

// Watch for project ID changes
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
/* Any component-specific styles */
</style>
