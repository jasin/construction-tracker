<template>
  <!-- Mobile: Full-screen Drawer (slides from right) -->
  <Drawer
    v-if="isMobileView"
    v-model:visible="isVisible"
    position="right"
    class="project-search-mobile-drawer"
    :modal="true"
    :style="{ width: '100vw' }"
    @hide="handleDrawerHide"
  >
    <template #header>
      <div class="flex flex-col gap-3 w-full">
        <h2 class="text-lg font-semibold">Search Projects</h2>
        <IconField iconPosition="left" class="w-full">
          <InputIcon>
            <i class="pi pi-search" />
          </InputIcon>
          <InputText
            ref="mobileSearchInput"
            v-model="searchQuery"
            placeholder="Search projects..."
            class="w-full"
            @input="handleSearch"
          />
        </IconField>
      </div>
    </template>

    <div class="search-content-mobile">
      <!-- Back to Dashboard -->
      <div
        v-if="selectedProject"
        class="p-3 mb-3 text-sm font-medium text-blue-600 cursor-pointer hover:bg-blue-50 rounded-md transition-colors border border-blue-200"
        @click="handleResetToDashboard"
      >
        <i class="pi pi-arrow-left mr-2"></i>
        Back to Dashboard
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="p-4 text-center text-surface-500">
        <i class="pi pi-spin pi-spinner text-2xl"></i>
        <p class="mt-2">Loading projects...</p>
      </div>

      <!-- No Results -->
      <div
        v-else-if="groupedProjects.length === 0 && searchQuery"
        class="p-4 text-center text-surface-500"
      >
        <i class="pi pi-search text-4xl mb-2"></i>
        <p>No projects found for "{{ searchQuery }}"</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="groupedProjects.length === 0" class="p-4 text-center text-surface-500">
        <i class="pi pi-inbox text-4xl mb-2"></i>
        <p>No projects yet. Create one to get started.</p>
      </div>

      <!-- Project Groups -->
      <template v-else>
        <div v-for="(group, index) in groupedProjects" :key="index" class="mb-6">
          <!-- Group Header -->
          <div class="px-3 py-2 text-xs font-semibold text-surface-600 uppercase tracking-wider">
            {{ group.name }}
          </div>

          <!-- Group Items -->
          <div class="space-y-2">
            <div
              v-for="project in group.items"
              :key="project.id"
              class="project-item p-4 cursor-pointer rounded-lg transition-all border"
              :class="{
                'bg-primary-50 border-primary-500': project.id === selectedProject?.id,
                'bg-surface-0 border-surface-200 hover:border-primary-300 hover:shadow-sm':
                  project.id !== selectedProject?.id,
              }"
              @click="handleSelectProject(project)"
            >
              <div class="font-medium text-base">{{ project.name }}</div>
              <div v-if="project.job_number" class="text-sm text-surface-500 mt-1">
                #{{ project.job_number }}
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </Drawer>

  <!-- Desktop/Tablet: Popover -->
  <Popover v-else ref="searchPanel" class="project-search-popover" @hide="handlePopoverHide">
    <div class="search-popover-content" style="width: 500px; max-height: 600px">
      <!-- Search Input -->
      <div class="search-header p-3 border-b">
        <IconField iconPosition="left" class="w-full">
          <InputIcon>
            <i class="pi pi-search" />
          </InputIcon>
          <InputText
            ref="desktopSearchInput"
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
        class="p-3 mx-3 mt-3 text-sm font-medium text-blue-600 cursor-pointer hover:bg-blue-50 rounded-md transition-colors border border-blue-200"
        @click="handleResetToDashboard"
      >
        <i class="pi pi-arrow-left mr-2"></i>
        Back to Dashboard
      </div>

      <!-- Results -->
      <div class="search-results overflow-y-auto p-3" style="max-height: 500px">
        <!-- Loading State -->
        <div v-if="isLoading" class="p-4 text-center text-surface-500">
          <i class="pi pi-spin pi-spinner text-xl"></i>
        </div>

        <!-- No Results -->
        <div
          v-else-if="groupedProjects.length === 0 && searchQuery"
          class="p-4 text-center text-surface-500"
        >
          <i class="pi pi-search text-2xl mb-2"></i>
          <p class="text-sm">No projects found</p>
        </div>

        <!-- Empty State -->
        <div v-else-if="groupedProjects.length === 0" class="p-4 text-center text-surface-500">
          <p class="text-sm">No projects available</p>
        </div>

        <!-- Project Groups -->
        <template v-else>
          <div v-for="(group, index) in groupedProjects" :key="index" class="mb-4">
            <!-- Group Header -->
            <div
              class="px-2 py-1 text-xs font-semibold text-surface-600 uppercase tracking-wider sticky top-0 bg-surface-0"
            >
              {{ group.name }}
            </div>

            <!-- Group Items -->
            <div class="space-y-1 mt-1">
              <div
                v-for="project in group.items"
                :key="project.id"
                class="project-item px-3 py-2 cursor-pointer rounded-md transition-all"
                :class="{
                  'bg-primary-50 border-l-2 border-primary-500': project.id === selectedProject?.id,
                  'hover:bg-surface-50': project.id !== selectedProject?.id,
                }"
                @click="handleSelectProject(project)"
              >
                <div class="font-medium text-sm">{{ project.name }}</div>
                <div v-if="project.job_number" class="text-xs text-surface-500 mt-0.5">
                  #{{ project.job_number }}
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </Popover>
</template>

<script setup>
import { computed, ref, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { useProjectSearch } from '@/composables/useProjectSearch';
import { useProjectStore, useUIStore } from '@/stores';
import Drawer from 'primevue/drawer';
import Popover from 'primevue/popover';
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

const searchPanel = ref(null);
const mobileSearchInput = ref(null);
const desktopSearchInput = ref(null);
const isMobileView = ref(false);

const isVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val),
});

const searchQuery = ref('');
const isSelecting = ref(false);

// Use project search composable
const projectSearch = useProjectSearch({
  groupByPhase: true,
  limit: 100,
});

const {
  query,
  suggestions,
  selected: composableSelected,
  selectProject: composableSelectProject,
  reset,
  loading: isLoading,
} = projectSearch;

// Sync search query
watch(searchQuery, (val) => {
  query.value = val;
});

// Grouped projects
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

// Detect screen size
const checkMobileView = () => {
  isMobileView.value = window.innerWidth < 640; // sm breakpoint
};

// Watch visibility to open appropriate UI
watch(isVisible, async (newVal) => {
  if (newVal) {
    checkMobileView();
    await nextTick();

    if (isMobileView.value) {
      // Mobile: Drawer opens automatically via v-model:visible
      await nextTick();
      mobileSearchInput.value?.$el?.focus();
    } else {
      // Desktop: Show Popover - new Popover component API
      const searchButton = document.querySelector('[aria-label="Search projects"]');
      if (searchButton && searchPanel.value) {
        searchPanel.value.show({ currentTarget: searchButton });
        await nextTick();
        desktopSearchInput.value?.$el?.focus();
      }
    }
  } else if (!isMobileView.value && searchPanel.value) {
    searchPanel.value.hide();
  }
});

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
      isVisible.value = false;
      searchQuery.value = '';
    }
  } catch (error) {
    console.error('ProjectSearchDialog: Selection error:', error);
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
      isVisible.value = false;
    }
  } catch (error) {
    console.error('ProjectSearchDialog: Reset error:', error);
  } finally {
    isSelecting.value = false;
  }
};

const handlePopoverHide = () => {
  // When popover is dismissed (click outside, ESC, etc.), sync our state
  isVisible.value = false;
  searchQuery.value = ''; // Reset search on close
};

const handleDrawerHide = () => {
  // When mobile drawer is dismissed (click outside, swipe, ESC, etc.), sync our state
  isVisible.value = false;
  searchQuery.value = ''; // Reset search on close
};

// Lifecycle
onMounted(() => {
  checkMobileView();
  window.addEventListener('resize', checkMobileView);
});

onUnmounted(() => {
  window.removeEventListener('resize', checkMobileView);
});

// Expose for parent (if needed)
defineExpose({
  searchPanel,
});
</script>

<style>
/* Mobile: Full-screen drawer - slides from right */
/* NOTE: Using non-scoped style to ensure PrimeVue Drawer gets proper width */
.project-search-mobile-drawer.p-drawer {
  width: 100vw !important;
  max-width: 100vw !important;
  min-width: 100vw !important;
}

.project-search-mobile-drawer .p-drawer-content {
  width: 100% !important;
  padding: 0 !important;
}

.project-search-mobile-drawer .p-drawer-header {
  padding: 1rem !important;
  width: 100% !important;
}
</style>

<style scoped>
.search-content-mobile {
  height: calc(100vh - 180px);
  overflow-y: auto;
  padding: 0 1rem;
}

/* Desktop: Popover styling */
.project-search-popover :deep(.p-popover-content) {
  padding: 0;
}

.search-header {
  background: var(--surface-0);
  position: sticky;
  top: 0;
  z-index: 1;
}

/* Project item hover effects */
.project-item {
  transition: all 0.15s ease;
}

.project-item:active {
  transform: scale(0.98);
}

/* Smooth scrolling */
.search-results {
  scroll-behavior: smooth;
}

/* Loading spinner animation */
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.pi-spinner {
  animation: spin 1s linear infinite;
}
</style>
