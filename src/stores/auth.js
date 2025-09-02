// stores/auth.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref(null)
  const isAuthenticated = ref(false)
  const userRole = ref(null)
  const permissions = ref({})

  // Getters
  const canManageSubmittals = computed(() => {
    return ['project_manager', 'admin'].includes(userRole.value)
  })

  const canViewSubmittals = computed(() => {
    return ['project_manager', 'supervisor', 'admin'].includes(userRole.value)
  })

  const canManageChangeOrders = computed(() => {
    return ['project_manager', 'admin'].includes(userRole.value)
  })

  const canManageRFIs = computed(() => {
    return ['project_manager', 'admin'].includes(userRole.value)
  })

  const hasProjectAccess = computed(() => (projectId) => {
    return user.value?.projects?.includes(projectId) || userRole.value === 'admin'
  })

  // Actions
  function setUser(userData) {
    user.value = userData
    userRole.value = userData?.role
    isAuthenticated.value = !!userData
    updatePermissions()
  }

  function updatePermissions() {
    permissions.value = {
      canManageSubmittals: canManageSubmittals.value,
      canViewSubmittals: canViewSubmittals.value,
      canManageChangeOrders: canManageChangeOrders.value,
      canManageRFIs: canManageRFIs.value,
    }
  }

  function logout() {
    user.value = null
    userRole.value = null
    isAuthenticated.value = false
    permissions.value = {}
  }

  return {
    // State
    user,
    isAuthenticated,
    userRole,
    permissions,

    // Getters
    canManageSubmittals,
    canViewSubmittals,
    canManageChangeOrders,
    canManageRFIs,
    hasProjectAccess,

    // Actions
    setUser,
    updatePermissions,
    logout
  }
})
