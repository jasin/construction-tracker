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
            class="p-3 text-sm font-medium text-blue-600 cursor-pointer hover:bg-blue-50 border-b border-gray-200"
            @click.stop="resetToDashboard"
            role="option"
            aria-label="Back to Dashboard"
          >
            ← Back to Dashboard
          </div>

          <!-- Grouped Suggestions (or show if no suggestions but back visible) -->
          <template
            v-if="suggestions.length > 0"
            v-for="(group, groupIndex) in groupedSuggestions"
            :key="groupIndex"
          >
            <div
              class="p-2 font-semibold text-sm text-gray-700 bg-gray-50 border-b border-gray-200"
              role="group"
            >
              {{ group.name }}
            </div>
            <template v-for="(item, itemIndex) in group.items" :key="itemIndex">
              <div
                class="px-2 pl-8 py-2 text-xs text-gray-800 hover:bg-gray-50 cursor-pointer"
                @click.stop="!isSelecting && handleSelectProject(item)"
                :class="{
                  'bg-blue-50 border-l-2 border-blue-500':
                    item.id === highlightedIndex || item.id === selectedProject?.id,
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
            class="px-3 py-2 text-sm text-gray-500 border-t border-gray-200"
          >
            No matches found for "{{ localQuery }}".
          </div>
          <div
            v-else-if="!selectedProject && suggestions.length === 0 && !localQuery"
            class="px-3 py-2 text-sm text-gray-500 border-t border-gray-200"
          >
            No projects yet—create one to get started.
          </div>

          <!-- Loading (if composable has it) -->
          <div v-if="isLoading" class="px-3 py-2 text-sm text-gray-500 border-t border-gray-200">
            Loading projects...
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch, onUnmounted } from 'vue';
import { useProjectSearch } from '@/composables/useProjectSearch';
import { useProjectStore } from '@/stores';

const props = defineProps({
  projectId: {
    type: String,
    default: null,
  },
});

const emit = defineEmits(['project-selected', 'reset']);

const projectStore = useProjectStore();
const inputRef = ref(null);
const dropdownRef = ref(null);
const localQuery = ref('');
const isOpen = ref(false);
const highlightedIndex = ref(null); // For keyboard nav
const isLoading = ref(false); // If composable exposes loading
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
  query.value = val; // Pass as-is; composable should handle case if needed
});
watch(query, (val) => {
  localQuery.value = val; // Direct sync
});

// Simplified Computed: Group suggestions with case-insensitive filter (no multi-word overkill)
const groupedSuggestions = computed(() => {
  const q = localQuery.value.toLowerCase().trim(); // Client normalize
  if (suggestions.value.length === 0 || !q) return suggestions.value;

  return suggestions.value
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => item.name.toLowerCase().includes(q) // Simple case-insensitive substring
      ),
    }))
    .filter((group) => group.items.length > 0);
});

// Watch for project switch (props from App.vue): Clear to prevent flashing/stale
watch(
  () => props.projectId,
  (newId, oldId) => {
    if (newId !== oldId) {
      localQuery.value = '';
      isOpen.value = false;
      highlightedIndex.value = null;
      reset();
    }
  }
);

// Simplified selectedProject: Direct from composable (no fallback to avoid loops; sync via handler)
const selectedProject = computed({
  get: () => composableSelected.value,
  set: (val) => composableSelectProject(val), // Use composable for logging
});

// Sync activeProject to composable on change (fixes detail view selected)
watch(
  () => projectStore.activeProject,
  (newProject) => {
    if (newProject && newProject.id !== composableSelected.value?.id) {
      composableSelected.value = newProject;
    }
  }
);

// Watch selected for reactivity
watch(selectedProject, (val) => {
  if (val && isOpen.value) {
    nextTick(updatePosition);
  }
});

// Add watcher to sync localQuery from store (prevents desync/manual set)
watch(
  () => projectStore.activeProject?.name,
  (newName) => {
    if (newName && !localQuery.value) {
      localQuery.value = newName; // Sync on store change (no loop as guarded)
    } else if (!projectStore.activeProjectId) {
      localQuery.value = ''; // Clear on reset
    }
  }
);

// Remove any existing watch on activeProject if conflicting (keep only if needed for position)

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
    highlightedIndex.value !== null ? flatOptions[highlightedIndex.value] : flatOptions[0];
  if (option && !isSelecting.value) {
    await handleSelectProject(option);
  }
};

const hideDropdown = () => {
  isOpen.value = false;
  highlightedIndex.value = null;
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

const handleSelectProject = async (project) => {
  console.log('Selecting project:', project);

  if (project.id === projectStore.activeProjectId || isSelecting.value) return;

  isSelecting.value = true;

  try {
    // Await centralized store call (handles set, subscribe, log)
    const success = await projectStore.selectProject(project);
    if (success) {
      // UI Updates after success (reactivity will sync query via watcher below)
      hideDropdown();
      console.log('Selection complete, active ID:', projectStore.activeProjectId);
    } else {
      console.warn('Selection failed, resetting query');
      localQuery.value = '';
    }
  } catch (error) {
    console.error('Select error:', error);
    localQuery.value = '';
  } finally {
    isSelecting.value = false;
  }

  selectedProject.value = project; // Triggers setter
  emit('project-selected', project); // Emit to parent
  localQuery.value = project.name;
  hideDropdown();
  await projectStore.setActiveProject(project.id); // Store update
  console.log('Selection complete, active ID:', projectStore.activeProjectId);
};

const resetToDashboard = () => {
  console.log('Resetting to dashboard via store');

  projectStore.resetActiveProject();

  localQuery.value = '';
  isOpen.value = false;
  highlightedIndex.value = null;

  console.log('Local reset complete');
};

const handleKeydown = (e) => {
  if (!isOpen.value) return;
  const flatOptions = groupedSuggestions.value.flatMap((g) => g.items);
  const total = flatOptions.length;
  if (e.key === 'ArrowDown') {
    highlightedIndex.value = (highlightedIndex.value + 1) % total;
    e.preventDefault();
  } else if (e.key === 'ArrowUp') {
    highlightedIndex.value = (highlightedIndex.value - 1 + total) % total;
    e.preventDefault();
  }
  const highlightedEl = dropdownRef.value?.querySelector(`[aria-selected="true"]`);
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
  opacity: 1; /* Default shown; v-show handles toggle */
}

/* Option hover/selected: Light gray/blue like PrimeVue */
.option {
  transition: background-color 0.15s ease;
}

/* Group header: Matches #optiongroup */
.group-header {
  background-color: #f8fafc; /* PrimeVue light bg */
  border-color: #e2e8f0; /* Gray-200 */
}

/* Indented options: Extra left padding under groups */
div[class*='text-xs text-gray-800'] {
  padding-left: 2rem; /* Indent by 0.5rem (8px) - adjust if needed */
  transition: background-color 0.15s ease;
}

/* Empty/loading: Neutral, padded like options */
div[class*='text-gray-500'] {
  border-top-color: #e2e8f0;
  background-color: #f8fafc;
}

/* Back button: Exact match to #header slot */
div[class*='text-blue-600'] {
  font-weight: 500;
  transition: background-color 0.15s ease;
}

div[class*='text-blue-600']:hover {
  background-color: #eff6ff; /* Blue-50 */
  border-bottom-color: #e2e8f0;
}

/* Focus ring on input: Matches PrimeVue */
.p-inputtext:focus {
  box-shadow: 0 0 0 0.2rem rgba(59, 130, 246, 0.25); /* Blue-500 ring */
}

/* Selected/highlighted: Subtle blue like PrimeVue */
.bg-blue-50 {
  border-left-color: #3b82f6; /* Blue-500 */
  background-color: #eff6ff !important; /* Blue-50 */
}

/* Dropdown icon rotation and hover */
.pi.pi-chevron-down {
  transition:
    transform 0.2s ease,
    color 0.2s ease;
}
</style>
