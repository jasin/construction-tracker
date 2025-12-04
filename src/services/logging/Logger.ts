/**
 * Dedicated logger service for the application, handling structured output of logs.
 * @module Logger
 */

export interface LogData {
  message: string
  context?: string
  stack?: string
  [key: string]: any
}

const Logger = {
  /**
   * Logs an error with structured formatting.
   */
  error: (data: LogData): void => {
    const { message, context = '', stack = '' } = data
    console.error('[ERROR]', message, context ? `(${context})` : '', stack ? `\n${stack}` : '')
    // In production, add logic to suppress console or send to external service:
    // if (process.env.NODE_ENV !== 'production') { /* console output */ }
    // else { /* e.g., send to Sentry or log file */ }
  },

  /**
   * Logs an info message
   */
  info: (data: LogData): void => {
    const { message, context = '' } = data
    console.info('[INFO]', message, context ? `(${context})` : '')
  },

  /**
   * Logs a warning message
   */
  warn: (data: LogData): void => {
    const { message, context = '' } = data
    console.warn('[WARN]', message, context ? `(${context})` : '')
  },

  /**
   * Logs a debug message
   */
  debug: (data: LogData): void => {
    const { message, context = '' } = data
    if (import.meta.env.DEV) {
      console.debug('[DEBUG]', message, context ? `(${context})` : '')
    }
  },
}

export default Logger
