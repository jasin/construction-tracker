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
        <p class="mt-2 text-center text-sm text-gray-600">
          {{ isSignUp ? 'Create a new account' : 'Sign in to your account' }}
        </p>
      </div>

      <form class="mt-8 space-y-6" @submit.prevent="handleSubmit">
        <div class="rounded-md shadow-sm -space-y-px">
          <!-- Name field (only for sign up) -->
          <div v-if="isSignUp">
            <label for="name" class="sr-only">Full Name</label>
            <input
              id="name"
              v-model="form.name"
              name="name"
              type="text"
              autocomplete="name"
              :required="isSignUp"
              class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 focus:z-10 sm:text-sm"
              placeholder="Full name"
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
              :class="[
                'appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 focus:z-10 sm:text-sm',
                isSignUp ? '' : 'rounded-t-md',
              ]"
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
              :class="[
                'appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 focus:z-10 sm:text-sm',
                isSignUp ? '' : 'rounded-b-md',
              ]"
              placeholder="Password"
              :disabled="loading"
            />
          </div>

          <!-- Confirm Password field (only for sign up) -->
          <div v-if="isSignUp">
            <label for="confirmPassword" class="sr-only">Confirm Password</label>
            <input
              id="confirmPassword"
              v-model="form.confirmPassword"
              name="confirmPassword"
              type="password"
              autocomplete="new-password"
              :required="isSignUp"
              class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 focus:z-10 sm:text-sm"
              placeholder="Confirm password"
              :disabled="loading"
            />
          </div>
        </div>

        <!-- Remember me (only for sign in) -->
        <div v-if="!isSignUp" class="flex items-center justify-between">
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

        <!-- Validation errors -->
        <div v-if="validationError" class="text-red-500 text-sm text-center">
          {{ validationError }}
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
            {{
              loading
                ? isSignUp
                  ? 'Creating account...'
                  : 'Signing in...'
                : isSignUp
                  ? 'Create account'
                  : 'Sign in'
            }}
          </Button>
        </div>

        <!-- Toggle between sign in and sign up -->
        <div class="text-center">
          <button
            type="button"
            @click="toggleMode"
            class="font-medium text-emerald-600 hover:text-emerald-500"
            :disabled="loading"
          >
            {{ isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up" }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { Button } from 'primevue';
import { useAuth } from '@/composables/useAuth';
import AlertMessage from '@/components/ui/AlertMessage.vue';

const router = useRouter();
const { loading, success, error, signIn, signUp } = useAuth();

// Toggle between sign in and sign up
const isSignUp = ref(false);

// Form data
const form = ref({
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  rememberMe: false,
});

// Validation error
const validationError = ref('');

// Validate form
const validateForm = () => {
  validationError.value = '';

  if (isSignUp.value) {
    if (!form.value.name.trim()) {
      validationError.value = 'Please enter your name';
      return false;
    }

    if (form.value.password.length < 6) {
      validationError.value = 'Password must be at least 6 characters';
      return false;
    }

    if (form.value.password !== form.value.confirmPassword) {
      validationError.value = 'Passwords do not match';
      return false;
    }
  }

  return true;
};

// Handle form submission
const handleSubmit = async () => {
  if (!validateForm()) {
    return;
  }

  try {
    if (isSignUp.value) {
      await signUp({
        name: form.value.name,
        email: form.value.email,
        password: form.value.password,
        role: 'user', // Default role for new registrations
      });
    } else {
      await signIn(form.value.email, form.value.password);
    }

    // Navigate to dashboard on success
    router.push('/');
  } catch (err) {
    console.error('Auth error:', err);
  }
};

// Toggle between sign in and sign up modes
const toggleMode = () => {
  isSignUp.value = !isSignUp.value;
  validationError.value = '';
  // Clear form fields
  form.value = {
    name: '',
    email: form.value.email, // Keep email
    password: '',
    confirmPassword: '',
    rememberMe: false,
  };
};
</script>
