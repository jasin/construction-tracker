// src/composables/useAuth.js
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import authService from '@/services/auth/authService'

export function useAuth() {
  const router = useRouter()

  // State - moved from LoginView
  const loading = ref(false)
  const error = ref('')
  const success = ref('')

  // Login method - moved from LoginView
  const signIn = async (email, password) => {
    if (!email || !password) {
      error.value = 'Please enter both email and password'
      return
    }

    loading.value = true
    error.value = ''
    success.value = ''

    try {
      const result = await authService.signIn(email, password)

      if (result.success) {
        success.value = 'Successfully signed in!'
        // Redirect to dashboard or intended route
        router.push('/')
      } else {
        error.value = result.error
      }
    } catch (err) {
      error.value = 'An unexpected error occurred. Please try again.'
      console.error('Login error:', err)
    } finally {
      loading.value = false
    }
  }

  return {
    // State
    loading,
    error,
    success,

    // Methods
    signIn
  }
}
