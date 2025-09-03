// src/router/guards.js
import { useAuthStore } from '@/stores' // ES module import from centralized stores/index.js for auth store access

/**
 * Router guard to require authentication.
 * Uses auth store's isAuthenticated getter for check.
 * Redirects to login if not authenticated.
 * @param {Object} to - Target route.
 * @param {Object} from - Current route.
 * @param {Function} next - Next function to proceed or redirect.
 */
export function requireAuth(to, from, next) {
  const authStore = useAuthStore()
  if (authStore.isAuthenticated) {
    next()
  } else {
    next('/login')
  }
}

/**
 * Router guard to require specific roles.
 * First checks authentication, then user's role from auth store.
 * Redirects to login if not authenticated, or unauthorized if role mismatch.
 * @param {Array<string>} roles - Array of allowed roles.
 * @returns {Function} Guard function.
 */
export function requireRole(roles) {
  return (to, from, next) => {
    const authStore = useAuthStore()
    if (!authStore.isAuthenticated) {
      next('/login')
      return
    }

    const userRole = authStore.user?.role // Changed: Access role from authStore.user (assuming role is stored there after sync)
    if (roles.includes(userRole)) {
      next()
    } else {
      next('/unauthorized')
    }
  }
}

/**
 * Router guard to require specific permissions.
 * First checks authentication, then permissions (assuming derived from user).
 * Redirects to login if not authenticated, or unauthorized if permission missing.
 * @param {string} permission - Required permission key.
 * @returns {Function} Guard function.
 */
export function requirePermission(permission) {
  return (to, from, next) => {
    const authStore = useAuthStore()
    if (!authStore.isAuthenticated) {
      next('/login')
      return
    }

    const permissions = authStore.user?.permissions || {} // Changed: Access permissions from authStore.user (implement getPermissions logic if needed; assuming object in user data)
    if (permissions[permission]) {
      next()
    } else {
      next('/unauthorized')
    }
  }
}

/**
 * Router guard to redirect if already authenticated.
 * Redirects to home if authenticated, otherwise proceeds.
 * @param {Object} to - Target route.
 * @param {Object} from - Current route.
 * @param {Function} next - Next function to proceed or redirect.
 */
export function redirectIfAuthenticated(to, from, next) {
  const authStore = useAuthStore()
  if (authStore.isAuthenticated) {
    next('/')
  } else {
    next()
  }
}

// Note: Standardized error handling not directly applicable here as guards don't throw errors; redirects handle failures
// Changed: Replaced undefined isAuthenticated(), userProfile, getPermissions() with authStore equivalents for consistency and reactivity
// Assumption: user.role and user.permissions are synced in authStore.user; adjust if stored differently
