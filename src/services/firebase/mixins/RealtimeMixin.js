// src/services/firebase/mixins/RealtimeMixin.js
import { ref, onValue, query, orderByChild, equalTo } from 'firebase/database';
import { handleError } from '@/utils/errorHandler';

/**
 * Mixin providing realtime subscription capabilities for Firebase repositories (RTDB).
 * Returns unsubscribe functions directly - caller is responsible for cleanup.
 * @mixin
 */
export function RealtimeMixin(base) {
  return class extends base {
    /**
     * Subscribe to realtime updates for all entities in the collection.
     * @param {Function} callback - Callback to receive entities (array of objects with id).
     * @param {Function|null} sortFn - Optional sorting function for the entities array.
     * @param {Function} [errorCallback] - Optional callback for errors.
     * @returns {Function} Unsubscribe function - caller MUST call this to cleanup.
     */
    subscribeToAll(callback, sortFn = null, errorCallback = () => {}) {
      const entitiesRef = ref(this.db, this.collectionName);

      if (!entitiesRef) {
        handleError(
          new Error('Invalid entitiesRef in subscribeToAll'),
          'RealtimeMixin.subscribeToAll'
        );
        return () => {}; // Return noop unsubscribe
      }

      const listener = (snapshot) => {
        try {
          const data = snapshot.val();
          console.log(
            `[RealtimeMixin] Data received for ${this.collectionName}:`,
            data ? Object.keys(data).length : 0
          );
          if (data) {
            const entities = Object.entries(data).map(([id, entityData]) => ({
              id,
              ...entityData,
            }));
            const sorted =
              sortFn && typeof sortFn === 'function' ? entities.sort(sortFn) : entities;
            callback(sorted);
          } else {
            callback([]);
          }
        } catch (error) {
          console.error(`[RealtimeMixin] Error in listener for ${this.collectionName}:`, error);
          handleError(error, `Realtime subscription listener error for ${this.collectionName}`);
          errorCallback(error);
        }
      };

      const errorListener = (error) => {
        console.error(`[RealtimeMixin] Firebase error for ${this.collectionName}:`, error);
        handleError(error, `Realtime subscription error for ${this.collectionName}`);
        errorCallback(error);
      };

      // Firebase's onValue returns an unsubscribe function
      const unsubscribe = onValue(entitiesRef, listener, errorListener);

      // Return the unsubscribe function directly - caller manages lifecycle
      return unsubscribe;
    }

    /**
     * Subscribe to a single entity by ID.
     * @param {string} entityId - The ID of the entity to subscribe to.
     * @param {Function} callback - Callback to receive entity data (object with id or null).
     * @param {Function} [errorCallback] - Optional callback for errors.
     * @returns {Function} Unsubscribe function - caller MUST call this to cleanup.
     */
    subscribeToOne(entityId, callback, errorCallback = () => {}) {
      if (!entityId) {
        handleError(
          new Error('subscribeToOne called with falsy entityId'),
          'RealtimeMixin.subscribeToOne'
        );
        return () => {};
      }

      const entityRef = ref(this.db, `${this.collectionName}/${entityId}`);

      const listener = (snapshot) => {
        try {
          const data = snapshot.val();
          if (data) {
            callback({ id: entityId, ...data });
          } else {
            callback(null);
          }
        } catch (error) {
          console.error(`[RealtimeMixin] Error in listener for ${entityId}:`, error);
          handleError(error, `Realtime subscription error for ${entityId}`);
          errorCallback(error);
        }
      };

      const errorListener = (error) => {
        console.error(`[RealtimeMixin] Firebase error for ${entityId}:`, error);
        handleError(error, `Realtime subscription error for ${entityId}`);
        errorCallback(error);
      };

      const unsubscribe = onValue(entityRef, listener, errorListener);
      return unsubscribe;
    }

    /**
     * Subscribe to entities by field value.
     * @param {string} fieldName - Field to query by.
     * @param {any} value - Value to match.
     * @param {Function} callback - Callback to receive entities (array of objects with id).
     * @param {Function|null} sortFn - Optional sorting function for the entities array.
     * @param {Function} [errorCallback] - Optional callback for errors.
     * @returns {Function} Unsubscribe function - caller MUST call this to cleanup.
     */
    subscribeToByField(fieldName, value, callback, sortFn = null, errorCallback = () => {}) {
      if (!fieldName || value === undefined) {
        handleError(
          new Error('subscribeToByField called with invalid parameters'),
          'RealtimeMixin.subscribeToByField'
        );
        return () => {};
      }

      const entitiesRef = ref(this.db, this.collectionName);
      const fieldQuery = query(entitiesRef, orderByChild(fieldName), equalTo(value));

      const listener = (snapshot) => {
        try {
          const data = snapshot.val();
          console.log(
            `[RealtimeMixin] Data received for ${this.collectionName} where ${fieldName}=${value}:`,
            data ? Object.keys(data).length : 0
          );
          if (data) {
            const entities = Object.entries(data).map(([id, entityData]) => ({
              id,
              ...entityData,
            }));
            const sorted =
              sortFn && typeof sortFn === 'function' ? entities.sort(sortFn) : entities;
            callback(sorted);
          } else {
            callback([]);
          }
        } catch (error) {
          console.error(`[RealtimeMixin] Error in listener:`, error);
          handleError(error, `Realtime subscription listener error`);
          errorCallback(error);
        }
      };

      const errorListener = (error) => {
        console.error(`[RealtimeMixin] Firebase error:`, error);
        handleError(error, `Realtime subscription error`);
        errorCallback(error);
      };

      const unsubscribe = onValue(fieldQuery, listener, errorListener);
      return unsubscribe;
    }
  };
}
