<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <!-- Header -->
      <div>
        <div class="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-emerald-100">
          <svg
            class="h-8 w-8 text-emerald-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h4M9 7h6m-6 4h6m-6 4h6"
            ></path>
          </svg>
        </div>
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Construction Tracker
        </h2>
        <p class="mt-2 text-center text-sm text-gray-600">
          {{ isSignUp ? 'Create your account' : 'Sign in to your account' }}
        </p>
      </div>

      <!-- Login/Register Form -->
      <form class="mt-8 space-y-6" @submit.prevent="handleSubmit">
        <div class="rounded-md shadow-sm space-y-px">
          <!-- Name field (only for registration) -->
          <div v-if="isSignUp">
            <label for="name" class="sr-only">Full Name</label>
            <input
              id="name"
              v-model="form.name"
              name="name"
              type="text"
              autocomplete="name"
              required
              class="appearance-none rounded-t-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 focus:z-10 sm:text-sm"
              :class="{ 'rounded-b-none': isSignUp }"
              placeholder="Full Name"
              :disabled="loading"
            />
          </div>

          <!-- Email field -->
          <div>
            <label for="email" class="sr-only">Email address</label>
            <input
              id="email"
              v-model="form.email"
              name="email"
              type="email"
              autocomplete="email"
              required
              class="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 focus:z-10 sm:text-sm"
              :class="{ 'rounded-t-md': !isSignUp, 'rounded-none': isSignUp }"
              placeholder="Email address"
              :disabled="loading"
            />
          </div>

          <!-- Password field -->
          <div>
            <label for="password" class="sr-only">Password</label>
            <input
              id="password"
              v-model="form.password"
              name="password"
              type="password"
              :autocomplete="isSignUp ? 'new-password' : 'current-password'"
              required
              class="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 focus:z-10 sm:text-sm"
              :class="{ 'rounded-b-md': !isSignUp, 'rounded-none': isSignUp }"
              placeholder="Password"
              :disabled="loading"
              :minlength="isSignUp ? 8 : undefined"
            />
          </div>

          <!-- Confirm Password field (only for registration) -->
          <div v-if="isSignUp">
            <label for="confirmPassword" class="sr-only">Confirm Password</label>
            <input
              id="confirmPassword"
              v-model="form.confirmPassword"
              name="confirmPassword"
              type="password"
              autocomplete="new-password"
              required
              class="appearance-none rounded-b-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 focus:z-10 sm:text-sm"
              placeholder="Confirm Password"
              :disabled="loading"
              minlength="8"
            />
          </div>
        </div>

        <!-- Remember me / Forgot password (only for login) -->
        <div v-if="!isSignUp" class="flex items-center justify-between">
          <div class="flex items-center">
            <input
              id="remember-me"
              v-model="form.rememberMe"
              name="remember-me"
              type="checkbox"
              class="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
            />
            <label for="remember-me" class="ml-2 block text-sm text-gray-900">
              Remember me
            </label>
          </div>

          <div class="text-sm">
            <button
              type="button"
              @click="showForgotPassword = true"
              class="font-medium text-emerald-600 hover:text-emerald-500"
            >
              Forgot your password?
            </button>
          </div>
        </div>

        <!-- Error/Success messages -->
        <AlertMessage v-if="error" :message="error" type="error" />
        <AlertMessage v-if="success" :message="success" type="success" />

        <!-- Submit button -->
        <div>
          <Button
            type="submit"
            :disabled="loading"
            :loading="loading"
            class="w-full bg-emerald-600 hover:bg-emerald-700 border-emerald-600 hover:border-emerald-700"
            size="large"
          >
            {{ loading ? (isSignUp ? 'Creating account...' : 'Signing in...') : (isSignUp ? 'Create Account' : 'Sign in') }}
          </Button>
        </div>

        <!-- Toggle between login/signup -->
        <div class="text-center">
          <button
            type="button"
            @click="toggleMode"
            class="text-sm font-medium text-emerald-600 hover:text-emerald-500"
          >
            {{ isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up" }}
          </button>
        </div>
      </form>

      <!-- Divider -->
      <div class="relative mt-6">
        <div class="absolute inset-0 flex items-center">
          <div class="w-full border-t border-gray-300"></div>
        </div>
        <div class="relative flex justify-center text-sm">
          <span class="px-2 bg-gray-50 text-gray-500">Or continue with</span>
        </div>
      </div>

      <!-- Social login buttons (optional - Supabase OAuth) -->
      <div class="mt-6">
        <button
          type="button"
          @click="handleGoogleSignIn"
          :disabled="loading"
          class="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
        >
          <svg class="h-5 w-5 mr-2" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Sign in with Google
        </button>
      </div>
    </div>

    <!-- Forgot Password Dialog (placeholder) -->
    <Dialog
      v-model:visible="showForgotPassword"
      modal
      header="Reset Password"
      :style="{ width: '400px' }"
    >
      <p class="text-sm text-gray-600 mb-4">
        Password reset functionality coming soon. Please contact your administrator.
      </p>
      <template #footer>
        <Button label="Close" @click="showForgotPassword = false" />
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import AlertMessage from '@/components/ui/AlertMessage.vue'

const router = useRouter()
const authStore = useAuthStore()

// State
const isSignUp = ref(false)
const loading = ref(false)
const error = ref('')
const success = ref('')
const showForgotPassword = ref(false)

// Form data
const form = ref({
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  rememberMe: false,
})

// Computed
const formErrors = computed(() => {
  const errors = []

  if (isSignUp.value) {
    if (!form.value.name.trim()) {
      errors.push('Name is required')
    }

    if (form.value.password.length < 8) {
      errors.push('Password must be at least 8 characters')
    }

    if (form.value.password !== form.value.confirmPassword) {
      errors.push('Passwords do not match')
    }
  }

  return errors
})

// Methods
const toggleMode = () => {
  isSignUp.value = !isSignUp.value
  error.value = ''
  success.value = ''

  // Clear confirm password when switching to login
  if (!isSignUp.value) {
    form.value.confirmPassword = ''
    form.value.name = ''
  }
}

const handleSubmit = async () => {
  error.value = ''
  success.value = ''

  // Validate form
  if (formErrors.value.length > 0) {
    error.value = formErrors.value.join(', ')
    return
  }

  loading.value = true

  try {
    if (isSignUp.value) {
      // Register new user
      await authStore.signUp({
        name: form.value.name,
        email: form.value.email,
        password: form.value.password,
        role: 'user', // Default role
      })

      success.value = 'Account created successfully! Signing you in...'

      // Wait a moment to show success message
      setTimeout(() => {
        router.push('/')
      }, 1000)
    } else {
      // Sign in existing user
      await authStore.signIn(form.value.email, form.value.password)
      router.push('/')
    }
  } catch (err) {
    error.value = err.message || (isSignUp.value ? 'Registration failed' : 'Sign in failed')
  } finally {
    loading.value = false
  }
}

const handleGoogleSignIn = async () => {
  error.value = 'Google Sign-In with Supabase OAuth coming soon!'
  // TODO: Implement Supabase OAuth
  // This would use Supabase's signInWithOAuth method
}
</script>

<style scoped>
/* Add any custom styles here */
</style>
