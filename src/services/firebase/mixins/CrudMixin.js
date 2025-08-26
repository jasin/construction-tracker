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
} from 'firebase/database'
import firebaseCore from '../core/FirebaseCore'
import { sanitizeForFirebase, sanitizeWithSchema } from '@/utils/index'

/**
 * Mixin providing standard CRUD operations for any Firebase entity
 */
export const CrudMixin = {
  /**
   * Generic create method with sanitization and metadata
   */
  async create(data, schema = null) {
    try {
      const entityRef = ref(firebaseCore.database, this.collectionName)
      const newEntityRef = push(entityRef)

      // Add creation metadata
      const dataWithMeta = firebaseCore.addCreateMetadata(data)

      // Sanitize data based on schema or generic sanitization
      const cleanData = schema
        ? sanitizeWithSchema(dataWithMeta, schema)
        : sanitizeForFirebase(dataWithMeta)

      firebaseCore.logOperation('Creating', this.entityName, null, cleanData)

      await set(newEntityRef, cleanData)
      return { id: newEntityRef.key, ...cleanData }
    } catch (error) {
      const wrappedError = firebaseCore.createError('create', this.entityName, error)
      console.error(wrappedError)
      throw wrappedError
    }
  },

  /**
   * Generic get by ID method
   */
  async getById(entityId) {
    try {
      const entityRef = ref(firebaseCore.database, `${this.collectionName}/${entityId}`)
      const snapshot = await get(entityRef)

      if (snapshot.exists()) {
        return { id: entityId, ...snapshot.val() }
      }
      return null
    } catch (error) {
      const wrappedError = firebaseCore.createError('getById', this.entityName, error)
      console.error(wrappedError)
      throw wrappedError
    }
  },

  /**
   * Generic get all method
   */
  async getAll() {
    try {
      const entitiesRef = ref(firebaseCore.database, this.collectionName)
      const snapshot = await get(entitiesRef)

      if (!snapshot.exists()) return []

      return Object.entries(snapshot.val()).map(([id, data]) => ({
        id,
        ...data,
      }))
    } catch (error) {
      const wrappedError = firebaseCore.createError('getAll', this.entityName, error)
      console.error(wrappedError)
      throw wrappedError
    }
  },

  /**
   * Generic update method with sanitization and metadata
   */
  async update(entityId, updates, schema = null) {
    try {
      const entityRef = ref(firebaseCore.database, `${this.collectionName}/${entityId}`)

      // Add update metadata
      const updatesWithMeta = firebaseCore.addUpdateMetadata(updates)

      // Sanitize updates
      const cleanUpdates = schema
        ? sanitizeWithSchema(updatesWithMeta, schema)
        : sanitizeForFirebase(updatesWithMeta)

      firebaseCore.logOperation('Updating', this.entityName, entityId, cleanUpdates)

      await update(entityRef, cleanUpdates)
      return { id: entityId, ...cleanUpdates }
    } catch (error) {
      const wrappedError = firebaseCore.createError('update', this.entityName, error)
      console.error(wrappedError)
      throw wrappedError
    }
  },

  /**
   * Generic delete method
   */
  async delete(entityId) {
    try {
      const entityRef = ref(firebaseCore.database, `${this.collectionName}/${entityId}`)

      firebaseCore.logOperation('Deleting', this.entityName, entityId)

      await remove(entityRef)
      return { success: true, id: entityId }
    } catch (error) {
      const wrappedError = firebaseCore.createError('delete', this.entityName, error)
      console.error(wrappedError)
      throw wrappedError
    }
  },

  /**
   * Generic query by field method
   */
  async getByField(fieldName, value) {
    try {
      const entitiesRef = ref(firebaseCore.database, this.collectionName)
      const fieldQuery = query(entitiesRef, orderByChild(fieldName), equalTo(value))
      const snapshot = await get(fieldQuery)

      if (!snapshot.exists()) return []

      return Object.entries(snapshot.val()).map(([id, data]) => ({
        id,
        ...data,
      }))
    } catch (error) {
      const wrappedError = firebaseCore.createError('getByField', this.entityName, error)
      console.error(wrappedError)
      throw wrappedError
    }
  },
}
