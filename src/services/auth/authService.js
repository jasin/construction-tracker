// authService.js
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth'
import { auth } from '@/configs/firebase'
import UserRepository from '@/services/firebase/Repositories/UserRepository'

class AuthService {
  constructor() {
    this.currentUser = null
    this.userProfile = null
    this.authStateListeners = []
  }

  // Initialize auth state listener
  init() {
    return new Promise((resolve) => {
      onAuthStateChanged(auth, async (user) => {
        console.log('Auth state changed:', user ? user.email : 'No user')

        if (user) {
          this.currentUser = user

          try {
            // Always try to load user profile from database
            this.userProfile = await UserRepository.getUserByEmail(user.email)
            console.log('Loaded user profile:', this.userProfile)

            if (!this.userProfile) {
              console.log('User profile not found, creating new profile...')
              // Create user profile if it doesn't exist
              this.userProfile = await this.createUserProfile(user)
              console.log('Created new user profile:', this.userProfile)
            } else {
              // Update last login time for existing users
              await UserRepository.updateUser(this.userProfile.id, {
                lastLoginAt: new Date().toISOString(),
              })
            }
          } catch (error) {
            console.error('Error loading/creating user profile:', error)
            // Create a basic profile as fallback
            try {
              this.userProfile = await this.createUserProfile(user, {
                role: 'user', // Default role
                active: true,
              })
              console.log('Created fallback user profile:', this.userProfile)
            } catch (fallbackError) {
              console.error('Failed to create fallback profile:', fallbackError)
              this.userProfile = null
            }
          }
        } else {
          this.currentUser = null
          this.userProfile = null
        }

        // Notify all listeners
        this.authStateListeners.forEach((callback) => callback(this.currentUser, this.userProfile))
        resolve(this.currentUser)
      })
    })
  }

  // Subscribe to auth state changes
  onAuthStateChange(callback) {
    this.authStateListeners.push(callback)
    // Call immediately with current state
    callback(this.currentUser, this.userProfile)

    // Return unsubscribe function
    return () => {
      const index = this.authStateListeners.indexOf(callback)
      if (index > -1) {
        this.authStateListeners.splice(index, 1)
      }
    }
  }

  // Sign in with email and password
  async signIn(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      console.log('Successfully signed in:', userCredential.user.email)

      // The user profile will be loaded automatically by the onAuthStateChanged listener
      // Wait a moment for the profile to be loaded
      await new Promise((resolve) => setTimeout(resolve, 1000))

      return { success: true, user: userCredential.user, profile: this.userProfile }
    } catch (error) {
      console.error('Sign in error:', error)
      return {
        success: false,
        error: this.getErrorMessage(error.code),
      }
    }
  }

  // Register new user
  async register(userData) {
    try {
      const { email, password, name, role, phone } = userData

      // Create Firebase auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      console.log('Created Firebase auth user:', userCredential.user.email)

      // Update display name
      await updateProfile(userCredential.user, { displayName: name })

      // Create user profile in database - this will be handled by onAuthStateChanged
      // But we can also create it immediately to ensure it exists
      const userProfile = await this.createUserProfile(userCredential.user, {
        name,
        role: role || 'user',
        phone: phone || '',
        active: true,
      })

      return { success: true, user: userCredential.user, profile: userProfile }
    } catch (error) {
      console.error('Registration error:', error)
      return {
        success: false,
        error: this.getErrorMessage(error.code),
      }
    }
  }

  // Create user profile in database
  async createUserProfile(firebaseUser, additionalData = {}) {
    try {
      const userProfile = {
        email: firebaseUser.email,
        name: firebaseUser.displayName || additionalData.name || '',
        role: additionalData.role || 'user',
        phone: additionalData.phone || '',
        active: additionalData.active !== undefined ? additionalData.active : true,
        createdAt: additionalData.createdAt || new Date().toISOString(),
        createdBy: additionalData.createdBy || 'system',
        lastLoginAt: new Date().toISOString(),
      }

      console.log('Creating user profile:', userProfile)
      const createdProfile = await UserRepository.createUser(userProfile)
      console.log('Successfully created user profile:', createdProfile)

      this.userProfile = createdProfile
      return createdProfile
    } catch (error) {
      console.error('Error creating user profile:', error)
      throw error
    }
  }

  // Sign out
  async signOut() {
    try {
      await signOut(auth)
      this.currentUser = null
      this.userProfile = null
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: this.getErrorMessage(error.code),
      }
    }
  }

  // Send password reset email
  async resetPassword(email) {
    try {
      await sendPasswordResetEmail(auth, email)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: this.getErrorMessage(error.code),
      }
    }
  }

  // Update user profile
  async updateUserProfile(updates) {
    if (!this.userProfile) {
      throw new Error('No user profile loaded')
    }

    try {
      // Update in database
      const updatedProfile = await UserRepository.updateUser(this.userProfile.id, updates)

      // Update display name in Firebase Auth if name changed
      if (updates.name && this.currentUser) {
        await updateProfile(this.currentUser, { displayName: updates.name })
      }

      // Update local profile
      this.userProfile = { ...this.userProfile, ...updatedProfile }

      return { success: true, profile: this.userProfile }
    } catch (error) {
      return {
        success: false,
        error: error.message,
      }
    }
  }

  // Get current user ID
  getCurrentUserId() {
    return this.userProfile?.id || this.currentUser?.uid || null
  }

  // Get current user email
  getCurrentUserEmail() {
    return this.currentUser?.email || null
  }

  // Get current user name
  getCurrentUserName() {
    return (
      this.userProfile?.name ||
      this.currentUser?.displayName ||
      this.currentUser?.email ||
      'Unknown User'
    )
  }

  // Check if user is authenticated
  isAuthenticated() {
    return !!this.currentUser && !!this.userProfile
  }

  // Check if user has specific role
  hasRole(role) {
    return this.userProfile?.role === role
  }

  // Check if user has any of the specified roles
  hasAnyRole(roles) {
    return roles.includes(this.userProfile?.role)
  }

  // Check if user can access project
  canAccessProject(projectId) {
    if (!this.userProfile) return false

    // Admins can access all projects
    if (this.hasRole('admin')) return true

    // Check if user is assigned to project
    return this.userProfile.projects && this.userProfile.projects[projectId]
  }

  // Get user permissions
  getPermissions() {
    const role = this.userProfile?.role

    const permissions = {
      user: {
        canViewProjects: true,
        canEditProjects: false,
        canCreateProjects: false,
        canDeleteProjects: false,
        canManageUsers: false,
        canViewReports: true,
        canManageDocuments: false,
      },
      foreman: {
        canViewProjects: true,
        canEditProjects: true,
        canCreateProjects: false,
        canDeleteProjects: false,
        canManageUsers: false,
        canViewReports: true,
        canManageDocuments: true,
      },
      'project-manager': {
        canViewProjects: true,
        canEditProjects: true,
        canCreateProjects: true,
        canDeleteProjects: false,
        canManageUsers: false,
        canViewReports: true,
        canManageDocuments: true,
      },
      superintendent: {
        canViewProjects: true,
        canEditProjects: true,
        canCreateProjects: true,
        canDeleteProjects: true,
        canManageUsers: false,
        canViewReports: true,
        canManageDocuments: true,
      },
      admin: {
        canViewProjects: true,
        canEditProjects: true,
        canCreateProjects: true,
        canDeleteProjects: true,
        canManageUsers: true,
        canViewReports: true,
        canManageDocuments: true,
      },
    }

    return permissions[role] || permissions.user
  }

  // Helper method to get user-friendly error messages
  getErrorMessage(errorCode) {
    const errorMessages = {
      'auth/user-not-found': 'No user found with this email address.',
      'auth/wrong-password': 'Incorrect password.',
      'auth/email-already-in-use': 'An account with this email already exists.',
      'auth/weak-password': 'Password should be at least 6 characters.',
      'auth/invalid-email': 'Invalid email address.',
      'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
      'auth/network-request-failed': 'Network error. Please check your connection.',
      'auth/requires-recent-login': 'Please sign in again to complete this action.',
    }

    return errorMessages[errorCode] || 'An unexpected error occurred. Please try again.'
  }

  // Method to manually sync current auth user to database (for fixing existing users)
  async syncCurrentUserToDatabase() {
    if (!this.currentUser) {
      throw new Error('No authenticated user')
    }

    console.log('Manually syncing current user to database...')

    try {
      // Check if user already exists
      let userProfile = await UserRepository.getUserByEmail(this.currentUser.email)

      if (!userProfile) {
        // Create the user profile
        userProfile = await this.createUserProfile(this.currentUser, {
          role: 'admin', // You can set a default role here
          active: true,
        })
        console.log('Created user profile:', userProfile)
      } else {
        console.log('User profile already exists:', userProfile)
      }

      this.userProfile = userProfile
      return userProfile
    } catch (error) {
      console.error('Error syncing user to database:', error)
      throw error
    }
  }
}

export default new AuthService()
