<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
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
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">Construction Tracker</h2>
        <p class="mt-2 text-center text-sm text-gray-600">Sign in to your account</p>
      </div>

      <form class="mt-8 space-y-6" @submit.prevent="handleLogin">
        <div class="rounded-md shadow-sm -space-y-px">
          <div>
            <label for="email" class="sr-only">Email address</label>
            <input
              id="email"
              v-model="form.email"
              name="email"
              type="email"
              autocomplete="email"
              required
              class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 focus:z-10 sm:text-sm"
              placeholder="Email address"
              :disabled="loading"
            />
          </div>
          <div>
            <label for="password" class="sr-only">Password</label>
            <input
              id="password"
              v-model="form.password"
              name="password"
              type="password"
              autocomplete="current-password"
              required
              class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 focus:z-10 sm:text-sm"
              placeholder="Password"
              :disabled="loading"
            />
          </div>
        </div>

        <div class="flex items-center justify-between">
          <div class="flex items-center">
            <input
              id="remember-me"
              v-model="form.rememberMe"
              name="remember-me"
              type="checkbox"
              class="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
            />
            <label for="remember-me" class="ml-2 block text-sm text-gray-900"> Remember me </label>
          </div>

          <div class="text-sm">
            <Button
              @click="showForgotPassword = true"
              variant="text"
              class="p-0 font-medium text-emerald-600 hover:text-emerald-500"
              size="small"
            >
              Forgot your password?
            </Button>
          </div>
        </div>

        <AlertMessage v-if="error" :message="error" type="error" />
        <AlertMessage v-if="success" :message="success" type="success" />

        <div>
          <Button
            type="submit"
            :disabled="loading"
            :loading="loading"
            class="w-full bg-emerald-600 hover:bg-emerald-700 border-emerald-600 hover:border-emerald-700"
            size="large"
          >
            {{ loading ? 'Signing in...' : 'Sign in' }}
          </Button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Button } from 'primevue'
import { useAuth } from '@/composables/useAuth'
import AlertMessage from '@/components/ui/AlertMessage.vue'

const { loading, success, error, signIn } = useAuth()

// Form data
const form = ref({
  email: '',
  password: '',
  rememberMe: false,
})

// Handle login
const handleLogin = async () => {
  await signIn(form.value.email, form.value.password)
}

</script>
