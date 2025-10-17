// src/services/firebase/mixins/CrudMixin.js
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
} from 'firebase/database';
import firebaseCore from '../core/FirebaseCore';
import { sanitizeForFirebase, sanitizeWithSchema } from '@/utils/index';

/**
 * Functional mixin providing standard CRUD operations for Firebase entities.
 * Applies methods to the provided Base class.
 * @param {typeof BaseRepository} Base - The base class to extend with CRUD methods.
 * @returns {typeof BaseRepository} Extended class with CRUD functionality.
 */
export function CrudMixin(Base) {
  return class extends Base {
    /**
     * Low-level get method to fetch raw data by ID.
     * @param {string} entityId - ID of the entity to fetch.
     * @returns {Promise<Object|null>} Raw snapshot value or null if not found.
     */
    async get(entityId) {
      // Added: Low-level get method for raw data fetch, used in custom repos or overrides
      try {
        const entityRef = ref(firebaseCore.database, `${this.collectionName}/${entityId}`);
        const snapshot = await get(entityRef);
        const val = snapshot.exists() ? snapshot.val() : null;
        console.log('CrudMixin get snap.val() for', entityId, ':', val); // Add log to diagnose empty data
        return val;
      } catch (error) {
        const wrappedError = firebaseCore.createError('get', this.entityName, error);
        console.error(wrappedError);
        throw wrappedError; // Rethrow for upstream handling
      }
    }

    /**
     * Low-level set method to write data by ID.
     * @param {string} entityId - ID to set data at.
     * @param {Object} data - Data to set.
     * @returns {Promise<void>}
     */
    async set(entityId, data) {
      // Added: Low-level set method for atomic writes, used in create/update overrides
      try {
        const entityRef = ref(firebaseCore.database, `${this.collectionName}/${entityId}`);
        await set(entityRef, data);
      } catch (error) {
        const wrappedError = firebaseCore.createError('set', this.entityName, error);
        console.error(wrappedError);
        throw wrappedError; // Rethrow for upstream handling
      }
    }

    /**
     * Generic create method with sanitization and metadata.
     * @param {Object} data - Data to create.
     * @param {Object|null} schema - Optional schema for sanitization.
     * @returns {Promise<Object>} Created entity with ID.
     */
    async create(data, schema = null) {
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
        const wrappedError = firebaseCore.createError('create', this.entityName, error);
        console.error(wrappedError);
        throw wrappedError; // Rethrow for upstream handling
      }
    }

    /**
     * Generic get by ID method.
     * @param {string} entityId - ID of the entity to fetch.
     * @returns {Promise<Object|null>} Entity data with ID or null if not found.
     */
    async getById(entityId) {
      try {
        const data = await this.get(entityId); // Changed: Use low-level this.get for raw data
        return data ? { id: entityId, ...data } : null;
      } catch (error) {
        const wrappedError = firebaseCore.createError('getById', this.entityName, error);
        console.error(wrappedError);
        throw wrappedError; // Rethrow for upstream handling
      }
    }

    /**
     * Generic get all method.
     * @returns {Promise<Array<Object>>} Array of all entities with IDs.
     */
    async getAll() {
      try {
        const entitiesRef = ref(firebaseCore.database, this.collectionName);
        const snapshot = await get(entitiesRef);

        if (!snapshot.exists()) return [];

        return Object.entries(snapshot.val()).map(([id, data]) => ({
          id,
          ...data,
        }));
      } catch (error) {
        const wrappedError = firebaseCore.createError('getAll', this.entityName, error);
        console.error(wrappedError);
        throw wrappedError; // Rethrow for upstream handling
      }
    }

    /**
     * Generic update method with sanitization and metadata.
     * @param {string} entityId - ID of the entity to update.
     * @param {Object} updates - Updates to apply.
     * @param {Object|null} schema - Optional schema for sanitization.
     * @returns {Promise<Object>} Updated entity with ID.
     */
    async update(entityId, updates, schema = null) {
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
        const wrappedError = firebaseCore.createError('update', this.entityName, error);
        console.error(wrappedError);
        throw wrappedError; // Rethrow for upstream handling
      }
    }

    /**
     * Generic delete method.
     * @param {string} entityId - ID of the entity to delete.
     * @returns {Promise<Object>} Success response with ID.
     */
    async delete(entityId) {
      try {
        const entityRef = ref(firebaseCore.database, `${this.collectionName}/${entityId}`);

        firebaseCore.logOperation('Deleting', this.entityName, entityId);

        await remove(entityRef);
        return { success: true, id: entityId };
      } catch (error) {
        const wrappedError = firebaseCore.createError('delete', this.entityName, error);
        console.error(wrappedError);
        throw wrappedError; // Rethrow for upstream handling
      }
    }

    /**
     * Generic query by field method.
     * @param {string} fieldName - Field to query by.
     * @param {any} value - Value to match.
     * @returns {Promise<Array<Object>>} Matching entities with IDs.
     */
    async getByField(fieldName, value) {
      try {
        const entitiesRef = ref(firebaseCore.database, this.collectionName);
        const fieldQuery = query(entitiesRef, orderByChild(fieldName), equalTo(value));

        const snapshot = await get(fieldQuery);

        if (!snapshot.exists()) return [];

        return Object.entries(snapshot.val()).map(([id, data]) => ({
          id,
          ...data,
        }));
      } catch (error) {
        const wrappedError = firebaseCore.createError('getByField', this.entityName, error);
        console.error(wrappedError);
        throw wrappedError; // Rethrow for upstream handling
      }
    }
  };
}
