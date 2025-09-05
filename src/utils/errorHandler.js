/**
 * Centralized error handling utilities for async operations.
 * @module errorHandler
 */

import Logger from '@/services/logging/Logger'

/**
 * Wraps an async function to handle errors uniformly.
 * @param {Function} asyncFn - The async function to execute.
 * @param {Object} [options={}] - Optional configuration.
 * @param {boolean} [options.silent=false] - If true, suppresses UI notifications.
 * @param {string} [options.context=''] - Context string for logging (e.g., 'Document load').
 * @returns {Promise<Object>} - { success: boolean, data: any, error: string|null }
 */
export async function handleAsync(asyncFn, options = {}) {
  const { silent = false, context = '' } = options
  try {
    const data = await asyncFn()
    const result = { success: true, data, error: null }
    console.log(`handleAsync result for "${context}":`, result) // Debug: Log actual return on success
    return result
  } catch (err) {
    const errorMessage = err.message || 'An unexpected error occurred'
    Logger.error({ message: errorMessage, context, stack: err.stack })

    if (!silent) {
      // Integrate with UI store for notifications (e.g., via ui.js store).
      // Example: useUIStore().addNotification({ type: 'error', message: errorMessage });
    }

    return { success: false, data: null, error: errorMessage }
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
  return result.success ? result.data : defaultValue
}
