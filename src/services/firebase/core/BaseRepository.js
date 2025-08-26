// src/services/firebase/core/BaseRepository.js
import { CrudMixin } from '../mixins/CrudMixin'
import { RealtimeMixin } from '../mixins/RealtimeMixin'
import { validateAndCleanForm } from '@/utils/index'

/**
 * Base repository class that all entity repositories extend
 * Provides common functionality through mixins
 */
class BaseRepository {
  constructor(collectionName, entityName, schema = null) {
    this.collectionName = collectionName
    this.entityName = entityName
    this.schema = schema

    // Apply mixins
    Object.assign(this, CrudMixin)
    Object.assign(this, RealtimeMixin)
  }

  /**
   * Validate data against required fields and optional schema
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
      throw new Error(`Validation failed: ${Object.values(validation.errors).join(', ')}`)
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
      throw new Error(`Validation failed: ${Object.values(validation.errors).join(', ')}`)
    }

    return await this.update(entityId, validation.cleanData, this.schema)
  }

  /**
   * Bulk operations
   */
  async bulkUpdate(entityIds, updates) {
    try {
      const promises = entityIds.map((id) => this.update(id, updates, this.schema))
      return await Promise.all(promises)
    } catch (error) {
      console.error(`Error in bulk update ${this.entityName}:`, error)
      throw error
    }
  }

  async bulkDelete(entityIds) {
    try {
      const promises = entityIds.map((id) => this.delete(id))
      return await Promise.all(promises)
    } catch (error) {
      console.error(`Error in bulk delete ${this.entityName}:`, error)
      throw error
    }
  }

  /**
   * Get entity count
   */
  async getCount() {
    try {
      const entities = await this.getAll()
      return entities.length
    } catch (error) {
      console.error(`Error getting ${this.entityName} count:`, error)
      throw error
    }
  }

  /**
   * Check if entity exists
   */
  async exists(entityId) {
    try {
      const entity = await this.getById(entityId)
      return entity !== null
    } catch (error) {
      console.error(`Error checking if ${this.entityName} exists:`, error)
      throw error
    }
  }
}

export default BaseRepository
