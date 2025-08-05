// authService.js
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth'
import { auth } from './firebase-config'
import firebaseService from './firebaseService'

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
        if (user) {
          this.currentUser = user
          // Load user profile from database
          try {
            this.userProfile = await firebaseService.getUserByEmail(user.email)
            if (!this.userProfile) {
              // Create user profile if it doesn't exist
              this.userProfile = await this.createUserProfile(user)
            }
          } catch (error) {
            console.error('Error loading user profile:', error)
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
      return { success: true, user: userCredential.user }
    } catch (error) {
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

      // Update display name
      await updateProfile(userCredential.user, { displayName: name })

      // Create user profile in database
      const userProfile = await this.createUserProfile(userCredential.user, {
        name,
        role: role || 'user',
        phone: phone || '',
        active: true,
        createdAt: new Date().toISOString(),
        createdBy: this.getCurrentUserId() || 'system',
      })

      return { success: true, user: userCredential.user, profile: userProfile }
    } catch (error) {
      return {
        success: false,
        error: this.getErrorMessage(error.code),
      }
    }
  }

  // Create user profile in database
  async createUserProfile(firebaseUser, additionalData = {}) {
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

    const createdProfile = await firebaseService.createUser(userProfile)
    this.userProfile = createdProfile
    return createdProfile
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
      const updatedProfile = await firebaseService.updateUser(this.userProfile.id, updates)

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
    return this.userProfile?.id || null
  }

  // Get current user email
  getCurrentUserEmail() {
    return this.currentUser?.email || null
  }

  // Check if user is authenticated
  isAuthenticated() {
    return !!this.currentUser
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
}

export default new AuthService()
