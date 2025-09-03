// src/services/firebase/mixins/RealtimeMixin.js
import { ref, query, orderByChild, equalTo, onValue, off } from 'firebase/database'
import firebaseCore from '../core/FirebaseCore'

/**
 * Functional mixin providing real-time subscription capabilities for Firebase entities.
 * Applies methods to the provided Base class.
 * @param {typeof BaseRepository} Base - The base class to extend with real-time methods.
 * @returns {typeof BaseRepository} Extended class with real-time functionality.
 */
export function RealtimeMixin(Base) {
  return class extends Base {
    /**
     * Subscribe to all entities in the collection.
     * @param {Function} callback - Callback to receive entities.
     * @param {Function|null} sortFn - Optional sorting function.
     * @returns {Object} Query reference for unsubscribing.
     */
    subscribeToAll(callback, sortFn = null) {
      try {
        const entitiesRef = ref(firebaseCore.database, this.collectionName)

        onValue(entitiesRef, (snapshot) => {
          const entities = snapshot.exists()
            ? Object.entries(snapshot.val()).map(([id, data]) => ({ id, ...data }))
            : []

          // Apply sorting if provided
          if (sortFn && typeof sortFn === 'function') {
            entities.sort(sortFn)
          }

          callback(entities)
        })

        return entitiesRef
      } catch (error) {
        const wrappedError = firebaseCore.createError('subscribeToAll', this.entityName, error)
        console.error(wrappedError)
        throw wrappedError // Rethrow for upstream handling
      }
    }

    /**
     * Subscribe to a single entity by ID.
     * @param {string} entityId - ID to subscribe to.
     * @param {Function} callback - Callback to receive data.
     * @returns {Object} Query reference for unsubscribing.
     */
    subscribeToOne(entityId, callback) {
      try {
        const entityRef = ref(firebaseCore.database, `${this.collectionName}/${entityId}`)

        onValue(entityRef, (snapshot) => {
          const data = snapshot.exists() ? { id: entityId, ...snapshot.val() } : null
          callback(data)
        })

        return entityRef
      } catch (error) {
        const wrappedError = firebaseCore.createError('subscribeToOne', this.entityName, error)
        console.error(wrappedError)
        throw wrappedError // Rethrow for upstream handling
      }
    }

    /**
     * Subscribe to entities filtered by a field value.
     * @param {string} fieldName - Field to filter by.
     * @param {any} value - Value to match.
     * @param {Function} callback - Callback to receive entities.
     * @param {Function|null} sortFn - Optional sorting function.
     * @returns {Object} Query reference for unsubscribing.
     */
    subscribeToByField(fieldName, value, callback, sortFn = null) {
      try {
        const entitiesRef = ref(firebaseCore.database, this.collectionName)
        const fieldQuery = query(entitiesRef, orderByChild(fieldName), equalTo(value))

        onValue(fieldQuery, (snapshot) => {
          const entities = snapshot.exists()
            ? Object.entries(snapshot.val()).map(([id, data]) => ({ id, ...data }))
            : []

          // Apply sorting if provided
          if (sortFn && typeof sortFn === 'function') {
            entities.sort(sortFn)
          }

          callback(entities)
        })

        return fieldQuery
      } catch (error) {
        const wrappedError = firebaseCore.createError('subscribeToByField', this.entityName, error)
        console.error(wrappedError)
        throw wrappedError // Rethrow for upstream handling
      }
    }

    /**
     * Unsubscribe from a query reference.
     * @param {Object} queryRef - Reference to unsubscribe from.
     * @returns {boolean} True if unsubscribed successfully.
     */
    unsubscribe(queryRef) {
      try {
        if (queryRef) {
          off(queryRef)
          return true
        }
        return false
      } catch (error) {
        const wrappedError = firebaseCore.createError('unsubscribe', this.entityName, error)
        console.error(wrappedError)
        throw wrappedError // Rethrow for upstream handling
      }
    }

    /**
     * Subscribe with custom query builder.
     * @param {Function} queryBuilder - Function to build the query.
     * @param {Function} callback - Callback to receive entities.
     * @returns {Object} Query reference for unsubscribing.
     */
    subscribeWithCustomQuery(queryBuilder, callback) {
      try {
        const entitiesRef = ref(firebaseCore.database, this.collectionName)
        const customQuery = queryBuilder(entitiesRef)

        onValue(customQuery, (snapshot) => {
          const entities = snapshot.exists()
            ? Object.entries(snapshot.val()).map(([id, data]) => ({ id, ...data }))
            : []
          callback(entities)
        })

        return customQuery
      } catch (error) {
        const wrappedError = firebaseCore.createError(
          'subscribeWithCustomQuery',
          this.entityName,
          error,
        )
        console.error(wrappedError)
        throw wrappedError // Rethrow for upstream handling
      }
    }
  }
}
