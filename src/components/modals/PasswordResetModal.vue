<template>
<!-- Forgot Password Modal -->
  <div
    v-if="showForgotPassword"
    class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50"
  >
    <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
      <div class="mt-3">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Reset Password</h3>
        <p class="text-sm text-gray-500 mb-4">
          Enter your email address and we'll send you a link to reset your password.
        </p>
        <input
          v-model="resetEmail"
          type="email"
          placeholder="Email address"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
          :disabled="resetLoading"
        />
        <div class="flex justify-end space-x-3 mt-4">
          <button
            @click="showForgotPassword = false"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            @click="handlePasswordReset"
            :disabled="resetLoading"
            class="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 disabled:opacity-50"
          >
            {{ resetLoading ? 'Sending...' : 'Send Reset Link' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { usePasswordReset } from '@/composables/auth/usePasswordReset'

const showForgotPassword = ref(false)
const resetEmail = ref('')
const resetLoading = ref(false)

const { resetPassword } = usePasswordReset()

// Handle password reset
const handlePasswordReset = async () => {
  resetLoading.value = true

  const result = await resetPassword(resetEmail.value)

  if(result.success){
    showForgotPassword.value = true
    resetEmail.value = ''
  }

  resetLoading.value = false
}
</script>
