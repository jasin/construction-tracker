// src/services/firebase/core/FirebaseCore.js
import { database } from '@/configs/firebase'
import { getCurrentUserId, getCurrentUserName } from '@/services/auth/authService'

/**
 * Core Firebase utilities and connection management
 */
class FirebaseCore {
  constructor() {
    this.database = database
  }

  /**
   * Get current user ID with fallback
   */
  getCurrentUserId() {
    return getCurrentUserId() || 'system'
  }

  /**
   * Get current user name with fallback
   */
  getCurrentUserName() {
    return getCurrentUserName() || 'System'
  }

  /**
   * Add creation metadata to data
   */
  addCreateMetadata(data) {
    return {
      ...data,
      createdAt: new Date().toISOString(),
      createdBy: this.getCurrentUserId(),
      createdByName: this.getCurrentUserName(),
    }
  }

  /**
   * Add update metadata to data
   */
  addUpdateMetadata(data) {
    return {
      ...data,
      updatedAt: new Date().toISOString(),
      updatedBy: this.getCurrentUserId(),
      updatedByName: this.getCurrentUserName(),
    }
  }

  /**
   * Generate a consistent error for logging
   */
  createError(operation, entityType, originalError) {
    const error = new Error(`${operation} ${entityType} failed: ${originalError.message}`)
    error.originalError = originalError
    error.operation = operation
    error.entityType = entityType
    return error
  }

  /**
   * Log operation for debugging
   */
  logOperation(operation, entityType, entityId, data) {
    console.log(`[Firebase] ${operation} ${entityType}${entityId ? `/${entityId}` : ''}`, {
      operation,
      entityType,
      entityId,
      data: data ? Object.keys(data) : null,
      timestamp: new Date().toISOString(),
    })
  }
}

export default new FirebaseCore()
