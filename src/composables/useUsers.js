// src/composables/useUsers.js
import { ref, computed, onUnmounted } from 'vue';
import { getAllUsers, getActiveUsers } from '@/services/api/usersApi';

/**
 * Composable for managing users and user lookups.
 * Provides user data and utility functions for resolving user IDs to names.
 *
 * @returns {Object} User state and utility functions.
 */
export function useUsers() {
  const users = ref([]);
  const loading = ref(false);
  const error = ref(null);

  /**
   * Create a lookup map for fast user ID to name resolution
   */
  const userMap = computed(() => {
    const map = {};
    users.value.forEach((user) => {
      map[user.id] = {
        name: user.name,
        email: user.email,
        role: user.role,
        photo: user.photo,
      };
    });
    return map;
  });

  /**
   * Load all users from API
   */
  async function loadUsers() {
    loading.value = true;
    error.value = null;

    try {
      users.value = await getAllUsers();
    } catch (err) {
      console.error('Error loading users:', err);
      error.value = err.message || 'Failed to load users';
    } finally {
      loading.value = false;
    }
  }

  /**
   * Load only active users from API
   */
  async function loadActiveUsers() {
    loading.value = true;
    error.value = null;

    try {
      users.value = await getActiveUsers();
    } catch (err) {
      console.error('Error loading active users:', err);
      error.value = err.message || 'Failed to load active users';
    } finally {
      loading.value = false;
    }
  }

  /**
   * Get user name by ID from loaded users
   * @param {string} userId - The user ID to look up
   * @param {string} fallback - Fallback text if user not found (default: 'Unknown User')
   * @returns {string} User name or fallback
   */
  function getUserName(userId, fallback = 'Unknown User') {
    if (!userId) return fallback;
    return userMap.value[userId]?.name || fallback;
  }

  /**
   * Get full user data by ID from loaded users
   * @param {string} userId - The user ID to look up
   * @returns {Object|null} User data or null if not found
   */
  function getUser(userId) {
    if (!userId) return null;
    return userMap.value[userId] || null;
  }

  /**
   * Cleanup function
   */
  function cleanup() {
    users.value = [];
    loading.value = false;
    error.value = null;
  }

  // Auto-cleanup on component unmount
  onUnmounted(() => {
    cleanup();
  });

  return {
    // State
    users,
    loading,
    error,
    userMap,

    // Actions
    loadUsers,
    loadActiveUsers,
    cleanup,

    // Utilities
    getUserName,
    getUser,
  };
}
