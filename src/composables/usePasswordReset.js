import { ref } from 'vue'
import authService from '@/services/auth/authService'

export function usePasswordReset() {

const error = ref()
const success = ref()

// Password reset method - moved from LoginView
  const resetPassword = async (email) => {
    if (!email) {
      error.value = 'Please enter your email address'
      return { success: false }
    }

    try {
      const result = await authService.resetPassword(email)

      if (result.success) {
        success.value = 'Password reset link sent to your email!'
        return { success: true }
      } else {
        error.value = result.error
        return { success: false }
      }
    } catch (err) {
      error.value = 'Failed to send reset email. Please try again.'
      console.error('Password reset error:', err)
      return { success: false }
    }
  }

  return {
    // State management
    error,
    success,

    // Methods
    resetPassword
  }
}
