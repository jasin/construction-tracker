<template>
  <Drawer
    v-model:visible="isVisible"
    position="left"
    class="project-drawer !w-80 md:!hidden"
    :modal="true"
    @hide="handleClose"
  >
    <template #header>
      <h2 class="text-lg font-semibold">Projects</h2>
    </template>

    <!-- Search Box -->
    <div class="mb-4">
      <IconField iconPosition="left">
        <InputIcon>
          <i class="pi pi-search" />
        </InputIcon>
        <InputText
          v-model="searchQuery"
          placeholder="Search projects..."
          class="w-full"
          @input="handleSearch"
        />
      </IconField>
    </div>

    <!-- Back to Dashboard -->
    <div
      v-if="selectedProject"
      class="p-3 mb-2 text-sm font-medium text-blue-600 cursor-pointer hover:bg-blue-50 rounded-md transition-colors"
      @click="handleResetToDashboard"
    >
      <i class="pi pi-arrow-left mr-2"></i>
      Back to Dashboard
    </div>

    <!-- Project List -->
    <div class="project-list">
      <div v-if="isLoading" class="p-3 text-sm text-gray-500">Loading projects...</div>

      <div
        v-else-if="groupedProjects.length === 0 && searchQuery"
        class="p-3 text-sm text-gray-500"
      >
        No projects found for "{{ searchQuery }}"
      </div>

      <div v-else-if="groupedProjects.length === 0" class="p-3 text-sm text-gray-500">
        No projects yet. Create one to get started.
      </div>

      <template v-else>
        <div v-for="(group, index) in groupedProjects" :key="index" class="mb-4">
          <!-- Group Header -->
          <div class="px-3 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">
            {{ group.name }}
          </div>

          <!-- Group Items -->
          <div class="space-y-1">
            <div
              v-for="project in group.items"
              :key="project.id"
              class="project-item px-3 py-3 cursor-pointer rounded-md transition-colors"
              :class="{
                'bg-primary-50 border-l-4 border-primary-500': project.id === selectedProject?.id,
                'hover:bg-surface-100': project.id !== selectedProject?.id,
              }"
              @click="handleSelectProject(project)"
            >
              <div class="font-medium text-sm">{{ project.name }}</div>
              <div v-if="project.job_number" class="text-xs text-gray-500 mt-1">
                #{{ project.job_number }}
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </Drawer>
</template>

<script setup>
import { computed, ref, watch, onMounted } from 'vue';
import { useProjectSearch } from '@/composables/useProjectSearch';
import { useProjectStore, useUIStore } from '@/stores';
import Drawer from 'primevue/drawer';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['update:visible', 'project-selected']);

const projectStore = useProjectStore();
const uiStore = useUIStore();

const isVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val),
});

const searchQuery = ref('');
const isSelecting = ref(false);

// Use the same composable as ProjectSelect for consistency
const projectSearch = useProjectSearch({
  groupByPhase: true,
  limit: 100, // Show more in sidebar since we have vertical space
});

const {
  query,
  suggestions,
  selected: composableSelected,
  selectProject: composableSelectProject,
  reset,
  loading: isLoading,
} = projectSearch;

// Sync search query with composable
watch(searchQuery, (val) => {
  query.value = val;
});

// Filter and group projects based on search
const groupedProjects = computed(() => {
  const q = searchQuery.value.toLowerCase().trim();
  if (!q) return suggestions.value;

  return suggestions.value
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.name.toLowerCase().includes(q)),
    }))
    .filter((group) => group.items.length > 0);
});

const selectedProject = computed(() => projectStore.activeProject);

// Sync with store
watch(
  () => projectStore.activeProject,
  (newProject) => {
    if (newProject) {
      composableSelected.value = newProject;
    } else {
      composableSelected.value = null;
      reset();
    }
  },
  { immediate: true }
);

const handleSearch = () => {
  // Reactive search via composable
};

const handleSelectProject = async (project) => {
  if (!project || !project.id || isSelecting.value || uiStore.isProjectTransitioning) {
    return;
  }

  isSelecting.value = true;

  try {
    const success = await projectStore.selectProject(project);

    if (success) {
      composableSelectProject(project);
      emit('project-selected', project);
      isVisible.value = false; // Close sidebar after selection
      searchQuery.value = ''; // Reset search
    }
  } catch (error) {
    console.error('ProjectSidebar: Selection error:', error);
  } finally {
    isSelecting.value = false;
  }
};

const handleResetToDashboard = async () => {
  if (isSelecting.value || uiStore.isProjectTransitioning) {
    return;
  }

  isSelecting.value = true;

  try {
    const success = await projectStore.resetActiveProject();

    if (success) {
      composableSelected.value = null;
      reset();
      searchQuery.value = '';
      isVisible.value = false; // Close sidebar
    }
  } catch (error) {
    console.error('ProjectSidebar: Reset error:', error);
  } finally {
    isSelecting.value = false;
  }
};

const handleClose = () => {
  isVisible.value = false;
  searchQuery.value = ''; // Reset search on close
};

// Debug: Log when drawer opens
watch(isVisible, (newVal) => {
  if (newVal) {
    console.log('ProjectSidebar: Drawer opened');
    console.log('ProjectSidebar: Projects in store:', projectStore.projects?.length);
    console.log('ProjectSidebar: Suggestions:', suggestions.value);
    console.log('ProjectSidebar: Grouped projects:', groupedProjects.value);
  }
});

// Initialize on mount
onMounted(() => {
  console.log('ProjectSidebar: Mounted');
  console.log('ProjectSidebar: Initial projects:', projectStore.projects?.length);
  console.log('ProjectSidebar: Initial suggestions:', suggestions.value);
});
</script>

<style scoped>
.project-drawer {
  max-width: 85vw;
}

.project-list {
  height: calc(100vh - 180px);
  overflow-y: auto;
}

.project-item {
  transition: all 0.15s ease;
}

/* Smooth animations */
:deep(.p-drawer-enter-active),
:deep(.p-drawer-leave-active) {
  transition: transform 0.3s ease-out;
}
</style>
