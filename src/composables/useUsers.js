// src/composables/useUsers.js
import { ref, computed, onUnmounted } from 'vue';
import UserRepository from '@/services/firebase/Repositories/UserRepository';

/**
 * Composable for managing users and user lookups.
 * Provides real-time user data and utility functions for resolving user IDs to names.
 *
 * @returns {Object} User state and utility functions.
 */
export function useUsers() {
  const users = ref([]);
  const loading = ref(false);
  const error = ref(null);
  let unsubscribe = null;

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
   * Load all users (one-time fetch)
   */
  async function loadUsers() {
    loading.value = true;
    error.value = null;

    try {
      users.value = await UserRepository.getAll();
    } catch (err) {
      console.error('Error loading users:', err);
      error.value = err.message || 'Failed to load users';
    } finally {
      loading.value = false;
    }
  }

  /**
   * Load only active users (one-time fetch)
   */
  async function loadActiveUsers() {
    loading.value = true;
    error.value = null;

    try {
      users.value = await UserRepository.getActiveUsers();
    } catch (err) {
      console.error('Error loading active users:', err);
      error.value = err.message || 'Failed to load active users';
    } finally {
      loading.value = false;
    }
  }

  /**
   * Subscribe to real-time user updates
   */
  function subscribeToUsers() {
    if (unsubscribe) {
      console.warn('useUsers: Already subscribed to users');
      return;
    }

    loading.value = true;

    unsubscribe = UserRepository.subscribeToUsers((data) => {
      users.value = data;
      loading.value = false;
    });
  }

  /**
   * Subscribe to active users only (real-time)
   */
  function subscribeToActiveUsers() {
    if (unsubscribe) {
      console.warn('useUsers: Already subscribed to active users');
      return;
    }

    loading.value = true;

    unsubscribe = UserRepository.subscribeToActiveUsers((data) => {
      users.value = data;
      loading.value = false;
    });
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
   * Cleanup subscription
   */
  function cleanup() {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
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
    subscribeToUsers,
    subscribeToActiveUsers,
    cleanup,

    // Utilities
    getUserName,
    getUser,
  };
}
