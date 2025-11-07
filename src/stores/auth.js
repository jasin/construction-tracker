// src/stores/auth.js
import { defineStore } from 'pinia';
import {
  getAuth,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  browserLocalPersistence,
  setPersistence,
} from 'firebase/auth';
import { signIn, logout } from '@/services/auth/authService';
import UserRepository from '@/services/firebase/Repositories/UserRepository';
import { useUserSettingsStore } from './userSettings';

let authUnsubscribe = null; // Global for persistent listener

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    loading: true, // Start true: Wait for initial listener fire
    error: '',
    success: '',
    permissions: {},
  }),

  getters: {
    getPermissions(state) {
      const role = state.user?.role || 'guest';
      return {
        canManageProject: role === 'admin' || role === 'project-manager',
        canViewSubmittals: role !== 'foreman',
        canManageChangeOrders: role === 'admin' || role === 'project-manager',
        canCreateTasks: true,
        canUploadDocuments: true,
      };
    },
    isAuthenticated: (state) => !!state.user,
  },

  actions: {
    /**
     * Initializes persistent auth listener (one-time, idempotent).
     * Sets local persistence for emulator/reloads.
     * @returns {Promise<void>} Resolves when listener fires first time (state settled).
     */
    async initAuth() {
      const self = this; // Capture store context for callback

      const auth = getAuth();

      // Set persistence for dev/emulator (localStorage; survives reloads)
      if (process.env.NODE_ENV === 'development') {
        await setPersistence(auth, browserLocalPersistence);
        console.log('Auth: Local persistence enabled for emulator');
      }

      // Idempotent: If listener active, resolve immediately
      if (authUnsubscribe) {
        console.log('Auth: Listener already active, skipping setup');
        self.loading = false; // Ensure settled
        return Promise.resolve();
      }

      return new Promise((resolve) => {
        self.loading = true; // Explicit during setup

        authUnsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          try {
            console.log('Auth: Listener fired, user:', firebaseUser ? firebaseUser.uid : 'null'); // Debug

            if (firebaseUser) {
              // Extract custom claims from Firebase Auth token
              const idTokenResult = await firebaseUser.getIdTokenResult();
              const customRole = idTokenResult.claims.role || 'user'; // Default to 'user' if no role claim
              console.log('Auth: Custom claims role:', customRole);

              let appUser = await UserRepository.getById(firebaseUser.uid);
              if (!appUser) {
                // Create new user with role from custom claims
                appUser = await UserRepository.create({
                  id: firebaseUser.uid,
                  email: firebaseUser.email,
                  name: firebaseUser.displayName || firebaseUser.email.split('@')[0],
                  photo: firebaseUser.photoURL || null,
                  role: customRole,
                });
              } else {
                // Update existing user's role if it changed in custom claims
                if (appUser.role !== customRole) {
                  console.log(`Auth: Updating user role from ${appUser.role} to ${customRole}`);
                  await UserRepository.update(firebaseUser.uid, { role: customRole });
                  appUser.role = customRole;
                }
              }
              self.user = { ...firebaseUser, ...appUser }; // Set merged user

              // Load user settings
              const userSettingsStore = useUserSettingsStore();
              await userSettingsStore.loadSettings();

              // FIXED: Inline permissions calculation (avoids getter in callback context)
              const role = self.user.role || 'guest';
              self.permissions = {
                canManageProject: role === 'admin' || role === 'project-manager',
                canViewSubmittals: role !== 'foreman',
                canManageChangeOrders: role === 'admin' || role === 'project-manager',
                canCreateTasks: true,
                canUploadDocuments: true,
              };

              self.error = '';
              self.success = 'User synced';
            } else {
              self.user = null;
              self.permissions = {}; // Reset
              self.success = '';
              // Reset settings to defaults on logout
              const userSettingsStore = useUserSettingsStore();
              userSettingsStore.resetToDefaults();
            }

            self.loading = false; // Settled: Resolve on first fire
            resolve(); // Promise done
          } catch (err) {
            console.error('Auth listener error:', err);
            self.error = 'Failed to sync user'; // FIXED: Use self
            self.loading = false; // FIXED: Use self
            // FIXED: Log but don't reject (continue init)
            console.warn('Auth: Listener error logged, continuing without reject');
          }
        });

        console.log('Auth: Persistent listener attached');
      });
    },

    async signIn(email, password) {
      this.loading = true;
      this.error = '';
      this.success = '';
      try {
        const result = await signIn(email, password);
        if (result.success) {
          this.success = 'Successfully signed in!';
          await this.initAuth(); // Listener auto-syncs
        } else {
          throw new Error(result.error);
        }
      } catch (err) {
        this.error = 'An unexpected error occurred. Please try again.';
        console.error('Login error:', err);
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async googleSignIn() {
      this.loading = true;
      this.error = '';
      this.success = '';
      try {
        const auth = getAuth();
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
        this.success = 'Successfully signed in with Google!';
        await this.initAuth(); // Listener syncs
      } catch (err) {
        this.error = 'Google sign-in failed.';
        console.error('Google login error:', err);
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async logout() {
      this.loading = true;
      try {
        await logout();
        if (authUnsubscribe) {
          authUnsubscribe();
          authUnsubscribe = null;
          console.log('Auth: Listener unsubscribed on logout');
        }
        this.user = null;
        this.permissions = {};
        this.success = 'Logged out successfully';
      } catch (err) {
        this.error = 'Logout failed.';
        console.error('Logout error:', err);
        throw err;
      } finally {
        this.loading = false;
      }
    },
  },
});
