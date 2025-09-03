// src/stores/auth.js
import { defineStore } from 'pinia'
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from 'firebase/auth' // ES module imports
import { signIn, logout } from '@/services/auth/authService' // ES module import
import UserRepository from '@/services/firebase/Repositories/UserRepository' // Singleton import

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    loading: false,
    error: '',
    success: '',
    permissions: {},
  }),



  getters: {
    getPermissions(state) {
      const role = state.user?.role || 'guest'  // Fallback role
      return {
        canManageProject: role === 'admin' || role === 'project-manager',
        canViewSubmittals: role !== 'foreman',
        canManageChangeOrders: role === 'admin' || role === 'project-manager',
        canCreateTasks: true,
        canUploadDocuments: true
      }
    },
    isAuthenticated: (state) => !!state.user,
  },

  actions: {
    /**
     * Initializes auth listener and syncs user to RTDB.
     * @returns {Promise<void>}
     */
    async initAuth() {
      // Changed: Made async for await in sync
      const auth = getAuth()
      return new Promise((resolve, reject) => {
        // Added: Reject for error propagation
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          this.loading = true
          try {
            if (firebaseUser) {
              let appUser = await UserRepository.getById(firebaseUser.uid)
              if (!appUser) {
                appUser = await UserRepository.create({
                  id: firebaseUser.uid, // Changed: Use uid as id for sync
                  email: firebaseUser.email,
                  name: firebaseUser.displayName || firebaseUser.email.split('@')[0],
                  photo: firebaseUser.photoURL || null,
                  role: 'user',
                  // Add other defaults per your user schema
                })
              }
              this.user = { ...firebaseUser, ...appUser } // Merged Auth and RTDB data
            } else {
              this.user = null
            }
            resolve()
          } catch (err) {
            console.error('Auth init error:', err)
            this.error = 'Failed to sync user.'
            reject(new Error(`Auth init failed: ${err.message}`))
          } finally {
            this.loading = false
            unsubscribe() // Changed: Unsubscribe after initial sync to avoid persistent listener; re-init if needed
          }
        })
      })
    },

    /**
     * Signs in with email/password and triggers sync.
     * @param {string} email - User's email.
     * @param {string} password - User's password.
     * @returns {Promise<void>}
     */
    async signIn(email, password) {
      this.loading = true
      this.error = ''
      this.success = ''
      try {
        const result = await signIn(email, password)
        if (result.success) {
          this.success = 'Successfully signed in!'
          await this.initAuth() // Added: Trigger sync after sign-in
        } else {
          throw new Error(result.error)
        }
      } catch (err) {
        this.error = 'An unexpected error occurred. Please try again.'
        console.error('Login error:', err)
        throw new Error(`Sign-in failed: ${err.message}`)
      } finally {
        this.loading = false
      }
    },

    /**
     * Signs in with Google and triggers sync.
     * @returns {Promise<void>}
     */
    async googleSignIn() {
      // Added: New action for optional Google sign-in with sync
      this.loading = true
      this.error = ''
      this.success = ''
      try {
        const auth = getAuth()
        const provider = new GoogleAuthProvider()
        await signInWithPopup(auth, provider)
        this.success = 'Successfully signed in with Google!'
        await this.initAuth() // Added: Trigger sync after Google sign-in
      } catch (err) {
        this.error = 'Google sign-in failed.'
        console.error('Google login error:', err)
        throw new Error(`Google sign-in failed: ${err.message}`)
      } finally {
        this.loading = false
      }
    },

    /**
     * Logs out the current user.
     * @returns {Promise<void>}
     */
    async logout() {
      this.loading = true
      try {
        await logout()
        this.user = null
      } catch (err) {
        this.error = 'Logout failed.'
        console.error('Logout error:', err)
        throw new Error(`Logout failed: ${err.message}`)
      } finally {
        this.loading = false
      }
    },
  },
})
