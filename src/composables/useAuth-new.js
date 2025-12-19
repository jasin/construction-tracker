/**
 * Auth Composable - Python Backend Version
 * Provides authentication methods for components
 */
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

export function useAuth() {
  const router = useRouter()
  const authStore = useAuthStore()

  /**
   * Sign in with email and password
   */
  const signIn = async (email, password) => {
    try {
      await authStore.signIn(email, password)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Sign up new user
   */
  const signUp = async (userData) => {
    try {
      await authStore.signUp(userData)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Log out current user
   */
  const logout = async () => {
    try {
      await authStore.logout()
      router.push('/login')
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Update user profile
   */
  const updateProfile = async (updates) => {
    try {
      await authStore.updateProfile(updates)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  return {
    // State
    user: computed(() => authStore.user),
    isAuthenticated: computed(() => authStore.isAuthenticated),
    loading: computed(() => authStore.loading),
    error: computed(() => authStore.error),
    success: computed(() => authStore.success),
    permissions: computed(() => authStore.getPermissions),

    // Methods
    signIn,
    signUp,
    logout,
    updateProfile,
    clearError: () => authStore.clearError(),
    clearSuccess: () => authStore.clearSuccess(),
  }
}
