<template>
  <div v-if="authLoading">Loading...</div>
  <div v-else>
    <LoginView v-if="!isAuthenticated" />
    <div v-else class="flex flex-col h-screen" @contextmenu.prevent="showContextMenu($event)">
      <!-- Header -->
      <header class="flex items-center justify-between p-4 bg-white border-b">
        <div class="flex items-center relative">
          <div class="text-xl font-bold">Construction Tracker</div>
          <!-- Custom Project Selector with fuzzy search -->
          <ProjectSelect
            ref="selectRef"
            :project-id="projectStore.activeProjectId"
            @project-selected="handleProjectSelected"
          />
        </div>
        <div class="flex items-center gap-4">
          <Button icon="pi pi-bell" severity="secondary" text />
          <div class="flex items-center gap-2 cursor-pointer" @click="toggleUserMenu">
            <Avatar :label="userInitials" shape="circle" />
            <span>{{ user?.name || 'User' }}</span>
          </div>
          <Menu ref="userMenu" :model="userMenuItems" :popup="true" />
        </div>
      </header>

      <!-- Main content area -->
      <main class="flex-1 p-4 overflow-auto">
        <template v-if="projectStore.activeProject">
          <ProjectDetailView
            :key="projectStore.activeProjectId"
            :project-id="projectStore.activeProjectId"
          />
        </template>
        <template v-else>
          <DashboardView />
        </template>
      </main>

      <!-- Context Menu for actions (right-click anywhere) -->
      <ContextMenu ref="contextMenu" :model="contextMenuItems" />
      <Toast />
      <ProjectDialog
        v-if="modals.projectDialog"
        :visible="modals.projectDialog"
        @update:visible="uiStore.closeModal('projectDialog')"
        @project-saved="handleProjectUpdated"
        :project="projectStore.activeProject"
        :project-id="projectStore.activeProjectId"
      />
      <TaskDialog
        v-if="modals.taskDialog"
        :visible="modals.taskDialog"
        @update:visible="uiStore.closeModal('taskDialog')"
        @task-saved="handleTaskUpdated"
        :project-id="projectStore.activeProjectId"
      />
      <RFIDialog
        v-if="modals.rfiDialog"
        :visible="modals.rfiDialog"
        @update:visible="uiStore.closeModal('rfiDialog')"
        @rfi-saved="handleRFISaved"
        :project-id="projectStore.activeProjectId"
      />
      <ActivityFlyout
        v-if="modals.activityFlyout"
        :visible="modals.activityFlyout"
        @update:visible="uiStore.closeModal('activityFlyout')"
        :project-id="projectStore.activeProjectId"
      />

      <!-- Task Display Settings Dialog -->
      <Dialog
        v-model:visible="showTaskSettings"
        modal
        header="Task Display Settings"
        :style="{ width: '500px' }"
      >
        <div class="space-y-6">
          <!-- Completed Tasks Filter -->
          <div class="settings-section">
            <h4 class="text-sm font-semibold text-surface-900 mb-3">Completed Tasks</h4>

            <div class="flex items-center justify-between mb-3">
              <label class="text-sm text-surface-700">Filter completed tasks</label>
              <InputSwitch v-model="completedTasksEnabled" />
            </div>

            <div v-if="completedTasksEnabled" class="ml-4 space-y-3">
              <div>
                <label class="block text-sm text-surface-700 mb-2">
                  Show completed tasks from the last
                </label>
                <div class="flex items-center gap-2">
                  <InputNumber
                    v-model="completedTasksDays"
                    :min="1"
                    :max="365"
                    :step="1"
                    class="w-24"
                    suffix=" days"
                  />
                  <span class="text-sm text-surface-600">days</span>
                </div>
              </div>

              <div class="flex flex-wrap gap-2">
                <Button
                  v-for="preset in dayPresets"
                  :key="preset.value"
                  :label="preset.label"
                  size="small"
                  :severity="completedTasksDays === preset.value ? 'primary' : 'secondary'"
                  outlined
                  @click="completedTasksDays = preset.value"
                />
              </div>

              <p class="text-xs text-surface-500 mt-2">
                <i class="pi pi-info-circle mr-1"></i>
                Completed tasks older than {{ completedTasksDays }} day{{
                  completedTasksDays !== 1 ? 's' : ''
                }}
                (based on completion date) will be hidden from the list
              </p>
            </div>

            <div v-else class="ml-4">
              <p class="text-xs text-surface-500">
                <i class="pi pi-info-circle mr-1"></i>
                All completed tasks will be shown regardless of age
              </p>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <template #footer>
          <div class="flex justify-end gap-2">
            <Button
              label="Reset to Defaults"
              severity="secondary"
              outlined
              @click="resetToDefaults"
            />
            <Button label="Cancel" severity="secondary" @click="cancelSettings" />
            <Button label="Save" @click="saveSettings" />
          </div>
        </template>
      </Dialog>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onBeforeMount, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { storeToRefs } from 'pinia';

// Stores
import { useAuthStore, useProjectStore, useUIStore, useUserSettingsStore } from '@/stores';

// Repositories (for context menu actions)
import DocumentRepository from '@/services/firebase/Repositories/DocumentRepository';
import SubmittalRepository from '@/services/firebase/Repositories/SubmittalRepository';
import ChangeOrderRepository from '@/services/firebase/Repositories/ChangeOrderRepository';

// Components
import LoginView from '@/views/auth/LoginView.vue';
import DashboardView from '@/views/dashboard/DashboardView.vue';
import ProjectDetailView from '@/views/projects/ProjectDetailView.vue';
import ProjectSelect from '@/components/features/projects/ProjectSelect.vue';
import Button from 'primevue/button';
import Avatar from 'primevue/avatar';
import Menu from 'primevue/menu';
import ContextMenu from 'primevue/contextmenu';
import Toast from 'primevue/toast';
import Dialog from 'primevue/dialog';
import ProjectDialog from './components/forms/ProjectDialog.vue';
import TaskDialog from './components/forms/TaskDialog.vue';
import RFIDialog from './components/forms/RFIDialog.vue';
import ActivityFlyout from './components/widgets/ActivityFlyout.vue';

// PrimeVue components for settings dialog
import InputSwitch from 'primevue/inputswitch';
import InputNumber from 'primevue/inputnumber';

const router = useRouter();
const projectStore = useProjectStore();
const authStore = useAuthStore();
const uiStore = useUIStore();
const userSettingsStore = useUserSettingsStore();
const { modals } = storeToRefs(uiStore);
const toast = useToast();

// State (Refs)
const userMenu = ref();
const contextMenu = ref();

// Task settings dialog state
const showTaskSettings = ref(false);
const completedTasksEnabled = ref(false); // Default to disabled - show all completed tasks
const completedTasksDays = ref(7);

// Day presets for quick selection
const dayPresets = [
  { label: '1 Day', value: 1 },
  { label: '3 Days', value: 3 },
  { label: '1 Week', value: 7 },
  { label: '2 Weeks', value: 14 },
  { label: '1 Month', value: 30 },
  { label: '3 Months', value: 90 },
];

// Computed Properties
const userInitials = computed(() => {
  if (!authStore.user?.name) return 'U';
  return authStore.user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();
});

const authLoading = computed(() => authStore.loading);
const isAuthenticated = computed(() => authStore.isAuthenticated);
const user = computed(() => authStore.user);

// Task settings functions
const loadSettings = () => {
  completedTasksEnabled.value = userSettingsStore.settings.completedTasksFilter.enabled;
  completedTasksDays.value = userSettingsStore.settings.completedTasksFilter.timePeriod;
};

const saveSettings = () => {
  userSettingsStore.updateCompletedTasksFilter({
    enabled: completedTasksEnabled.value,
    timePeriod: completedTasksDays.value,
  });
  showTaskSettings.value = false;
};

const cancelSettings = () => {
  loadSettings();
  showTaskSettings.value = false;
};

const resetToDefaults = () => {
  completedTasksEnabled.value = false; // Disabled by default
  completedTasksDays.value = 7;
};

// Event Handlers
const handleProjectSelected = async (project) => {
  console.log('App: Project selected:', project.id);
  // Store already handled URL update via selectProject()
  await nextTick();
};

const handleProjectUpdated = async (project) => {
  uiStore.closeModal('projectDialog');
  toast.add({
    severity: 'success',
    summary: 'Success',
    detail: project.id ? 'Project updated successfully' : 'Project created successfully',
    life: 3000,
  });
  // Auto-activate the project after creation/update for better UX
  await projectStore.selectProject(project);
  await nextTick();
};

const handleTaskUpdated = (task) => {
  uiStore.closeModal('taskDialog');
  toast.add({
    severity: 'success',
    summary: 'Success',
    detail: task.id ? 'Task updated successfully' : 'Task created successfully',
    life: 3000,
  });
};

const handleRFISaved = (rfi) => {
  uiStore.closeModal('rfiDialog');
  toast.add({
    severity: 'success',
    summary: 'Success',
    detail: rfi.id ? 'RFI updated successfully' : 'RFI created successfully',
    life: 3000,
  });
};

const uploadDocument = async () => {
  try {
    await DocumentRepository.create({
      name: 'New Document',
      projectId: projectStore.activeProjectId,
    });
    toast.add({ severity: 'success', summary: 'Success', detail: 'Document uploaded', life: 3000 });
  } catch (error) {
    console.error('Upload document error:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to upload document',
      life: 3000,
    });
  }
};

const newSubmittal = async () => {
  try {
    await SubmittalRepository.create({
      title: 'New Submittal',
      projectId: projectStore.activeProjectId,
    });
    toast.add({ severity: 'success', summary: 'Success', detail: 'Submittal created', life: 3000 });
  } catch (error) {
    console.error('New submittal error:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to create submittal',
      life: 3000,
    });
  }
};

const changeOrder = async () => {
  try {
    await ChangeOrderRepository.create({
      description: 'New Change Order',
      projectId: projectStore.activeProjectId,
    });
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Change order created',
      life: 3000,
    });
  } catch (error) {
    console.error('Change order error:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to create change order',
      life: 3000,
    });
  }
};

const generateReport = async () => {
  try {
    toast.add({ severity: 'success', summary: 'Success', detail: 'Report generated', life: 3000 });
  } catch (error) {
    console.error('Generate report error:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to generate report',
      life: 3000,
    });
  }
};

const settings = () => {
  router.push('/settings');
};

const toggleUserMenu = (event) => {
  userMenu.value.toggle(event);
};

// Menu Items
const userMenuItems = ref([
  {
    label: 'Profile',
    command: () => {
      // TODO: Navigate to profile
    },
  },
  {
    label: 'Settings',
    command: settings,
  },
  {
    label: 'Logout',
    command: async () => {
      try {
        await authStore.logout();
        router.push('/login');
      } catch (error) {
        console.error('Logout error:', error);
        toast.add({ severity: 'error', summary: 'Error', detail: 'Logout failed', life: 3000 });
      }
    },
  },
]);

const contextMenuItems = ref([
  {
    label: 'New Project',
    icon: 'pi pi-plus',
    command: () => {
      uiStore.openModal('projectDialog');
    },
  },
  {
    label: 'Upload Document',
    icon: 'pi pi-upload',
    command: uploadDocument,
  },
  {
    label: 'Create Task',
    icon: 'pi pi-check-square',
    command: () => {
      uiStore.openModal('taskDialog');
    },
  },
  {
    label: 'Submit RFI',
    icon: 'pi pi-question-circle',
    command: () => {
      uiStore.openModal('rfiDialog');
    },
  },
  {
    label: 'New Submittal',
    icon: 'pi pi-file',
    command: newSubmittal,
  },
  {
    label: 'Change Order',
    icon: 'pi pi-money-bill',
    command: changeOrder,
  },
  {
    label: 'Generate Report',
    icon: 'pi pi-chart-bar',
    command: generateReport,
  },
  {
    label: 'Settings',
    icon: 'pi pi-cog',
    items: [
      {
        label: 'Task Display Settings',
        icon: 'pi pi-cog',
        command: () => (showTaskSettings.value = true),
      },
      {
        label: 'General Settings',
        icon: 'pi pi-cog',
        command: settings,
      },
    ],
  },
]);

const showContextMenu = (event) => {
  contextMenu.value.show(event);
};

// REMOVED: Route watcher - router guard now handles URL → Store sync
// The router.afterEach guard handles all external navigation (back button, bookmarks, direct URLs)
// Components just call store methods which update both state and URL

// Lifecycle Hooks
onBeforeMount(async () => {
  console.log('App: Starting early initAuth');
  await authStore.initAuth();
  console.log(
    'App: Early init done, isAuth:',
    authStore.isAuthenticated,
    'loading:',
    authStore.loading
  );
});

onMounted(async () => {
  await authStore.initAuth();
  console.log('App: Auth initialized, isAuth:', authStore.isAuthenticated);

  if (authStore.isAuthenticated) {
    projectStore.initializeProjectsSubscription();
    loadSettings(); // Load user settings
  }
});
</script>

<style scoped></style>
