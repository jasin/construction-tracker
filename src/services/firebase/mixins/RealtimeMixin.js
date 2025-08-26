// src/services/firebase/mixins/RealtimeMixin.js
import { ref, query, orderByChild, equalTo, onValue, off } from 'firebase/database'
import firebaseCore from '../core/FirebaseCore'

/**
 * Mixin providing real-time subscription capabilities for any Firebase entity
 */
export const RealtimeMixin = {
  /**
   * Subscribe to all entities in the collection
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
      throw wrappedError
    }
  },

  /**
   * Subscribe to a single entity by ID
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
      throw wrappedError
    }
  },

  /**
   * Subscribe to entities filtered by a field value
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
      throw wrappedError
    }
  },

  /**
   * Unsubscribe from a query reference
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
      throw wrappedError
    }
  },

  /**
   * Subscribe with custom query builder
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
      throw wrappedError
    }
  },
}
