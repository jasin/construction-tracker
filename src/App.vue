<template>
  <div v-if="authLoading">Loading...</div>
  <div v-else>
    <LoginView v-if="!isAuthenticated" />
    <div v-else class="flex flex-col h-screen" @contextmenu.prevent="showContextMenu($event)">
      <!-- Header -->
      <header class="flex items-center justify-between p-4 bg-white border-b">
        <div class="flex items-center">
          <div class="text-xl font-bold">Construction Tracker</div>
          <!-- Project Selector with fuzzy search -->
          <AutoComplete
            ref="autoCompleteRef"
            v-model="inputQuery"
            :suggestions="filteredProjects"
            :loading="projectsLoading"
            optionLabel="name"
            optionGroupLabel="name"
            optionGroupChildren="items"
            placeholder="Select a project"
            class="ml-4 w-64 text-xs"
            @item-select="handleProjectSelect"
            size="small"
            dropdown
          >
            <template #optiongroup="slotProps">
              <div class="font-semibold text-sm text-gray-700">{{ slotProps.option.name }}</div>
            </template>
            <template #header>
              <div
                v-if="selectedProject"
                class="p-3 text-sm font-medium text-blue-600 cursor-pointer hover:bg-blue-50"
                @click="resetToDashboard"
              >
                ← Back to Dashboard
              </div>
            </template>
            <template #option="slotProps">
              <div class="text-xs text-gray-800">{{ slotProps.option.name }}</div>
            </template>
          </AutoComplete>
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
      <!-- Main content area (full width after sidebar removal) -->
      <main class="flex-1 p-4 overflow-auto">
        <template v-if="selectedProject">
          <ProjectDetailView :key="selectedProject.id" :project-id="selectedProject.id" />
        </template>
        <template v-else>
          <DashboardView />
        </template>
      </main>
      <!-- Context Menu for actions (right-click anywhere) -->
      <ContextMenu ref="contextMenu" :model="contextMenuItems" />
      <Toast />
      <ProjectDialog v-model:visible="showProjectDialog" @project-saved="handleProjectUpdated" />
      <TaskDialog v-model:visible="showTaskDialog" @task-saved="handleTaskUpdated" />
      <RFIDialog v-model:visible="showRFIDialog" @rfi-saved="handleRFISaved" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores'; // Centralized store import via index.js
import ProjectRepository from '@/services/firebase/Repositories/ProjectRepository'; // Singleton repository import
import DocumentRepository from '@/services/firebase/Repositories/DocumentRepository'; // Singleton for document uploads
import SubmittalRepository from '@/services/firebase/Repositories/SubmittalRepository'; // Singleton for submittals
import ChangeOrderRepository from '@/services/firebase/Repositories/ChangeOrderRepository'; // Singleton for change orders
import { useToast } from 'primevue/usetoast'; // Composable for toast notifications
import LoginView from '@/views/auth/LoginView.vue';
import DashboardView from '@/views/dashboard/DashboardView.vue';
import ProjectDetailView from '@/views/projects/ProjectDetailView.vue';
import AutoComplete from 'primevue/autocomplete';
import Button from 'primevue/button';
import Avatar from 'primevue/avatar';
import Menu from 'primevue/menu';
import ContextMenu from 'primevue/contextmenu'; // PrimeVue ContextMenu for right-click menu
import Toast from 'primevue/toast'; // PrimeVue Toast component for notifications
import ProjectDialog from './components/forms/ProjectDialog.vue';
import TaskDialog from './components/forms/TaskDialog.vue';
import RFIDialog from './components/forms/RFIDialog.vue';

let projectUnsubscribe = null;

const router = useRouter();
const authStore = useAuthStore(); // Use centralized auth store
const toast = useToast(); // PrimeVue toast for success/error messages

// Refs
const projects = ref([]);
const selectedProject = ref(null);
const inputQuery = ref(''); // String ref for reactive input filtering and display
const userMenu = ref();
const contextMenu = ref(); // Ref for ContextMenu component
const autoCompleteRef = ref();
const showProjectDialog = ref(false);
const showTaskDialog = ref(false);
const showRFIDialog = ref(false);
const projectsLoading = ref(true);
const projectsInitialized = ref(false);

// Constants
const phaseToGroup = {
  construction: 'Active Projects',
  'pre-construction': 'Pre-Construction',
  complete: 'Completed',
  // Add more mappings if needed, e.g., 'close-out': 'Close-Out'
};

const groupOrder = ['Active Projects', 'Pre-Construction', 'Completed'];

// Computed properties
const userInitials = computed(() => {
  if (!authStore.user?.name) return 'U';
  return authStore.user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();
});

/**
 * Computed suggestions: Groups and filters projects reactively based on inputQuery.
 * Updates automatically when projects changes (realtime subscription) or inputQuery changes (typing).
 * @type {ComputedRef<Array<{name: string, items: Array<Object>}>>}
 */
const filteredProjects = computed(() => groupProjects(projects.value, inputQuery.value));

const authLoading = computed(() => authStore.loading); // Use store's loading for auth state
const isAuthenticated = computed(() => authStore.isAuthenticated); // Use store's getter for auth check
const user = computed(() => authStore.user); // Use store's user ref

// Utility function for grouping and sorting projects
/**
 * Groups projects by phase and sorts within groups and across groups.
 * Filters by query if provided.
 * @param {Array<Object>} projectsList - List of project objects.
 * @param {string} [query=''] - Optional search query for filtering.
 * @returns {Array<{name: string, items: Array<Object>}>} Grouped and sorted projects.
 */
const groupProjects = (projectsList, query = '') => {
  const lowerQuery = query.toLowerCase();
  const filtered = query
    ? projectsList.filter(
        (p) =>
          p.name.toLowerCase().includes(lowerQuery) ||
          (p.jobNumber || '').toLowerCase().includes(lowerQuery)
      )
    : projectsList;

  const groupsMap = {};
  filtered.forEach((p) => {
    const groupName = phaseToGroup[p.phase] || 'Other';
    if (!groupsMap[groupName]) groupsMap[groupName] = [];
    groupsMap[groupName].push(p);
  });

  const groups = Object.keys(groupsMap)
    .map((name) => ({
      name,
      items: groupsMap[name].sort((a, b) => a.name.localeCompare(b.name)), // Sort projects by name within group
    }))
    .filter((g) => g.items.length > 0); // Exclude empty groups

  // Sort groups by predefined order
  groups.sort((a, b) => groupOrder.indexOf(a.name) - groupOrder.indexOf(b.name));

  return groups;
};

// Event handlers (defined before menus to resolve references)
/**
 * Handles the project-saved event from the ProjectDialog.
 * Since realtime subscriptions are in place, we don't need to manually refresh projects.value.
 * This can be used for additional UI feedback if needed.
 * @param {Object} project - The created or updated project data.
 */
const handleProjectUpdated = (project) => {
  showProjectDialog.value = false;
  toast.add({
    severity: 'success',
    summary: 'Success',
    detail: project.id ? 'Project updated successfully' : 'Project created successfully',
    life: 3000,
  });
};

/**
 * Uploads a document.
 * @returns {Promise<void>}
 */
const uploadDocument = async () => {
  try {
    await DocumentRepository.create({ name: 'New Document', projectId: selectedProject.value?.id });
    toast.add({ severity: 'success', summary: 'Success', detail: 'Document uploaded', life: 3000 });
  } catch (error) {
    console.error('Upload document error:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to upload document',
      life: 3000,
    });
    throw new Error(`Failed to upload document: ${error.message}`);
  }
};

/**
 * Handles the task-saved event from TaskDialog.
 * Since realtime subscriptions are in place, we don't need to manually refresh tasks.value.
 * This can be used for additional UI feedback if needed.
 * @param {Object} task - The created or updated task data.
 */
const handleTaskUpdated = (task) => {
  showTaskDialog.value = false;
  toast.add({
    severity: 'success',
    summary: 'Success',
    detail: task.id ? 'Task updated successfully' : 'Task created successfully',
    life: 3000,
  });
};

/**
 * Handles the rfi-saved event from RFIDialog.
 * Since realtime subscriptions are in place, we don't need to manually refresh rfis.value.
 * This can be used for additional UI feedback if needed.
 * @param {Object} rfi - The created or updated RFI data.
 */
const handleRFISaved = (rfi) => {
  showRFIDialog.value = false;
  toast.add({
    severity: 'success',
    summary: 'Success',
    detail: rfi.id ? 'RFI updated successfully' : 'RFI created successfully',
    life: 3000,
  });
};

/**
 * Creates a new submittal.
 * @returns {Promise<void>}
 */
const newSubmittal = async () => {
  try {
    await SubmittalRepository.create({
      title: 'New Submittal',
      projectId: selectedProject.value?.id,
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
    throw new Error(`Failed to create submittal: ${error.message}`);
  }
};

/**
 * Creates a change order.
 * @returns {Promise<void>}
 */
const changeOrder = async () => {
  try {
    await ChangeOrderRepository.create({
      description: 'New Change Order',
      projectId: selectedProject.value?.id,
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
    throw new Error(`Failed to create change order: ${error.message}`);
  }
};

/**
 * Generates a report.
 * @returns {Promise<void>}
 */
const generateReport = async () => {
  try {
    // Placeholder: Implement report generation logic (e.g., fetch data and export PDF/CSV)
    toast.add({ severity: 'success', summary: 'Success', detail: 'Report generated', life: 3000 });
  } catch (error) {
    console.error('Generate report error:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to generate report',
      life: 3000,
    });
    throw new Error(`Failed to generate report: ${error.message}`);
  }
};

/**
 * Navigates to settings.
 */
const settings = () => {
  // Placeholder: Navigate to settings route
  router.push('/settings');
};

/**
 * Handles project selection to show in ProjectDetailView.
 * Assigns selectedProject only if it's a different project, and syncs input display.
 * @param {Object} event - AutoComplete item-select event.
 */
const handleProjectSelect = (event) => {
  if (!selectedProject.value || selectedProject.value.id !== event.value.id) {
    selectedProject.value = event.value;
    inputQuery.value = event.value.name; // Sync input to show selected name
  }
};

/**
 * Toggles the user menu popup.
 * @param {Event} event - Click event.
 */
const toggleUserMenu = (event) => {
  userMenu.value.toggle(event);
};

/**
 * Resets to dashboard view and clears selection/query.
 */
const resetToDashboard = () => {
  selectedProject.value = null;
  inputQuery.value = ''; // Clear to show all on next dropdown open
  if (autoCompleteRef.value) {
    autoCompleteRef.value.hide();
  }
};

/**
 * Shows the context menu at the right-click position.
 * @param {Event} event - The contextmenu event.
 */
const showContextMenu = (event) => {
  contextMenu.value.show(event); // Display context menu on right-click
};

// Watchers
/**
 * Syncs inputQuery to selectedProject's name when selection changes externally.
 * Ensures input reflects current selection (e.g., if set via route params).
 */
watch(selectedProject, (newProject) => {
  inputQuery.value = newProject?.name || '';
});

// Menu items (defined after handlers to resolve command references)
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
        throw new Error(`Logout failed: ${error.message}`);
      }
    },
  },
]);

const contextMenuItems = ref([
  {
    label: 'New Project',
    icon: 'pi pi-plus',
    command: () => {
      showProjectDialog.value = true;
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
      showTaskDialog.value = true;
    },
  },
  {
    label: 'Submit RFI',
    icon: 'pi pi-question-circle',
    command: () => {
      showRFIDialog.value = true;
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
    command: settings,
  },
]);

onMounted(async () => {
  try {
    await authStore.initAuth();
    if (authStore.isAuthenticated) {
      projectUnsubscribe = ProjectRepository.subscribeToAll((updatedProjects) => {
        projects.value = updatedProjects;
        // Set loading to false after first data load
        projectsLoading.value = false;
        projectsInitialized.value = true;
      });

      // Set a timeout fallback in case subscription doesn't fire immediately
      setTimeout(() => {
        if (!projectsInitialized.value) {
          projectsLoading.value = false;
        }
      }, 1000);
    } else {
      projectsLoading.value = false;
    }
  } catch (error) {
    projectsLoading.value = false;
    console.error('App init error:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to initialize app',
      life: 3000,
    });
  }
});

onUnmounted(() => {
  if (projectUnsubscribe) {
    try {
      ProjectRepository.unsubscribe(projectUnsubscribe);
    } catch (error) {
      console.error('Unsubscribe error:', error);
      throw new Error(`Failed to unsubscribe from projects: ${error.message}`);
    }
  }
});
</script>

<style>
/* Add any additional styles or rely on Tailwind */
</style>
