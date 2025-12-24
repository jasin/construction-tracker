// src/composables/useAuth.js
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores';

/**
 * Composable for handling authentication using Pinia store.
 * Provides access to auth state and methods for JWT-based authentication.
 *
 * @returns {Object} Auth state and methods.
 * @property {ComputedRef<Object|null>} user - Current authenticated user.
 * @property {ComputedRef<boolean>} isAuthenticated - Authentication status.
 * @property {ComputedRef<boolean>} loading - Loading state.
 * @property {ComputedRef<string>} error - Error message.
 * @property {ComputedRef<string>} success - Success message.
 * @property {Function} signIn - Email/password sign-in.
 * @property {Function} signUp - User registration with auto sign-in.
 * @property {Function} logout - Logout function.
 * @property {Function} clearMessages - Clear error and success messages.
 */
export function useAuth() {
  const router = useRouter();
  const authStore = useAuthStore();

  /**
   * Sign in with email and password
   * @param {string} email - User email
   * @param {string} password - User password
   */
  const signIn = async (email, password) => {
    try {
      await authStore.signIn(email, password);
      // Don't navigate here - let the calling component handle navigation
      return { success: true };
    } catch (err) {
      console.error('Sign-in error:', err);
      throw new Error(`Sign-in failed: ${err.message}`);
    }
  };

  /**
   * Register a new user and automatically sign them in
   * @param {Object} userData - User registration data
   * @param {string} userData.name - User's full name
   * @param {string} userData.email - User's email
   * @param {string} userData.password - User's password
   * @param {string} userData.role - User's role (default: 'user')
   */
  const signUp = async (userData) => {
    try {
      await authStore.signUp(userData);
      // Don't navigate here - let the calling component handle navigation
      return { success: true };
    } catch (err) {
      console.error('Sign-up error:', err);
      throw new Error(`Sign-up failed: ${err.message}`);
    }
  };

  /**
   * Logout current user
   */
  const logout = async () => {
    try {
      await authStore.logout();
      router.push('/login');
      return { success: true };
    } catch (err) {
      console.error('Logout error:', err);
      throw new Error(`Logout failed: ${err.message}`);
    }
  };

  /**
   * Clear error and success messages
   */
  const clearMessages = () => {
    authStore.clearMessages();
  };

  return {
    user: computed(() => authStore.user),
    isAuthenticated: computed(() => authStore.isAuthenticated),
    loading: computed(() => authStore.loading),
    error: computed(() => authStore.error),
    success: computed(() => authStore.success),
    signIn,
    signUp,
    logout,
    clearMessages,
  };
}
