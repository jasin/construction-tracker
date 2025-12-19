// src/composables/useUserActivity.js
import { ref } from 'vue';
import { useAuthStore } from '@/stores/auth';

const SECTION_VISITS_KEY = 'user_section_visits';
const READ_ITEMS_KEY = 'user_read_items';

/**
 * Composable for tracking user activity and managing unread badges
 * Implements hybrid approach using localStorage:
 * - Section visits (when user views a section)
 * - Item reads (when user clicks/expands specific items)
 */
export function useUserActivity() {
  const lastSectionVisits = ref({});
  const readItems = ref({});
  const loading = ref(false);

  /**
   * Get user-specific storage key
   */
  const getUserKey = (baseKey) => {
    const authStore = useAuthStore();
    const userId = authStore.user?.id;
    return userId ? `${baseKey}_${userId}` : baseKey;
  };

  /**
   * Load data from localStorage
   */
  const loadFromStorage = (key) => {
    try {
      const data = localStorage.getItem(getUserKey(key));
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Error loading from localStorage:', error);
      return {};
    }
  };

  /**
   * Save data to localStorage
   */
  const saveToStorage = (key, data) => {
    try {
      localStorage.setItem(getUserKey(key), JSON.stringify(data));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  };

  /**
   * Update section visit timestamp
   * Call this when user navigates to or interacts with a section
   * @param {string} projectId - Project ID
   * @param {string} section - Section name ('rfis', 'submittals', 'changeOrders', 'tasks', 'documents')
   */
  const updateSectionVisit = async (projectId, section) => {
    try {
      const timestamp = new Date().toISOString();

      // Update local state
      if (!lastSectionVisits.value[projectId]) {
        lastSectionVisits.value[projectId] = {};
      }
      lastSectionVisits.value[projectId][section] = timestamp;

      // Save to localStorage
      saveToStorage(SECTION_VISITS_KEY, lastSectionVisits.value);

      return { timestamp };
    } catch (error) {
      console.error('Error updating section visit:', error);
    }
  };

  /**
   * Mark an item as read
   * Call this when user clicks or expands an item
   * @param {string} projectId - Project ID
   * @param {string} entityType - Entity type ('rfi', 'submittal', 'changeOrder', 'task', 'document')
   * @param {string} entityId - Entity ID
   */
  const markItemAsRead = async (projectId, entityType, entityId) => {
    try {
      const timestamp = new Date().toISOString();

      // Update local state
      if (!readItems.value[projectId]) {
        readItems.value[projectId] = {};
      }
      const itemKey = `${entityType}_${entityId}`;
      readItems.value[projectId][itemKey] = {
        readAt: timestamp,
        expandedCount: 1,
      };

      // Save to localStorage
      saveToStorage(READ_ITEMS_KEY, readItems.value);

      return { timestamp };
    } catch (error) {
      console.error('Error marking item as read:', error);
    }
  };

  /**
   * Load section visit data for a project
   * @param {string} projectId - Project ID
   * @param {Array} sections - Array of section names to load
   */
  const loadSectionVisits = async (
    projectId,
    sections = ['rfis', 'submittals', 'changeOrders', 'tasks', 'documents']
  ) => {
    try {
      loading.value = true;

      // Load from localStorage
      const storedData = loadFromStorage(SECTION_VISITS_KEY);
      lastSectionVisits.value = storedData;
    } catch (error) {
      console.error('Error loading section visits:', error);
    } finally {
      loading.value = false;
    }
  };

  /**
   * Load read items for a project
   * @param {string} projectId - Project ID
   */
  const loadReadItems = async (projectId) => {
    try {
      loading.value = true;

      // Load from localStorage
      const storedData = loadFromStorage(READ_ITEMS_KEY);
      readItems.value = storedData;
    } catch (error) {
      console.error('Error loading read items:', error);
    } finally {
      loading.value = false;
    }
  };

  /**
   * Load all activity data for a project
   * @param {string} projectId - Project ID
   * @param {Array} sections - Array of section names to load
   */
  const loadProjectActivity = async (projectId, sections) => {
    await Promise.all([loadSectionVisits(projectId, sections), loadReadItems(projectId)]);
  };

  /**
   * Check if an item is unread
   * @param {Object} item - The item to check
   * @param {string} projectId - Project ID
   * @param {string} entityType - Entity type
   * @param {string} section - Section name
   * @returns {boolean} True if unread
   */
  const isItemUnread = (item, projectId, entityType, section) => {
    if (!item) return false;

    const lastVisit = lastSectionVisits.value[projectId]?.[section];
    const projectReadItems = readItems.value[projectId] || {};
    const itemKey = `${entityType}_${item.id}`;

    // Check if item was explicitly marked as read
    if (projectReadItems[itemKey]) {
      return false;
    }

    // Check if item is newer than last section visit
    if (lastVisit && item.createdAt) {
      return new Date(item.createdAt) > new Date(lastVisit);
    }

    // If no last visit recorded, consider all items as read (avoid overwhelming user)
    return false;
  };

  /**
   * Get unread count for a list of items
   * @param {Array} items - Array of items
   * @param {string} projectId - Project ID
   * @param {string} entityType - Entity type
   * @param {string} section - Section name
   * @returns {number} Unread count
   */
  const getUnreadCount = (items, projectId, entityType, section) => {
    if (!items || items.length === 0) return 0;

    return items.filter((item) => isItemUnread(item, projectId, entityType, section)).length;
  };

  /**
   * Clear read items for a project (useful for testing)
   * @param {string} projectId - Project ID
   */
  const clearReadItems = async (projectId) => {
    try {
      if (readItems.value[projectId]) {
        readItems.value[projectId] = {};
      }
      saveToStorage(READ_ITEMS_KEY, readItems.value);
    } catch (error) {
      console.error('Error clearing read items:', error);
    }
  };

  /**
   * Clear section visits for a project
   * @param {string} projectId - Project ID
   */
  const clearSectionVisits = async (projectId) => {
    try {
      if (lastSectionVisits.value[projectId]) {
        lastSectionVisits.value[projectId] = {};
      }
      saveToStorage(SECTION_VISITS_KEY, lastSectionVisits.value);
    } catch (error) {
      console.error('Error clearing section visits:', error);
    }
  };

  return {
    // State
    lastSectionVisits,
    readItems,
    loading,

    // Methods
    updateSectionVisit,
    markItemAsRead,
    loadSectionVisits,
    loadReadItems,
    loadProjectActivity,
    isItemUnread,
    getUnreadCount,
    clearReadItems,
    clearSectionVisits,
  };
}
