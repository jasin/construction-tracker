// src/stores/userSettings.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useAuthStore } from './auth';

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
   * Load user settings from localStorage
   * In the future, this can be extended to load from Firebase
   */
  const loadSettings = () => {
    try {
      loading.value = true;
      error.value = '';

      const userId = authStore.user?.uid || authStore.user?.id;
      if (!userId) {
        settings.value = { ...defaultSettings };
        return;
      }

      const storageKey = `userSettings_${userId}`;
      const stored = localStorage.getItem(storageKey);

      if (stored) {
        const parsed = JSON.parse(stored);

        // Merge with defaults to ensure all properties exist
        settings.value = {
          completedTasksFilter: {
            ...defaultSettings.completedTasksFilter,
            ...parsed.completedTasksFilter,
          },
          taskDisplay: { ...defaultSettings.taskDisplay, ...parsed.taskDisplay },
          dashboard: { ...defaultSettings.dashboard, ...parsed.dashboard },
        };
      } else {
        settings.value = { ...defaultSettings };
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
   * Save user settings to localStorage
   * In the future, this can be extended to save to Firebase
   */
  const saveSettings = () => {
    try {
      const userId = authStore.user?.uid || authStore.user?.id;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const storageKey = `userSettings_${userId}`;
      localStorage.setItem(storageKey, JSON.stringify(settings.value));
    } catch (err) {
      console.error('Error saving user settings:', err);
      error.value = 'Failed to save settings';
    }
  };

  /**
   * Update completed tasks filter settings
   */
  const updateCompletedTasksFilter = ({ enabled, timePeriod, limit }) => {
    if (enabled !== undefined) {
      settings.value.completedTasksFilter.enabled = enabled;
    }
    if (timePeriod !== undefined) {
      settings.value.completedTasksFilter.timePeriod = timePeriod;
    }
    if (limit !== undefined) {
      settings.value.completedTasksFilter.limit = limit;
    }
    saveSettings();
  };

  /**
   * Update task display settings
   */
  const updateTaskDisplay = (updates) => {
    settings.value.taskDisplay = { ...settings.value.taskDisplay, ...updates };
    saveSettings();
  };

  /**
   * Update dashboard settings
   */
  const updateDashboard = (updates) => {
    settings.value.dashboard = { ...settings.value.dashboard, ...updates };
    saveSettings();
  };

  /**
   * Reset settings to defaults
   */
  const resetSettings = () => {
    settings.value = { ...defaultSettings };
    saveSettings();
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
    updateDashboard,
    resetSettings,
    getCompletedTasksCutoffDate,
  };
});
