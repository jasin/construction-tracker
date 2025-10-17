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
 * Legacy: Wraps an async function to handle errors uniformly.
 * Keep for backward compatibility during migration.
 */
export async function handleAsync(asyncFn, options = {}) {
  const { silent = false, context = '' } = options;
  try {
    console.log(`Before await asyncFn in handleAsync (${context})`);
    const data = await asyncFn();
    console.log(`After await asyncFn in handleAsync - data:`, data);
    return { success: true, data, error: null };
  } catch (err) {
    console.log(`Caught in handleAsync (${context}):`, err);
    let errorMessage = err.message || 'An unexpected error occurred';
    Logger.error({ message: errorMessage, context, stack: err.stack });

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
    } else if (err.code && err.code.startsWith('database/')) {
      statusCode = 400;
      firebaseCode = err.code;
      switch (err.code) {
        case 'database/rules-not-allowed':
          statusCode = 403;
          errorMessage = 'Operation not permitted due to database rules';
          break;
        case 'database/invalid-argument':
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

    const instance = getCurrentInstance();
    if (!silent && instance) {
      const toast = useToast();
      toast.add({ severity: 'error', summary: 'Error', detail: errorMessage, life: 3000 });
    } else if (!silent) {
      console.warn('Toast skipped - not in Vue component context');
    }

    return { success: false, data: null, error: appError };
  }
}

/**
 * Legacy: Extracts data from a handleAsync result.
 * Keep for backward compatibility.
 */
export function extractData(result, defaultValue = null) {
  if (!result.success) {
    console.warn(
      `extractData: failure in ${result.error?.context || 'unknown'}, returning default`
    );
    return defaultValue;
  }
  const data = result.data;
  if (data === null || data === undefined) console.warn('extractData: success but null data');
  return data || defaultValue;
}

/**
 * New: Custom Promise Wrapper Factory (Solution #3).
 * Creates a "safe" async function that retries, centralizes logging/toasting, returns data directly on success,
 * or throws AppError on final fail (caller handles gracefully, e.g., fallback).
 * @param {Function} asyncFn - The async function to wrap (e.g., () => this.getById(id)).
 * @param {Object} [options={}] - Config.
 * @param {number} [options.retries=0] - Number of retry attempts on fail/null.
 * @param {boolean} [options.silent=false] - Suppress toasts.
 * @param {string} [options.context=''] - Log context (e.g., 'Get project').
 * @param {boolean} [options.retryOnNull=true] - Retry if data is null/falsy.
 * @returns {Function} Wrapped async fn (call with args, returns data or throws).
 */

export function createSafeFetcher(asyncFn, options = {}) {
  const { retries = 0, silent = false, context = '', retryOnNull = true } = options;

  return async (...args) => {
    let lastError;
    for (let attempt = 1; attempt <= retries + 1; attempt++) {
      // +1 for initial try
      console.log(
        `${context}: Fetch attempt ${attempt}/${retries + 1}${args.length ? ` with args: ${args}` : ''}`
      );
      try {
        const data = await asyncFn(...args);
        console.log(`${context}: Success on attempt ${attempt}, data:`, data);
        if (data !== null && data !== undefined) {
          return data; // Direct return – full data
        }
        if (!retryOnNull || attempt === retries + 1) {
          console.warn(`${context}: Null/falsy data on final attempt, returning null`);
          return null; // Graceful null for caller fallback
        }
      } catch (err) {
        lastError = err;
        console.error(`${context}: Error on attempt ${attempt}:`, err);
        if (attempt === retries + 1) {
          // Final fail: Central log/mapping/toast, throw AppError
          const errorMessage = lastError.message || 'An unexpected error occurred';
          let firebaseCode = null;
          let statusCode = 500;

          if (lastError.code && lastError.code.startsWith('auth/')) {
            statusCode = 400;
            firebaseCode = lastError.code;
            // ... (same mapping as handleAsync)
            switch (
              lastError.code
              // ... (cases)
            ) {
            }
          } else if (lastError.code && lastError.code.startsWith('database/')) {
            statusCode = 400;
            firebaseCode = lastError.code;
            // ... (cases)
          }

          const appError = new AppError(errorMessage, statusCode, firebaseCode);
          Logger.error({
            message: errorMessage,
            context,
            code: firebaseCode,
            stack: lastError.stack,
            status: statusCode,
          });

          const instance = getCurrentInstance();
          if (!silent && instance) {
            const toast = useToast();
            toast.add({ severity: 'error', summary: 'Error', detail: errorMessage, life: 3000 });
          } else if (!silent) {
            console.warn('Toast skipped - not in Vue component context');
          }

          throw appError; // Throw for caller to handle (e.g., fallback in store)
        }
      }
      // Backoff delay (emulator race fix)
      if (attempt < retries + 1) {
        const delay = 100 * attempt;
        console.log(`${context}: Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  };
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
