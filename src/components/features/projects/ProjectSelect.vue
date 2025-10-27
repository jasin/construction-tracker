<template>
  <div class="custom-project-select p-autocomplete">
    <!-- Input Wrapper for Dropdown Arrow -->
    <div class="relative inline-flex w-64 ml-4">
      <input
        ref="inputRef"
        v-model="localQuery"
        @input="handleInput"
        @focus="handleFocus"
        @keydown.enter="handleEnter"
        @keydown.esc="hideDropdown"
        @blur="handleBlur"
        placeholder="Select a project"
        class="p-inputtext p-component flex-1 text-xs border border-gray-300 rounded-md px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
        autocomplete="off"
        aria-label="Project search"
      />
      <!-- Dropdown Arrow Icon -->
      <i
        class="pi pi-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer transition-colors duration-200 hover:text-gray-600"
        :class="{ 'rotate-180': isOpen }"
        @click="toggleDropdown"
        aria-hidden="true"
      />
    </div>

    <!-- Dropdown (Teleport to body for stability, no parent re-render interference) -->
    <Teleport to="body">
      <div
        v-show="isOpen && (suggestions.length > 0 || localQuery || selectedProject)"
        ref="dropdownRef"
        class="p-autocomplete-panel absolute bg-white rounded-md shadow-md max-h-48 overflow-y-auto z-50 min-w-[16rem] text-xs transition-opacity duration-100"
        :style="dropdownStyle"
        role="listbox"
        aria-expanded="true"
      >
        <!-- Outer wrapper for click-outside -->
        <div @click.self="hideDropdown">
          <!-- Back to Dashboard (Header slot mimic: Top row when selected) -->
          <div
            v-if="selectedProject"
            class="p-3 text-sm font-medium text-blue-600 cursor-pointer hover:bg-blue-50"
            :class="{
              'opacity-50 cursor-not-allowed pointer-events-none':
                isSelecting || uiStore.isProjectTransitioning,
            }"
            @click.stop="resetToDashboard"
            role="option"
            aria-label="Back to Dashboard"
          >
            ← Back to Dashboard
          </div>

          <!-- Grouped Suggestions (or show if no suggestions but back visible) -->
          <template v-for="(group, groupIndex) in groupedSuggestions" :key="groupIndex">
            <div class="p-2 font-semibold text-sm text-gray-700 bg-white" role="group">
              {{ group.name }}
            </div>
            <template v-for="(item, itemIndex) in group.items" :key="itemIndex">
              <div
                class="px-2 pl-8 py-2 text-xs text-gray-800 hover:bg-blue-50 cursor-pointer"
                @click.stop="handleSelectProject(item)"
                :class="{
                  'bg-gray-50 border-l-2 border-gray-300': item.id === selectedProject?.id,
                  'bg-blue-50 border-l-2 border-blue-500': item.id === highlightedId,
                  'opacity-50 cursor-not-allowed pointer-events-none': isSelecting,
                }"
                role="option"
                :aria-selected="item.id === selectedProject?.id"
              >
                {{ item.name }}
              </div>
            </template>
          </template>

          <!-- No Results or Empty State (hide if back visible) -->
          <div
            v-if="!selectedProject && suggestions.length === 0 && localQuery"
            class="px-3 py-2 text-sm text-gray-500"
          >
            No matches found for "{{ localQuery }}".
          </div>
          <div
            v-else-if="!selectedProject && suggestions.length === 0 && !localQuery"
            class="px-3 py-2 text-sm text-gray-500"
          >
            No projects yet—create one to get started.
          </div>

          <!-- Loading (if composable has it) -->
          <div v-if="isLoading" class="px-3 py-2 text-sm text-gray-500">Loading projects...</div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch, onUnmounted } from 'vue';
import { useRouter } from 'vue-router'; // FIXED: Import for navigation
import { useProjectSearch } from '@/composables/useProjectSearch';
import { useProjectStore } from '@/stores';
import { useUIStore } from '@/stores/ui';

const router = useRouter(); // FIXED: Instance for navigation

const props = defineProps({
  projectId: {
    type: String,
    default: null,
  },
});

const emit = defineEmits(['project-selected', 'reset']);

const projectStore = useProjectStore();
const uiStore = useUIStore();
const inputRef = ref(null);
const dropdownRef = ref(null);
const localQuery = ref('');
const isOpen = ref(false);
const highlightedId = ref(null);
const isLoading = ref(false);
const isSelecting = ref(false);

// Re-use composable (handles fuzzy, grouping, real-time Firebase, logging via ActivityService)
const projectSearch = useProjectSearch({
  groupByPhase: true,
  limit: 20,
});
const {
  query,
  suggestions,
  selected: composableSelected,
  selectProject: composableSelectProject,
  reset,
} = projectSearch;

// Sync localQuery with composable (bidirectional, no normalization to avoid breaking composable)
watch(localQuery, (val) => {
  query.value = val;
});
watch(query, (val) => {
  localQuery.value = val;
});

// Simplified Computed: Group suggestions with case-insensitive filter
const groupedSuggestions = computed(() => {
  const q = localQuery.value.toLowerCase().trim();
  if (suggestions.value.length === 0 || !q) return suggestions.value;

  return suggestions.value
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.name.toLowerCase().includes(q)),
    }))
    .filter((group) => group.items.length > 0);
});

// Simplified selectedProject: Direct from composable
const selectedProject = computed({
  get: () => composableSelected.value,
  set: (val) => {
    if (val && val.id) {
      composableSelectProject(val);
    } else {
      composableSelectProject(null);
    }
  },
});

// Sync activeProject to composable on change
watch(
  () => projectStore.activeProject,
  async (newProject) => {
    console.log('ProjectSelect: Store activeProject changed:', newProject ? newProject.id : 'null');
    if (newProject && newProject.id !== composableSelected.value?.id) {
      console.log('ProjectSelect: Syncing active to composable:', newProject.id);
      composableSelected.value = newProject;
      await nextTick();
    } else if (!newProject) {
      console.log('ProjectSelect: Clearing selected on store reset');
      composableSelected.value = null;
      reset();
      await nextTick();
    }
  },
  { immediate: true, flush: 'post' }
);

// Watch selected for reactivity
watch(selectedProject, (val) => {
  // FIXED: Ensured proper syntax (arrow function closed)
  if (val && isOpen.value) {
    nextTick(updatePosition);
  }
});

// Sync localQuery from store
watch(
  () => projectStore.activeProject?.name,
  (newName) => {
    if (newName && !localQuery.value) {
      localQuery.value = newName;
    } else if (!projectStore.activeProjectId) {
      localQuery.value = '';
    }
  }
);

// Dropdown position
const dropdownStyle = ref({});
const updatePosition = async () => {
  await nextTick();
  if (inputRef.value && dropdownRef.value) {
    const rect = inputRef.value.getBoundingClientRect();
    dropdownStyle.value = {
      top: `${rect.bottom + window.scrollY}px`,
      left: `${rect.left + window.scrollX}px`,
      width: `${rect.width}px`,
    };
  }
};

// Handlers
const handleInput = () => {
  isOpen.value = true;
  updatePosition();
};

const handleFocus = () => {
  if (!localQuery.value) {
    query.value = '';
  }
  isOpen.value = true;
  updatePosition();
};

const handleBlur = () => {
  setTimeout(() => {
    isOpen.value = false;
  }, 150);
};

const handleEnter = async () => {
  const flatOptions = groupedSuggestions.value.flatMap((g) => g.items);
  const option =
    highlightedId.value !== null
      ? flatOptions.find((item) => item.id === highlightedId.value)
      : flatOptions[0];
  if (option && !isSelecting.value) {
    await handleSelectProject(option);
  }
};

const hideDropdown = () => {
  isOpen.value = false;
  highlightedId.value = null;
};

const toggleDropdown = () => {
  if (isOpen.value) {
    hideDropdown();
  } else {
    inputRef.value?.focus();
    isOpen.value = true;
    updatePosition();
    if (!localQuery.value) query.value = '';
  }
};

/**
 * FIXED: Improved project selection handler
 * - Removed early return for already-selected projects (let store decide)
 * - Better error handling
 * - Always clears isSelecting flag
 * - More defensive checks
 */
const handleSelectProject = async (project) => {
  if (!project || !project.id || uiStore.isProjectTransitioning) {
    console.warn('ProjectSelect: Invalid project:', project);
    return;
  }

  // FIXED: Only guard against rapid double-clicks, not same project selection
  if (isSelecting.value) {
    console.log('ProjectSelect: Selection in progress, skipping');
    return;
  }

  console.log('ProjectSelect: Selecting project:', project.id);
  isSelecting.value = true;

  try {
    // FIXED: Always call store, even if same project (store handles deduplication)
    const success = await projectStore.selectProject(project);

    // Wait a tick for store state to propagate
    await nextTick();

    if (success) {
      // Sync composable
      composableSelectProject(project);
      localQuery.value = project.name;
      hideDropdown();
      emit('project-selected', project);
      console.log('ProjectSelect: Selection complete');
    } else {
      console.warn('ProjectSelect: Store selectProject returned false');
      // Don't clear query on failure - let user retry
    }
  } catch (error) {
    console.error('ProjectSelect: Selection error:', error);
    // Don't clear query on error - let user retry
  } finally {
    // CRITICAL: Always clear flag, even on error
    isSelecting.value = false;
  }
};

// ============================================
// FIXED resetToDashboard() function
// File: components/features/projects/ProjectSelect.vue
// Replace your existing function with this
// ============================================
const resetToDashboard = async () => {
  if (isSelecting.value || uiStore.isProjectTransitioning) {
    console.log('⏸️ Reset blocked - operation in progress');
    return;
  }

  console.log('🔄 ProjectSelect: Resetting to dashboard');
  isSelecting.value = true;

  try {
    // Store handles: state clearing + navigation + logging
    const success = await projectStore.resetActiveProject();

    if (success) {
      // Clear local UI state after successful store reset
      localQuery.value = '';
      composableSelected.value = null;
      hideDropdown();
      reset();

      console.log('✅ Dashboard reset complete');
    } else {
      console.warn('⚠️ Store reset returned false');
    }
  } catch (error) {
    console.error('❌ ProjectSelect: Reset error:', error);
  } finally {
    isSelecting.value = false;
  }
};

// ============================================
// OPTIONAL: Simplified watchers (remove conflicts)
// Remove the props.projectId watcher if you have one
// Keep only this single source of truth watcher:
// ============================================

watch(
  () => projectStore.activeProject,
  async (newProject) => {
    console.log('📊 Store changed:', newProject?.id || 'null');

    if (newProject) {
      composableSelected.value = newProject;
      localQuery.value = newProject.name;
    } else {
      composableSelected.value = null;
      localQuery.value = '';
      reset();
    }

    await nextTick();
  },
  { immediate: true, flush: 'post' }
);

const handleKeydown = (e) => {
  if (!isOpen.value) return;
  const flatOptions = groupedSuggestions.value.flatMap((g) => g.items);
  const total = flatOptions.length;
  if (e.key === 'ArrowDown') {
    let currentIdx = -1;
    if (highlightedId.value !== null) {
      currentIdx = flatOptions.findIndex((item) => item.id === highlightedId.value);
    }
    const nextIdx = (currentIdx + 1) % total;
    highlightedId.value = flatOptions[nextIdx].id;
    e.preventDefault();
  } else if (e.key === 'ArrowUp') {
    let currentIdx = -1;
    if (highlightedId.value !== null) {
      currentIdx = flatOptions.findIndex((item) => item.id === highlightedId.value);
    }
    const prevIdx = currentIdx === -1 ? total - 1 : (currentIdx - 1 + total) % total;
    highlightedId.value = flatOptions[prevIdx].id;
    e.preventDefault();
  }
  const highlightedEl = dropdownRef.value?.querySelector('.bg-blue-50');
  highlightedEl?.scrollIntoView({ block: 'nearest' });
};

// Expose for parent
defineExpose({
  hideDropdown,
});

// Mount
onMounted(() => {
  inputRef.value.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  if (inputRef.value) inputRef.value.removeEventListener('keydown', handleKeydown);
});
</script>

<style scoped>
/* Wrapper for PrimeVue-like structure */
.custom-project-select {
  position: relative;
}

/* Dropdown: Mimic p-autocomplete-panel with subtle transition (no border) */
.custom-project-select .p-autocomplete-panel {
  opacity: 1;
}

/* Option hover/selected: Light gray/blue like PrimeVue */
.option {
  transition: background-color 0.15s ease;
}

/* Group header: Matches #optiongroup */
.group-header {
  background-color: #ffffff;
  border-color: #e2e8f0;
}

/* Indented options: Extra left padding under groups */
div[class*='text-xs text-gray-800'] {
  padding-left: 2rem;
  transition: background-color 0.15s ease;
}

/* Empty/loading: Neutral, padded like options */
div[class*='text-gray-500'] {
  border-top-color: #e2e8f0;
  background-color: #ffffff;
}

/* Back button: Exact match to #header slot */
div[class*='text-blue-600'] {
  font-weight: 500;
  transition: background-color 0.15s ease;
}

div[class*='text-blue-600']:hover {
  background-color: #eff6ff;
  border-bottom-color: #e2e8f0;
}

/* Focus ring on input: Matches PrimeVue */
.p-inputtext:focus {
  box-shadow: 0 0 0 0.2rem rgba(59, 130, 246, 0.25);
}

/* Selected/highlighted: Subtle blue like PrimeVue */
.bg-blue-50 {
  border-left-color: #3b82f6;
  background-color: #eff6ff !important;
}

/* Dropdown icon rotation and hover */
.pi.pi-chevron-down {
  transition:
    transform 0.2s ease,
    color 0.2s ease;
}
</style>
