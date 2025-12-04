// src/services/firebase/core/BaseRepository.ts
import type { Database } from 'firebase/database';
import { CrudMixin, type BaseRepositoryInterface } from '../mixins/CrudMixin';
import { RealtimeMixin } from '../mixins/RealtimeMixin';
import { validateAndCleanForm } from '@/utils/index';
import { handleAsync, extractData } from '@/utils/errorHandler';
import firebaseCore from './FirebaseCore';

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  cleanData?: Record<string, unknown>;
  errors: Record<string, string>;
}

/**
 * Base repository class that all entity repositories extend
 * Provides common functionality through mixins
 */
class BaseRepositoryClass implements BaseRepositoryInterface {
  collectionName: string;
  entityName: string;
  schema: Record<string, unknown> | null;
  db: Database;

  constructor(
    collectionName: string,
    entityName: string | null = null,
    schema: Record<string, unknown> | null = null
  ) {
    this.collectionName = collectionName;
    this.entityName = entityName || this.deriveEntityName(collectionName);
    this.schema = schema;
    this.db = firebaseCore.database;
  }

  /**
   * Derive entityName from collectionName (e.g., 'projects' → 'Project')
   */
  deriveEntityName(collectionName: string): string {
    const singular = collectionName.slice(0, -1);
    return singular.replace(/^\w/, (c) => c.toUpperCase());
  }

  /**
   * Validate data against required fields
   */
  validateData(data: Record<string, unknown>, requiredFields: string[] = []): ValidationResult {
    const validation = validateAndCleanForm(data, requiredFields);

    // If we have a schema, we could add additional validation here
    if (this.schema) {
      // Custom schema validation could be added here
      // For now, we'll rely on the sanitizeWithSchema function
    }

    return validation;
  }

  /**
   * Create with validation
   */
  async createWithValidation(
    data: Record<string, unknown>,
    requiredFields: string[] = []
  ): Promise<unknown> {
    const validation = this.validateData(data, requiredFields);

    if (!validation.isValid) {
      return {
        success: false,
        data: null,
        error: `Validation failed: ${Object.values(validation.errors || {}).join(', ')}`,
      };
    }

    return await (this as any).create(validation.cleanData, this.schema);
  }

  /**
   * Update with validation
   */
  async updateWithValidation(
    entityId: string,
    updates: Record<string, unknown>,
    requiredFields: string[] = []
  ): Promise<unknown> {
    // For updates, we don't require all fields, just validate what's provided
    const validation = this.validateData(updates, requiredFields);

    if (!validation.isValid) {
      return {
        success: false,
        data: null,
        error: `Validation failed: ${Object.values(validation.errors || {}).join(', ')}`,
      };
    }

    return await (this as any).update(entityId, validation.cleanData, this.schema);
  }

  /**
   * Bulk operations
   */
  async bulkUpdate(entityIds: string[], updates: Record<string, unknown>): Promise<unknown> {
    const result = await handleAsync(
      async () => {
        const promises = entityIds.map(async (id) => {
          const result = await (this as any).update(id, updates, this.schema);
          if (!result.success) {
            throw new Error(result.error);
          }
          return result.data;
        });
        return await Promise.all(promises);
      },
      { context: `Bulk update ${this.entityName}` }
    );
    return extractData(result);
  }

  async bulkDelete(entityIds: string[]): Promise<unknown> {
    const result = await handleAsync(
      async () => {
        const promises = entityIds.map(async (id) => {
          const result = await (this as any).delete(id);
          if (!result.success) {
            throw new Error(result.error);
          }
          return result.data;
        });
        return await Promise.all(promises);
      },
      { context: `Bulk delete ${this.entityName}` }
    );
    return extractData(result);
  }

  /**
   * Get entity count
   */
  async getCount(): Promise<number> {
    const result = await handleAsync(
      async () => {
        const result = await (this as any).getAll();
        if (!result.success) {
          throw new Error(result.error);
        }
        return result.data.length;
      },
      { context: `Get count of ${this.entityName}` }
    );
    return extractData(result);
  }

  /**
   * Check if entity exists
   */
  async exists(entityId: string): Promise<boolean> {
    const result = await handleAsync(
      async () => {
        const result = await (this as any).getById(entityId);
        if (!result.success) {
          if (result.error === 'Document not found') {
            return false;
          }
          throw new Error(result.error);
        }
        return true;
      },
      { context: `Check existence of ${this.entityName}` }
    );
    return extractData(result);
  }
}

// Apply mixins to BaseRepository
const BaseRepository = RealtimeMixin(CrudMixin(BaseRepositoryClass));

export default BaseRepository;
