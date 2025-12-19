// Type definitions for Repository pattern with Mixins
import type { Database } from 'firebase/database';

/**
 * Base repository interface
 */
export interface BaseRepositoryInterface {
  collectionName: string;
  entityName: string;
  db: Database;
  schema: Record<string, unknown> | null;
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  cleanData?: Record<string, unknown>;
  errors: Record<string, string>;
}

/**
 * CRUD Mixin methods interface
 * These methods are added by CrudMixin
 */
export interface CrudMethods<T = Record<string, unknown>> {
  get(entityId: string): Promise<T | null>;
  set(entityId: string, data: T): Promise<void>;
  create(data: Partial<T>, schema?: Record<string, string> | null): Promise<T & { id: string }>;
  getById(entityId: string): Promise<(T & { id: string }) | null>;
  getAll(): Promise<Array<T & { id: string }>>;
  update(entityId: string, updates: Partial<T>, schema?: Record<string, unknown> | null): Promise<T & { id: string }>;
  delete(entityId: string): Promise<{ success: boolean; id: string }>;
  getByField(fieldName: string, value: unknown): Promise<Array<T & { id: string }>>;
}

/**
 * Realtime Mixin methods interface
 * These methods are added by RealtimeMixin
 */
export interface RealtimeMethods<T = Record<string, unknown>> {
  subscribeToAll(
    callback: (data: Array<T & { id: string }>) => void,
    sortFn?: ((a: T, b: T) => number) | null,
    errorCallback?: (error: Error) => void
  ): () => void;

  subscribeToOne(
    entityId: string,
    callback: (data: (T & { id: string }) | null) => void,
    errorCallback?: (error: Error) => void
  ): () => void;

  subscribeToByField(
    fieldName: string,
    value: unknown,
    callback: (data: Array<T & { id: string }>) => void,
    sortFn?: ((a: T, b: T) => number) | null,
    errorCallback?: (error: Error) => void
  ): () => void;
}

/**
 * Base Repository methods interface
 * These methods are in BaseRepositoryClass
 */
export interface BaseRepositoryMethods<T = Record<string, unknown>> {
  validateData(data: Partial<T>, requiredFields?: string[]): ValidationResult;
  createWithValidation(data: Partial<T>, requiredFields?: string[]): Promise<T>;
  updateWithValidation(entityId: string, updates: Partial<T>, requiredFields?: string[]): Promise<T>;
  bulkUpdate(entityIds: string[], updates: Partial<T>): Promise<unknown>;
  bulkDelete(entityIds: string[]): Promise<unknown>;
  getCount(): Promise<number>;
  exists(entityId: string): Promise<boolean>;
}

/**
 * Complete Repository interface combining all mixins
 * Use this type for repositories that extend the full mixin chain
 */
export interface RepositoryInterface<T = Record<string, unknown>>
  extends BaseRepositoryInterface,
          CrudMethods<T>,
          RealtimeMethods<T>,
          BaseRepositoryMethods<T> {}

/**
 * Constructor type for the mixed base class
 */
export type RepositoryConstructor<T = Record<string, unknown>> = new (
  collectionName: string,
  entityName?: string | null,
  schema?: Record<string, unknown> | null
) => RepositoryInterface<T>;
