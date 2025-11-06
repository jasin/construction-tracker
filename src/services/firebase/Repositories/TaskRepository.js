// src/services/firebase/repositories/TaskRepository.js
import BaseRepository from '../core/BaseRepository';
import ActivityService from '@/services/logging/ActivityService';
import firebaseCore from '../core/FirebaseCore';
import { CrudMixin } from '../mixins/CrudMixin';
import { RealtimeMixin } from '../mixins/RealtimeMixin';
import {
  ref,
  query,
  orderByChild,
  equalTo,
  onValue,
  push,
  set,
  get,
  remove,
} from 'firebase/database';
import { TASK_SCHEMA } from '../schemas';
import {
  canTransitionToStatus,
  getDependentTasks,
  calculateDependencyStatus,
} from '@/utils/taskDependencies';

/**
 * Task Repository - handles all task-related Firebase operations
 * Includes task management, comments, assignments, and progress tracking
 */
class TaskRepository extends CrudMixin(RealtimeMixin(BaseRepository)) {
  constructor() {
    super('tasks');
  }

  /**
   * Create a new task with validation and activity logging
   */
  async createTask(taskData) {
    try {
      // Tasks can be independent of projects, so only require title
      const validation = this.validateData(taskData, ['title']);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${Object.values(validation.errors).join(', ')}`);
      }

      // Add task-specific defaults
      const taskDataWithDefaults = {
        ...validation.cleanData,
        status: validation.cleanData.status || 'todo',
        priority: validation.cleanData.priority || 'medium',
        actualHours: validation.cleanData.actualHours || 0,
        progress: validation.cleanData.progress || 0,
        completedAt: null,
        tags: validation.cleanData.tags || [],
      };

      const newTask = await this.create(taskDataWithDefaults, TASK_SCHEMA);

      // Only log activity if task is associated with a project
      if (newTask.projectId) {
        await ActivityService.logEntityCreated(
          newTask.projectId,
          'task',
          newTask.id,
          newTask.title
        );
      }

      return newTask;
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  }

  /**
   * Get all tasks
   */
  async getAllTasks() {
    try {
      return await this.getAll();
    } catch (error) {
      console.error('Error getting all tasks:', error);
    }
  }

  /**
   * Get tasks by project with optional filtering
   */
  async getTasksByProject(projectId, filters = {}) {
    try {
      let tasks = await this.getByField('projectId', projectId);

      // Apply filters
      if (filters.status && filters.status.length > 0) {
        tasks = tasks.filter((task) => filters.status.includes(task.status));
      }

      if (filters.assignedTo) {
        tasks = tasks.filter((task) => task.assignedTo === filters.assignedTo);
      }

      if (filters.priority && filters.priority.length > 0) {
        tasks = tasks.filter((task) => filters.priority.includes(task.priority));
      }

      if (filters.dueDateFrom) {
        tasks = tasks.filter(
          (task) => task.dueDate && new Date(task.dueDate) >= new Date(filters.dueDateFrom)
        );
      }

      if (filters.dueDateTo) {
        tasks = tasks.filter(
          (task) => task.dueDate && new Date(task.dueDate) <= new Date(filters.dueDateTo)
        );
      }

      if (filters.tags && filters.tags.length > 0) {
        tasks = tasks.filter(
          (task) => task.tags && task.tags.some((tag) => filters.tags.includes(tag))
        );
      }

      // Apply sorting
      tasks = this.sortTasks(tasks, filters.sortBy || 'priority', filters.sortDirection || 'asc');

      return tasks;
    } catch (error) {
      console.error('Error getting tasks by project:', error);
      throw error;
    }
  }

  /**
   * Get tasks assigned to a specific user
   */
  async getTasksByUser(userId, filters = {}) {
    try {
      let tasks = await this.getByField('assignedTo', userId);

      // Apply status filter if provided
      if (filters.status && filters.status.length > 0) {
        tasks = tasks.filter((task) => filters.status.includes(task.status));
      }

      // Apply project filter if provided
      if (filters.projectId) {
        tasks = tasks.filter((task) => task.projectId === filters.projectId);
      }

      // Sort by due date and priority
      tasks = this.sortTasks(tasks, 'dueDate', 'asc');

      return tasks;
    } catch (error) {
      console.error('Error getting tasks by user:', error);
      throw error;
    }
  }

  /**
   * Get overdue tasks
   */
  async getOverdueTasks(projectId = null) {
    try {
      let tasks = projectId ? await this.getTasksByProject(projectId) : await this.getAll();

      const now = new Date();

      return tasks
        .filter((task) => {
          return (
            task.dueDate &&
            new Date(task.dueDate) < now &&
            task.status !== 'complete' &&
            task.status !== 'cancelled'
          );
        })
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    } catch (error) {
      console.error('Error getting overdue tasks:', error);
      throw error;
    }
  }

  /**
   * Get tasks due soon
   */
  async getTasksDueSoon(days = 7, projectId = null) {
    try {
      let tasks = projectId ? await this.getTasksByProject(projectId) : await this.getAll();

      const now = new Date();
      const futureDate = new Date();
      futureDate.setDate(now.getDate() + days);

      return tasks
        .filter((task) => {
          if (!task.dueDate || task.status === 'complete' || task.status === 'cancelled') {
            return false;
          }

          const dueDate = new Date(task.dueDate);
          return dueDate >= now && dueDate <= futureDate;
        })
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    } catch (error) {
      console.error('Error getting tasks due soon:', error);
      throw error;
    }
  }

  /**
   * Update task with validation and activity logging
   */
  async updateTask(taskId, updates) {
    try {
      const originalTask = await this.getById(taskId);
      if (!originalTask) {
        throw new Error('Task not found');
      }

      // Validate status transition if status is being changed
      if (updates.status && updates.status !== originalTask.status) {
        // Get all tasks for dependency validation
        const allTasks = await this.getAll();

        // Check if status transition is allowed based on dependencies
        const validation = canTransitionToStatus(
          { ...originalTask, ...updates },
          updates.status,
          allTasks
        );

        if (!validation.allowed) {
          throw new Error(validation.reason);
        }
      }

      // Handle completion logic
      if (updates.status === 'complete' && originalTask.status !== 'complete') {
        updates.completedAt = new Date().toISOString();
        updates.progress = 100;
      }

      // Handle reopening task
      if (originalTask.status === 'complete' && updates.status !== 'complete') {
        updates.completedAt = null;
      }

      // Handle transition to in-progress (set startedAt timestamp)
      if (
        updates.status === 'in-progress' &&
        originalTask.status !== 'in-progress' &&
        !originalTask.startedAt
      ) {
        updates.startedAt = new Date().toISOString();
      }

      const result = await this.update(taskId, updates, TASK_SCHEMA);

      // Log significant updates (only if task has projectId)
      if (updates.status && updates.status !== originalTask.status && originalTask.projectId) {
        await ActivityService.logStatusChange(
          originalTask.projectId,
          'task',
          taskId,
          originalTask.title,
          originalTask.status,
          updates.status
        );
      }

      if (
        updates.assignedTo &&
        updates.assignedTo !== originalTask.assignedTo &&
        originalTask.projectId
      ) {
        await ActivityService.logActivity(
          originalTask.projectId,
          'assigned_task',
          'task',
          taskId,
          `Assigned task "${originalTask.title}" to ${updates.assignedToName || 'user'}`,
          {
            previousAssignee: originalTask.assignedTo,
            newAssignee: updates.assignedTo,
          }
        );
      }

      if (
        updates.priority &&
        updates.priority !== originalTask.priority &&
        originalTask.projectId
      ) {
        await ActivityService.logActivity(
          originalTask.projectId,
          'updated_task_priority',
          'task',
          taskId,
          `Changed task "${originalTask.title}" priority from ${originalTask.priority} to ${updates.priority}`,
          {
            oldPriority: originalTask.priority,
            newPriority: updates.priority,
          }
        );
      }

      return result;
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  }

  /**
   * Delete task and its comments
   */
  async deleteTask(taskId) {
    try {
      const task = await this.getById(taskId);
      if (!task) {
        throw new Error('Task not found');
      }

      // Delete task comments first
      await this.deleteTaskComments(taskId);

      // Delete the task
      await this.delete(taskId);

      // Log activity (only if task has projectId)
      if (task.projectId) {
        await ActivityService.logEntityDeleted(task.projectId, 'task', taskId, task.title);
      }

      return { success: true, id: taskId };
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  }

  /**
   * Search tasks across projects
   */
  async searchTasks(searchTerm, projectId = null) {
    try {
      let tasks = projectId ? await this.getTasksByProject(projectId) : await this.getAll();

      const term = searchTerm.toLowerCase().trim();

      return tasks.filter((task) => {
        return (
          task.title?.toLowerCase().includes(term) ||
          task.description?.toLowerCase().includes(term) ||
          task.assignedToName?.toLowerCase().includes(term) ||
          task.tags?.some((tag) => tag.toLowerCase().includes(term))
        );
      });
    } catch (error) {
      console.error('Error searching tasks:', error);
      throw error;
    }
  }

  /**
   * Get task statistics
   */
  async getTaskStatistics(projectId = null) {
    try {
      let tasks = projectId ? await this.getTasksByProject(projectId) : await this.getAll();

      const now = new Date();

      const stats = {
        total: tasks.length,
        completed: tasks.filter((t) => t.status === 'complete').length,
        inProgress: tasks.filter((t) => t.status === 'in-progress').length,
        todo: tasks.filter((t) => t.status === 'todo').length,
        cancelled: tasks.filter((t) => t.status === 'cancelled').length,
        overdue: tasks.filter((t) => {
          return (
            t.dueDate &&
            new Date(t.dueDate) < now &&
            t.status !== 'complete' &&
            t.status !== 'cancelled'
          );
        }).length,
        byPriority: {
          critical: tasks.filter((t) => t.priority === 'critical').length,
          high: tasks.filter((t) => t.priority === 'high').length,
          medium: tasks.filter((t) => t.priority === 'medium').length,
          low: tasks.filter((t) => t.priority === 'low').length,
        },
        byAssignee: {},
        totalEstimatedHours: tasks.reduce((sum, task) => sum + (task.estimatedHours || 0), 0),
        totalActualHours: tasks.reduce((sum, task) => sum + (task.actualHours || 0), 0),
        averageProgress: 0,
        completionRate: 0,
      };

      // Count by assignee
      tasks.forEach((task) => {
        if (task.assignedToName) {
          const assignee = task.assignedToName;
          stats.byAssignee[assignee] = (stats.byAssignee[assignee] || 0) + 1;
        }
      });

      // Calculate averages
      if (tasks.length > 0) {
        stats.averageProgress =
          tasks.reduce((sum, task) => sum + (task.progress || 0), 0) / tasks.length;
        stats.completionRate = (stats.completed / stats.total) * 100;
      }

      return stats;
    } catch (error) {
      console.error('Error getting task statistics:', error);
      throw error;
    }
  }

  // ==================== TASK COMMENTS ====================

  /**
   * Add comment to task
   */
  async addTaskComment(taskId, comment, additionalData = {}) {
    try {
      const task = await this.getById(taskId);
      if (!task) {
        throw new Error('Task not found');
      }

      const commentData = {
        text: comment,
        taskId: taskId,
        createdBy: firebaseCore.getCurrentUserId(),
        createdByName: firebaseCore.getCurrentUserName(),
        createdAt: new Date().toISOString(),
        ...additionalData,
      };

      const commentsRef = ref(firebaseCore.database, `taskComments/${taskId}`);
      const newCommentRef = push(commentsRef);

      await set(newCommentRef, commentData);

      // Log activity (only if task has projectId)
      if (task.projectId) {
        await ActivityService.logActivity(
          task.projectId,
          'commented_on_task',
          'task',
          taskId,
          `Added comment to task: ${task.title}`,
          { commentId: newCommentRef.key }
        );
      }

      return { id: newCommentRef.key, ...commentData };
    } catch (error) {
      console.error('Error adding task comment:', error);
      throw error;
    }
  }

  /**
   * Get task comments
   */
  async getTaskComments(taskId) {
    try {
      const commentsRef = ref(firebaseCore.database, `taskComments/${taskId}`);
      const snapshot = await get(commentsRef);

      if (!snapshot.exists()) return [];

      return Object.entries(snapshot.val())
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch (error) {
      console.error('Error getting task comments:', error);
      throw error;
    }
  }

  /**
   * Delete all comments for a task
   */
  async deleteTaskComments(taskId) {
    try {
      const commentsRef = ref(firebaseCore.database, `taskComments/${taskId}`);
      await remove(commentsRef);
      return true;
    } catch (error) {
      console.error('Error deleting task comments:', error);
      throw error;
    }
  }

  // ==================== BULK OPERATIONS ====================

  /**
   * Bulk update tasks
   */
  async bulkUpdateTasks(taskIds, updates) {
    try {
      const results = await this.bulkUpdate(taskIds, updates);

      // Log bulk activity
      await ActivityService.logBulkActivity(
        'bulk_updated_tasks',
        'task',
        taskIds,
        `Bulk updated ${taskIds.length} tasks`,
        { updates, taskCount: taskIds.length }
      );

      return results;
    } catch (error) {
      console.error('Error in bulk update tasks:', error);
      throw error;
    }
  }

  /**
   * Bulk assign tasks to user
   */
  async bulkAssignTasks(taskIds, userId, userName) {
    try {
      const updates = {
        assignedTo: userId,
        assignedToName: userName,
        assignedAt: new Date().toISOString(),
      };

      const results = await this.bulkUpdate(taskIds, updates);

      // Log bulk assignment
      await ActivityService.logBulkActivity(
        'bulk_assigned_tasks',
        'task',
        taskIds,
        `Bulk assigned ${taskIds.length} tasks to ${userName}`,
        { assignedTo: userId, assignedToName: userName }
      );

      return results;
    } catch (error) {
      console.error('Error in bulk assign tasks:', error);
      throw error;
    }
  }

  /**
   * Bulk update task status
   */
  async bulkUpdateTaskStatus(taskIds, status) {
    try {
      const updates = {
        status,
        ...(status === 'complete' && {
          completedAt: new Date().toISOString(),
          progress: 100,
        }),
      };

      const results = await this.bulkUpdate(taskIds, updates);

      // Log bulk status update
      await ActivityService.logBulkActivity(
        'bulk_updated_task_status',
        'task',
        taskIds,
        `Bulk updated ${taskIds.length} tasks to ${status} status`,
        { newStatus: status }
      );

      return results;
    } catch (error) {
      console.error('Error in bulk update task status:', error);
      throw error;
    }
  }

  // ==================== REAL-TIME SUBSCRIPTIONS ====================

  /**
   * Subscribe to tasks by project
   */
  subscribeToTasksByProject(projectId, callback) {
    try {
      const tasksRef = ref(firebaseCore.database, this.collectionName);
      const projectTasksQuery = query(tasksRef, orderByChild('projectId'), equalTo(projectId));

      onValue(projectTasksQuery, (snapshot) => {
        const tasks = snapshot.exists()
          ? Object.entries(snapshot.val()).map(([id, data]) => ({ id, ...data }))
          : [];

        // Sort by due date and priority
        const sortedTasks = this.sortTasks(tasks, 'priority', 'asc');
        callback(sortedTasks);
      });

      return projectTasksQuery;
    } catch (error) {
      console.error('Error subscribing to tasks by project:', error);
      throw error;
    }
  }

  /**
   * Subscribe to tasks by user
   */
  subscribeToTasksByUser(userId, callback) {
    try {
      const tasksRef = ref(firebaseCore.database, this.collectionName);
      const userTasksQuery = query(tasksRef, orderByChild('assignedTo'), equalTo(userId));

      onValue(userTasksQuery, (snapshot) => {
        const tasks = snapshot.exists()
          ? Object.entries(snapshot.val()).map(([id, data]) => ({ id, ...data }))
          : [];

        // Sort by due date and priority
        const sortedTasks = this.sortTasks(tasks, 'dueDate', 'asc');
        callback(sortedTasks);
      });

      return userTasksQuery;
    } catch (error) {
      console.error('Error subscribing to tasks by user:', error);
      throw error;
    }
  }

  /**
   * Subscribe to all tasks
   */
  subscribeToTasks(callback) {
    const sortByPriorityAndDueDate = (a, b) => {
      // First sort by status (incomplete tasks first)
      const statusOrder = { todo: 0, 'in-progress': 1, complete: 2, cancelled: 3 };
      const aStatusOrder = statusOrder[a.status] ?? 1;
      const bStatusOrder = statusOrder[b.status] ?? 1;

      if (aStatusOrder !== bStatusOrder) {
        return aStatusOrder - bStatusOrder;
      }

      // Then by priority
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const aPriority = priorityOrder[a.priority] ?? 2;
      const bPriority = priorityOrder[b.priority] ?? 2;

      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }

      // Finally by due date
      if (a.dueDate && !b.dueDate) return -1;
      if (!a.dueDate && b.dueDate) return 1;
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate) - new Date(b.dueDate);
      }

      return 0;
    };

    return this.subscribeToAll(callback, sortByPriorityAndDueDate);
  }

  /**
   * Subscribe to task comments
   */
  subscribeToTaskComments(taskId, callback) {
    try {
      const commentsRef = ref(firebaseCore.database, `taskComments/${taskId}`);

      onValue(commentsRef, (snapshot) => {
        const comments = snapshot.exists()
          ? Object.entries(snapshot.val())
              .map(([id, data]) => ({ id, ...data }))
              .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          : [];

        callback(comments);
      });

      return commentsRef;
    } catch (error) {
      console.error('Error subscribing to task comments:', error);
      throw error;
    }
  }

  // ==================== HELPER METHODS ====================

  /**
   * Sort tasks by various criteria
   */
  sortTasks(tasks, sortBy = 'priority', direction = 'asc') {
    return tasks.sort((a, b) => {
      let aVal, bVal;

      switch (sortBy) {
        case 'title':
          aVal = (a.title || '').toLowerCase();
          bVal = (b.title || '').toLowerCase();
          break;

        case 'priority': {
          const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
          aVal = priorityOrder[a.priority] ?? 2;
          bVal = priorityOrder[b.priority] ?? 2;
          break;
        }

        case 'status': {
          const statusOrder = { todo: 0, 'in-progress': 1, complete: 2, cancelled: 3 };
          aVal = statusOrder[a.status] ?? 1;
          bVal = statusOrder[b.status] ?? 1;
          break;
        }

        case 'dueDate':
          aVal = a.dueDate ? new Date(a.dueDate) : new Date('2099-12-31');
          bVal = b.dueDate ? new Date(b.dueDate) : new Date('2099-12-31');
          break;

        case 'progress':
          aVal = a.progress || 0;
          bVal = b.progress || 0;
          break;

        case 'estimatedHours':
          aVal = a.estimatedHours || 0;
          bVal = b.estimatedHours || 0;
          break;

        case 'createdAt':
          aVal = new Date(a.createdAt || 0);
          bVal = new Date(b.createdAt || 0);
          break;

        default:
          aVal = a[sortBy] || '';
          bVal = b[sortBy] || '';
      }

      if (direction === 'desc') {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
      return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
    });
  }

  /**
   * Validate task-specific data
   */
  validateTaskData(taskData) {
    // Tasks are project-independent, so only require title
    const validation = super.validateData(taskData, ['title']);

    // Add task-specific validations
    if (taskData.estimatedHours && taskData.estimatedHours < 0) {
      validation.errors.estimatedHours = 'Estimated hours cannot be negative';
      validation.isValid = false;
    }

    if (taskData.actualHours && taskData.actualHours < 0) {
      validation.errors.actualHours = 'Actual hours cannot be negative';
      validation.isValid = false;
    }

    if (taskData.progress && (taskData.progress < 0 || taskData.progress > 100)) {
      validation.errors.progress = 'Progress must be between 0 and 100';
      validation.isValid = false;
    }

    if (taskData.priority && !['critical', 'high', 'medium', 'low'].includes(taskData.priority)) {
      validation.errors.priority = 'Invalid priority. Must be: critical, high, medium, or low';
      validation.isValid = false;
    }

    if (
      taskData.status &&
      !['todo', 'in-progress', 'complete', 'cancelled'].includes(taskData.status)
    ) {
      validation.errors.status =
        'Invalid status. Must be: todo, in-progress, complete, or cancelled';
      validation.isValid = false;
    }

    if (taskData.dueDate && taskData.startDate) {
      if (new Date(taskData.startDate) > new Date(taskData.dueDate)) {
        validation.errors.dueDate = 'Due date cannot be before start date';
        validation.isValid = false;
      }
    }

    return validation;
  }

  /**
   * Check if task is overdue
   */
  isTaskOverdue(task) {
    if (!task.dueDate || task.status === 'complete' || task.status === 'cancelled') {
      return false;
    }

    return new Date(task.dueDate) < new Date();
  }

  /**
   * Get days until due date
   */
  getDaysUntilDue(task) {
    if (!task.dueDate) return null;

    const dueDate = new Date(task.dueDate);
    const today = new Date();
    const diffTime = dueDate - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Calculate task completion percentage for a project
   */
  calculateProjectTaskCompletion(tasks) {
    if (!tasks || tasks.length === 0) return 0;

    const completedTasks = tasks.filter((task) => task.status === 'complete').length;
    return Math.round((completedTasks / tasks.length) * 100);
  }
}

export default new TaskRepository();
