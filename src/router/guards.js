// src/router/guards.js
import { useAuthStore } from '@/stores'; // ES module import from centralized stores/index.js for auth store access

// Helper: Simple polling wait for loading (non-reactive, no polling; waits for listener via initAuth)
const waitForAuth = async (authStore) => {
  const maxWait = 5000; // 5s timeout
  const start = Date.now();

  if (!authStore.loading) {
    console.log('Guard: Auth already ready (no wait needed)'); // Debug
    return;
  }

  while (authStore.loading && Date.now() - start < maxWait) {
    // Trigger/re-run initAuth to fire listener (persistent, idempotent)
    await authStore.initAuth();
    // Non-blocking poll (100ms)
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  if (authStore.loading) {
    console.warn('Guard: Auth timeout after 5s (listener may be stuck)'); // Debug: Rare with fixed auth.js
  } else {
    console.log('Guard: Auth ready after wait'); // Debug: Confirms success
  }
};

/**
 * Router guard to require authentication.
 * Uses auth store's isAuthenticated getter for check (after waiting for loading).
 * Redirects to login if not authenticated.
 * @param {Object} to - Target route.
 * @param {Object} from - Current route.
 * @param {Function} next - Next function to proceed or redirect.
 * @returns {Promise<void>} Makes async for Vue Router (waits for auth init).
 */
export const requireAuth = async (to, from, next) => {
  const authStore = useAuthStore();

  // Wait for loading (fixes direct access race; uses polling)
  await waitForAuth(authStore);

  if (authStore.isAuthenticated) {
    next();
  } else {
    console.log('Guard: Not authenticated after wait, redirecting to login'); // Debug: Confirms redirect reason
    next('/login');
  }
};

/**
 * Router guard to require specific roles.
 * First checks authentication (with wait), then user's role from auth store.
 * Redirects to login if not authenticated, or unauthorized if role mismatch.
 * @param {Array<string>} roles - Array of allowed roles.
 * @returns {Function} Guard function (async wrapper for consistency).
 */
export function requireRole(roles) {
  return async (to, from, next) => {
    // Async for wait
    const authStore = useAuthStore();

    // Wait for loading (ensures user.role is available)
    await waitForAuth(authStore);

    if (!authStore.isAuthenticated) {
      console.log('Guard: Not authenticated for role check, redirecting to login'); // Debug
      next('/login');
      return;
    }

    const userRole = authStore.user?.role; // Safe access
    if (roles.includes(userRole)) {
      next();
    } else {
      console.log('Guard: Role mismatch, redirecting to unauthorized'); // Debug
      next('/unauthorized');
    }
  };
}

/**
 * Router guard to require specific permissions.
 * First checks authentication (with wait), then permissions (assuming derived from user).
 * Redirects to login if not authenticated, or unauthorized if permission missing.
 * @param {string} permission - Required permission key.
 * @returns {Function} Guard function (async wrapper for consistency).
 */
export function requirePermission(permission) {
  return async (to, from, next) => {
    // Async for wait
    const authStore = useAuthStore();

    // Wait for loading (ensures user.permissions is available)
    await waitForAuth(authStore);

    if (!authStore.isAuthenticated) {
      console.log('Guard: Not authenticated for permission check, redirecting to login'); // Debug
      next('/login');
      return;
    }

    const permissions = authStore.user?.permissions || {}; // Safe access
    if (permissions[permission]) {
      next();
    } else {
      console.log('Guard: Permission missing, redirecting to unauthorized'); // Debug
      next('/unauthorized');
    }
  };
}

/**
 * Router guard to redirect if already authenticated.
 * Redirects to home if authenticated (after quick wait), otherwise proceeds.
 * @param {Object} to - Target route.
 * @param {Object} from - Current route.
 * @param {Function} next - Next function to proceed or redirect.
 */
export async function redirectIfAuthenticated(to, from, next) {
  const authStore = useAuthStore();

  // Wait for auth to be ready
  await waitForAuth(authStore);

  if (authStore.isAuthenticated) {
    console.log('Guard: Authenticated on public route, redirecting to dashboard'); // Debug
    next('/');
  } else {
    next();
  }
}

// Note: Guards use simple polling for waitForAuth (non-reactive, compatible with custom auth store).
// Async-aware for Firebase loading states. Debug logs for troubleshooting (remove in prod).
// Assumption: authStore.loading and user sync via persistent listener in auth.js.
