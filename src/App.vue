<template>
  <div id="app" class="min-h-screen font-sans">
    <!-- Loading screen while auth initializes -->
    <div
      v-if="authLoading"
      class="flex flex-col items-center justify-center min-h-screen bg-primary text-primary-contrast gap-4"
    >
      <ProgressSpinner strokeWidth="3" class="w-16 h-16" />
      <span class="text-lg font-medium">Loading...</span>
    </div>

    <!-- Authenticated app layout -->
    <div v-else-if="isAuthenticated" class="min-h-screen bg-surface-ground">
      <!-- Header -->
      <Toolbar
        class="border-b border-surface shadow-sm sticky top-0 z-50"
        style="height: var(--header-height)"
      >
        <template #start>
          <div class="flex items-center gap-3">
            <i class="pi pi-building text-2xl text-primary"></i>
            <span class="text-xl font-semibold text-surface-900">Construction Tracker</span>
          </div>
        </template>
        <template #end>
          <div class="flex items-center gap-3">
            <Chip :label="currentUser?.displayName || currentUser?.email" class="font-medium" />
            <Button
              @click="handleLogout"
              severity="danger"
              size="small"
              label="Logout"
              icon="pi pi-sign-out"
            />
          </div>
        </template>
      </Toolbar>

      <!-- Main layout with sidebar -->
      <div class="flex h-[calc(100vh-var(--header-height))]">
        <!-- Sidebar -->
        <div class="h-full overflow-y-auto">
          <NavigationSidebar class="flex-shrink-0" />
        </div>
        <!-- Main content -->
        <main class="flex-1 bg-surface-ground overflow-y-auto">
          <router-view />
        </main>
      </div>
    </div>

    <!-- Unauthenticated - show login -->
    <div v-else class="min-h-screen bg-surface-ground">
      <router-view />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { Button, Toolbar, ProgressSpinner, Chip } from 'primevue'
import authService from '@/services/auth/authService'
import NavigationSidebar from '@/components/layout/AppSidebar.vue'

const router = useRouter()
const authLoading = ref(true)
const isAuthenticated = ref(false)
const currentUser = ref(null)

let unsubscribeAuth = null

const handleAuthStateChange = (user, userProfile) => {
  isAuthenticated.value = !!user
  currentUser.value = user
  authLoading.value = false

  if (user) {
    if (router.currentRoute.value.name === 'Login') {
      router.push('/')
    }
  } else {
    if (router.currentRoute.value.name !== 'Login') {
      router.push('/login')
    }
  }
}

const handleLogout = async () => {
  try {
    await authService.signOut()
  } catch (error) {
    console.error('Logout error:', error)
  }
}

onMounted(async () => {
  unsubscribeAuth = authService.onAuthStateChange(handleAuthStateChange)
})

onBeforeUnmount(() => {
  if (unsubscribeAuth) {
    unsubscribeAuth()
  }
})
</script>
