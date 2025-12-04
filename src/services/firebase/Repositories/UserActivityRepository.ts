// src/services/firebase/Repositories/UserActivityRepository.js
import BaseRepository from '@/services/firebase/core/BaseRepository'
import { CrudMixin } from '../mixins/CrudMixin'
import { RealtimeMixin } from '../mixins/RealtimeMixin'
import firebaseCore from '@/services/firebase/core/FirebaseCore'
import { ref, get, set, update } from 'firebase/database'

/**
 * UserActivity Repository - Tracks user interactions with entities for notification badges
 * Uses hybrid approach:
 * - Section-level timestamps (when user last visited RFIs/Submittals/etc.)
 * - Item-level timestamps (when user clicked/expanded specific items)
 */
class UserActivityRepository extends BaseRepository {
  constructor() {
    super('userActivity')
  }

  /**
   * Get the current user's ID
   */
  getCurrentUserId() {
    return firebaseCore.getCurrentUserId()
  }

  /**
   * Update last visited timestamp for a section (e.g., RFIs, Submittals, Tasks)
   * @param {string} projectId - Project ID
   * @param {string} section - Section name ('rfis', 'submittals', 'changeOrders', 'tasks', 'documents')
   */
  async updateSectionVisit(projectId, section) {
    try {
      const userId = this.getCurrentUserId()
      if (!userId) {
        console.warn('No user ID available for updating section visit')
        return
      }

      const timestamp = new Date().toISOString()
      const path = `${this.collectionName}/${userId}/projectViews/${projectId}/lastVisited${this.capitalize(section)}`
      const sectionRef = ref(firebaseCore.database, path)

      await set(sectionRef, timestamp)

      return { success: true, timestamp }
    } catch (error) {
      console.error(`Error updating section visit for ${section}:`, error)
      throw error
    }
  }

  /**
   * Get last visited timestamp for a section
   * @param {string} projectId - Project ID
   * @param {string} section - Section name
   * @returns {string|null} ISO timestamp or null
   */
  async getLastSectionVisit(projectId, section) {
    try {
      const userId = this.getCurrentUserId()
      if (!userId) return null

      const path = `${this.collectionName}/${userId}/projectViews/${projectId}/lastVisited${this.capitalize(section)}`
      const sectionRef = ref(firebaseCore.database, path)
      const snapshot = await get(sectionRef)

      return snapshot.exists() ? snapshot.val() : null
    } catch (error) {
      console.error(`Error getting last section visit for ${section}:`, error)
      return null
    }
  }

  /**
   * Mark an item as read (when user clicks/expands it)
   * @param {string} projectId - Project ID
   * @param {string} entityType - Entity type ('rfi', 'submittal', 'changeOrder', 'task', 'document')
   * @param {string} entityId - Entity ID
   */
  async markItemAsRead(projectId, entityType, entityId) {
    try {
      const userId = this.getCurrentUserId()
      if (!userId) {
        console.warn('No user ID available for marking item as read')
        return
      }

      const timestamp = new Date().toISOString()
      const path = `${this.collectionName}/${userId}/readItems/${projectId}/${entityType}_${entityId}`
      const itemRef = ref(firebaseCore.database, path)

      await set(itemRef, {
        readAt: timestamp,
        expandedCount: 1, // Track how many times user has expanded this item
      })

      return { success: true, timestamp }
    } catch (error) {
      console.error(`Error marking item as read:`, error)
      throw error
    }
  }

  /**
   * Increment expanded count for an item
   * @param {string} projectId - Project ID
   * @param {string} entityType - Entity type
   * @param {string} entityId - Entity ID
   */
  async incrementExpandedCount(projectId, entityType, entityId) {
    try {
      const userId = this.getCurrentUserId()
      if (!userId) return

      const path = `${this.collectionName}/${userId}/readItems/${projectId}/${entityType}_${entityId}`
      const itemRef = ref(firebaseCore.database, path)
      const snapshot = await get(itemRef)

      if (snapshot.exists()) {
        const data = snapshot.val()
        await update(itemRef, {
          readAt: new Date().toISOString(),
          expandedCount: (data.expandedCount || 0) + 1,
        })
      } else {
        await this.markItemAsRead(projectId, entityType, entityId)
      }
    } catch (error) {
      console.error(`Error incrementing expanded count:`, error)
    }
  }

  /**
   * Check if an item has been read
   * @param {string} projectId - Project ID
   * @param {string} entityType - Entity type
   * @param {string} entityId - Entity ID
   * @returns {Object|null} Read data or null
   */
  async isItemRead(projectId, entityType, entityId) {
    try {
      const userId = this.getCurrentUserId()
      if (!userId) return null

      const path = `${this.collectionName}/${userId}/readItems/${projectId}/${entityType}_${entityId}`
      const itemRef = ref(firebaseCore.database, path)
      const snapshot = await get(itemRef)

      return snapshot.exists() ? snapshot.val() : null
    } catch (error) {
      console.error(`Error checking if item is read:`, error)
      return null
    }
  }

  /**
   * Get all read items for a project
   * @param {string} projectId - Project ID
   * @returns {Object} Map of entity keys to read data
   */
  async getReadItems(projectId) {
    try {
      const userId = this.getCurrentUserId()
      if (!userId) return {}

      const path = `${this.collectionName}/${userId}/readItems/${projectId}`
      const itemsRef = ref(firebaseCore.database, path)
      const snapshot = await get(itemsRef)

      return snapshot.exists() ? snapshot.val() : {}
    } catch (error) {
      console.error(`Error getting read items:`, error)
      return {}
    }
  }

  /**
   * Check if an item is unread (hybrid logic)
   * An item is unread if:
   * 1. It was created/updated after the last section visit AND
   * 2. The user has NOT specifically read this item
   *
   * @param {Object} item - The item to check (must have createdAt, updatedAt, id)
   * @param {string} projectId - Project ID
   * @param {string} entityType - Entity type
   * @param {string} lastSectionVisit - Last visited timestamp for the section
   * @param {Object} readItems - Map of read items
   * @returns {boolean} True if item is unread
   */
  isItemUnread(item, projectId, entityType, lastSectionVisit, readItems) {
    if (!item || !item.id) return false

    const itemKey = `${entityType}_${item.id}`

    // Check if user has specifically read this item
    const itemReadData = readItems[itemKey]
    if (itemReadData) {
      return false // Item has been read
    }

    // Check if item is newer than last section visit
    if (!lastSectionVisit) {
      return true // No section visit recorded, all items are "new"
    }

    const lastVisitTime = new Date(lastSectionVisit).getTime()
    const itemTime = new Date(item.updatedAt || item.createdAt).getTime()

    return itemTime > lastVisitTime
  }

  /**
   * Get unread count for a collection of items
   * @param {Array} items - Array of items to check
   * @param {string} projectId - Project ID
   * @param {string} entityType - Entity type ('rfi', 'submittal', etc.)
   * @param {string} section - Section name ('rfis', 'submittals', etc.)
   * @returns {number} Count of unread items
   */
  async getUnreadCount(items, projectId, entityType, section) {
    try {
      if (!items || items.length === 0) return 0

      const lastSectionVisit = await this.getLastSectionVisit(projectId, section)
      const readItems = await this.getReadItems(projectId)

      return items.filter(item =>
        this.isItemUnread(item, projectId, entityType, lastSectionVisit, readItems)
      ).length
    } catch (error) {
      console.error(`Error getting unread count:`, error)
      return 0
    }
  }

  /**
   * Clear all read items for a project (useful for testing or cleanup)
   * @param {string} projectId - Project ID
   */
  async clearReadItems(projectId) {
    try {
      const userId = this.getCurrentUserId()
      if (!userId) return

      const path = `${this.collectionName}/${userId}/readItems/${projectId}`
      const itemsRef = ref(firebaseCore.database, path)
      await set(itemsRef, null)

      return { success: true }
    } catch (error) {
      console.error(`Error clearing read items:`, error)
      throw error
    }
  }

  /**
   * Clear all section visits for a project
   * @param {string} projectId - Project ID
   */
  async clearSectionVisits(projectId) {
    try {
      const userId = this.getCurrentUserId()
      if (!userId) return

      const path = `${this.collectionName}/${userId}/projectViews/${projectId}`
      const viewsRef = ref(firebaseCore.database, path)
      await set(viewsRef, null)

      return { success: true }
    } catch (error) {
      console.error(`Error clearing section visits:`, error)
      throw error
    }
  }

  /**
   * Helper to capitalize first letter
   */
  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1)
  }
}

export default new UserActivityRepository()
