// src/services/logging/ActivityService.ts
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
  type Database,
} from 'firebase/database';
import { database } from '@/configs/firebase';
import { getCurrentUserId, getCurrentUserName } from '@/services/auth/authService';
import { sanitizeForFirebase } from '@/utils/index';
import { getActivityCategory } from '@/constants/activityActions';

/**
 * Activity data structure
 */
export interface ActivityData {
  projectId: string | null;
  userId: string;
  userName: string;
  action: string;
  entityType: string;
  entityId: string;
  description: string;
  timestamp: string;
  category: string;
  source: string;
  [key: string]: any;
}

/**
 * Bulk activity data structure
 */
export interface BulkActivityData extends Omit<ActivityData, 'entityId'> {
  entityIds: string[];
  entityCount: number;
  isBulkOperation: boolean;
}

/**
 * Activity statistics
 */
export interface ActivityStatistics {
  totalActivities: number;
  period: string;
  byAction: Record<string, number>;
  byEntityType: Record<string, number>;
  byUser: Record<string, number>;
  byDay: Record<string, number>;
  bySource: Record<string, number>;
  mostActiveProjects: Record<string, number>;
  averageActivitiesPerDay: number;
}

/**
 * Activity query options
 */
export interface ActivityQueryOptions {
  limit?: number;
  since?: Date;
}

/**
 * Activity Service - Centralized activity logging for the entire application
 * This service is domain-agnostic and can be used by any part of the app
 */
class ActivityService {
  private collectionName: string;
  private database: Database;

  constructor() {
    this.collectionName = 'activityLog';
    this.database = database;
  }

  /**
   * Get current user info with fallbacks
   */
  private getCurrentUserId(): string {
    return getCurrentUserId() || 'system';
  }

  private getCurrentUserName(): string {
    return getCurrentUserName() || 'System';
  }

  /**
   * Log an activity with full context
   */
  async logActivity(
    projectId: string | null,
    action: string,
    entityType: string,
    entityId: string,
    description: string,
    additionalData: Record<string, any> = {}
  ): Promise<ActivityData | null> {
    try {
      const activityData: ActivityData = {
        projectId,
        userId: this.getCurrentUserId(),
        userName: this.getCurrentUserName(),
        action,
        entityType,
        entityId,
        description,
        timestamp: new Date().toISOString(),
        category: getActivityCategory(action),
        source: 'web_app',
        ...additionalData,
      };

      const result = await this._logToFirebase(activityData);

      console.log(`[ActivityService] ${action}: ${description}`);

      return result;
    } catch (error) {
      console.error('Error logging activity:', error);
      return null;
    }
  }

  /**
   * Private method for Firebase logging
   */
  private async _logToFirebase(activityData: ActivityData): Promise<ActivityData> {
    const cleanActivity = sanitizeForFirebase(activityData);
    const activityRef = dbRef(this.database, this.collectionName);
    const newActivityRef = push(activityRef);

    await set(newActivityRef, cleanActivity);
    return { id: newActivityRef.key, ...cleanActivity } as ActivityData;
  }

  /**
   * Log bulk activity (for bulk operations)
   */
  async logBulkActivity(
    action: string,
    entityType: string,
    entityIds: string | string[],
    description: string,
    additionalData: Record<string, any> = {}
  ): Promise<BulkActivityData | null> {
    try {
      const entityIdsArray = Array.isArray(entityIds) ? entityIds : [entityIds];
      const activityData: BulkActivityData = {
        projectId: null,
        userId: this.getCurrentUserId(),
        userName: this.getCurrentUserName(),
        action,
        entityType,
        entityIds: entityIdsArray,
        entityCount: entityIdsArray.length,
        description,
        timestamp: new Date().toISOString(),
        category: getActivityCategory(action),
        isBulkOperation: true,
        source: 'web_app',
        ...additionalData,
      };

      const result = await this._logToFirebase(activityData as any);

      console.log(`[ActivityService] Bulk ${action}: ${description}`);

      return result as any;
    } catch (error) {
      console.error('Error logging bulk activity:', error);
      return null;
    }
  }

  /**
   * Get activities by project
   */
  async getActivitiesByProject(projectId: string, limit: number = 50): Promise<ActivityData[]> {
    try {
      const activityRef = dbRef(this.database, this.collectionName);
      const projectActivityQuery = query(
        activityRef,
        orderByChild('projectId'),
        equalTo(projectId)
      );
      const snapshot = await get(projectActivityQuery);

      if (!snapshot.exists()) return [];

      let activities = Object.entries(snapshot.val())
        .map(([id, data]) => ({ id, ...(data as any) }))
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      if (limit > 0) {
        activities = activities.slice(0, limit);
      }

      return activities;
    } catch (error) {
      console.error('Error getting activities by project:', error);
      throw error;
    }
  }

  /**
   * Get activities by user
   */
  async getActivitiesByUser(userId: string, limit: number = 50): Promise<ActivityData[]> {
    try {
      const activityRef = dbRef(this.database, this.collectionName);
      const userActivityQuery = query(activityRef, orderByChild('userId'), equalTo(userId));
      const snapshot = await get(userActivityQuery);

      if (!snapshot.exists()) return [];

      let activities = Object.entries(snapshot.val())
        .map(([id, data]) => ({ id, ...(data as any) }))
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      if (limit > 0) {
        activities = activities.slice(0, limit);
      }

      return activities;
    } catch (error) {
      console.error('Error getting activities by user:', error);
      throw error;
    }
  }

  /**
   * Get recent activities across all entities
   */
  async getRecentActivities(options: ActivityQueryOptions = {}): Promise<ActivityData[]> {
    const { limit = 100, since } = options;
    try {
      const activityRef = dbRef(this.database, this.collectionName);
      let q = query(activityRef, orderByChild('timestamp'));

      if (since) {
        const cutoffTimestamp = since.toISOString();
        q = query(activityRef, orderByChild('timestamp'), startAt(cutoffTimestamp));
      }

      const snapshot = await get(q);

      if (!snapshot.exists()) return [];

      let activities = Object.entries(snapshot.val())
        .map(([id, data]) => ({ id, ...(data as any) }))
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      if (limit > 0) {
        activities = activities.slice(0, limit);
      }

      return activities;
    } catch (error) {
      console.error('Error getting recent activities:', error);
      throw error;
    }
  }

  /**
   * Subscribe to recent activities with realtime updates
   */
  subscribeToRecentActivities(
    options: ActivityQueryOptions,
    callback: (activities: ActivityData[]) => void
  ): () => void {
    const { since, limit = 100 } = options;
    const activityRef = dbRef(this.database, this.collectionName);
    let q = query(activityRef, orderByChild('timestamp'));

    if (since) {
      const cutoffTimestamp = since.toISOString();
      q = query(activityRef, orderByChild('timestamp'), startAt(cutoffTimestamp));
    }

    const listener = onValue(
      q,
      (snapshot) => {
        if (!snapshot.exists()) {
          callback([]);
          return;
        }

        let activities = Object.entries(snapshot.val())
          .map(([id, data]) => ({ id, ...(data as any) }))
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        if (limit > 0) {
          activities = activities.slice(0, limit);
        }

        callback(activities);
      },
      (error) => {
        console.error('Error in recent activities subscription:', error);
        throw new Error(`Subscription error: ${error.message}`);
      }
    );

    return () => off(q, 'value', listener);
  }

  /**
   * Subscribe to activities by category
   */
  subscribeToActivitiesByCategory(
    category: string,
    options: ActivityQueryOptions,
    callback: (activities: ActivityData[]) => void
  ): () => void {
    const { limit = 100 } = options;
    const activityRef = dbRef(this.database, this.collectionName);
    const q = query(activityRef, orderByChild('category'), equalTo(category));

    const listener = onValue(
      q,
      (snapshot) => {
        if (!snapshot.exists()) {
          callback([]);
          return;
        }

        let activities = Object.entries(snapshot.val())
          .map(([id, data]) => ({ id, ...(data as any) }))
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        if (limit > 0) {
          activities = activities.slice(0, limit);
        }

        callback(activities);
      },
      (error) => {
        console.error('Error in category activities subscription:', error);
        throw new Error(`Subscription error: ${error.message}`);
      }
    );

    return () => off(q, 'value', listener);
  }

  /**
   * Get activity statistics
   */
  async getActivityStatistics(days: number = 30): Promise<ActivityStatistics> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      const cutoffTimestamp = cutoffDate.toISOString();

      const allActivities = await this.getRecentActivities({ limit: 0 });

      const recentActivities = allActivities.filter(
        (activity) => activity.timestamp >= cutoffTimestamp
      );

      const stats: ActivityStatistics = {
        totalActivities: recentActivities.length,
        period: `${days} days`,
        byAction: {},
        byEntityType: {},
        byUser: {},
        byDay: {},
        bySource: {},
        mostActiveProjects: {},
        averageActivitiesPerDay: 0,
      };

      recentActivities.forEach((activity) => {
        const action = activity.action || 'unknown';
        stats.byAction[action] = (stats.byAction[action] || 0) + 1;

        const entityType = activity.entityType || 'unknown';
        stats.byEntityType[entityType] = (stats.byEntityType[entityType] || 0) + 1;

        const userName = activity.userName || 'Unknown';
        stats.byUser[userName] = (stats.byUser[userName] || 0) + 1;

        const source = activity.source || 'unknown';
        stats.bySource[source] = (stats.bySource[source] || 0) + 1;

        const day = activity.timestamp.split('T')[0];
        stats.byDay[day] = (stats.byDay[day] || 0) + 1;

        if (activity.projectId) {
          stats.mostActiveProjects[activity.projectId] =
            (stats.mostActiveProjects[activity.projectId] || 0) + 1;
        }
      });

      const uniqueDays = Object.keys(stats.byDay).length;
      stats.averageActivitiesPerDay =
        uniqueDays > 0 ? Math.round((stats.totalActivities / uniqueDays) * 10) / 10 : 0;

      return stats;
    } catch (error) {
      console.error('Error getting activity statistics:', error);
      throw error;
    }
  }

  /**
   * Clean up old activities
   */
  async cleanupOldActivities(daysToKeep: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      const cutoffTimestamp = cutoffDate.toISOString();

      const activityRef = dbRef(this.database, this.collectionName);
      const snapshot = await get(activityRef);

      if (!snapshot.exists()) return 0;

      const activities = snapshot.val();
      const deletePromises: Promise<void>[] = [];

      Object.entries(activities).forEach(([id, activity]) => {
        if ((activity as any).timestamp < cutoffTimestamp) {
          deletePromises.push(remove(dbRef(this.database, `${this.collectionName}/${id}`)));
        }
      });

      await Promise.all(deletePromises);

      console.log(`[ActivityService] Cleaned up ${deletePromises.length} old activities`);

      return deletePromises.length;
    } catch (error) {
      console.error('Error cleaning up old activities:', error);
      throw error;
    }
  }

  /**
   * Helper method to format activity descriptions with context
   */
  static formatDescription(
    action: string,
    entityType: string,
    entityName: string,
    additionalContext: string = ''
  ): string {
    const actionVerbs: Record<string, string> = {
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
    };

    const verb = actionVerbs[action] || action;
    const context = additionalContext ? ` - ${additionalContext}` : '';

    return `${verb} ${entityType}: ${entityName}${context}`;
  }

  /**
   * Predefined activity logging methods
   */
  async logEntityCreated(
    projectId: string | null,
    entityType: string,
    entityId: string,
    entityName: string,
    additionalData: Record<string, any> = {}
  ): Promise<ActivityData | null> {
    const description = ActivityService.formatDescription('created', entityType, entityName);
    return await this.logActivity(
      projectId,
      `created_${entityType}`,
      entityType,
      entityId,
      description,
      additionalData
    );
  }

  async logEntityUpdated(
    projectId: string | null,
    entityType: string,
    entityId: string,
    entityName: string,
    changes: Record<string, any> = {},
    additionalData: Record<string, any> = {}
  ): Promise<ActivityData | null> {
    const changeKeys = Object.keys(changes);
    const context = changeKeys.length > 0 ? `Changed: ${changeKeys.join(', ')}` : '';
    const description = ActivityService.formatDescription(
      'updated',
      entityType,
      entityName,
      context
    );

    return await this.logActivity(
      projectId,
      `updated_${entityType}`,
      entityType,
      entityId,
      description,
      { changes, ...additionalData }
    );
  }

  async logEntityDeleted(
    projectId: string | null,
    entityType: string,
    entityId: string,
    entityName: string,
    additionalData: Record<string, any> = {}
  ): Promise<ActivityData | null> {
    const description = ActivityService.formatDescription('deleted', entityType, entityName);
    return await this.logActivity(
      projectId,
      `deleted_${entityType}`,
      entityType,
      entityId,
      description,
      additionalData
    );
  }

  async logStatusChange(
    projectId: string | null,
    entityType: string,
    entityId: string,
    entityName: string,
    oldStatus: string,
    newStatus: string,
    additionalData: Record<string, any> = {}
  ): Promise<ActivityData | null> {
    const context = `${oldStatus} → ${newStatus}`;
    const description = ActivityService.formatDescription(
      'updated',
      `${entityType} status`,
      entityName,
      context
    );

    return await this.logActivity(
      projectId,
      `updated_${entityType}_status`,
      entityType,
      entityId,
      description,
      { oldStatus, newStatus, ...additionalData }
    );
  }

  /**
   * Log user actions
   */
  async logUserAction(
    action: string,
    userId: string,
    userName: string,
    additionalData: Record<string, any> = {}
  ): Promise<ActivityData | null> {
    const description = `User ${action}: ${userName}`;
    return await this.logActivity(
      null,
      `user_${action}`,
      'user',
      userId,
      description,
      additionalData
    );
  }

  /**
   * Log system events
   */
  async logSystemEvent(
    action: string,
    description: string,
    additionalData: Record<string, any> = {}
  ): Promise<ActivityData | null> {
    return await this.logActivity(null, `system_${action}`, 'system', 'system', description, {
      ...additionalData,
      isSystemEvent: true,
    });
  }
}

export default new ActivityService();
