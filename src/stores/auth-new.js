/**
 * Auth Store - Python Backend Version
 * Handles authentication with JWT tokens from Python backend
 */
import { defineStore } from 'pinia'
import { login, register, getCurrentUser } from '@/services/api/authApi'
import {
  saveToken,
  getToken,
  saveUser,
  getUser,
  clearAuthData,
  isTokenExpired,
} from '@/services/auth/tokenService'
import { useUserSettingsStore } from './userSettings'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    token: null,
    loading: false,
    error: '',
    success: '',
    initialized: false,
  }),

  getters: {
    isAuthenticated: (state) => !!state.user && !!state.token,

    getPermissions(state) {
      const role = state.user?.role || 'guest'
      return {
        canManageProject: role === 'admin' || role === 'project-manager',
        canViewSubmittals: role !== 'foreman',
        canManageChangeOrders: role === 'admin' || role === 'project-manager',
        canCreateTasks: true,
        canUploadDocuments: true,
      }
    },
  },

  actions: {
    /**
     * Initialize auth state from localStorage
     * Checks if stored token is valid and loads user data
     */
    async initAuth() {
      if (this.initialized) {
        return
      }

      this.loading = true

      try {
        const token = getToken()
        const storedUser = getUser()

        if (!token || !storedUser) {
          console.log('Auth: No stored credentials found')
          this.initialized = true
          this.loading = false
          return
        }

        // Check if token is expired
        if (isTokenExpired(token)) {
          console.log('Auth: Token expired, clearing credentials')
          clearAuthData()
          this.initialized = true
          this.loading = false
          return
        }

        // Verify token is still valid by fetching current user
        try {
          const currentUser = await getCurrentUser(token)

          this.user = currentUser
          this.token = token

          // Load user settings
          const userSettingsStore = useUserSettingsStore()
          await userSettingsStore.loadSettings()

          console.log('Auth: User restored from localStorage:', currentUser.email)
        } catch (error) {
          // Token is invalid, clear everything
          console.error('Auth: Token validation failed:', error)
          clearAuthData()
          this.user = null
          this.token = null
        }
      } catch (error) {
        console.error('Auth: Init error:', error)
        clearAuthData()
      } finally {
        this.initialized = true
        this.loading = false
      }
    },

    /**
     * Sign in with email and password
     */
    async signIn(email, password) {
      this.loading = true
      this.error = ''
      this.success = ''

      try {
        const response = await login(email, password)

        // Response contains: {id, email, name, role, token, token_type, created_at, updated_at}
        this.token = response.token
        this.user = {
          id: response.id,
          email: response.email,
          name: response.name,
          role: response.role,
          photo: response.photo || null,
          active: response.active !== false,
        }

        // Save to localStorage
        saveToken(this.token)
        saveUser(this.user)

        // Load user settings
        const userSettingsStore = useUserSettingsStore()
        await userSettingsStore.loadSettings()

        this.success = 'Successfully signed in!'
        console.log('Auth: User signed in:', this.user.email)
      } catch (error) {
        this.error = error.message || 'Sign in failed'
        console.error('Auth: Sign in error:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Register a new user
     */
    async signUp(userData) {
      this.loading = true
      this.error = ''
      this.success = ''

      try {
        // userData should contain: {email, name, password, role?}
        const newUser = await register(userData)

        // After registration, automatically log in
        await this.signIn(userData.email, userData.password)

        this.success = 'Account created successfully!'
        console.log('Auth: User registered:', newUser.email)
      } catch (error) {
        this.error = error.message || 'Registration failed'
        console.error('Auth: Registration error:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Log out current user
     */
    async logout() {
      this.loading = true

      try {
        // Clear local state
        this.user = null
        this.token = null
        this.error = ''
        this.success = ''

        // Clear localStorage
        clearAuthData()

        // Reset user settings to defaults
        const userSettingsStore = useUserSettingsStore()
        userSettingsStore.resetToDefaults()

        console.log('Auth: User logged out')
      } catch (error) {
        console.error('Auth: Logout error:', error)
        // Still clear local data even if there's an error
        this.user = null
        this.token = null
        clearAuthData()
      } finally {
        this.loading = false
      }
    },

    /**
     * Update user profile
     */
    async updateProfile(updates) {
      // This would call your backend API to update user
      // For now, just update local state
      if (this.user) {
        this.user = { ...this.user, ...updates }
        saveUser(this.user)
      }
    },

    /**
     * Clear error message
     */
    clearError() {
      this.error = ''
    },

    /**
     * Clear success message
     */
    clearSuccess() {
      this.success = ''
    },
  },
})
