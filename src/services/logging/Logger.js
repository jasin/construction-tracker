/**
 * Dedicated logger service for the application, handling structured output of logs.
 * @module Logger
 */

const Logger = {
  /**
   * Logs an error with structured formatting.
   * @param {Object} data - Error data to log.
   * @param {string} data.message - The error message.
   * @param {string} [data.context=''] - Optional context for the error.
   * @param {string} [data.stack=''] - Optional stack trace.
   */
  error: (data) => {
    const { message, context = '', stack = '' } = data
    console.error('[ERROR]', message, context ? `(${context})` : '', stack ? `\n${stack}` : '')
    // In production, add logic to suppress console or send to external service:
    // if (process.env.NODE_ENV !== 'production') { /* console output */ }
    // else { /* e.g., send to Sentry or log file */ }
  },

  // Add other log levels as needed (e.g., info, warn) for future expansion.
}

export default Logger
