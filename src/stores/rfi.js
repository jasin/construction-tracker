// stores/rfi.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import {
  getAllRFIs,
  getRFIById as getRFIByIdApi,
  getRFIsByProject,
  createRFI as createRFIApi,
  updateRFI as updateRFIApi,
  deleteRFI as deleteRFIApi,
} from '@/services/api/rfisApi';
import { supabase } from '@/configs/supabase';
import { useAuthStore } from './auth';

export const useRFIStore = defineStore('rfi', () => {
  // State - User RFIs (for dashboard - assigned to user)
  const userRFIs = ref([]);
  const userRFIsLoading = ref(true);
  const userRFIsInitialized = ref(false);

  // State - Project RFIs (for project detail views)
  const projectRFIs = ref([]);
  const projectRFIsLoading = ref(false);
  const currentProjectId = ref(null);

  // State - Single RFI (for detail view/editing)
  const currentRFI = ref(null);
  const loading = ref(false);
  const error = ref(null);

  // Subscription management
  let userRFIsUnsubscribe = null;
  let projectRFIsUnsubscribe = null;

  // Getters - User RFIs
  const userRFICount = computed(() => userRFIs.value.length);

  const userActiveRFIs = computed(() =>
    userRFIs.value.filter((r) => !['responded', 'closed'].includes(r.status))
  );

  const userOverdueRFIs = computed(() => {
    const now = new Date();
    return userRFIs.value.filter((r) => {
      return r.dueDate && new Date(r.dueDate) < now && !['responded', 'closed'].includes(r.status);
    });
  });

  const userRFIsDueSoon = computed(() => {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + 7); // 7 days ahead

    return userRFIs.value.filter((r) => {
      if (!r.dueDate || ['responded', 'closed'].includes(r.status)) {
        return false;
      }
      const dueDate = new Date(r.dueDate);
      return dueDate >= now && dueDate <= futureDate;
    });
  });

  const userRFIsByStatus = computed(() => {
    const grouped = {};
    userRFIs.value.forEach((rfi) => {
      const status = rfi.status || 'draft';
      if (!grouped[status]) grouped[status] = [];
      grouped[status].push(rfi);
    });
    return grouped;
  });

  // Getters - Project RFIs
  const projectRFICount = computed(() => projectRFIs.value.length);

  const projectActiveRFIsCount = computed(
    () => projectRFIs.value.filter((r) => !['responded', 'closed'].includes(r.status)).length
  );

  // Actions - User RFIs Subscription (for dashboard)
  /**
   * Initializes real-time subscription to current user's RFIs
   * Subscribes to all RFIs assigned to the current user
   */
  async function initializeUserRFIsSubscription() {
    if (userRFIsInitialized.value) {
      console.log('RFI Store: User RFIs subscription already initialized');
      return;
    }

    const authStore = useAuthStore();
    const userId = authStore.user?.id;
    if (!userId) {
      console.warn('RFI Store: Cannot initialize user RFIs subscription - no user ID');
      userRFIsLoading.value = false;
      return;
    }

    console.log('RFI Store: Initializing user RFIs subscription for user:', userId);
    userRFIsLoading.value = true;

    try {
      // Cleanup existing subscription before creating a new one
      cleanupUserRFIsSubscription();

      // Load initial data from API
      const allRFIs = await getAllRFIs();
      userRFIs.value = allRFIs.filter((rfi) => rfi.assignedTo === userId);

      console.log('RFI Store: User RFIs loaded, count:', userRFIs.value.length);

      // Subscribe to real-time updates with Supabase
      const channel = supabase
        .channel('user-rfis')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'rfis',
          },
          (payload) => {
            handleUserRFIUpdate(payload);
          }
        )
        .subscribe();

      userRFIsUnsubscribe = () => supabase.removeChannel(channel);
      userRFIsInitialized.value = true;
      userRFIsLoading.value = false;
    } catch (error) {
      console.error('RFI Store: Error initializing user RFIs subscription:', error);
      userRFIsLoading.value = false;
    }
  }

  /**
   * Handle real-time updates for user RFIs
   */
  function handleUserRFIUpdate(payload) {
    const authStore = useAuthStore();
    const userId = authStore.user?.id;
    if (!userId) return;

    const rfi = payload.new || payload.old;

    // Only process if this RFI is relevant to the user
    const isRelevant = rfi.assignedTo === userId;

    if (!isRelevant) return;

    if (payload.eventType === 'INSERT') {
      userRFIs.value.push(payload.new);
    } else if (payload.eventType === 'UPDATE') {
      const index = userRFIs.value.findIndex((r) => r.id === payload.new.id);
      if (index !== -1) {
        userRFIs.value[index] = payload.new;
      } else if (isRelevant) {
        // RFI became relevant to user (e.g., assigned to user)
        userRFIs.value.push(payload.new);
      }
    } else if (payload.eventType === 'DELETE') {
      userRFIs.value = userRFIs.value.filter((r) => r.id !== payload.old.id);
    }
  }

  /**
   * Cleanup user RFIs subscription
   */
  function cleanupUserRFIsSubscription() {
    if (userRFIsUnsubscribe) {
      console.log('RFI Store: Cleaning up user RFIs subscription');
      userRFIsUnsubscribe();
      userRFIsUnsubscribe = null;
    }
    userRFIs.value = [];
    userRFIsInitialized.value = false;
    userRFIsLoading.value = true;
  }

  // Actions - Project RFIs Subscription (for project detail)
  /**
   * Initializes real-time subscription to RFIs for a specific project
   */
  async function initializeProjectRFIsSubscription(projectId) {
    if (!projectId) {
      console.warn('RFI Store: Cannot initialize project RFIs - no project ID');
      return;
    }

    // If already subscribed to this project, do nothing
    if (currentProjectId.value === projectId && projectRFIsUnsubscribe) {
      console.log('RFI Store: Already subscribed to project RFIs:', projectId);
      return;
    }

    // Cleanup existing subscription
    cleanupProjectRFIsSubscription();

    console.log('RFI Store: Initializing project RFIs subscription for:', projectId);
    currentProjectId.value = projectId;
    projectRFIsLoading.value = true;

    try {
      // Load initial data from API
      projectRFIs.value = await getRFIsByProject(projectId);

      console.log('RFI Store: Project RFIs loaded, count:', projectRFIs.value.length);

      // Subscribe to real-time updates with Supabase
      const channel = supabase
        .channel(`project-${projectId}-rfis`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'rfis',
            filter: `project_id=eq.${projectId}`,
          },
          (payload) => {
            handleProjectRFIUpdate(payload);
          }
        )
        .subscribe();

      projectRFIsUnsubscribe = () => supabase.removeChannel(channel);
      projectRFIsLoading.value = false;
    } catch (error) {
      console.error('RFI Store: Error initializing project RFIs subscription:', error);
      projectRFIsLoading.value = false;
    }
  }

  /**
   * Handle real-time updates for project RFIs
   */
  function handleProjectRFIUpdate(payload) {
    if (payload.eventType === 'INSERT') {
      projectRFIs.value.push(payload.new);
    } else if (payload.eventType === 'UPDATE') {
      const index = projectRFIs.value.findIndex((r) => r.id === payload.new.id);
      if (index !== -1) projectRFIs.value[index] = payload.new;
    } else if (payload.eventType === 'DELETE') {
      projectRFIs.value = projectRFIs.value.filter((r) => r.id !== payload.old.id);
    }
  }

  /**
   * Cleanup project RFIs subscription
   */
  function cleanupProjectRFIsSubscription() {
    if (projectRFIsUnsubscribe) {
      console.log('RFI Store: Cleaning up project RFIs subscription');
      projectRFIsUnsubscribe();
      projectRFIsUnsubscribe = null;
    }
    projectRFIs.value = [];
    currentProjectId.value = null;
    projectRFIsLoading.value = false;
  }

  // Actions - CRUD Operations
  /**
   * Create a new RFI
   */
  async function createRFI(rfiData) {
    loading.value = true;
    error.value = null;

    try {
      const newRFI = await createRFIApi(rfiData);
      console.log('RFI Store: RFI created successfully:', newRFI.id);
      return newRFI;
    } catch (err) {
      console.error('RFI Store: Error creating RFI:', err);
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Update an existing RFI
   */
  async function updateRFI(rfiId, updates) {
    loading.value = true;
    error.value = null;

    try {
      const updatedRFI = await updateRFIApi(rfiId, updates);
      console.log('RFI Store: RFI updated successfully:', rfiId);
      return updatedRFI;
    } catch (err) {
      console.error('RFI Store: Error updating RFI:', err);
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Delete an RFI
   */
  async function deleteRFI(rfiId) {
    loading.value = true;
    error.value = null;

    try {
      await deleteRFIApi(rfiId);
      console.log('RFI Store: RFI deleted successfully:', rfiId);
    } catch (err) {
      console.error('RFI Store: Error deleting RFI:', err);
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Get RFI by ID
   */
  async function getRFIById(rfiId) {
    loading.value = true;
    error.value = null;

    try {
      const rfi = await getRFIByIdApi(rfiId);
      currentRFI.value = rfi;
      return rfi;
    } catch (err) {
      console.error('RFI Store: Error getting RFI:', err);
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Add response to RFI
   */
  async function addRFIResponse(rfiId, response) {
    loading.value = true;
    error.value = null;

    try {
      const updatedRFI = await updateRFIApi(rfiId, {
        status: 'responded',
        response,
      });
      console.log('RFI Store: Response added to RFI:', rfiId);
      return updatedRFI;
    } catch (err) {
      console.error('RFI Store: Error adding RFI response:', err);
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Close an RFI
   */
  async function closeRFI(rfiId, closeNotes = '') {
    loading.value = true;
    error.value = null;

    try {
      const updatedRFI = await updateRFIApi(rfiId, {
        status: 'closed',
        ...(closeNotes && { closeNotes }),
      });
      console.log('RFI Store: RFI closed:', rfiId);
      return updatedRFI;
    } catch (err) {
      console.error('RFI Store: Error closing RFI:', err);
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  return {
    // State - User RFIs
    userRFIs,
    userRFIsLoading,
    userRFIsInitialized,

    // State - Project RFIs
    projectRFIs,
    projectRFIsLoading,
    currentProjectId,

    // State - Single RFI
    currentRFI,
    loading,
    error,

    // Getters - User RFIs
    userRFICount,
    userActiveRFIs,
    userOverdueRFIs,
    userRFIsDueSoon,
    userRFIsByStatus,

    // Getters - Project RFIs
    projectRFICount,
    projectActiveRFIsCount,

    // Actions - Subscriptions
    initializeUserRFIsSubscription,
    cleanupUserRFIsSubscription,
    initializeProjectRFIsSubscription,
    cleanupProjectRFIsSubscription,

    // Actions - CRUD
    createRFI,
    updateRFI,
    deleteRFI,
    getRFIById,
    addRFIResponse,
    closeRFI,
  };
});
