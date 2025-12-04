// src/services/firebase/core/FirebaseCore.ts
import type { Database } from 'firebase/database';
import { database } from '@/configs/firebase';
import { getCurrentUserId, getCurrentUserName } from '@/services/auth/authService';

/**
 * Metadata added to entities on creation
 */
export interface CreateMetadata {
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  createdByName: string;
  updatedBy: string;
  updatedByName: string;
}

/**
 * Metadata added to entities on update
 */
export interface UpdateMetadata {
  updatedAt: string;
  updatedBy: string;
  updatedByName: string;
}

/**
 * Custom error with operation context
 */
export interface FirebaseError extends Error {
  originalError: Error;
  operation: string;
  entityType: string;
}

/**
 * Core Firebase utilities and connection management
 * Provides metadata management and error handling for repositories
 */
class FirebaseCore {
  public database: Database;

  constructor() {
    this.database = database;
  }

  /**
   * Get current user ID with fallback
   */
  getCurrentUserId(): string {
    return getCurrentUserId() || 'system';
  }

  /**
   * Get current user name with fallback
   */
  getCurrentUserName(): string {
    return getCurrentUserName() || 'System';
  }

  /**
   * Add creation metadata to data
   */
  addCreateMetadata<T extends Record<string, any>>(data: T): T & CreateMetadata {
    const timestamp = new Date().toISOString();
    return {
      ...data,
      createdAt: timestamp,
      updatedAt: timestamp,
      createdBy: this.getCurrentUserId(),
      createdByName: this.getCurrentUserName(),
      updatedBy: this.getCurrentUserId(),
      updatedByName: this.getCurrentUserName(),
    };
  }

  /**
   * Add update metadata to data
   */
  addUpdateMetadata<T extends Record<string, any>>(data: T): T & UpdateMetadata {
    return {
      ...data,
      updatedAt: new Date().toISOString(),
      updatedBy: this.getCurrentUserId(),
      updatedByName: this.getCurrentUserName(),
    };
  }

  /**
   * Generate a consistent error for logging
   */
  createError(operation: string, entityType: string, originalError: Error): FirebaseError {
    const error = new Error(
      `${operation} ${entityType} failed: ${originalError.message}`
    ) as FirebaseError;
    error.originalError = originalError;
    error.operation = operation;
    error.entityType = entityType;
    return error;
  }

  /**
   * Log operation for debugging
   */
  logOperation(
    operation: string,
    entityType: string,
    entityId: string | null,
    data?: Record<string, any>
  ): void {
    console.log(`[Firebase] ${operation} ${entityType}${entityId ? `/${entityId}` : ''}`, {
      operation,
      entityType,
      entityId,
      data: data ? Object.keys(data) : null,
      timestamp: new Date().toISOString(),
    });
  }
}

export default new FirebaseCore();
