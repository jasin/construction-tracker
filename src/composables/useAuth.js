// src/composables/useAuth.js
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores' // Import via stores/index.js wrapper for centralized access

/**
 * Composable for handling authentication using Pinia store.
 * Provides access to auth state and methods, with optional Google sign-in and user syncing.
 *
 * @returns {Object} Auth state and methods.
 * @property {Ref<Object|null>} user - Current synced user (from Auth and RTDB).
 * @property {ComputedRef<boolean>} isAuthenticated - Authentication status.
 * @property {Ref<boolean>} loading - Loading state.
 * @property {Ref<string>} error - Error message.
 * @property {Ref<string>} success - Success message.
 * @property {Function} signIn - Email/password sign-in with sync.
 * @property {Function} googleSignIn - Optional Google sign-in with sync.
 * @property {Function} logout - Logout function.
 */
export function useAuth() {
  const router = useRouter()
  const authStore = useAuthStore()

  const signIn = async (email, password) => {
    try {
      await authStore.signIn(email, password)
      router.push('/')
    } catch (err) {
      console.error('Sign-in error:', err)
      throw new Error(`Sign-in failed: ${err.message}`)
    }
  }

  // Added: Optional Google sign-in method, calling store action for sync
  const googleSignIn = async () => {
    try {
      await authStore.googleSignIn()
      router.push('/')
    } catch (err) {
      console.error('Google sign-in error:', err)
      throw new Error(`Google sign-in failed: ${err.message}`)
    }
  }

  const logout = async () => {
    try {
      await authStore.logout()
      router.push('/login')
    } catch (err) {
      console.error('Logout error:', err)
      throw new Error(`Logout failed: ${err.message}`)
    }
  }

  return {
    user: authStore.user,
    isAuthenticated: authStore.isAuthenticated,
    loading: authStore.loading,
    error: authStore.error,
    success: authStore.success,
    signIn,
    googleSignIn, // Added: Expose Google sign-in for optional use in views
    logout,
  }
}
