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
            :suggestions="suggestions"
            optionLabel="name"
            optionGroupLabel="name"
            optionGroupChildren="items"
            placeholder="Select a project"
            class="ml-4 w-64 text-xs"
            @complete="onComplete"
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

      <!-- Main content area -->
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
// ==================== IMPORTS ====================
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';

// Stores
import { useAuthStore, useProjectStore } from '@/stores';

// Repositories
import DocumentRepository from '@/services/firebase/Repositories/DocumentRepository';
import SubmittalRepository from '@/services/firebase/Repositories/SubmittalRepository';
import ChangeOrderRepository from '@/services/firebase/Repositories/ChangeOrderRepository';

// Components
import LoginView from '@/views/auth/LoginView.vue';
import DashboardView from '@/views/dashboard/DashboardView.vue';
import ProjectDetailView from '@/views/projects/ProjectDetailView.vue';
import AutoComplete from 'primevue/autocomplete';
import Button from 'primevue/button';
import Avatar from 'primevue/avatar';
import Menu from 'primevue/menu';
import ContextMenu from 'primevue/contextmenu';
import Toast from 'primevue/toast';
import ProjectDialog from './components/forms/ProjectDialog.vue';
import TaskDialog from './components/forms/TaskDialog.vue';
import RFIDialog from './components/forms/RFIDialog.vue';

// ==================== COMPOSABLES ====================
const router = useRouter();
const authStore = useAuthStore();
const projectStore = useProjectStore();
const toast = useToast();

// ==================== STATE (REFS) ====================
const suggestions = ref([]);
const selectedProject = ref(null);
const inputQuery = ref('');
const userMenu = ref();
const contextMenu = ref();
const autoCompleteRef = ref();
const showProjectDialog = ref(false);
const showTaskDialog = ref(false);
const showRFIDialog = ref(false);

// ==================== CONSTANTS ====================
const phaseToGroup = {
  construction: 'Active Projects',
  preConstruction: 'Pre-Construction',
  complete: 'Completed',
  closeOut: 'Close-Out',
};

const groupOrder = ['Active Projects', 'Pre-Construction', 'Completed', 'Close-Out'];

// ==================== COMPUTED PROPERTIES ====================
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

// ==================== UTILITY FUNCTIONS ====================
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
      items: groupsMap[name].sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .filter((g) => g.items.length > 0);

  groups.sort((a, b) => groupOrder.indexOf(a.name) - groupOrder.indexOf(b.name));

  return groups;
};

// ==================== EVENT HANDLERS ====================
/**
 * Handles the project-saved event from the ProjectDialog.
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
 * Handles the task-saved event from TaskDialog.
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
 * Uploads a document.
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
  }
};

/**
 * Creates a new submittal.
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
  }
};

/**
 * Creates a change order.
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
  }
};

/**
 * Generates a report.
 */
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

/**
 * Navigates to settings.
 */
const settings = () => {
  router.push('/settings');
};

/**
 * Handles project selection to show in ProjectDetailView.
 */
const handleProjectSelect = (event) => {
  if (!selectedProject.value || selectedProject.value.id !== event.value.id) {
    selectedProject.value = event.value;
    inputQuery.value = event.value.name;
  }
};

/**
 * Toggles the user menu popup.
 */
const toggleUserMenu = (event) => {
  userMenu.value.toggle(event);
};

/**
 * Resets to dashboard view and clears selection/query.
 */
const resetToDashboard = () => {
  selectedProject.value = null;
  inputQuery.value = '';
  if (autoCompleteRef.value) {
    autoCompleteRef.value.hide();
  }
};

/**
 * Shows the context menu at the right-click position.
 */
const showContextMenu = (event) => {
  contextMenu.value.show(event);
};

/**
 * Handles autocomplete complete event.
 */
const onComplete = (event) => {
  console.log('AutoComplete @complete event fired, query:', event.query);
  suggestions.value = groupProjects(projectStore.projects, event.query);
  console.log('Updated suggestions (grouped):', suggestions.value);
};

// ==================== MENU ITEMS (Defined after handlers) ====================
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

// ==================== WATCHERS ====================
/**
 * Syncs inputQuery to selectedProject's name when selection changes externally.
 */
watch(selectedProject, (newProject) => {
  inputQuery.value = newProject?.name || '';
});

/**
 * Updates autocomplete suggestions when store projects change.
 */
watch(
  () => projectStore.projects,
  (newProjects) => {
    console.log('🔄 Projects from store updated:', newProjects.length);
    suggestions.value = groupProjects(newProjects, inputQuery.value);
    console.log('Updated suggestions (grouped):', suggestions.value);
  },
  { immediate: true, deep: true }
);

// ==================== LIFECYCLE HOOKS ====================
onMounted(async () => {
  await authStore.initAuth();
  if (authStore.isAuthenticated) {
    projectStore.initializeProjectsSubscription();
  }
});
</script>

<style>
/* Add any additional styles or rely on Tailwind */
</style>
