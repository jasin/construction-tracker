// src/stores/auth.js
import { defineStore } from 'pinia';
import { login, register, getCurrentUser } from '@/services/api/authApi';
import {
  saveToken,
  getToken,
  saveUser,
  getUser,
  clearAuthData,
  isTokenExpired,
} from '@/services/auth/tokenService';
import { useUserSettingsStore } from './userSettings';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    token: null,
    loading: false,
    error: '',
    success: '',
    permissions: {},
    initialized: false,
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
    isAuthenticated: (state) => !!state.user && !!state.token,
  },

  actions: {
    /**
     * Initialize authentication from stored token
     * Called on app startup to restore auth state
     */
    async initAuth() {
      if (this.initialized) {
        console.log('Auth: Already initialized, skipping');
        return;
      }

      this.loading = true;

      try {
        const token = getToken();
        const storedUser = getUser();

        console.log('Auth: Initializing with token:', token ? 'present' : 'missing');

        // No token or user stored
        if (!token || !storedUser) {
          console.log('Auth: No stored credentials');
          this.user = null;
          this.token = null;
          this.initialized = true;
          return;
        }

        // Check if token is expired
        if (isTokenExpired(token)) {
          console.log('Auth: Token expired, clearing auth data');
          clearAuthData();
          this.user = null;
          this.token = null;
          this.initialized = true;
          return;
        }

        // Verify token is still valid with backend
        try {
          const currentUser = await getCurrentUser(token);
          console.log('Auth: Token verified, user:', currentUser.email);

          this.user = currentUser;
          this.token = token;

          // Update stored user data (in case it changed on backend)
          saveUser(currentUser);

          // Load user settings
          const userSettingsStore = useUserSettingsStore();
          await userSettingsStore.loadSettings();

          // Set permissions
          const role = this.user.role || 'guest';
          this.permissions = {
            canManageProject: role === 'admin' || role === 'project-manager',
            canViewSubmittals: role !== 'foreman',
            canManageChangeOrders: role === 'admin' || role === 'project-manager',
            canCreateTasks: true,
            canUploadDocuments: true,
          };

          this.success = 'Session restored';
        } catch (err) {
          console.error('Auth: Token verification failed:', err);
          // Token invalid, clear auth data
          clearAuthData();
          this.user = null;
          this.token = null;
        }
      } catch (err) {
        console.error('Auth: Initialization error:', err);
        this.error = 'Failed to initialize authentication';
        clearAuthData();
        this.user = null;
        this.token = null;
      } finally {
        this.loading = false;
        this.initialized = true;
      }
    },

    /**
     * Sign in with email and password
     */
    async signIn(email, password) {
      this.loading = true;
      this.error = '';
      this.success = '';

      try {
        console.log('Auth: Signing in user:', email);
        const response = await login(email, password);

        // Response format: {id, email, name, role, token, token_type}
        this.token = response.token;
        this.user = {
          id: response.id,
          email: response.email,
          name: response.name,
          role: response.role,
          photo: response.photo || null,
          active: response.active !== false,
        };

        // Save to localStorage
        saveToken(this.token);
        saveUser(this.user);

        // Set permissions
        const role = this.user.role || 'guest';
        this.permissions = {
          canManageProject: role === 'admin' || role === 'project-manager',
          canViewSubmittals: role !== 'foreman',
          canManageChangeOrders: role === 'admin' || role === 'project-manager',
          canCreateTasks: true,
          canUploadDocuments: true,
        };

        // Load user settings
        const userSettingsStore = useUserSettingsStore();
        await userSettingsStore.loadSettings();

        this.success = 'Successfully signed in!';
        console.log('Auth: Sign in successful');
      } catch (err) {
        this.error = err.message || 'Sign in failed. Please check your credentials.';
        console.error('Auth: Sign in error:', err);
        throw err;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Register a new user and automatically sign them in
     */
    async signUp(userData) {
      this.loading = true;
      this.error = '';
      this.success = '';

      try {
        console.log('Auth: Registering new user:', userData.email);
        await register(userData);

        // Automatically sign in after registration
        await this.signIn(userData.email, userData.password);

        this.success = 'Account created successfully!';
        console.log('Auth: Registration and sign in successful');
      } catch (err) {
        this.error = err.message || 'Registration failed. Please try again.';
        console.error('Auth: Registration error:', err);
        throw err;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Sign out current user
     */
    async logout() {
      this.loading = true;

      try {
        console.log('Auth: Logging out user');

        // Clear auth data
        clearAuthData();
        this.user = null;
        this.token = null;
        this.permissions = {};

        // Reset user settings to defaults
        const userSettingsStore = useUserSettingsStore();
        userSettingsStore.resetToDefaults();

        this.success = 'Logged out successfully';
        console.log('Auth: Logout successful');
      } catch (err) {
        this.error = 'Logout failed';
        console.error('Auth: Logout error:', err);
        throw err;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Clear error and success messages
     */
    clearMessages() {
      this.error = '';
      this.success = '';
    },
  },
});
