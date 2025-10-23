import { ref, watch } from 'vue';
import { debounce } from 'lodash-es';
import { useProjectStore } from '@/stores/project';
import { database } from '@/configs/firebase'; // RTDB ref
import {
  query as dbQuery,
  ref as dbRef,
  orderByChild,
  startAt,
  endAt,
  limitToFirst,
  onValue,
} from 'firebase/database';

export function useProjectSearch({ groupByPhase = false, limit = 20 } = {}) {
  const store = useProjectStore();
  const query = ref('');
  const suggestions = ref([]);
  const loading = ref(false);
  const selected = ref(null);
  let searchUnsubscribe = null;

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

  // Debounced search function using RTDB for real-time query
  const debouncedSearch = debounce(async (q) => {
    if (!q || typeof q !== 'string') {
      console.log('Search guard: q not string, skipping', q);
      loading.value = false;
      return;
    }
    loading.value = true;
    try {
      if (searchUnsubscribe) {
        searchUnsubscribe();
      }
      if (!q.trim()) {
        // Fallback to cached full list for empty query
        suggestions.value = store.projects.slice(0, limit);
        if (groupByPhase) {
          suggestions.value = groupProjectsByPhase(suggestions.value, q);
        }
        loading.value = false;
        return;
      }

      const projectsRef = dbRef(database, 'projects');
      const searchQuery = q.trim();
      const start = searchQuery;
      const end = searchQuery + '\uf8ff'; // For startsWith in RTDB
      searchUnsubscribe = onValue(
        dbQuery(projectsRef, orderByChild('name'), startAt(start), endAt(end), limitToFirst(limit)),
        (snapshot) => {
          const data = snapshot.val();
          if (data) {
            suggestions.value = Object.entries(data).map(([id, p]) => ({ id, ...p }));
            if (groupByPhase) {
              suggestions.value = groupProjectsByPhase(suggestions.value, q);
            }
          } else {
            suggestions.value = [];
          }
          loading.value = false;
        },
        (err) => {
          console.error('RTDB search failed:', err);
          suggestions.value = [];
          loading.value = false;
        }
      );
    } catch (err) {
      console.error('Search failed:', err);
      suggestions.value = [];
    } finally {
      loading.value = false;
    }
  }, 300); // 300ms debounce

  const handleEmptyQuery = () => {
    if (searchUnsubscribe) {
      searchUnsubscribe();
      searchUnsubscribe = null;
    }
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
    { immediate: false } // Don't run immediately; wait for first store update
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

  // Cleanup on unmount or query clear
  watch(
    () => query.value,
    (newQ) => {
      if (!newQ && searchUnsubscribe) {
        searchUnsubscribe();
        searchUnsubscribe = null;
      }
    },
    { immediate: true }
  );

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
