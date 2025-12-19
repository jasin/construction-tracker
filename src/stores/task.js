// stores/task.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import {
  getAllTasks,
  getTaskById,
  getTasksByProject,
  getTasksByAssignee,
  createTask as createTaskApi,
  updateTask as updateTaskApi,
  deleteTask as deleteTaskApi,
} from '@/services/api/tasksApi';
import { handleError } from '../utils/errorHandler';
import { supabase } from '@/configs/supabase';
import { useAuthStore } from './auth';

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
  async function initializeUserTasksSubscription() {
    const authStore = useAuthStore();
    const currentUserId = authStore.user?.id;

    if (!currentUserId) {
      console.warn('Task Store: No authenticated user, skipping user tasks subscription');
      userTasksLoading.value = false;
      return;
    }

    console.log('🔥 Initializing user tasks subscription for user:', currentUserId);

    try {
      // Initial load from API
      userTasksLoading.value = true;
      const tasksData = await getTasksByAssignee(currentUserId);
      userTasks.value = tasksData || [];
      console.log('📦 Initial user tasks loaded:', userTasks.value.length, 'tasks');
      userTasksLoading.value = false;
      userTasksInitialized.value = true;

      // Subscribe to real-time changes via Supabase
      const channel = supabase
        .channel('user-tasks-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tasks',
            filter: `assigned_to=eq.${currentUserId}`,
          },
          (payload) => {
            console.log('📡 Supabase real-time event on user tasks:', payload);

            if (payload.eventType === 'INSERT') {
              userTasks.value.push(payload.new);
            } else if (payload.eventType === 'UPDATE') {
              const index = userTasks.value.findIndex((t) => t.id === payload.new.id);
              if (index !== -1) {
                userTasks.value[index] = payload.new;
              } else {
                // Task was reassigned to current user
                userTasks.value.push(payload.new);
              }
            } else if (payload.eventType === 'DELETE') {
              userTasks.value = userTasks.value.filter((t) => t.id !== payload.old.id);
            }
          }
        )
        .subscribe();

      subscriptions.value.push(() => supabase.removeChannel(channel));
      console.log('✅ User tasks subscription started');
    } catch (err) {
      console.error('Error initializing user tasks subscription:', err);
      userTasksLoading.value = false;
      handleError(err, 'Initialize user tasks subscription');
    }
  }

  /**
   * Cleans up user tasks subscription
   */
  function cleanupUserTasksSubscription() {
    console.log('🧹 Cleaning up user tasks subscription');
    userTasksInitialized.value = false;
    userTasks.value = [];
    userTasksLoading.value = true;
  }

  // Actions - Project Tasks Subscription (for project detail view)
  /**
   * Initializes real-time subscription to tasks for a specific project
   * Shows all tasks for the project regardless of assignee
   * @param {string} projectId - The project ID to subscribe to
   */
  async function initializeProjectTasksSubscription(projectId) {
    if (!projectId) {
      console.warn('Task Store: No projectId provided for project tasks subscription');
      return;
    }

    // Clean up existing subscription if switching projects
    if (currentProjectId.value && currentProjectId.value !== projectId) {
      console.log('🧹 Cleaning up previous project tasks subscription');
      cleanupProjectTasksSubscription();
    }

    if (currentProjectId.value === projectId) {
      console.log('✅ Project tasks subscription already active for:', projectId);
      return;
    }

    console.log('🔥 Initializing project tasks subscription for project:', projectId);
    projectTasksLoading.value = true;
    currentProjectId.value = projectId;

    try {
      // Initial load from API
      const tasksData = await getTasksByProject(projectId);
      projectTasks.value = tasksData || [];
      console.log('📦 Initial project tasks loaded:', projectTasks.value.length, 'tasks');
      projectTasksLoading.value = false;

      // Subscribe to real-time changes via Supabase
      const channel = supabase
        .channel(`project-${projectId}-tasks`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tasks',
            filter: `project_id=eq.${projectId}`,
          },
          (payload) => {
            console.log('📡 Supabase real-time event on project tasks:', payload);

            if (payload.eventType === 'INSERT') {
              projectTasks.value.push(payload.new);
            } else if (payload.eventType === 'UPDATE') {
              const index = projectTasks.value.findIndex((t) => t.id === payload.new.id);
              if (index !== -1) {
                projectTasks.value[index] = payload.new;
              }
            } else if (payload.eventType === 'DELETE') {
              projectTasks.value = projectTasks.value.filter((t) => t.id !== payload.old.id);
            }
          }
        )
        .subscribe();

      subscriptions.value.push(() => supabase.removeChannel(channel));
      console.log('✅ Project tasks subscription started for:', projectId);
    } catch (err) {
      console.error('Error initializing project tasks subscription:', err);
      projectTasksLoading.value = false;
      handleError(err, `Initialize project tasks subscription for ${projectId}`);
    }
  }

  /**
   * Cleans up project tasks subscription
   */
  function cleanupProjectTasksSubscription() {
    console.log('🧹 Cleaning up project tasks subscription');
    currentProjectId.value = null;
    projectTasks.value = [];
    projectTasksLoading.value = false;
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
      const taskData = await getTaskById(taskId);
      console.log('API getById result for task', taskId, ':', taskData);

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
      const newTask = await createTaskApi(taskData);

      if (!newTask) {
        throw new Error('Task creation failed - no data returned');
      }

      console.log('✅ Task created:', newTask.id);

      // Note: Activity logging is handled by backend
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
      const updatedTask = await updateTaskApi(taskId, updates);

      if (!updatedTask) {
        throw new Error('Task update failed - no data returned');
      }

      console.log('✅ Task updated:', taskId);

      // Update currentTask if it's the one being updated
      if (currentTask.value?.id === taskId) {
        currentTask.value = updatedTask;
      }

      // Note: Activity logging is handled by backend
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
      await deleteTaskApi(taskId);

      console.log('✅ Task deleted:', taskId);

      // Clear currentTask if it's the one being deleted
      if (currentTask.value?.id === taskId) {
        currentTask.value = null;
      }

      // Note: Activity logging is handled by backend
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
    // Load the task to check its current status
    const task = await loadTask(taskId);

    if (!task) {
      console.error('Cannot reopen task - task not found:', taskId);
      return null;
    }

    // If already in todo or in-progress, just clear completedAt
    if (task.status === 'todo' || task.status === 'in-progress') {
      return await updateTask(taskId, {
        completedAt: null,
        progress: task.status === 'in-progress' ? task.progress || 50 : 0,
      });
    }

    // Otherwise transition to in-progress (not todo) since user was working on it
    return await updateTask(taskId, {
      status: 'in-progress',
      completedAt: null,
      progress: 50,
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
      subscriptions.value.forEach((unsub) => {
        try {
          if (typeof unsub === 'function') {
            unsub();
          }
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
