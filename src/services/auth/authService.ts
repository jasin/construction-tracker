// src/services/auth/authService.ts
// TEMP: Disabled Firebase Auth - migrating to Python backend with JWT
console.log('⚠️ authService.ts DISABLED - using Python backend JWT auth');

/**
 * Result type for authentication operations
 */
export interface AuthResult {
  success: boolean;
  user?: any;
  error?: string;
}

/**
 * STUB: Signs in with email and password.
 * Now handled by src/stores/auth.js using JWT
 */
export async function signIn(email: string, password: string): Promise<AuthResult> {
  console.warn('authService.signIn() called but disabled - use auth store instead');
  return { success: false, error: 'Firebase auth disabled' };
}

/**
 * STUB: Signs in with Google using popup.
 * Now handled by src/stores/auth.js using JWT
 */
export async function googleSignIn(): Promise<AuthResult> {
  console.warn('authService.googleSignIn() called but disabled - use auth store instead');
  return { success: false, error: 'Firebase auth disabled' };
}

/**
 * STUB: Signs out the current user.
 * Now handled by src/stores/auth.js
 */
export async function logout(): Promise<AuthResult> {
  console.warn('authService.logout() called but disabled - use auth store instead');
  return { success: true };
}

/**
 * STUB: Gets the current user's ID (UID) from Firebase Auth.
 * Now handled by src/stores/auth.js
 */
export function getCurrentUserId(): string | null {
  console.warn('authService.getCurrentUserId() called but disabled - use auth store instead');
  return null;
}

/**
 * STUB: Gets the current user's name from Firebase Auth.
 * Now handled by src/stores/auth.js
 */
export function getCurrentUserName(): string | null {
  console.warn('authService.getCurrentUserName() called but disabled - use auth store instead');
  return null;
}

/**
 * STUB: Get the Firebase Auth instance.
 * Returns null since Firebase is disabled
 */
export function getAuthInstance(): any {
  console.warn('authService.getAuthInstance() called but disabled');
  return null;
}

/*
UNCOMMENT BELOW TO RE-ENABLE FIREBASE AUTH:

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

export async function signIn(email: string, password: string): Promise<AuthResult> {
  try {
    const userCredential: UserCredential = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (error: any) {
    console.error('Sign-in error:', error);
    return { success: false, error: error.message };
  }
}

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

export async function logout(): Promise<AuthResult> {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error: any) {
    console.error('Logout error:', error);
    return { success: false, error: error.message };
  }
}

export function getCurrentUserId(): string | null {
  try {
    const user = auth.currentUser;
    return user ? user.uid : null;
  } catch (error: any) {
    console.error('Get current user ID error:', error);
    throw new Error(`Failed to get current user ID: ${error.message}`);
  }
}

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

export function getAuthInstance(): Auth {
  return auth;
}
*/
