// src/services/firebase/mixins/RealtimeMixin.js
import { ref, onValue, off } from 'firebase/database' // ES module imports for RTDB
import { handleError } from '@/utils/errorHandler' // Centralized error handling

/**
 * Mixin providing realtime subscription capabilities for Firebase repositories (RTDB).
 * Allows subscribing to path changes with automatic error handling via callbacks.
 * @mixin
 */
export function RealtimeMixin(base) {
  return class extends base {
    /**
     * Internal map of active subscriptions.
     * Key: subscription name, Value: { ref: firebase.database.Reference, listener: Function }.
     */
    subscriptions = {}

    /**
     * Subscribe to realtime updates for a path (RTDB).
     * @param {string} key - Unique key for the subscription (e.g., 'ProjectDocuments').
     * @param {firebase.database.Reference} pathRef - RTDB reference to subscribe to.
     * @param {Function} callback - Callback to handle data updates (object or array with id).
     * @param {Function} [errorCallback] - Optional callback for errors.
     * @returns {Function} Unsubscribe function.
     */
    subscribe(key, pathRef, callback, errorCallback = () => {}) {
      if (!key) {
        handleError(new Error('Subscribe called with falsy key'), 'RealtimeMixin.subscribe')
        return () => {} // Return noop unsubscribe
      }
      if (!pathRef) {
        handleError(
          new Error('Subscribe called with falsy ref'),
          `RealtimeMixin.subscribe for key: ${key}`,
        )
        return () => {} // Return noop unsubscribe
      }

      if (this.subscriptions[key]) {
        this.unsubscribe(key) // Clean existing subscription if any
      }

      const listener = (snapshot) => {
        const data = snapshot.val()
        if (data) {
          // Map object to array with id if collection-like
          const entities = Object.entries(data).map(([id, entityData]) => ({ id, ...entityData }))
          callback(entities)
        } else {
          callback([])
        }
      }

      onValue(pathRef, listener, (err) => {
        handleError(err, `Realtime subscription error for ${key}`)
        errorCallback(err)
      })

      this.subscriptions[key] = { ref: pathRef, listener }

      // Return unsubscribe function
      return () => this.unsubscribe(key)
    }

    /**
     * Subscribe to all entities in the collection (RTDB-specific).
     * @param {Function} callback - Callback to receive entities (array of objects with id).
     * @param {Function|null} sortFn - Optional sorting function for the entities array.
     * @param {Function} [errorCallback] - Optional callback for errors.
     * @returns {Function} Unsubscribe function.
     */
    subscribeToAll(callback, sortFn = null, errorCallback = () => {}) {
      const entitiesRef = ref(this.db, this.collectionName) // Use this.db set in constructor

      if (!entitiesRef) {
        handleError(
          new Error('Invalid entitiesRef in subscribeToAll'),
          'RealtimeMixin.subscribeToAll',
        )
        return () => {} // Return noop unsubscribe
      }

      return this.subscribe(
        'allEntities',
        entitiesRef,
        (data) => {
          const sorted = sortFn && typeof sortFn === 'function' ? data.sort(sortFn) : data
          callback(sorted)
        },
        errorCallback,
      )
    }

    /**
     * Unsubscribe from a realtime listener.
     * @param {string} key - The key of the subscription to unsubscribe.
     * @returns {void}
     */
    unsubscribe(key) {
      if (!key) {
        handleError(new Error('Unsubscribe called with falsy key'), 'RealtimeMixin.unsubscribe')
        return
      }

      const sub = this.subscriptions[key]
      if (!sub || typeof sub.listener !== 'function') {
        handleError(
          new Error('No valid unsubscribe function'),
          `RealtimeMixin.unsubscribe for key: ${key}`,
        )
        return
      }

      off(sub.ref, 'value', sub.listener)
      delete this.subscriptions[key]
    }

    /**
     * Unsubscribe from all active subscriptions.
     * @returns {void}
     */
    unsubscribeAll() {
      const keys = Object.keys(this.subscriptions)
      keys.forEach((key) => this.unsubscribe(key))
    }
  }
}
