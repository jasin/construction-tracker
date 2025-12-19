// src/services/firebase/mixins/RealtimeMixin.ts
import {
  ref,
  onValue,
  query,
  orderByChild,
  equalTo,
  type Database,
  type DataSnapshot,
} from 'firebase/database';
import { handleError } from '@/utils/errorHandler';

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
 * Callback function for realtime data updates
 */
type DataCallback<T = any> = (data: T) => void;

/**
 * Error callback function
 */
type ErrorCallback = (error: Error) => void;

/**
 * Sort function for entity arrays
 */
type SortFunction<T = any> = (a: T, b: T) => number;

/**
 * Mixin providing realtime subscription capabilities for Firebase repositories (RTDB).
 * Returns unsubscribe functions directly - caller is responsible for cleanup.
 */
export function RealtimeMixin<T extends Constructor<BaseRepositoryInterface>>(Base: T) {
  return class extends Base {
    /**
     * Subscribe to realtime updates for all entities in the collection.
     */
    subscribeToAll(
      callback: DataCallback<any[]>,
      sortFn: SortFunction | null = null,
      errorCallback: ErrorCallback = () => {}
    ): () => void {
      const entitiesRef = ref(this.db, this.collectionName);

      if (!entitiesRef) {
        handleError(
          new Error('Invalid entitiesRef in subscribeToAll'),
          'RealtimeMixin.subscribeToAll'
        );
        return () => {}; // Return noop unsubscribe
      }

      const listener = (snapshot: DataSnapshot) => {
        try {
          const data = snapshot.val();
          console.log(
            `[RealtimeMixin] Data received for ${this.collectionName}:`,
            data ? Object.keys(data).length : 0
          );
          if (data) {
            const entities = Object.entries(data).map(([id, entityData]) => ({
              id,
              ...(entityData as Record<string, any>),
            }));
            const sorted =
              sortFn && typeof sortFn === 'function' ? entities.sort(sortFn) : entities;
            callback(sorted);
          } else {
            callback([]);
          }
        } catch (error) {
          console.error(`[RealtimeMixin] Error in listener for ${this.collectionName}:`, error);
          handleError(
            error as Error,
            `Realtime subscription listener error for ${this.collectionName}`
          );
          errorCallback(error as Error);
        }
      };

      const errorListener = (error: Error) => {
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
     */
    subscribeToOne(
      entityId: string,
      callback: DataCallback<any | null>,
      errorCallback: ErrorCallback = () => {}
    ): () => void {
      if (!entityId) {
        handleError(
          new Error('subscribeToOne called with falsy entityId'),
          'RealtimeMixin.subscribeToOne'
        );
        return () => {};
      }

      const entityRef = ref(this.db, `${this.collectionName}/${entityId}`);

      const listener = (snapshot: DataSnapshot) => {
        try {
          const data = snapshot.val();
          if (data) {
            callback({ id: entityId, ...data });
          } else {
            callback(null);
          }
        } catch (error) {
          console.error(`[RealtimeMixin] Error in listener for ${entityId}:`, error);
          handleError(error as Error, `Realtime subscription error for ${entityId}`);
          errorCallback(error as Error);
        }
      };

      const errorListener = (error: Error) => {
        console.error(`[RealtimeMixin] Firebase error for ${entityId}:`, error);
        handleError(error, `Realtime subscription error for ${entityId}`);
        errorCallback(error);
      };

      const unsubscribe = onValue(entityRef, listener, errorListener);
      return unsubscribe;
    }

    /**
     * Subscribe to entities by field value.
     */
    subscribeToByField(
      fieldName: string,
      value: unknown,
      callback: DataCallback<unknown[]>,
      sortFn: SortFunction | null = null,
      errorCallback: ErrorCallback = () => {}
    ): () => void {
      if (!fieldName || value === undefined) {
        handleError(
          new Error('subscribeToByField called with invalid parameters'),
          'RealtimeMixin.subscribeToByField'
        );
        return () => {};
      }

      const entitiesRef = ref(this.db, this.collectionName);
      const fieldQuery = query(entitiesRef, orderByChild(fieldName), equalTo(value as string));

      const listener = (snapshot: DataSnapshot) => {
        try {
          const data = snapshot.val();
          console.log(
            `[RealtimeMixin] Data received for ${this.collectionName} where ${fieldName}=${value}:`,
            data ? Object.keys(data).length : 0
          );
          if (data) {
            const entities = Object.entries(data).map(([id, entityData]) => ({
              id,
              ...(entityData as Record<string, any>),
            }));
            const sorted =
              sortFn && typeof sortFn === 'function' ? entities.sort(sortFn) : entities;
            callback(sorted);
          } else {
            callback([]);
          }
        } catch (error) {
          console.error(`[RealtimeMixin] Error in listener:`, error);
          handleError(error as Error, `Realtime subscription listener error`);
          errorCallback(error as Error);
        }
      };

      const errorListener = (error: Error) => {
        console.error(`[RealtimeMixin] Firebase error:`, error);
        handleError(error, `Realtime subscription error`);
        errorCallback(error);
      };

      const unsubscribe = onValue(fieldQuery, listener, errorListener);
      return unsubscribe;
    }
  };
}
