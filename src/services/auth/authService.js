// src/services/auth/authService.js
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  signInWithPopup,
  GoogleAuthProvider,
} from 'firebase/auth' // ES module imports for Firebase Auth functions
import { app } from '@/configs/firebase' // ES module import for Firebase app instance

const auth = getAuth(app)

/**
 * Service for handling Firebase Authentication operations.
 * Provides methods for sign-in (email/password and Google), and sign-out.
 * Does not handle RTDB user syncing—that is managed in the auth store.
 */

/**
 * Signs in with email and password.
 * @param {string} email - User's email address.
 * @param {string} password - User's password.
 * @returns {Promise<Object>} Result with success flag and user or error message.
 */
export async function signIn(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password)
    return { success: true, user: userCredential.user }
  } catch (error) {
    console.error('Sign-in error:', error) // Standardized logging
    return { success: false, error: error.message } // Return error for upstream handling
  }
}

/**
 * Signs in with Google using popup.
 * @returns {Promise<Object>} Result with success flag and user or error message.
 */
export async function googleSignIn() {
  // Added: New method for optional Google sign-in, aligning with Auth-only focus
  try {
    const provider = new GoogleAuthProvider()
    const userCredential = await signInWithPopup(auth, provider)
    return { success: true, user: userCredential.user }
  } catch (error) {
    console.error('Google sign-in error:', error) // Standardized logging
    return { success: false, error: error.message } // Return error for upstream handling
  }
}

/**
 * Signs out the current user.
 * @returns {Promise<Object>} Result with success flag or error message.
 */
export async function logout() {
  // Renamed: Changed from signOut to logout for consistency with store/composable
  try {
    await signOut(auth)
    return { success: true }
  } catch (error) {
    console.error('Logout error:', error) // Standardized logging
    return { success: false, error: error.message } // Return error for upstream handling
  }
}

/**
 * Gets the current user's ID (UID) from Firebase Auth.
 * @returns {string|null} User UID or null if no user is signed in.
 */
export function getCurrentUserId() {
  try {
    const user = auth.currentUser
    return user ? user.uid : null
  } catch (error) {
    console.error('Get current user ID error:', error) // Standardized logging
    throw new Error(`Failed to get current user ID: ${error.message}`) // Rethrow descriptive error
  }
}

/**
 * Gets the current user's name from Firebase Auth (displayName or fallback to email username part).
 * @returns {string|null} User name or null if no user is signed in.
 */
export function getCurrentUserName() {
  try {
    const user = auth.currentUser
    if (!user) return null
    return user.displayName || (user.email ? user.email.split('@')[0] : null)
  } catch (error) {
    console.error('Get current user name error:', error) // Standardized logging
    throw new Error(`Failed to get current user name: ${error.message}`) // Rethrow descriptive error
  }
}

// Removed: Export default object; switched to named ES module exports for better tree-shaking and consistency
// Note: No direct calls to UserRepository here—syncing is handled in auth store to keep this service Auth-focused
