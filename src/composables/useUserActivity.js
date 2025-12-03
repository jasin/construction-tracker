// src/composables/useUserActivity.js
import { ref, computed } from 'vue'
import UserActivityRepository from '@/services/firebase/Repositories/UserActivityRepository'

/**
 * Composable for tracking user activity and managing unread badges
 * Implements hybrid approach:
 * - Section visits (when user views a section)
 * - Item reads (when user clicks/expands specific items)
 */
export function useUserActivity() {
  const lastSectionVisits = ref({})
  const readItems = ref({})
  const loading = ref(false)

  /**
   * Update section visit timestamp
   * Call this when user navigates to or interacts with a section
   * @param {string} projectId - Project ID
   * @param {string} section - Section name ('rfis', 'submittals', 'changeOrders', 'tasks', 'documents')
   */
  const updateSectionVisit = async (projectId, section) => {
    try {
      const result = await UserActivityRepository.updateSectionVisit(projectId, section)

      // Update local state
      if (!lastSectionVisits.value[projectId]) {
        lastSectionVisits.value[projectId] = {}
      }
      lastSectionVisits.value[projectId][section] = result.timestamp

      return result
    } catch (error) {
      console.error('Error updating section visit:', error)
    }
  }

  /**
   * Mark an item as read
   * Call this when user clicks or expands an item
   * @param {string} projectId - Project ID
   * @param {string} entityType - Entity type ('rfi', 'submittal', 'changeOrder', 'task', 'document')
   * @param {string} entityId - Entity ID
   */
  const markItemAsRead = async (projectId, entityType, entityId) => {
    try {
      const result = await UserActivityRepository.markItemAsRead(projectId, entityType, entityId)

      // Update local state
      if (!readItems.value[projectId]) {
        readItems.value[projectId] = {}
      }
      const itemKey = `${entityType}_${entityId}`
      readItems.value[projectId][itemKey] = {
        readAt: result.timestamp,
        expandedCount: 1,
      }

      return result
    } catch (error) {
      console.error('Error marking item as read:', error)
    }
  }

  /**
   * Load section visit data for a project
   * @param {string} projectId - Project ID
   * @param {Array} sections - Array of section names to load
   */
  const loadSectionVisits = async (projectId, sections = ['rfis', 'submittals', 'changeOrders', 'tasks', 'documents']) => {
    try {
      loading.value = true

      if (!lastSectionVisits.value[projectId]) {
        lastSectionVisits.value[projectId] = {}
      }

      for (const section of sections) {
        const timestamp = await UserActivityRepository.getLastSectionVisit(projectId, section)
        lastSectionVisits.value[projectId][section] = timestamp
      }
    } catch (error) {
      console.error('Error loading section visits:', error)
    } finally {
      loading.value = false
    }
  }

  /**
   * Load read items for a project
   * @param {string} projectId - Project ID
   */
  const loadReadItems = async (projectId) => {
    try {
      loading.value = true
      const items = await UserActivityRepository.getReadItems(projectId)
      readItems.value[projectId] = items
    } catch (error) {
      console.error('Error loading read items:', error)
    } finally {
      loading.value = false
    }
  }

  /**
   * Load all activity data for a project
   * @param {string} projectId - Project ID
   * @param {Array} sections - Array of section names to load
   */
  const loadProjectActivity = async (projectId, sections) => {
    await Promise.all([
      loadSectionVisits(projectId, sections),
      loadReadItems(projectId)
    ])
  }

  /**
   * Check if an item is unread
   * @param {Object} item - The item to check
   * @param {string} projectId - Project ID
   * @param {string} entityType - Entity type
   * @param {string} section - Section name
   * @returns {boolean} True if unread
   */
  const isItemUnread = (item, projectId, entityType, section) => {
    const lastVisit = lastSectionVisits.value[projectId]?.[section]
    const projectReadItems = readItems.value[projectId] || {}

    return UserActivityRepository.isItemUnread(
      item,
      projectId,
      entityType,
      lastVisit,
      projectReadItems
    )
  }

  /**
   * Get unread count for a list of items
   * @param {Array} items - Array of items
   * @param {string} projectId - Project ID
   * @param {string} entityType - Entity type
   * @param {string} section - Section name
   * @returns {number} Unread count
   */
  const getUnreadCount = (items, projectId, entityType, section) => {
    if (!items || items.length === 0) return 0

    const lastVisit = lastSectionVisits.value[projectId]?.[section]
    const projectReadItems = readItems.value[projectId] || {}

    return items.filter(item =>
      UserActivityRepository.isItemUnread(
        item,
        projectId,
        entityType,
        lastVisit,
        projectReadItems
      )
    ).length
  }

  /**
   * Clear read items for a project (useful for testing)
   * @param {string} projectId - Project ID
   */
  const clearReadItems = async (projectId) => {
    try {
      await UserActivityRepository.clearReadItems(projectId)
      if (readItems.value[projectId]) {
        readItems.value[projectId] = {}
      }
    } catch (error) {
      console.error('Error clearing read items:', error)
    }
  }

  /**
   * Clear section visits for a project
   * @param {string} projectId - Project ID
   */
  const clearSectionVisits = async (projectId) => {
    try {
      await UserActivityRepository.clearSectionVisits(projectId)
      if (lastSectionVisits.value[projectId]) {
        lastSectionVisits.value[projectId] = {}
      }
    } catch (error) {
      console.error('Error clearing section visits:', error)
    }
  }

  return {
    // State
    lastSectionVisits,
    readItems,
    loading,

    // Methods
    updateSectionVisit,
    markItemAsRead,
    loadSectionVisits,
    loadReadItems,
    loadProjectActivity,
    isItemUnread,
    getUnreadCount,
    clearReadItems,
    clearSectionVisits,
  }
}
