// stores/project.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import ProjectRepository from '@/services/firebase/Repositories/ProjectRepository';
import { handleError } from '../utils/errorHandler';
import { ref as dbRef, onValue } from 'firebase/database';
import firebaseCore from '@/services/firebase/core/FirebaseCore';
import ActivityService from '@/services/logging/ActivityService.js';
import router from '@/router'; // ADDED: Import router for URL updates

export const useProjectStore = defineStore('project', () => {
  // State - Single Project (existing)
  const currentProject = ref({});
  const loading = ref(false);
  const error = ref(null);
  const subscriptions = ref([]);

  // State - All Projects (existing)
  const projects = ref([]);
  const projectsLoading = ref(true);
  const projectsInitialized = ref(false);
  const activeProjectId = ref(null);
  const isResetting = ref(false); // Flag for dedupe in resetActiveProject
  const isSetting = ref(false); // Flag for dedupe in selectProject

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

  // Getters - Active Project (existing)
  const activeProject = computed(() => {
    if (activeProjectId.value === null) return null;
    if (currentProject.value?.id === activeProjectId.value) {
      return currentProject.value; // Full loaded data
    }
    // Fallback to list item (partial) if not fully loaded
    return projects.value.find((p) => p.id === activeProjectId.value) || null;
  });

  // Getters - All Projects (existing)
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

    let projectData;
    try {
      projectData = await ProjectRepository.getProject(projectId);
      console.log('Repository getProject result for', projectId, ':', projectData);
      if (projectData) {
        currentProject.value = projectData;
        currentProject.value.loadedFully = true;
        console.log('loadProject direct success:', projectData);
      }
    } catch (err) {
      console.error('loadProject error:', err);
      projectData = null;
    }

    if (!projectData) {
      if (!currentProject.value.id) {
        error.value = 'Project not found';
      } else {
        console.log(
          'Load failed but fallback exists, keeping currentProject:',
          currentProject.value.id
        );
      }
    }

    loading.value = false;
    return projectData;
  }

  function subscribeToProject(projectId) {
    const unsubscribe = ProjectRepository.subscribeToProject(projectId, (projectData) => {
      if (projectData) {
        projectData.loadedFully = true;
        currentProject.value = projectData;
        console.log(
          'Subscription updated currentProject, loadedFully:',
          currentProject.value.loadedFully
        );
      }
    });
    subscriptions.value.push(unsubscribe);
    return unsubscribe;
  }

  function updateProject(updates) {
    currentProject.value = { ...currentProject.value, ...updates };
  }

  function clearSubscriptions() {
    subscriptions.value.forEach((sub) => {
      const unsubscribe = sub.unsubscribe || sub;
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

  // ENHANCED: Sets the active project by ID or project object, loading full details if needed and subscribing for real-time updates.
  // Centralizes active project management as single source of truth.
  // @param {string|Object} idOrProject - Project ID (string) or full project object
  // @returns {Promise<Object|null>} The active project data
  async function setActiveProject(idOrProject) {
    if (idOrProject === null || idOrProject === undefined) {
      console.log('Guard: setActiveProject called with null/undefined – using reset path');
      activeProjectId.value = null;
      resetProject(); // Safe cleanup
      return null;
    }

    const id = typeof idOrProject === 'object' ? idOrProject.id : idOrProject;
    if (!id) {
      activeProjectId.value = null;
      resetProject(); // Clear current if no ID
      return null;
    }

    if (activeProjectId.value === id && currentProject.value?.id === id) {
      console.log('✅ Active project already set:', id);
      return currentProject.value;
    }

    console.log('🔄 Setting active project:', id);

    try {
      // Load full project if not already loaded
      if (currentProject.value?.id !== id) {
        clearSubscriptions();
        try {
          await loadProject(id);
        } catch (loadErr) {
          console.error('Full load failed in setActiveProject:', loadErr);
        }
        if (!currentProject.value?.id) {
          // Fallback to partial data from list as single source
          const partial = projects.value.find((p) => p.id === id);
          if (partial) {
            currentProject.value = { ...partial, loadedFully: false };
            console.log('🔄 Fallback to partial list data for active project:', id);
            error.value = null;
            console.log('Cleared error after fallback for project:', id);
          } else {
            console.warn('No partial data found for active project:', id);
            error.value = 'Project not found - catastrophic failure';
            activeProjectId.value = null;
            return null;
          }
        } else {
          currentProject.value.loadedFully = true;
          error.value = null;
        }
      } else {
        currentProject.value.loadedFully = true;
      }

      // Subscribe if not already (avoids duplicates)
      if (!subscriptions.value.some((sub) => sub.projectId === id)) {
        const unsubscribe = subscribeToProject(id);
        subscriptions.value.push({ projectId: id, unsubscribe });
      }

      // Set active ID only AFTER data is ready (full or partial)
      activeProjectId.value = id;
      console.log('✅ Active project set and subscribed:', id);
      return currentProject.value;
    } catch (err) {
      console.error('Failed to set active project:', err);
      handleError(err, `Set active project ${id}`);
      activeProjectId.value = null;
      return null;
    }
  }

  // ENHANCED: Public action for selecting a project (centralized with logging and URL update)
  async function selectProject(project) {
    if (isSetting.value) {
      console.log('Store: selectProject already in progress - skipping duplicate');
      return false;
    }

    isSetting.value = true;
    console.log('Store: selectProject called for:', project?.id || project);

    try {
      // Set the active project in store
      const active = await setActiveProject(project);
      if (!active) {
        throw new Error('Failed to load active project');
      }

      // ADDED: Update URL to match state (store is source of truth)
      const targetPath = `/project/${active.id}`;
      if (router.currentRoute.value.path !== targetPath) {
        console.log('Store: Pushing URL to', targetPath);
        await router.push(targetPath);
      }

      // Log the selection event via ActivityService.logActivity (direct call, non-blocking)
      const description = `Selected project: ${active.name}`;
      await ActivityService.logActivity(
        active.id, // projectId
        'project_selected', // action
        'project', // entityType
        active.id, // entityId
        description, // description
        { projectName: active.name } // additionalData
      );
      console.log('📋 Logged project selection:', active.name);

      return true; // Success
    } catch (err) {
      console.error('Error in selectProject:', err);
      handleError(err, `Project selection failed for ${project.name || project.id}`);
      return false;
    } finally {
      isSetting.value = false;
    }
  }

  // ENHANCED: Public action for resetting active project (centralized with logging and URL update)
  async function resetActiveProject(pushUrl = true) {
    if (isResetting.value) {
      console.log('Store: Reset already in progress - skipping duplicate');
      return;
    }

    if (!activeProjectId.value) {
      console.log('Store: No active project to reset');
      return;
    }

    isResetting.value = true;
    const oldId = activeProjectId.value; // For logs
    console.log('🔄 Resetting active project:', oldId);

    try {
      // Clear active state and subscriptions (leverage existing)
      activeProjectId.value = null;
      resetProject(); // Clears currentProject and subscriptions for the old project

      // Log the reset event via ActivityService.logActivity (direct call, non-blocking)
      await ActivityService.logActivity(
        oldId, // projectId (old for context)
        'dashboard_switch', // action
        'ui', // entityType
        null, // No entityId
        'Switched to dashboard view', // description
        { action: 'reset_active_project', projectId: oldId } // additionalData
      );
      console.log('✅ Logged dashboard switch');

      // ENHANCED: Update URL to match state (default true unless called from router guard)
      if (pushUrl) {
        const targetPath = '/';
        if (router.currentRoute.value.path !== targetPath) {
          console.log('Store: Pushing URL to dashboard');
          await router.push(targetPath);
        }
      }

      console.log('✅ Active project reset complete');
    } catch (err) {
      console.error('Error in resetActiveProject:', err);
      handleError(err, 'Failed to reset active project');
    } finally {
      isResetting.value = false; // Re-enable
    }
  }

  // Actions - All Projects (existing) - unchanged from previous
  function initializeProjectsSubscription() {
    if (allProjectsUnsubscribe) {
      console.log('⚠️ Projects subscription already active');
      return;
    }

    console.log('🔥 Initializing all projects subscription in store');

    const projectsRef = dbRef(firebaseCore.database, 'projects');
    allProjectsUnsubscribe = onValue(
      projectsRef,
      (snap) => {
        console.log(
          '📦 Store received projects update from RTDB:',
          snap.exists() ? Object.keys(snap.val() || {}).length : 0
        );
        if (snap.exists()) {
          const updatedProjects = Object.entries(snap.val()).map(([id, p]) => ({ id, ...p }));
          projects.value = updatedProjects;
        } else {
          projects.value = [];
        }
        projectsLoading.value = false;
        projectsInitialized.value = true;
      },
      (error) => {
        console.error('🚨 Store subscription error:', error);
        projectsLoading.value = false;
        handleError(error, 'Projects subscription error');
        setTimeout(initializeProjectsSubscription, 5000);
      }
    );

    console.log('✅ RTDB subscription started - unsubscribe:', typeof allProjectsUnsubscribe);
  }

  function cleanupProjectsSubscription() {
    if (allProjectsUnsubscribe) {
      console.log('🧹 Cleaning up all projects subscription');
      allProjectsUnsubscribe();
      allProjectsUnsubscribe = null;
      projectsInitialized.value = false;
      projects.value = [];
    }
  }

  function getProjectById(id) {
    return projects.value.find((p) => p.id === id);
  }

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

  async function createAndLogProject(projectData) {
    try {
      const result = await ProjectRepository.createProject(projectData);
      if (result && result.id) {
        await ActivityService.logEntityCreated(result.id, 'project', result.id, result.name);
        console.log('Project created and logged:', result.id);
        if (projectsInitialized.value) {
          // Subscription handles update
        }
        return result;
      } else {
        console.warn('Project creation succeeded but no ID returned');
        return null;
      }
    } catch (error) {
      console.error('Error in createAndLogProject:', error);
      handleError(error, 'Project creation failed');
      throw error;
    }
  }

  async function updateAndLogProject(id, updates) {
    if (!id || !updates) {
      console.warn('Invalid parameters for updateAndLogProject');
      return null;
    }

    try {
      await ProjectRepository.updateProject(id, updates);

      const updatedProject = await ProjectRepository.getProject(id);
      if (!updatedProject) {
        console.warn('Update succeeded but project not retrievable');
        return null;
      }

      const changeKeys = Object.keys(updates);
      const changes = changeKeys.length > 0 ? changeKeys.join(', ') : 'General update';

      await ActivityService.logEntityUpdated(
        id,
        'project',
        id,
        updatedProject.name,
        { changedFields: changes },
        { oldValues: {} }
      );

      console.log('Project updated and logged:', id, 'Changes:', changes);

      if (activeProjectId.value === id) {
        currentProject.value = updatedProject;
        currentProject.value.loadedFully = true;
      }

      if (projectsInitialized.value) {
        // Subscription handles update
      }

      return updatedProject;
    } catch (error) {
      console.error('Error in updateAndLogProject:', error);
      handleError(error, `Project update failed for ${id}`);
      throw error;
    }
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
    activeProjectId,

    // Getters - Single Project
    projectTeam,
    projectStatus,

    // Getters - All Projects
    projectCount,
    activeProjects,
    projectsByPhase,

    // Getters - Active Project
    activeProject,

    // Actions - Single Project
    loadProject,
    setActiveProject,
    subscribeToProject,
    updateProject,
    clearSubscriptions,
    resetProject,

    // Centralized actions (handle both state and URL)
    selectProject,
    resetActiveProject,
    isResetting, // Expose for dedupe guards
    isSetting, // Expose for dedupe in select

    // Actions - All Projects
    initializeProjectsSubscription,
    cleanupProjectsSubscription,
    getProjectById,
    searchProjects,
    createAndLogProject,
    updateAndLogProject,
  };
});
