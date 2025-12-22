import { ref, watch, computed } from 'vue';
import { debounce } from 'lodash-es';
import { useProjectStore } from '@/stores/project';

export function useProjectSearch({ groupByPhase = false, limit = 20 } = {}) {
  const store = useProjectStore();
  const query = ref('');
  const suggestions = ref([]);
  const loading = ref(false);
  const selected = ref(null);

  // Inline group by phase logic (if needed)
  const phaseToGroup = {
    construction: 'Active Projects',
    preConstruction: 'Pre-Construction',
    complete: 'Completed',
    closeOut: 'Close-Out',
  };

  const groupOrder = ['Active Projects', 'Pre-Construction', 'Completed', 'Close-Out', 'Other'];

  const groupProjectsByPhase = (projectsList, searchQuery = '') => {
    const lowerQuery = searchQuery.toLowerCase();
    const filtered = searchQuery
      ? projectsList.filter(
          (p) =>
            p.name.toLowerCase().includes(lowerQuery) ||
            (p.job_number || '').toLowerCase().includes(lowerQuery)
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

  // Debounced search function using store's projects
  const debouncedSearch = debounce(async (q) => {
    if (!q || typeof q !== 'string') {
      console.log('Search guard: q not string, skipping', q);
      loading.value = false;
      return;
    }
    loading.value = true;
    try {
      if (!q.trim()) {
        // Fallback to cached full list for empty query
        suggestions.value = store.projects.slice(0, limit);
        if (groupByPhase) {
          suggestions.value = groupProjectsByPhase(suggestions.value, q);
        }
        loading.value = false;
        return;
      }

      // Filter projects from store based on search query
      const searchQuery = q.trim().toLowerCase();
      const filtered = store.projects.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery) ||
          (p.job_number || '').toLowerCase().includes(searchQuery) ||
          (p.client_name || '').toLowerCase().includes(searchQuery)
      );

      suggestions.value = filtered.slice(0, limit);
      if (groupByPhase) {
        suggestions.value = groupProjectsByPhase(suggestions.value, q);
      }
      loading.value = false;
    } catch (err) {
      console.error('Search failed:', err);
      suggestions.value = [];
    } finally {
      loading.value = false;
    }
  }, 300); // 300ms debounce

  const handleEmptyQuery = () => {
    loading.value = true;
    suggestions.value = store.projects.slice(0, limit);
    if (groupByPhase) {
      suggestions.value = groupProjectsByPhase(suggestions.value, '');
    }
    loading.value = false;
  };

  // Watch store projects for initial load sync (only when query empty)
  watch(
    () => store.projects,
    () => {
      if (!query.value.trim()) {
        handleEmptyQuery();
      }
    },
    { immediate: true } // Run immediately to populate suggestions on mount
  );

  // Watch query for search
  watch(query, (newQuery) => {
    const trimmed = String(newQuery || '').trim();
    if (!trimmed || (selected.value && trimmed === selected.value.name)) {
      handleEmptyQuery();
    } else {
      debouncedSearch(newQuery);
    }
  });

  // Select project function
  const selectProject = async (project) => {
    if (!project || !project.id) {
      console.log('Composable selectProject: Guarding null/undefined – skipping store');
      selected.value = null; // Local clear only
      return; // Don't call store
    }

    selected.value = project;
    const projectStore = useProjectStore();
    await projectStore.selectProject(project); // Full project from search
  };

  const reset = () => {
    selected.value = null;
    query.value = '';
    // The query watch will immediately handle empty query repopulation
  };

  return {
    query,
    suggestions,
    loading,
    selected,
    selectProject,
    reset,
  };
}
