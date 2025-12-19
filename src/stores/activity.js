// stores/activity.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { getActivityLogs, getRecentActivityLogs } from '@/services/api/activityLogsApi';
import { supabase } from '@/configs/supabase';

export const useActivityStore = defineStore('activity', () => {
  // State
  const activities = ref([]);
  const loading = ref(false);
  const error = ref(null);

  // Subscription management
  let activitiesUnsubscribe = null;

  // Getters
  const recentActivities = computed(() => {
    return activities.value.slice(0, 10);
  });

  const todaysActivities = computed(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return activities.value.filter((activity) => {
      const activityDate = new Date(activity.timestamp);
      activityDate.setHours(0, 0, 0, 0);
      return activityDate.getTime() === today.getTime();
    });
  });

  const activityCount = computed(() => activities.value.length);

  // Actions
  /**
   * Load activities for a project
   */
  async function loadActivities(projectId) {
    loading.value = true;
    error.value = null;

    try {
      const activitiesData = await getActivityLogs({ project_id: projectId });
      activities.value = activitiesData;
    } catch (err) {
      error.value = err.message;
      console.error('Error loading activities:', err);
    } finally {
      loading.value = false;
    }
  }

  /**
   * Load recent activities (across all projects)
   */
  async function loadRecentActivities(limit = 50) {
    loading.value = true;
    error.value = null;

    try {
      const activitiesData = await getRecentActivityLogs(limit);
      activities.value = activitiesData;
    } catch (err) {
      error.value = err.message;
      console.error('Error loading recent activities:', err);
    } finally {
      loading.value = false;
    }
  }

  /**
   * Subscribe to real-time activity updates for a project
   */
  async function subscribeToProjectActivities(projectId) {
    if (!projectId) {
      console.warn('Activity Store: Cannot subscribe - no project ID');
      return;
    }

    // Cleanup existing subscription
    if (activitiesUnsubscribe) {
      activitiesUnsubscribe();
      activitiesUnsubscribe = null;
    }

    console.log('Activity Store: Subscribing to activity logs for project:', projectId);

    try {
      // Load initial data
      await loadActivities(projectId);

      // Subscribe to real-time updates
      const channel = supabase
        .channel(`project-${projectId}-activities`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'activity_logs',
            filter: `project_id=eq.${projectId}`,
          },
          (payload) => {
            // Prepend new activity to the list
            activities.value.unshift(payload.new);
            console.log('Activity Store: New activity received:', payload.new);
          }
        )
        .subscribe();

      activitiesUnsubscribe = () => supabase.removeChannel(channel);
    } catch (err) {
      console.error('Activity Store: Error subscribing to activities:', err);
    }
  }

  /**
   * Cleanup activity subscription
   */
  function unsubscribeFromActivities() {
    if (activitiesUnsubscribe) {
      console.log('Activity Store: Cleaning up activity subscription');
      activitiesUnsubscribe();
      activitiesUnsubscribe = null;
    }
  }

  /**
   * Add activity to local state (for optimistic updates)
   * Note: Activities are created by the backend automatically
   */
  function addActivity(activity) {
    activities.value.unshift(activity);
  }

  /**
   * Clear activities from state
   */
  function clearActivities() {
    activities.value = [];
  }

  return {
    // State
    activities,
    loading,
    error,

    // Getters
    recentActivities,
    todaysActivities,
    activityCount,

    // Actions
    loadActivities,
    loadRecentActivities,
    subscribeToProjectActivities,
    unsubscribeFromActivities,
    addActivity,
    clearActivities,
  };
});
