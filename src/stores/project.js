// stores/project.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import ProjectRepository from '@/services/firebase/Repositories/ProjectRepository';
import { extractData, handleAsync, handleError } from '../utils/errorHandler';

export const useProjectStore = defineStore('project', () => {
  // State - Single Project (existing)
  const currentProject = ref({});
  const loading = ref(false);
  const error = ref(null);
  const subscriptions = ref([]);

  // State - All Projects (new)
  const projects = ref([]);
  const projectsLoading = ref(true);
  const projectsInitialized = ref(false);
  let allProjectsUnsubscribe = null;

  // Getters - Single Project (existing)
  const projectTeam = computed(() => {
    return [
      currentProject.value.projectManager && {
        name: currentProject.value.projectManager,
        role: 'Project Manager',
        icon: 'pi-user',
        color: 'blue',
      },
      currentProject.value.superintendent && {
        name: currentProject.value.superintendent,
        role: 'Superintendent',
        icon: 'pi-hard-hat',
        color: 'yellow',
      },
      currentProject.value.architect && {
        name: currentProject.value.architect,
        role: 'Architect',
        icon: 'pi-pencil',
        color: 'purple',
      },
    ].filter(Boolean);
  });

  const projectStatus = computed(() => {
    return {
      phase: currentProject.value.phase,
      contractSigned: currentProject.value.contractSigned,
      cost: currentProject.value.cost,
      startDate: currentProject.value.startDate,
      endDate: currentProject.value.endDate,
    };
  });

  // Getters - All Projects (new)
  const projectCount = computed(() => projects.value.length);

  const activeProjects = computed(() =>
    projects.value.filter((p) => !['completed', 'cancelled', 'on-hold'].includes(p.status))
  );

  const projectsByPhase = computed(() => {
    const grouped = {};
    projects.value.forEach((project) => {
      const phase = project.phase || 'other';
      if (!grouped[phase]) grouped[phase] = [];
      grouped[phase].push(project);
    });
    return grouped;
  });

  // Actions - Single Project (existing)
  /**
   * Loads a project by ID, updating loading and error state.
   * @param {string} projectId - The ID of the project to load.
   * @returns {Promise<Object|null>} Loaded project data or null if not found.
   */
  async function loadProject(projectId) {
    loading.value = true;
    error.value = null;

    const result = await handleAsync(
      async () => {
        const projectData = await ProjectRepository.getProject(projectId);
        currentProject.value = projectData || null;
        return projectData;
      },
      { context: `Load project ${projectId}` }
    );

    const projectData = extractData(result);

    if (!projectData) {
      error.value = 'Project not found';
    }

    loading.value = false;
    return projectData;
  }

  function subscribeToProject(projectId) {
    const unsubscribe = ProjectRepository.subscribeToProject(projectId, (projectData) => {
      if (projectData) {
        currentProject.value = projectData;
      }
    });
    subscriptions.value.push(unsubscribe);
    return unsubscribe;
  }

  function updateProject(updates) {
    currentProject.value = { ...currentProject.value, ...updates };
  }

  function clearSubscriptions() {
    subscriptions.value.forEach((unsubscribe) => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      } else if (unsubscribe && typeof unsubscribe.unsubscribe === 'function') {
        unsubscribe.unsubscribe();
      } else {
        handleError(
          new Error('Invalid subscribe type'),
          'clearSubscriptions - Invalid unsubscribe'
        );
      }
    });
    subscriptions.value = [];
  }

  function resetProject() {
    currentProject.value = {};
    error.value = null;
    clearSubscriptions();
  }

  // Actions - All Projects (new)
  /**
   * Initializes the real-time subscription to all projects.
   * Should be called once when the app starts (after authentication).
   */
  function initializeProjectsSubscription() {
    if (allProjectsUnsubscribe) {
      console.log('⚠️ Projects subscription already active');
      return;
    }

    console.log('🔥 Initializing all projects subscription in store');

    allProjectsUnsubscribe = ProjectRepository.subscribeToAll(
      (updatedProjects) => {
        console.log('📦 Store received projects update:', updatedProjects.length);
        projects.value = [...updatedProjects];
        projectsLoading.value = false;
        projectsInitialized.value = true;
      },
      null, // sortFn
      (error) => {
        console.error('🚨 Store subscription error:', error);
        projectsLoading.value = false;
        handleError(error, 'Projects subscription error');
      }
    );
  }

  /**
   * Cleans up the all projects subscription.
   * Should be called on logout.
   */
  function cleanupProjectsSubscription() {
    if (allProjectsUnsubscribe) {
      console.log('🧹 Cleaning up all projects subscription');
      allProjectsUnsubscribe();
      allProjectsUnsubscribe = null;
      projectsInitialized.value = false;
      projects.value = [];
    }
  }

  /**
   * Gets a project by ID from the projects list.
   * @param {string} id - Project ID
   * @returns {Object|undefined} Project object or undefined
   */
  function getProjectById(id) {
    return projects.value.find((p) => p.id === id);
  }

  /**
   * Searches projects by name, job number, or client name.
   * @param {string} query - Search query
   * @returns {Array} Filtered projects
   */
  function searchProjects(query) {
    if (!query) return projects.value;
    const lowerQuery = query.toLowerCase();
    return projects.value.filter(
      (p) =>
        p.name.toLowerCase().includes(lowerQuery) ||
        (p.jobNumber || '').toLowerCase().includes(lowerQuery) ||
        (p.clientName || '').toLowerCase().includes(lowerQuery)
    );
  }

  return {
    // State - Single Project
    currentProject,
    loading,
    error,

    // State - All Projects
    projects,
    projectsLoading,
    projectsInitialized,

    // Getters - Single Project
    projectTeam,
    projectStatus,

    // Getters - All Projects
    projectCount,
    activeProjects,
    projectsByPhase,

    // Actions - Single Project
    loadProject,
    subscribeToProject,
    updateProject,
    clearSubscriptions,
    resetProject,

    // Actions - All Projects
    initializeProjectsSubscription,
    cleanupProjectsSubscription,
    getProjectById,
    searchProjects,
  };
});
