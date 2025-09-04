// src/services/logging/ActivityService.js
import {
  ref as dbRef,
  push,
  set,
  get,
  query,
  orderByChild,
  equalTo,
  remove,
  onValue,
  off,
  startAt,
} from 'firebase/database'
import { database } from '@/configs/firebase'
import { getCurrentUserId, getCurrentUserName } from '@/services/auth/authService'
import { sanitizeForFirebase } from '@/utils/index'

/**
 * Activity Service - Centralized activity logging for the entire application
 * This service is domain-agnostic and can be used by any part of the app
 * Location: src/services/logging/ActivityService.js
 */
class ActivityService {
  constructor() {
    this.collectionName = 'activityLog'
    this.database = database
  }

  /**
   * Get current user info with fallbacks
   */
  getCurrentUserId() {
    return getCurrentUserId() || 'system'
  }

  getCurrentUserName() {
    return getCurrentUserName() || 'System'
  }

  /**
   * Log an activity with full context
   * This method is storage-agnostic and could be extended to log to multiple destinations
   */
  async logActivity(projectId, action, entityType, entityId, description, additionalData = {}) {
    try {
      const activityData = {
        projectId,
        userId: this.getCurrentUserId(),
        userName: this.getCurrentUserName(),
        action,
        entityType,
        entityId,
        description,
        timestamp: new Date().toISOString(),
        source: 'web_app', // Could be 'mobile_app', 'api', etc.
        ...additionalData,
      }

      // For now, log to Firebase - but this could easily be extended
      const result = await this._logToFirebase(activityData)

      // Future: Could also log to other destinations
      // await this._logToExternalService(activityData)
      // await this._logToLocalStorage(activityData)

      console.log(`[ActivityService] ${action}: ${description}`)

      return result
    } catch (error) {
      console.error('Error logging activity:', error)

      // Future: Log to error service
      // await ErrorService.logError('activity_logging_failed', error, { action, entityType })

      // Don't throw here as activity logging shouldn't break main operations
      return null
    }
  }

  /**
   * Private method for Firebase logging
   * This encapsulates the Firebase-specific logic
   */
  async _logToFirebase(activityData) {
    const cleanActivity = sanitizeForFirebase(activityData)
    const activityRef = dbRef(this.database, this.collectionName)
    const newActivityRef = push(activityRef)

    await set(newActivityRef, cleanActivity)
    return { id: newActivityRef.key, ...cleanActivity }
  }

  /**
   * Log bulk activity (for bulk operations)
   */
  async logBulkActivity(action, entityType, entityIds, description, additionalData = {}) {
    try {
      const activityData = {
        projectId: null, // Bulk operations might span multiple projects
        userId: this.getCurrentUserId(),
        userName: this.getCurrentUserName(),
        action,
        entityType,
        entityIds: Array.isArray(entityIds) ? entityIds : [entityIds],
        entityCount: Array.isArray(entityIds) ? entityIds.length : 1,
        description,
        timestamp: new Date().toISOString(),
        isBulkOperation: true,
        source: 'web_app',
        ...additionalData,
      }

      const result = await this._logToFirebase(activityData)

      console.log(`[ActivityService] Bulk ${action}: ${description}`)

      return result
    } catch (error) {
      console.error('Error logging bulk activity:', error)
      return null
    }
  }

  /**
   * Get activities by project
   */
  async getActivitiesByProject(projectId, limit = 50) {
    try {
      const activityRef = dbRef(this.database, this.collectionName)
      const projectActivityQuery = query(activityRef, orderByChild('projectId'), equalTo(projectId))
      const snapshot = await get(projectActivityQuery)

      if (!snapshot.exists()) return []

      let activities = Object.entries(snapshot.val())
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

      // Apply limit
      if (limit > 0) {
        activities = activities.slice(0, limit)
      }

      return activities
    } catch (error) {
      console.error('Error getting activities by project:', error)
      throw error
    }
  }

  /**
   * Get activities by user
   */
  async getActivitiesByUser(userId, limit = 50) {
    try {
      const activityRef = dbRef(this.database, this.collectionName)
      const userActivityQuery = query(activityRef, orderByChild('userId'), equalTo(userId))
      const snapshot = await get(userActivityQuery)

      if (!snapshot.exists()) return []

      let activities = Object.entries(snapshot.val())
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

      if (limit > 0) {
        activities = activities.slice(0, limit)
      }

      return activities
    } catch (error) {
      console.error('Error getting activities by user:', error)
      throw error
    }
  }

  /**
   * Get recent activities across all entities
   * @param {Object} options - Query options
   * @param {number} [options.limit=100] - Maximum number of activities to return
   * @param {Date} [options.since] - Filter activities since this date
   * @returns {Promise<Array>} Array of recent activities
   */
  async getRecentActivities(options = {}) {
    const { limit = 100, since } = options
    try {
      const activityRef = dbRef(this.database, this.collectionName)
      let q = query(activityRef, orderByChild('timestamp'))

      if (since) {
        const cutoffTimestamp = since.toISOString()
        q = query(q, startAt(cutoffTimestamp))
      }

      const snapshot = await get(q)

      if (!snapshot.exists()) return []

      let activities = Object.entries(snapshot.val())
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

      if (limit > 0) {
        activities = activities.slice(0, limit)
      }

      return activities
    } catch (error) {
      console.error('Error getting recent activities:', error)
      throw error
    }
  }

  /**
   * Subscribe to recent activities with realtime updates
   * @param {Object} options - Subscription options
   * @param {Date} [options.since] - Filter activities since this date
   * @param {number} [options.limit=100] - Initial limit (note: realtime may exceed this)
   * @param {Function} callback - Callback function to receive updated activities
   * @returns {Function} Unsubscribe function
   */
  subscribeToRecentActivities(options = {}, callback) {
    const { since, limit = 100 } = options
    const activityRef = dbRef(this.database, this.collectionName)
    let q = query(activityRef, orderByChild('timestamp'))

    if (since) {
      const cutoffTimestamp = since.toISOString()
      q = query(q, startAt(cutoffTimestamp))
    }

    // Note: Realtime Database doesn't support limit with startAt directly for realtime,
    // so we'll fetch initial with limit and listen for changes, filtering client-side if needed.
    // For better scalability, consider using Firestore if limits are critical.

    const listener = onValue(
      q,
      (snapshot) => {
        if (!snapshot.exists()) {
          callback([])
          return
        }

        let activities = Object.entries(snapshot.val())
          .map(([id, data]) => ({ id, ...data }))
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

        if (limit > 0) {
          activities = activities.slice(0, limit)
        }

        callback(activities)
      },
      (error) => {
        console.error('Error in recent activities subscription:', error)
        throw new Error(`Subscription error: ${error.message}`)
      },
    )

    return () => off(q, 'value', listener)
  }

  /**
   * Get activity statistics
   */
  async getActivityStatistics(days = 30) {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - days)
      const cutoffTimestamp = cutoffDate.toISOString()

      const allActivities = await this.getRecentActivities(0) // Get all

      // Filter to recent activities
      const recentActivities = allActivities.filter(
        (activity) => activity.timestamp >= cutoffTimestamp,
      )

      const stats = {
        totalActivities: recentActivities.length,
        period: `${days} days`,
        byAction: {},
        byEntityType: {},
        byUser: {},
        byDay: {},
        bySource: {},
        mostActiveProjects: {},
        averageActivitiesPerDay: 0,
      }

      recentActivities.forEach((activity) => {
        // Count by action
        const action = activity.action || 'unknown'
        stats.byAction[action] = (stats.byAction[action] || 0) + 1

        // Count by entity type
        const entityType = activity.entityType || 'unknown'
        stats.byEntityType[entityType] = (stats.byEntityType[entityType] || 0) + 1

        // Count by user
        const userName = activity.userName || 'Unknown'
        stats.byUser[userName] = (stats.byUser[userName] || 0) + 1

        // Count by source (web_app, mobile_app, api, etc.)
        const source = activity.source || 'unknown'
        stats.bySource[source] = (stats.bySource[source] || 0) + 1

        // Count by day
        const day = activity.timestamp.split('T')[0]
        stats.byDay[day] = (stats.byDay[day] || 0) + 1

        // Count by project
        if (activity.projectId) {
          stats.mostActiveProjects[activity.projectId] =
            (stats.mostActiveProjects[activity.projectId] || 0) + 1
        }
      })

      // Calculate average activities per day
      const uniqueDays = Object.keys(stats.byDay).length
      stats.averageActivitiesPerDay =
        uniqueDays > 0 ? Math.round((stats.totalActivities / uniqueDays) * 10) / 10 : 0

      return stats
    } catch (error) {
      console.error('Error getting activity statistics:', error)
      throw error
    }
  }

  /**
   * Clean up old activities
   */
  async cleanupOldActivities(daysToKeep = 90) {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)
      const cutoffTimestamp = cutoffDate.toISOString()

      const activityRef = dbRef(this.database, this.collectionName)
      const snapshot = await get(activityRef)

      if (!snapshot.exists()) return 0

      const activities = snapshot.val()
      const deletePromises = []

      Object.entries(activities).forEach(([id, activity]) => {
        if (activity.timestamp < cutoffTimestamp) {
          deletePromises.push(remove(dbRef(this.database, `${this.collectionName}/${id}`)))
        }
      })

      await Promise.all(deletePromises)

      console.log(`[ActivityService] Cleaned up ${deletePromises.length} old activities`)

      return deletePromises.length
    } catch (error) {
      console.error('Error cleaning up old activities:', error)
      throw error
    }
  }

  /**
   * Helper method to format activity descriptions with context
   */
  static formatDescription(action, entityType, entityName, additionalContext = '') {
    const actionVerbs = {
      created: 'Created',
      updated: 'Updated',
      deleted: 'Deleted',
      completed: 'Completed',
      approved: 'Approved',
      rejected: 'Rejected',
      assigned: 'Assigned',
      unassigned: 'Unassigned',
      commented: 'Commented on',
      uploaded: 'Uploaded',
      downloaded: 'Downloaded',
      viewed: 'Viewed',
      exported: 'Exported',
      imported: 'Imported',
      archived: 'Archived',
    }

    const verb = actionVerbs[action] || action
    const context = additionalContext ? ` - ${additionalContext}` : ''

    return `${verb} ${entityType}: ${entityName}${context}`
  }

  /**
   * Predefined activity logging methods for common operations
   */
  async logEntityCreated(projectId, entityType, entityId, entityName, additionalData = {}) {
    const description = ActivityService.formatDescription('created', entityType, entityName)
    return await this.logActivity(
      projectId,
      `created_${entityType}`,
      entityType,
      entityId,
      description,
      additionalData,
    )
  }

  async logEntityUpdated(
    projectId,
    entityType,
    entityId,
    entityName,
    changes = {},
    additionalData = {},
  ) {
    const changeKeys = Object.keys(changes)
    const context = changeKeys.length > 0 ? `Changed: ${changeKeys.join(', ')}` : ''
    const description = ActivityService.formatDescription(
      'updated',
      entityType,
      entityName,
      context,
    )

    return await this.logActivity(
      projectId,
      `updated_${entityType}`,
      entityType,
      entityId,
      description,
      { changes, ...additionalData },
    )
  }

  async logEntityDeleted(projectId, entityType, entityId, entityName, additionalData = {}) {
    const description = ActivityService.formatDescription('deleted', entityType, entityName)
    return await this.logActivity(
      projectId,
      `deleted_${entityType}`,
      entityType,
      entityId,
      description,
      additionalData,
    )
  }

  async logStatusChange(
    projectId,
    entityType,
    entityId,
    entityName,
    oldStatus,
    newStatus,
    additionalData = {},
  ) {
    const context = `${oldStatus} → ${newStatus}`
    const description = ActivityService.formatDescription(
      'updated',
      `${entityType} status`,
      entityName,
      context,
    )

    return await this.logActivity(
      projectId,
      `updated_${entityType}_status`,
      entityType,
      entityId,
      description,
      { oldStatus, newStatus, ...additionalData },
    )
  }

  /**
   * Log user actions (login, logout, etc.)
   */
  async logUserAction(action, userId, userName, additionalData = {}) {
    const description = `User ${action}: ${userName}`
    return await this.logActivity(
      null, // No project context for user actions
      `user_${action}`,
      'user',
      userId,
      description,
      additionalData,
    )
  }

  /**
   * Log system events (backups, cleanups, etc.)
   */
  async logSystemEvent(action, description, additionalData = {}) {
    return await this.logActivity(
      null, // No project context for system events
      `system_${action}`,
      'system',
      'system',
      description,
      { ...additionalData, isSystemEvent: true },
    )
  }

  /**
   * Future: Method to configure multiple logging destinations
   */
  configureDestinations(destinations) {
    // This could configure external logging services
    // { firebase: true, datadog: { apiKey: '...' }, cloudwatch: { region: 'us-east-1' } }
    this.destinations = destinations
  }
}

export default new ActivityService()
