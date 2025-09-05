// src/services/firebase/core/BaseRepository.js
import { CrudMixin } from '../mixins/CrudMixin'
import { RealtimeMixin } from '../mixins/RealtimeMixin'
import { validateAndCleanForm } from '@/utils/index'
import { handleAsync, extractData } from '@/utils/errorHandler'
import firebaseCore from './FirebaseCore'

/**
 * Base repository class that all entity repositories extend
 * Provides common functionality through mixins
 */
export default class BaseRepository {
  constructor(collectionName, entityName = null, schema = null) {
    this.collectionName = collectionName
    this.entityName = entityName || this.deriveEntityName(collectionName)
    this.schema = schema
    this.db = firebaseCore.database

    // Apply mixins
    Object.assign(this, CrudMixin)
    Object.assign(this, RealtimeMixin)
  }

  /**
   * Derive entityName from collectionName (e.g., 'projects' → 'Project')
   */
  deriveEntityName(collectionName) {
    const singular = collectionName.slice(0, -1)
    return singular.replace(/^\w/, (c) => c.toUpperCase())
  }

  /**
   * Validate data against required fields
   */
  validateData(data, requiredFields = []) {
    const validation = validateAndCleanForm(data, requiredFields)

    // If we have a schema, we could add additional validation here
    if (this.schema) {
      // Custom schema validation could be added here
      // For now, we'll rely on the sanitizeWithSchema function
    }

    return validation
  }

  /**
   * Create with validation
   */
  async createWithValidation(data, requiredFields = []) {
    const validation = this.validateData(data, requiredFields)

    if (!validation.isValid) {
      return {
        success: false,
        data: null,
        error: `Validation failed: ${Object.values(validation.errors).join(', ')}`,
      }
    }

    return await this.create(validation.cleanData, this.schema)
  }

  /**
   * Update with validation
   */
  async updateWithValidation(entityId, updates, requiredFields = []) {
    // For updates, we don't require all fields, just validate what's provided
    const validation = this.validateData(updates, requiredFields)

    if (!validation.isValid) {
      return {
        success: false,
        data: null,
        error: `Validation failed: ${Object.values(validation.errors).join(', ')}`,
      }
    }

    return await this.update(entityId, validation.cleanData, this.schema)
  }

  /**
   * Bulk operations
   */
  async bulkUpdate(entityIds, updates) {
    const result = handleAsync(
      async () => {
        const promises = entityIds.map(async (id) => {
          const result = await this.update(id, updates, this.schema)
          if (!result.success) {
            throw new Error(result.error) // Propagate error to fail the bulk operation
          }
          return result.data
        })
        return await Promise.all(promises)
      },
      { context: `Bulk update ${this.entityName}` },
    )
    return extractData(result)
  }

  async bulkDelete(entityIds) {
    const result = handleAsync(
      async () => {
        const promises = entityIds.map(async (id) => {
          const result = await this.delete(id)
          if (!result.success) {
            throw new Error(result.error) // Propagate error to fail the bulk operation
          }
          return result.data
        })
        return await Promise.all(promises)
      },
      { context: `Bulk delete ${this.entityName}` },
    )
    return extractData(result)
  }

  /**
   * Get entity count
   */
  async getCount() {
    const result = handleAsync(
      async () => {
        const result = await this.getAll()
        if (!result.success) {
          throw new Error(result.error)
        }
        return result.data.length
      },
      { context: `Get count of ${this.entityName}` },
    )
    return extractData(result)
  }

  /**
   * Check if entity exists
   */
  async exists(entityId) {
    const result = handleAsync(
      async () => {
        const result = await this.getById(entityId)
        if (!result.success) {
          if (result.error === 'Document not found') {
            return false
          }
          throw new Error(result.error)
        }
        return true
      },
      { context: `Check existence of ${this.entityName}` },
    )
    return extractData(result)
  }
}
