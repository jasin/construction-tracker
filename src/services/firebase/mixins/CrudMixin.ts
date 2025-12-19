// src/services/firebase/mixins/CrudMixin.ts
import {
  ref,
  push,
  set,
  get,
  update,
  remove,
  query,
  orderByChild,
  equalTo,
  type Database,
} from 'firebase/database';
import firebaseCore from '../core/FirebaseCore';
import { sanitizeForFirebase, sanitizeWithSchema } from '@/utils/index';

/**
 * Type for the base class constructor
 */
type Constructor<T = object> = new (...args: unknown[]) => T;

/**
 * Base repository interface that mixins can extend
 */
export interface BaseRepositoryInterface {
  collectionName: string;
  entityName: string;
  db: Database;
}

/**
 * Functional mixin providing standard CRUD operations for Firebase entities.
 * Applies methods to the provided Base class.
 */
export function CrudMixin<T extends Constructor<BaseRepositoryInterface>>(Base: T) {
  return class extends Base {
    /**
     * Low-level get method to fetch raw data by ID.
     */
    async get(entityId: string): Promise<Record<string, unknown> | null> {
      try {
        const entityRef = ref(firebaseCore.database, `${this.collectionName}/${entityId}`);
        const snapshot = await get(entityRef);
        const val = snapshot.exists() ? snapshot.val() : null;
        console.log('CrudMixin get snap.val() for', entityId, ':', val);
        return val;
      } catch (error) {
        const wrappedError = firebaseCore.createError('get', this.entityName, error as Error);
        console.error(wrappedError);
        throw wrappedError;
      }
    }

    /**
     * Low-level set method to write data by ID.
     */
    async set(entityId: string, data: Record<string, unknown>): Promise<void> {
      try {
        const entityRef = ref(firebaseCore.database, `${this.collectionName}/${entityId}`);
        await set(entityRef, data);
      } catch (error) {
        const wrappedError = firebaseCore.createError('set', this.entityName, error as Error);
        console.error(wrappedError);
        throw wrappedError;
      }
    }

    /**
     * Generic create method with sanitization and metadata.
     */
    async create(
      data: Record<string, unknown>,
      schema: Record<string, string> | null = null
    ): Promise<Record<string, unknown>> {
      try {
        const entityRef = ref(firebaseCore.database, this.collectionName);
        const newEntityRef = push(entityRef);

        // Add creation metadata
        const dataWithMeta = firebaseCore.addCreateMetadata(data);

        // Sanitize data based on schema or generic sanitization
        const cleanData = schema
          ? sanitizeWithSchema(dataWithMeta, schema)
          : sanitizeForFirebase(dataWithMeta);

        firebaseCore.logOperation('Creating', this.entityName, null, cleanData);

        await set(newEntityRef, cleanData);
        return { id: newEntityRef.key, ...cleanData };
      } catch (error) {
        const wrappedError = firebaseCore.createError('create', this.entityName, error as Error);
        console.error(wrappedError);
        throw wrappedError;
      }
    }

    /**
     * Generic get by ID method.
     */
    async getById(entityId: string): Promise<Record<string, unknown> | null> {
      try {
        const data = await this.get(entityId);
        return data ? { id: entityId, ...data } : null;
      } catch (error) {
        const wrappedError = firebaseCore.createError('getById', this.entityName, error as Error);
        console.error(wrappedError);
        throw wrappedError;
      }
    }

    /**
     * Generic get all method.
     */
    async getAll(): Promise<Record<string, unknown>[]> {
      try {
        const entitiesRef = ref(firebaseCore.database, this.collectionName);
        const snapshot = await get(entitiesRef);

        if (!snapshot.exists()) return [];

        return Object.entries(snapshot.val()).map(([id, data]) => ({
          id,
          ...(data as Record<string, unknown>),
        }));
      } catch (error) {
        const wrappedError = firebaseCore.createError('getAll', this.entityName, error as Error);
        console.error(wrappedError);
        throw wrappedError;
      }
    }

    /**
     * Generic update method with sanitization and metadata.
     */
    async update(
      entityId: string,
      updates: Record<string, unknown>,
      schema: Record<string, unknown> | null = null
    ): Promise<Record<string, unknown>> {
      try {
        const entityRef = ref(firebaseCore.database, `${this.collectionName}/${entityId}`);

        // Add update metadata
        const updatesWithMeta = firebaseCore.addUpdateMetadata(updates);

        // Sanitize updates
        const cleanUpdates = schema
          ? sanitizeWithSchema(updatesWithMeta, schema)
          : sanitizeForFirebase(updatesWithMeta);

        firebaseCore.logOperation('Updating', this.entityName, entityId, cleanUpdates);

        await update(entityRef, cleanUpdates);
        return { id: entityId, ...cleanUpdates };
      } catch (error) {
        const wrappedError = firebaseCore.createError('update', this.entityName, error as Error);
        console.error(wrappedError);
        throw wrappedError;
      }
    }

    /**
     * Generic delete method.
     */
    async delete(entityId: string): Promise<{ success: boolean; id: string }> {
      try {
        const entityRef = ref(firebaseCore.database, `${this.collectionName}/${entityId}`);

        firebaseCore.logOperation('Deleting', this.entityName, entityId);

        await remove(entityRef);
        return { success: true, id: entityId };
      } catch (error) {
        const wrappedError = firebaseCore.createError('delete', this.entityName, error as Error);
        console.error(wrappedError);
        throw wrappedError;
      }
    }

    /**
     * Generic query by field method.
     */
    async getByField(fieldName: string, value: unknown): Promise<Record<string, unknown>[]> {
      try {
        const entitiesRef = ref(firebaseCore.database, this.collectionName);
        const fieldQuery = query(entitiesRef, orderByChild(fieldName), equalTo(value));

        const snapshot = await get(fieldQuery);

        if (!snapshot.exists()) return [];

        return Object.entries(snapshot.val()).map(([id, data]) => ({
          id,
          ...(data as Record<string, unknown>),
        }));
      } catch (error) {
        const wrappedError = firebaseCore.createError(
          'getByField',
          this.entityName,
          error as Error
        );
        console.error(wrappedError);
        throw wrappedError;
      }
    }
  };
}
