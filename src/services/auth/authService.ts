// src/services/auth/authService.ts
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  signInWithPopup,
  GoogleAuthProvider,
  type Auth,
  type User,
  type UserCredential,
} from 'firebase/auth';
import { app } from '@/configs/firebase';

const auth: Auth = getAuth(app);

/**
 * Result type for authentication operations
 */
export interface AuthResult {
  success: boolean;
  user?: User;
  error?: string;
}

/**
 * Service for handling Firebase Authentication operations.
 * Provides methods for sign-in (email/password and Google), and sign-out.
 * Does not handle RTDB user syncing—that is managed in the auth store.
 */

/**
 * Signs in with email and password.
 */
export async function signIn(email: string, password: string): Promise<AuthResult> {
  try {
    const userCredential: UserCredential = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (error: any) {
    console.error('Sign-in error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Signs in with Google using popup.
 */
export async function googleSignIn(): Promise<AuthResult> {
  try {
    const provider = new GoogleAuthProvider();
    const userCredential: UserCredential = await signInWithPopup(auth, provider);
    return { success: true, user: userCredential.user };
  } catch (error: any) {
    console.error('Google sign-in error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Signs out the current user.
 */
export async function logout(): Promise<AuthResult> {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error: any) {
    console.error('Logout error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Gets the current user's ID (UID) from Firebase Auth.
 */
export function getCurrentUserId(): string | null {
  try {
    const user = auth.currentUser;
    return user ? user.uid : null;
  } catch (error: any) {
    console.error('Get current user ID error:', error);
    throw new Error(`Failed to get current user ID: ${error.message}`);
  }
}

/**
 * Gets the current user's name from Firebase Auth (displayName or fallback to email username part).
 */
export function getCurrentUserName(): string | null {
  try {
    const user = auth.currentUser;
    if (!user) return null;
    return user.displayName || (user.email ? user.email.split('@')[0] : null);
  } catch (error: any) {
    console.error('Get current user name error:', error);
    throw new Error(`Failed to get current user name: ${error.message}`);
  }
}

/**
 * Get the Firebase Auth instance (for store/composable use)
 */
export function getAuthInstance(): Auth {
  return auth;
}
