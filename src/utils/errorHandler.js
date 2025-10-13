// src/utils/errorHandler.js

/**
 * Centralized error handling utilities for async operations.
 * @module errorHandler
 */

import Logger from '@/services/logging/Logger';
import AppError from './AppError.js';
import { getCurrentInstance } from 'vue';
import { useToast } from 'primevue/usetoast';

/**
 * Wraps an async function to handle errors uniformly.
 * @param {Function} asyncFn - The async function to execute.
 * @param {Object} [options={}] - Optional configuration.
 * @param {boolean} [options.silent=false] - If true, suppresses UI notifications.
 * @param {string} [options.context=''] - Context string for logging (e.g., 'Document load').
 * @returns {Promise<Object>} - { success: boolean, data: any, error: string|null }
 */
export async function handleAsync(asyncFn, options = {}) {
  const { silent = false, context = '' } = options;
  try {
    const data = await asyncFn();
    return { success: true, data, error: null };
  } catch (err) {
    let errorMessage = err.message || 'An unexpected error occurred';
    Logger.error({ message: errorMessage, context, stack: err.stack });

    if (!silent) {
      // Integrate with UI store for notifications (e.g., via ui.js store).
      // Example: useUIStore().addNotification({ type: 'error', message: errorMessage });
    }

    //let errorMessage = err.message || 'An unexpected error occurred';
    let firebaseCode = null;
    let statusCode = 500;

    // Map Firebase errors if applicable
    if (err.code && err.code.startsWith('auth/')) {
      statusCode = 400;
      firebaseCode = err.code;
      switch (err.code) {
        case 'auth/email-already-exists':
          errorMessage = 'Email already in use';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email format';
          break;
        case 'auth/weak-password':
          errorMessage = 'Password does not meet complexity requirements';
          break;
        case 'auth/too-many-requests':
          statusCode = 429;
          errorMessage = 'Too many requests; try again later';
          break;
        default:
          errorMessage = `Authentication error: ${err.code}`;
      }
    } else if (err.code && err.code.startsWith('datab ase/')) {
      statusCode = 400;
      firebaseCode = err.code;
      switch (err.code) {
        case 'datab ase/rules-not-allowed':
          statusCode = 403;
          errorMessage = 'Operation not permitted due to database rules';
          break;
        case 'datab ase/invalid-argument':
          errorMessage = 'Invalid data provided';
          break;
        default:
          errorMessage = `Database error: ${err.code}`;
      }
    }

    const appError = new AppError(errorMessage, statusCode, firebaseCode);
    Logger.error({
      message: errorMessage,
      context,
      code: firebaseCode,
      stack: err.stack,
      status: statusCode,
    });

    if (!silent) {
      // Show toast notification in Vue app
      const toast = useToast();
      toast.add({ severity: 'error', summary: 'Error', detail: errorMessage, life: 3000 });
    }

    return { success: false, data: null, error: appError };
  }
}

/**
 * Extracts data from a handleAsync result, returning a default value on failure.
 * This standardizes data extraction across repositories, reducing redundancy.
 * @param {Object} result - The result object from handleAsync.
 * @param {any} [defaultValue=[]] - Default value to return if !result.success (e.g., [] for arrays, null for singles).
 * @returns {any} Extracted data or defaultValue.
 */
export function extractData(result, defaultValue = []) {
  return result.success ? result.data : defaultValue;
}

/**
 * Handles synchronous errors uniformly, logging via Logger.
 * Use this for non-async error handling to centralize logging.
 * @param {Error|string} err - The error object or message.
 * @param {string} [context=''] - Context string for logging.
 * @param {Object} [options={}] - Optional configuration.
 * @param {boolean} [options.silent=false] - If true, suppresses UI notifications.
 * @param {boolean} [options.rethrow=false] - If true, rethrows the error after logging.
 * @returns {void}
 */
export function handleError(err, context = '', options = {}) {
  const { silent = false, rethrow = false } = options;
  let errorMessage = err instanceof Error ? err.message : err || 'An unexpected error occurred';
  let firebaseCode = null;
  let statusCode = 500;

  // Map Firebase errors similarly to handleAsync
  if (err.code && err.code.startsWith('auth/')) {
    statusCode = 400;
    firebaseCode = err.code;
    switch (err.code) {
      case 'auth/email-already-exists':
        errorMessage = 'Email already in use';
        break;
      // ... (same cases as in handleAsync for consistency)
      default:
        errorMessage = `Authentication error: ${err.code}`;
    }
  } else if (err.code && err.code.startsWith('datab ase/')) {
    statusCode = 400;
    firebaseCode = err.code;
    // ... (same cases)
  }

  const appError = new AppError(errorMessage, statusCode, firebaseCode);
  const stack = err instanceof Error ? err.stack : undefined;

  Logger.error({
    message: errorMessage,
    context,
    code: firebaseCode,
    stack,
    status: statusCode,
  });

  if (!silent) {
    // Integrate with UI store or toast for notifications
    const toast = useToast();
    toast.add({ severity: 'error', summary: 'Error', detail: errorMessage, life: 3000 });
  }

  if (rethrow) {
    throw appError;
  }
}
