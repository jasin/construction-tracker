// src/stores/userSettings.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useAuthStore } from './auth';
import { database } from '@/configs/firebase';
import { ref as dbRef, set, get } from 'firebase/database';

/**
 * User Settings Store
 * Manages user preferences and settings using Composition API
 */
export const useUserSettingsStore = defineStore('userSettings', () => {
  const authStore = useAuthStore();

  // Default settings
  const defaultSettings = {
    completedTasksFilter: {
      enabled: false, // Disabled by default - show all completed tasks
      timePeriod: 7, // days - show completed tasks from last 7 days (when enabled)
      limit: null, // null means no limit, or set a number
    },
    taskDisplay: {
      showProjectName: true,
      showEstimatedHours: true,
      showCategory: true,
      sortBy: 'priority', // 'priority', 'dueDate', 'status', 'title'
      taskDescriptionMode: 'click', // 'click' or 'hover' - how to expand task descriptions
    },
    dashboard: {
      showCompletedTasks: true,
      maxProjectCards: 8,
    },
  };

  // State
  const settings = ref({ ...defaultSettings });
  const loading = ref(false);
  const error = ref('');

  // Computed
  const completedTasksTimePeriod = computed(() => settings.value.completedTasksFilter.timePeriod);
  const completedTasksFilterEnabled = computed(() => settings.value.completedTasksFilter.enabled);

  // Actions

  /**
   * Load user settings from Firebase RTDB
   */
  const loadSettings = async () => {
    try {
      loading.value = true;
      error.value = '';

      const userId = authStore.user?.uid || authStore.user?.id;
      if (!userId) {
        settings.value = { ...defaultSettings };
        return;
      }

      const userRef = dbRef(database, `users/${userId}/settings`);
      const snapshot = await get(userRef);

      if (snapshot.exists()) {
        const loaded = snapshot.val();

        // Merge with defaults to ensure all properties exist
        settings.value = {
          completedTasksFilter: {
            ...defaultSettings.completedTasksFilter,
            ...loaded.completedTasksFilter,
          },
          taskDisplay: { ...defaultSettings.taskDisplay, ...loaded.taskDisplay },
          dashboard: { ...defaultSettings.dashboard, ...loaded.dashboard },
        };
      } else {
        settings.value = { ...defaultSettings };
        // Save defaults to Firebase
        saveSettings();
      }
    } catch (err) {
      console.error('Error loading user settings:', err);
      error.value = 'Failed to load settings';
      settings.value = { ...defaultSettings };
    } finally {
      loading.value = false;
    }
  };

  /**
   * Save user settings to Firebase RTDB
   */
  const saveSettings = async () => {
    try {
      const userId = authStore.user?.uid || authStore.user?.id;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const userRef = dbRef(database, `users/${userId}/settings`);
      await set(userRef, settings.value);
    } catch (err) {
      console.error('Error saving user settings:', err);
      error.value = 'Failed to save settings';
    }
  };

  /**
   * Update completed tasks filter settings
   */
  const updateCompletedTasksFilter = async ({ enabled, timePeriod, limit }) => {
    if (enabled !== undefined) {
      settings.value.completedTasksFilter.enabled = enabled;
    }
    if (timePeriod !== undefined) {
      settings.value.completedTasksFilter.timePeriod = timePeriod;
    }
    if (limit !== undefined) {
      settings.value.completedTasksFilter.limit = limit;
    }
    await saveSettings();
  };

  /**
   * Update task display settings
   */
  const updateTaskDisplay = async (updates) => {
    settings.value.taskDisplay = { ...settings.value.taskDisplay, ...updates };
    await saveSettings();
  };

  /**
   * Update dashboard settings
   */
  const updateDashboard = async (updates) => {
    settings.value.dashboard = { ...settings.value.dashboard, ...updates };
    await saveSettings();
  };

  /**
   * Update task description expansion mode
   */
  const updateTaskDescriptionMode = async (mode) => {
    settings.value.taskDisplay.taskDescriptionMode = mode;
    await saveSettings();
  };

  /**
   * Reset settings to defaults
   */
  const resetSettings = async () => {
    settings.value = { ...defaultSettings };
    await saveSettings();
  };

  /**
   * Get cutoff date for completed tasks filter
   * Returns null if filter is disabled
   */
  const getCompletedTasksCutoffDate = () => {
    if (!settings.value.completedTasksFilter.enabled) {
      return null;
    }

    const days = settings.value.completedTasksFilter.timePeriod;
    if (!days) {
      return null;
    }

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    cutoff.setHours(0, 0, 0, 0);
    return cutoff;
  };

  const resetToDefaults = () => {
    settings.value = { ...defaultSettings };
  };

  return {
    // State
    settings,
    loading,
    error,

    // Computed
    completedTasksTimePeriod,
    completedTasksFilterEnabled,

    // Actions
    loadSettings,
    saveSettings,
    updateCompletedTasksFilter,
    updateTaskDisplay,
    updateTaskDescriptionMode,
    updateDashboard,
    resetToDefaults,
    resetSettings,
    getCompletedTasksCutoffDate,
  };
});
