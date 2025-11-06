/**
 * Task Dependency Utilities
 *
 * Provides validation, calculation, and helper functions for managing
 * task dependencies in the construction tracker application.
 *
 * Key Features:
 * - Dependency completion tracking
 * - Circular dependency prevention
 * - Status transition validation
 * - Real-time dependency status calculation
 */

import { TASK_STATUSES } from '@/constants';

/**
 * Calculates the dependency completion status for a task
 *
 * @param {Object} task - The task to check
 * @param {Array} allTasks - All tasks in the project/context
 * @returns {Object} Dependency status information
 * @returns {number} return.complete - Number of completed dependencies
 * @returns {number} return.total - Total number of dependencies
 * @returns {number} return.percentage - Completion percentage (0-100)
 * @returns {boolean} return.allComplete - True if all dependencies are complete
 * @returns {Array} return.incompleteDeps - Array of incomplete dependency tasks
 * @returns {Array} return.completeDeps - Array of completed dependency tasks
 *
 * @example
 * const status = calculateDependencyStatus(task, allTasks)
 * console.log(`${status.complete}/${status.total} complete (${status.percentage}%)`)
 */
export function calculateDependencyStatus(task, allTasks) {
  // Handle tasks with no dependencies
  if (!task.dependencies || task.dependencies.length === 0) {
    return {
      complete: 0,
      total: 0,
      percentage: 100,
      allComplete: true,
      incompleteDeps: [],
      completeDeps: [],
    };
  }

  // Get actual dependency task objects
  const depTasks = task.dependencies
    .map((depId) => allTasks.find((t) => t.id === depId))
    .filter(Boolean); // Remove null/undefined (handles deleted dependencies)

  // Separate completed and incomplete dependencies
  const completeDeps = depTasks.filter((t) => t.status === TASK_STATUSES.COMPLETE);
  const incompleteDeps = depTasks.filter((t) => t.status !== TASK_STATUSES.COMPLETE);

  const completeCount = completeDeps.length;
  const totalCount = depTasks.length;

  return {
    complete: completeCount,
    total: totalCount,
    percentage: totalCount > 0 ? Math.round((completeCount / totalCount) * 100) : 0,
    allComplete: completeCount === totalCount && totalCount > 0,
    incompleteDeps,
    completeDeps,
  };
}

/**
 * Checks if all dependencies for a task are complete
 *
 * @param {Object} task - The task to check
 * @param {Array} allTasks - All tasks in the project/context
 * @returns {boolean} True if all dependencies are complete (or no dependencies exist)
 *
 * @example
 * if (checkDependenciesComplete(task, allTasks)) {
 *   console.log('Task can be completed')
 * }
 */
export function checkDependenciesComplete(task, allTasks) {
  const status = calculateDependencyStatus(task, allTasks);
  return status.allComplete;
}

/**
 * Gets list of incomplete dependency tasks
 *
 * @param {Object} task - The task to check
 * @param {Array} allTasks - All tasks in the project/context
 * @returns {Array} Array of incomplete dependency task objects
 *
 * @example
 * const blocked = getIncompleteDependencies(task, allTasks)
 * console.log(`Blocked by: ${blocked.map(t => t.title).join(', ')}`)
 */
export function getIncompleteDependencies(task, allTasks) {
  const status = calculateDependencyStatus(task, allTasks);
  return status.incompleteDeps;
}

/**
 * Gets list of tasks that depend on the given task (reverse lookup)
 *
 * @param {string} taskId - The task ID to find dependents for
 * @param {Array} allTasks - All tasks in the project/context
 * @returns {Array} Array of tasks that depend on this task
 *
 * @example
 * const dependents = getDependentTasks('task-123', allTasks)
 * console.log(`${dependents.length} tasks depend on this one`)
 */
export function getDependentTasks(taskId, allTasks) {
  return allTasks.filter((task) => task.dependencies && task.dependencies.includes(taskId));
}

/**
 * Validation rules for status transitions
 * Defines which status changes require dependencies to be complete
 */
const STATUS_TRANSITION_RULES = {
  [TASK_STATUSES.TODO]: {
    requiresDependenciesComplete: false,
    allowedFromStatuses: [
      TASK_STATUSES.IN_PROGRESS,
      TASK_STATUSES.COMPLETE,
      TASK_STATUSES.ON_HOLD,
      TASK_STATUSES.REVIEW,
    ],
  },
  [TASK_STATUSES.IN_PROGRESS]: {
    requiresDependenciesComplete: false,
    allowedFromStatuses: [
      TASK_STATUSES.TODO,
      TASK_STATUSES.REVIEW,
      TASK_STATUSES.ON_HOLD,
      TASK_STATUSES.COMPLETE,
    ],
  },
  [TASK_STATUSES.COMPLETE]: {
    requiresDependenciesComplete: true, // ENFORCED
    allowedFromStatuses: [TASK_STATUSES.IN_PROGRESS, TASK_STATUSES.REVIEW],
  },
  [TASK_STATUSES.REVIEW]: {
    requiresDependenciesComplete: false,
    allowedFromStatuses: [TASK_STATUSES.IN_PROGRESS, TASK_STATUSES.COMPLETE],
  },
  [TASK_STATUSES.ON_HOLD]: {
    requiresDependenciesComplete: false,
    allowedFromStatuses: [TASK_STATUSES.TODO, TASK_STATUSES.IN_PROGRESS, TASK_STATUSES.REVIEW],
  },
};

/**
 * Validates if a task can transition to a new status
 * Checks both dependency requirements and valid status transitions
 *
 * @param {Object} task - The task to check
 * @param {string} newStatus - The desired new status
 * @param {Array} allTasks - All tasks in the project/context
 * @returns {Object} Validation result
 * @returns {boolean} return.allowed - Whether the transition is allowed
 * @returns {string} return.reason - Human-readable reason if not allowed
 * @returns {Array} return.blockingTasks - Tasks blocking completion (if applicable)
 *
 * @example
 * const validation = canTransitionToStatus(task, 'complete', allTasks)
 * if (!validation.allowed) {
 *   alert(validation.reason)
 * }
 */
export function canTransitionToStatus(task, newStatus, allTasks) {
  // If status is not changing, allow it (no validation needed)
  if (task.status === newStatus) {
    return {
      allowed: true,
      reason: '',
      blockingTasks: [],
    };
  }

  // Get transition rules for target status
  const rules = STATUS_TRANSITION_RULES[newStatus];

  if (!rules) {
    return {
      allowed: false,
      reason: `Invalid status: ${newStatus}`,
      blockingTasks: [],
    };
  }

  // Check if current status allows transition to new status
  if (task.status && !rules.allowedFromStatuses.includes(task.status)) {
    return {
      allowed: false,
      reason: `Cannot transition from ${task.status} to ${newStatus}`,
      blockingTasks: [],
    };
  }

  // Check dependency requirements
  if (rules.requiresDependenciesComplete) {
    const depStatus = calculateDependencyStatus(task, allTasks);

    if (!depStatus.allComplete) {
      const incompleteTitles = depStatus.incompleteDeps.map((t) => t.title).join(', ');
      const count = depStatus.incompleteDeps.length;

      return {
        allowed: false,
        reason: `Cannot complete: ${count} ${count === 1 ? 'dependency is' : 'dependencies are'} incomplete (${incompleteTitles})`,
        blockingTasks: depStatus.incompleteDeps,
      };
    }
  }

  return {
    allowed: true,
    reason: '',
    blockingTasks: [],
  };
}

/**
 * Checks if adding a dependency would create a circular reference
 * Uses depth-first search to detect cycles in the dependency graph
 *
 * @param {string} taskId - The task that would receive the dependency
 * @param {string} newDepId - The task ID to add as a dependency
 * @param {Array} allTasks - All tasks in the project/context
 * @returns {boolean} True if adding the dependency would create a cycle
 *
 * @example
 * if (wouldCreateCircularDependency(taskA.id, taskB.id, allTasks)) {
 *   alert('Cannot add - would create circular dependency')
 * }
 */
export function wouldCreateCircularDependency(taskId, newDepId, allTasks) {
  // Cannot depend on itself (direct self-reference)
  if (taskId === newDepId) {
    return true;
  }

  // Check if newDepId transitively depends on taskId
  // If so, adding taskId → newDepId would create a cycle
  return hasTransitiveDependency(newDepId, taskId, allTasks, new Set());
}

/**
 * Recursively checks if a task transitively depends on a target task
 * Helper function for circular dependency detection
 *
 * @private
 * @param {string} startTaskId - The starting task ID
 * @param {string} targetTaskId - The target task ID to search for
 * @param {Array} allTasks - All tasks in the project/context
 * @param {Set} visited - Set of already visited task IDs (prevents infinite loops)
 * @returns {boolean} True if startTask transitively depends on targetTask
 */
function hasTransitiveDependency(startTaskId, targetTaskId, allTasks, visited) {
  // Prevent infinite loops in case of existing cycles
  if (visited.has(startTaskId)) {
    return false;
  }
  visited.add(startTaskId);

  // Find the starting task
  const startTask = allTasks.find((t) => t.id === startTaskId);

  if (!startTask || !startTask.dependencies || startTask.dependencies.length === 0) {
    return false;
  }

  // Direct dependency check
  if (startTask.dependencies.includes(targetTaskId)) {
    return true;
  }

  // Recursive transitive dependency check
  return startTask.dependencies.some((depId) =>
    hasTransitiveDependency(depId, targetTaskId, allTasks, visited)
  );
}

/**
 * Finds all circular dependency chains in a set of tasks
 * Useful for auditing existing tasks or debugging
 *
 * @param {Array} allTasks - All tasks to check
 * @returns {Array} Array of circular dependency chains found
 * @returns {Array} return[].cycle - Array of task IDs in the cycle
 * @returns {Array} return[].tasks - Array of task objects in the cycle
 *
 * @example
 * const cycles = findCircularDependencies(allTasks)
 * cycles.forEach(cycle => {
 *   console.log('Circular dependency:', cycle.tasks.map(t => t.title).join(' → '))
 * })
 */
export function findCircularDependencies(allTasks) {
  const cycles = [];
  const visited = new Set();
  const recursionStack = new Set();

  function detectCycle(taskId, path = []) {
    if (recursionStack.has(taskId)) {
      // Found a cycle - extract the cycle from path
      const cycleStart = path.indexOf(taskId);
      const cycle = path.slice(cycleStart);
      const cycleTasks = cycle.map((id) => allTasks.find((t) => t.id === id)).filter(Boolean);

      cycles.push({
        cycle,
        tasks: cycleTasks,
      });
      return;
    }

    if (visited.has(taskId)) {
      return;
    }

    const task = allTasks.find((t) => t.id === taskId);
    if (!task || !task.dependencies) {
      return;
    }

    visited.add(taskId);
    recursionStack.add(taskId);
    path.push(taskId);

    task.dependencies.forEach((depId) => {
      detectCycle(depId, [...path]);
    });

    recursionStack.delete(taskId);
  }

  // Check all tasks
  allTasks.forEach((task) => {
    if (!visited.has(task.id)) {
      detectCycle(task.id);
    }
  });

  return cycles;
}

/**
 * Calculates the dependency chain depth for a task
 * Returns the longest path from this task to a leaf task (no dependencies)
 *
 * @param {string} taskId - The task ID to calculate depth for
 * @param {Array} allTasks - All tasks in the project/context
 * @returns {number} The maximum dependency depth (0 if no dependencies)
 *
 * @example
 * const depth = calculateDependencyDepth(task.id, allTasks)
 * console.log(`This task is ${depth} levels deep`)
 */
export function calculateDependencyDepth(taskId, allTasks) {
  const task = allTasks.find((t) => t.id === taskId);

  if (!task || !task.dependencies || task.dependencies.length === 0) {
    return 0;
  }

  const depths = task.dependencies.map((depId) => calculateDependencyDepth(depId, allTasks));

  return 1 + Math.max(...depths, 0);
}

/**
 * Gets the complete dependency tree for a task (all transitive dependencies)
 *
 * @param {string} taskId - The task ID to get tree for
 * @param {Array} allTasks - All tasks in the project/context
 * @returns {Array} Array of all tasks this task depends on (directly or indirectly)
 *
 * @example
 * const tree = getDependencyTree(task.id, allTasks)
 * console.log(`This task depends on ${tree.length} total tasks`)
 */
export function getDependencyTree(taskId, allTasks, visited = new Set()) {
  if (visited.has(taskId)) {
    return [];
  }
  visited.add(taskId);

  const task = allTasks.find((t) => t.id === taskId);
  if (!task || !task.dependencies || task.dependencies.length === 0) {
    return [];
  }

  const directDeps = task.dependencies
    .map((depId) => allTasks.find((t) => t.id === depId))
    .filter(Boolean);

  const transitiveDeps = task.dependencies.flatMap((depId) =>
    getDependencyTree(depId, allTasks, visited)
  );

  // Combine and deduplicate
  const allDeps = [...directDeps, ...transitiveDeps];
  return Array.from(new Map(allDeps.map((t) => [t.id, t])).values());
}

/**
 * Checks if a task is ready to start (all dependencies complete or no dependencies)
 *
 * @param {Object} task - The task to check
 * @param {Array} allTasks - All tasks in the project/context
 * @returns {boolean} True if task is ready to start
 *
 * @example
 * if (isTaskReadyToStart(task, allTasks)) {
 *   console.log('Task can be started now')
 * }
 */
export function isTaskReadyToStart(task, allTasks) {
  // Already complete or in progress - consider "ready"
  if (task.status === TASK_STATUSES.COMPLETE || task.status === TASK_STATUSES.IN_PROGRESS) {
    return true;
  }

  // No dependencies - ready to start
  if (!task.dependencies || task.dependencies.length === 0) {
    return true;
  }

  // Check if all dependencies are complete
  return checkDependenciesComplete(task, allTasks);
}

/**
 * Calculates dependency progress percentage (0-100)
 * Convenience wrapper around calculateDependencyStatus
 *
 * @param {Object} task - The task to check
 * @param {Array} allTasks - All tasks in the project/context
 * @returns {number} Percentage (0-100)
 *
 * @example
 * const progress = getDependencyProgress(task, allTasks)
 * console.log(`${progress}% of dependencies complete`)
 */
export function getDependencyProgress(task, allTasks) {
  const status = calculateDependencyStatus(task, allTasks);
  return status.percentage;
}

/**
 * Gets a human-readable summary of task dependencies
 *
 * @param {Object} task - The task to summarize
 * @param {Array} allTasks - All tasks in the project/context
 * @returns {string} Human-readable dependency summary
 *
 * @example
 * const summary = getDependencySummary(task, allTasks)
 * console.log(summary) // "2/3 dependencies complete (67%)"
 */
export function getDependencySummary(task, allTasks) {
  const status = calculateDependencyStatus(task, allTasks);

  if (status.total === 0) {
    return 'No dependencies';
  }

  if (status.allComplete) {
    return `All ${status.total} ${status.total === 1 ? 'dependency' : 'dependencies'} complete`;
  }

  return `${status.complete}/${status.total} ${status.total === 1 ? 'dependency' : 'dependencies'} complete (${status.percentage}%)`;
}

/**
 * Validates a dependency array before saving
 * Checks for invalid IDs, self-references, and circular dependencies
 *
 * @param {string} taskId - The task ID that will have these dependencies
 * @param {Array} dependencyIds - Array of dependency task IDs
 * @param {Array} allTasks - All tasks in the project/context
 * @returns {Object} Validation result
 * @returns {boolean} return.valid - Whether dependencies are valid
 * @returns {Array} return.errors - Array of error messages
 * @returns {Array} return.warnings - Array of warning messages
 *
 * @example
 * const validation = validateDependencies(task.id, selectedDeps, allTasks)
 * if (!validation.valid) {
 *   alert(validation.errors.join('\n'))
 * }
 */
export function validateDependencies(taskId, dependencyIds, allTasks) {
  const errors = [];
  const warnings = [];

  if (!Array.isArray(dependencyIds)) {
    errors.push('Dependencies must be an array');
    return { valid: false, errors, warnings };
  }

  // Check for self-reference
  if (dependencyIds.includes(taskId)) {
    errors.push('A task cannot depend on itself');
  }

  // Check for non-existent tasks
  const invalidIds = dependencyIds.filter((depId) => !allTasks.find((t) => t.id === depId));
  if (invalidIds.length > 0) {
    errors.push(`Invalid task IDs: ${invalidIds.join(', ')}`);
  }

  // Check for circular dependencies
  dependencyIds.forEach((depId) => {
    if (wouldCreateCircularDependency(taskId, depId, allTasks)) {
      errors.push(`Adding dependency "${depId}" would create a circular reference`);
    }
  });

  // Warn about depending on completed tasks (informational)
  const completedDeps = dependencyIds.filter((depId) => {
    const dep = allTasks.find((t) => t.id === depId);
    return dep && dep.status === TASK_STATUSES.COMPLETE;
  });
  if (completedDeps.length > 0 && completedDeps.length === dependencyIds.length) {
    warnings.push('All dependencies are already complete');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Gets blocking tasks with formatted titles for display
 *
 * @param {Object} task - The task to check
 * @param {Array} allTasks - All tasks in the project/context
 * @returns {Array<string>} Array of blocking task titles
 *
 * @example
 * const blocking = getBlockingTaskTitles(task, allTasks)
 * console.log(`Blocked by: ${blocking.join(', ')}`)
 */
export function getBlockingTaskTitles(task, allTasks) {
  const incompleteDeps = getIncompleteDependencies(task, allTasks);
  return incompleteDeps.map((t) => t.title);
}

/**
 * Checks if a task is blocking other tasks (reverse dependency check)
 *
 * @param {string} taskId - The task ID to check
 * @param {Array} allTasks - All tasks in the project/context
 * @returns {boolean} True if other tasks depend on this one
 *
 * @example
 * if (isTaskBlockingOthers(task.id, allTasks)) {
 *   console.log('Other tasks are waiting on this one')
 * }
 */
export function isTaskBlockingOthers(taskId, allTasks) {
  return getDependentTasks(taskId, allTasks).length > 0;
}
