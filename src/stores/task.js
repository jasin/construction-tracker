// stores/task.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import TaskRepository from '@/services/firebase/Repositories/TaskRepository';
import { handleError } from '../utils/errorHandler';
import firebaseCore from '@/services/firebase/core/FirebaseCore';
import ActivityService from '@/services/logging/ActivityService.js';
import { ref as dbRef, query, orderByChild, equalTo, onValue } from 'firebase/database';

export const useTaskStore = defineStore('task', () => {
  // State - User Tasks (for dashboard)
  const userTasks = ref([]);
  const userTasksLoading = ref(true);
  const userTasksInitialized = ref(false);

  // State - Project Tasks (for project detail views)
  const projectTasks = ref([]);
  const projectTasksLoading = ref(false);
  const currentProjectId = ref(null);

  // State - Single Task (for detail view/editing)
  const currentTask = ref(null);
  const loading = ref(false);
  const error = ref(null);

  // Subscription management
  let userTasksUnsubscribe = null;
  let projectTasksUnsubscribe = null;
  const subscriptions = ref([]);

  // Getters - User Tasks
  const userTaskCount = computed(() => userTasks.value.length);

  const userActiveTasks = computed(() =>
    userTasks.value.filter((t) => t.status !== 'complete' && t.status !== 'cancelled')
  );

  const userOverdueTasks = computed(() => {
    const now = new Date();
    return userTasks.value.filter((t) => {
      return (
        t.dueDate &&
        new Date(t.dueDate) < now &&
        t.status !== 'complete' &&
        t.status !== 'cancelled'
      );
    });
  });

  const userTasksDueSoon = computed(() => {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + 7); // 7 days ahead

    return userTasks.value.filter((t) => {
      if (!t.dueDate || t.status === 'complete' || t.status === 'cancelled') {
        return false;
      }
      const dueDate = new Date(t.dueDate);
      return dueDate >= now && dueDate <= futureDate;
    });
  });

  const userTasksByStatus = computed(() => {
    const grouped = {};
    userTasks.value.forEach((task) => {
      const status = task.status || 'todo';
      if (!grouped[status]) grouped[status] = [];
      grouped[status].push(task);
    });
    return grouped;
  });

  const userTasksByPriority = computed(() => {
    const grouped = {};
    userTasks.value.forEach((task) => {
      const priority = task.priority || 'medium';
      if (!grouped[priority]) grouped[priority] = [];
      grouped[priority].push(task);
    });
    return grouped;
  });

  // Getters - Project Tasks
  const projectTaskCount = computed(() => projectTasks.value.length);

  const projectActiveTasksCount = computed(
    () =>
      projectTasks.value.filter((t) => t.status !== 'complete' && t.status !== 'cancelled').length
  );

  const projectTaskCompletion = computed(() => {
    if (projectTasks.value.length === 0) return 0;
    const completed = projectTasks.value.filter((t) => t.status === 'complete').length;
    return Math.round((completed / projectTasks.value.length) * 100);
  });

  // Actions - User Tasks Subscription (for dashboard)
  /**
   * Initializes real-time subscription to current user's tasks
   * Subscribes to all tasks assigned to the current user across all projects
   */
  function initializeUserTasksSubscription() {
    if (userTasksUnsubscribe) {
      console.log('⚠️ User tasks subscription already active');
      return;
    }

    const currentUserId = firebaseCore.getCurrentUserId();
    if (!currentUserId || currentUserId === 'system') {
      console.warn('Task Store: No authenticated user, skipping user tasks subscription');
      userTasksLoading.value = false;
      return;
    }

    console.log('🔥 Initializing user tasks subscription for user:', currentUserId);

    const tasksRef = dbRef(firebaseCore.database, 'tasks');
    const userTasksQuery = query(tasksRef, orderByChild('assignedTo'), equalTo(currentUserId));

    const unsubscribe = onValue(userTasksQuery, (snapshot) => {
      const tasks = snapshot.exists()
        ? Object.entries(snapshot.val()).map(([id, data]) => ({ id, ...data }))
        : [];

      console.log('📦 Store received user tasks update:', tasks.length, 'tasks');

      userTasks.value = tasks;
      userTasksLoading.value = false;
      userTasksInitialized.value = true;
    });

    userTasksUnsubscribe = unsubscribe;
    console.log('✅ User tasks subscription started');
  }

  /**
   * Cleans up user tasks subscription
   */
  function cleanupUserTasksSubscription() {
    if (userTasksUnsubscribe) {
      console.log('🧹 Cleaning up user tasks subscription');
      userTasksUnsubscribe();
      userTasksUnsubscribe = null;
      userTasksInitialized.value = false;
      userTasks.value = [];
      userTasksLoading.value = true;
    }
  }

  // Actions - Project Tasks Subscription (for project detail view)
  /**
   * Initializes real-time subscription to tasks for a specific project
   * Shows all tasks for the project regardless of assignee
   * @param {string} projectId - The project ID to subscribe to
   */
  function initializeProjectTasksSubscription(projectId) {
    if (!projectId) {
      console.warn('Task Store: No projectId provided for project tasks subscription');
      return;
    }

    // Clean up existing subscription if switching projects
    if (projectTasksUnsubscribe && currentProjectId.value !== projectId) {
      console.log('🧹 Cleaning up previous project tasks subscription');
      projectTasksUnsubscribe();
      projectTasksUnsubscribe = null;
    }

    if (currentProjectId.value === projectId && projectTasksUnsubscribe) {
      console.log('✅ Project tasks subscription already active for:', projectId);
      return;
    }

    console.log('🔥 Initializing project tasks subscription for project:', projectId);
    projectTasksLoading.value = true;
    currentProjectId.value = projectId;

    const tasksRef = dbRef(firebaseCore.database, 'tasks');
    const projectTasksQuery = query(tasksRef, orderByChild('projectId'), equalTo(projectId));

    const unsubscribe = onValue(projectTasksQuery, (snapshot) => {
      const tasks = snapshot.exists()
        ? Object.entries(snapshot.val()).map(([id, data]) => ({ id, ...data }))
        : [];

      console.log(
        '📦 Store received project tasks update:',
        tasks.length,
        'tasks for project',
        projectId
      );
      projectTasks.value = tasks;
      projectTasksLoading.value = false;
    });

    projectTasksUnsubscribe = unsubscribe;
    console.log('✅ Project tasks subscription started for:', projectId);
  }

  /**
   * Cleans up project tasks subscription
   */
  function cleanupProjectTasksSubscription() {
    if (projectTasksUnsubscribe) {
      console.log('🧹 Cleaning up project tasks subscription');
      projectTasksUnsubscribe();
      projectTasksUnsubscribe = null;
      currentProjectId.value = null;
      projectTasks.value = [];
      projectTasksLoading.value = false;
    }
  }

  // Actions - Single Task Operations
  /**
   * Loads a single task by ID
   * @param {string} taskId - The ID of the task to load
   * @returns {Promise<Object|null>} Loaded task data or null if not found
   */
  async function loadTask(taskId) {
    loading.value = true;
    error.value = null;

    try {
      const taskData = await TaskRepository.getById(taskId);
      console.log('Repository getById result for task', taskId, ':', taskData);

      if (taskData) {
        currentTask.value = taskData;
        console.log('loadTask success:', taskData);
        return taskData;
      } else {
        error.value = 'Task not found';
        return null;
      }
    } catch (err) {
      console.error('loadTask error:', err);
      error.value = err.message || 'Failed to load task';
      handleError(err, `Load task ${taskId}`);
      return null;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Creates a new task with validation and activity logging
   * @param {Object} taskData - The task data to create
   * @returns {Promise<Object|null>} Created task or null on failure
   */
  async function createTask(taskData) {
    loading.value = true;
    error.value = null;

    try {
      const newTask = await TaskRepository.createTask(taskData);

      if (!newTask) {
        throw new Error('Task creation failed - no data returned');
      }

      console.log('✅ Task created:', newTask.id);

      // Note: Activity logging is handled in TaskRepository.createTask
      // User tasks subscription will auto-update if assigned to current user
      // Project tasks subscription will auto-update if for current project

      return newTask;
    } catch (err) {
      console.error('Error creating task:', err);
      error.value = err.message || 'Failed to create task';
      handleError(err, 'Task creation failed');
      return null;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Updates an existing task
   * @param {string} taskId - The ID of the task to update
   * @param {Object} updates - The updates to apply
   * @returns {Promise<Object|null>} Updated task or null on failure
   */
  async function updateTask(taskId, updates) {
    if (!taskId || !updates) {
      console.warn('Invalid parameters for updateTask');
      return null;
    }

    loading.value = true;
    error.value = null;

    try {
      const updatedTask = await TaskRepository.updateTask(taskId, updates);

      if (!updatedTask) {
        throw new Error('Task update failed - no data returned');
      }

      console.log('✅ Task updated:', taskId);

      // Update currentTask if it's the one being updated
      if (currentTask.value?.id === taskId) {
        currentTask.value = updatedTask;
      }

      // Note: Activity logging is handled in TaskRepository.updateTask
      // Subscriptions will auto-update

      return updatedTask;
    } catch (err) {
      console.error('Error updating task:', err);
      error.value = err.message || 'Failed to update task';
      handleError(err, `Task update failed for ${taskId}`);
      return null;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Deletes a task
   * @param {string} taskId - The ID of the task to delete
   * @returns {Promise<boolean>} Success status
   */
  async function deleteTask(taskId) {
    if (!taskId) {
      console.warn('No taskId provided for deleteTask');
      return false;
    }

    loading.value = true;
    error.value = null;

    try {
      await TaskRepository.deleteTask(taskId);

      console.log('✅ Task deleted:', taskId);

      // Clear currentTask if it's the one being deleted
      if (currentTask.value?.id === taskId) {
        currentTask.value = null;
      }

      // Note: Activity logging is handled in TaskRepository.deleteTask
      // Subscriptions will auto-update

      return true;
    } catch (err) {
      console.error('Error deleting task:', err);
      error.value = err.message || 'Failed to delete task';
      handleError(err, `Task deletion failed for ${taskId}`);
      return false;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Quick action: Mark task as complete
   * @param {string} taskId - The ID of the task to complete
   * @returns {Promise<Object|null>} Updated task or null on failure
   */
  async function completeTask(taskId) {
    return await updateTask(taskId, {
      status: 'complete',
      completedAt: new Date().toISOString(),
      progress: 100,
    });
  }

  /**
   * Quick action: Reopen a completed task
   * @param {string} taskId - The ID of the task to reopen
   * @returns {Promise<Object|null>} Updated task or null on failure
   */
  async function reopenTask(taskId) {
    return await updateTask(taskId, {
      status: 'todo',
      completedAt: null,
    });
  }

  /**
   * Search tasks (searches within userTasks or projectTasks based on context)
   * @param {string} searchTerm - The search term
   * @param {string} scope - 'user' or 'project'
   * @returns {Array} Filtered tasks
   */
  function searchTasks(searchTerm, scope = 'user') {
    if (!searchTerm) {
      return scope === 'user' ? userTasks.value : projectTasks.value;
    }

    const tasksToSearch = scope === 'user' ? userTasks.value : projectTasks.value;
    const term = searchTerm.toLowerCase().trim();

    return tasksToSearch.filter((task) => {
      return (
        task.title?.toLowerCase().includes(term) ||
        task.description?.toLowerCase().includes(term) ||
        task.assignedToName?.toLowerCase().includes(term) ||
        task.tags?.some((tag) => tag.toLowerCase().includes(term))
      );
    });
  }

  /**
   * Clear current task
   */
  function clearCurrentTask() {
    currentTask.value = null;
    error.value = null;
  }

  /**
   * Clear all subscriptions
   */
  function clearAllSubscriptions() {
    cleanupUserTasksSubscription();
    cleanupProjectTasksSubscription();

    if (subscriptions.value && Array.isArray(subscriptions.value)) {
      console.log('🧹 Clearing', subscriptions.value.length, 'task subscriptions');
      subscriptions.value
        .filter((s) => typeof s === 'function')
        .forEach((unsub) => {
          try {
            unsub();
          } catch (err) {
            console.warn('Task unsubscribe call failed:', err);
          }
        });
      subscriptions.value = [];
    }
  }

  return {
    // State - User Tasks
    userTasks,
    userTasksLoading,
    userTasksInitialized,

    // State - Project Tasks
    projectTasks,
    projectTasksLoading,
    currentProjectId,

    // State - Single Task
    currentTask,
    loading,
    error,

    // Getters - User Tasks
    userTaskCount,
    userActiveTasks,
    userOverdueTasks,
    userTasksDueSoon,
    userTasksByStatus,
    userTasksByPriority,

    // Getters - Project Tasks
    projectTaskCount,
    projectActiveTasksCount,
    projectTaskCompletion,

    // Actions - Subscriptions
    initializeUserTasksSubscription,
    cleanupUserTasksSubscription,
    initializeProjectTasksSubscription,
    cleanupProjectTasksSubscription,
    clearAllSubscriptions,

    // Actions - CRUD Operations
    loadTask,
    createTask,
    updateTask,
    deleteTask,
    completeTask,
    reopenTask,

    // Actions - Utilities
    searchTasks,
    clearCurrentTask,
  };
});
