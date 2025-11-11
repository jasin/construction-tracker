<template>
  <div class="task-list">
    <div class="task-list-header">
      <h3 class="text-base font-semibold text-surface-900">{{ title }}</h3>
    </div>

    <div v-if="loading" class="flex justify-center py-8">
      <ProgressSpinner style="width: 50px; height: 50px" />
    </div>

    <div v-else-if="!tasks || tasks.length === 0" class="no-data">
      <i class="pi pi-inbox text-4xl text-surface-400 mb-2"></i>
      <p class="text-surface-600">{{ emptyMessage }}</p>
    </div>

    <div v-else class="task-accordion">
      <div
        v-for="(task, index) in sortedTasks"
        :key="task.id"
        class="task-accordion-panel"
        :class="[
          getTaskStatusClass(task),
          { 'is-expanded': expandedTaskId === task.id },
          `priority-${task.priority}`,
          `status-${task.status}`,
        ]"
      >
        <!-- Collapsed View: Single Line -->
        <div class="task-accordion-header">
          <div class="task-row">
            <!-- Status Icon with Dropdown -->
            <div class="status-control">
              <button
                class="status-icon-button"
                :class="`status-${task.status}`"
                :title="getStatusTooltip(task)"
              >
                <i :class="getStatusIcon(task)"></i>
              </button>
            </div>

            <!-- Task Title (Clickable for expand/collapse) -->
            <div
              class="task-title-area"
              :class="{ 'line-through': task.status === 'complete' }"
              @click="toggleExpanded(task.id)"
            >
              <span class="task-title">
                {{ task.title }}
              </span>
            </div>

            <!-- Action Buttons (Always Visible) -->
            <div class="task-actions">
              <Button
                icon="pi pi-pencil"
                severity="secondary"
                text
                rounded
                size="small"
                @click.stop="handleEditTask(task)"
                v-tooltip.top="'Edit task'"
              />
              <Button
                icon="pi pi-trash"
                severity="danger"
                text
                rounded
                size="small"
                @click.stop="handleDeleteTask(task)"
                v-tooltip.top="'Delete task'"
              />
            </div>
          </div>
        </div>

        <!-- Expanded View: Full Task Card -->
        <div v-if="expandedTaskId === task.id" class="task-accordion-content">
          <div class="task-card-expanded">
            <!-- Expanded Header: Status Icons on Left, Tags on Right -->
            <div class="task-expanded-header">
              <div class="status-icons-row">
                <button
                  v-for="status in statusOptions"
                  :key="status.value"
                  class="status-icon-option"
                  :class="[`status-${status.value}`, { active: task.status === status.value }]"
                  @click="handleStatusChange(task, status.value)"
                  :title="status.label"
                >
                  <i :class="getStatusIconForValue(status.value)"></i>
                </button>
              </div>

              <div class="task-tags-row">
                <Tag
                  :value="formatPriority(task.priority)"
                  size="small"
                  :severity="getPrioritySeverity(task.priority)"
                  class="text-[10px] font-normal"
                />
                <Tag
                  :value="formatStatus(task.status)"
                  size="small"
                  :severity="'secondary'"
                  class="text-[10px] font-normal"
                />
              </div>
            </div>

            <!-- Project Name (if shown) -->
            <div v-if="showProjectName && task.projectId" class="task-project">
              <i class="pi pi-briefcase text-xs"></i>
              <span class="text-xs text-surface-700">{{ getProjectName(task.projectId) }}</span>
            </div>

            <!-- Description -->
            <div v-if="task.description" class="task-description">
              <div class="text-xs text-surface-800 whitespace-pre-wrap">{{ task.description }}</div>
            </div>

            <!-- Assignee, Due Date, and Actions in same row -->
            <div class="flex justify-between items-center">
              <div class="flex gap-4">
                <div v-if="task.assignedTo" class="task-assignee">
                  <i class="pi pi-user text-xs"></i>
                  <span class="text-xs text-surface-700">{{ getAssigneeName(task) }}</span>
                </div>

                <div v-if="task.dueDate" class="task-due-date">
                  <i class="pi pi-calendar text-xs"></i>
                  <span class="text-xs" :class="getDueDateClass(task)">
                    {{ formatDueDate(task.dueDate) }}
                  </span>
                </div>
              </div>

              <div class="task-expanded-actions">
                <Button
                  icon="pi pi-pencil"
                  severity="secondary"
                  text
                  rounded
                  size="small"
                  @click.stop="handleEditTask(task)"
                  v-tooltip.top="'Edit task'"
                />
                <Button
                  icon="pi pi-trash"
                  severity="danger"
                  text
                  rounded
                  size="small"
                  @click.stop="handleDeleteTask(task)"
                  v-tooltip.top="'Delete task'"
                />
              </div>
            </div>

            <!-- Dependencies -->
            <div v-if="hasDependencies(task)" class="task-dependencies">
              <div class="dependency-header">
                <i class="pi pi-link text-xs"></i>
                <span class="text-sm font-medium text-surface-800">Dependencies</span>
              </div>
              <ProgressBar
                :value="getDependencyStatus(task).percentage"
                :severity="getDependencyProgressSeverity(task)"
                :showValue="false"
                class="mb-2"
                style="height: 6px"
              />
              <div class="text-xs text-surface-600">
                {{ getDependencyStatus(task).complete }} of
                {{ getDependencyStatus(task).total }} completed
              </div>
              <div
                v-if="!getDependencyStatus(task).allComplete"
                class="text-xs text-orange-600 mt-1"
              >
                <i class="pi pi-exclamation-triangle"></i>
                Blocked by: {{ getBlockedByText(task) }}
              </div>
            </div>

            <!-- Estimated Hours -->
            <div v-if="task.estimatedHours" class="task-estimated-hours">
              <i class="pi pi-clock text-xs"></i>
              <span class="text-xs text-surface-700">{{ task.estimatedHours }}h estimated</span>
            </div>

            <!-- Category -->
            <div v-if="task.category" class="task-category">
              <i class="pi pi-tag text-xs"></i>
              <span class="text-xs text-surface-700">{{ task.category }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue';
import { useProjectStore } from '@/stores/project';
import { useUserSettingsStore } from '@/stores/userSettings';
import { useUsers } from '@/composables/useUsers';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import ProgressBar from 'primevue/progressbar';
import ProgressSpinner from 'primevue/progressspinner';
import {
  calculateDependencyStatus,
  canTransitionToStatus,
  getIncompleteDependencies,
} from '@/utils/taskDependencies';
import { TASK_STATUSES } from '@/constants';

// Computed for description expansion mode

// Props
const props = defineProps({
  tasks: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    default: 'Tasks',
  },
  emptyMessage: {
    type: String,
    default: 'No tasks found',
  },
  showCreateButton: {
    type: Boolean,
    default: false,
  },
  showProjectName: {
    type: Boolean,
    default: false,
  },
  sortBy: {
    type: String,
    default: 'priority', // 'dueDate', 'priority', 'status', 'title'
  },
  filterCompletedTasks: {
    type: Boolean,
    default: true, // Enable filtering by default
  },
});

// Emits
const emit = defineEmits([
  'task-click',
  'create-task',
  'toggle-complete',
  'status-change',
  'edit-task',
  'delete-task',
]);

// Local state
const activeDropdown = ref(null);
const expandedTaskId = ref(null); // Currently expanded task ID (null = all collapsed)

// Status options for dropdown
const statusOptions = [
  { label: 'To Do', value: TASK_STATUSES.TODO },
  { label: 'In Progress', value: TASK_STATUSES.IN_PROGRESS },
  { label: 'Review', value: TASK_STATUSES.REVIEW },
  { label: 'On Hold', value: TASK_STATUSES.ON_HOLD },
  { label: 'Complete', value: TASK_STATUSES.COMPLETE },
];

// Stores
const projectStore = useProjectStore();
const userSettingsStore = useUserSettingsStore();

// Users composable for name resolution
const { getUserName, loadActiveUsers } = useUsers();

// Load users on mount for name resolution
onMounted(async () => {
  await loadActiveUsers();
});

// Helper function to resolve assignee name
const getAssigneeName = (task) => {
  // If task already has assignedToName, use it
  if (task.assignedToName) {
    return task.assignedToName;
  }
  // Otherwise, look up the user by ID
  if (task.assignedTo) {
    return getUserName(task.assignedTo, 'Unassigned');
  }
  return 'Unassigned';
};

// Computed
const filteredTasks = computed(() => {
  if (!props.tasks || props.tasks.length === 0) return [];

  // Filter completed tasks based on settings
  if (props.filterCompletedTasks && userSettingsStore.completedTasksFilterEnabled) {
    const cutoffDate = userSettingsStore.getCompletedTasksCutoffDate();

    if (cutoffDate) {
      return props.tasks.filter((task) => {
        // Always show non-completed tasks
        if (task.status !== 'complete') return true;

        // For completed tasks, check if they were completed within the time period
        // Use completedAt first (most accurate), then fallback to updatedAt, then show by default
        let completionDate = null;

        if (task.completedAt) {
          // completedAt is the most accurate date for when task was marked complete
          completionDate = new Date(task.completedAt);
        } else if (task.updatedAt) {
          // Fallback to updatedAt for tasks that might have been completed before we added completedAt
          completionDate = new Date(task.updatedAt);
        } else {
          // No completion date found - show it by default (legacy tasks)
          return true;
        }

        // Filter based on the cutoff date
        return completionDate >= cutoffDate;
      });
    }
  }

  return props.tasks;
});

const sortedTasks = computed(() => {
  if (!filteredTasks.value || filteredTasks.value.length === 0) return [];

  const tasksCopy = [...filteredTasks.value];

  return tasksCopy.sort((a, b) => {
    // Primary sort: by status order (active statuses before completed)
    // Order: todo -> in-progress -> review -> on-hold -> complete -> cancelled
    const statusOrder = {
      todo: 0,
      'in-progress': 1,
      review: 2,
      'on-hold': 3,
      complete: 4,
      cancelled: 5,
    };
    const aStatusOrder = statusOrder[a.status] ?? 0;
    const bStatusOrder = statusOrder[b.status] ?? 0;
    if (aStatusOrder !== bStatusOrder) return aStatusOrder - bStatusOrder;

    // Secondary sort: For non-completed tasks, sort by priority then by sortBy prop
    // For completed tasks, sort by completion date (most recent first)
    if (a.status === 'complete' && b.status === 'complete') {
      // Get completion date - use completedAt first (most accurate), then updatedAt, then createdAt
      const aCompleted = new Date(a.completedAt || a.updatedAt || a.createdAt || 0);
      const bCompleted = new Date(b.completedAt || b.updatedAt || b.createdAt || 0);
      return bCompleted - aCompleted; // Most recently completed first
    }

    // For non-completed tasks, first sort by priority
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const aPriority = priorityOrder[a.priority] ?? 2;
    const bPriority = priorityOrder[b.priority] ?? 2;
    if (aPriority !== bPriority) return aPriority - bPriority;

    // Then apply the requested secondary sort
    switch (props.sortBy) {
      case 'priority': {
        // Already sorted by priority above
        break;
      }

      case 'dueDate': {
        const aDate = a.dueDate ? new Date(a.dueDate) : new Date('2099-12-31');
        const bDate = b.dueDate ? new Date(b.dueDate) : new Date('2099-12-31');
        if (aDate.getTime() !== bDate.getTime()) return aDate - bDate;
        break;
      }

      case 'title': {
        const aTitle = (a.title || '').toLowerCase();
        const bTitle = (b.title || '').toLowerCase();
        if (aTitle !== bTitle) return aTitle.localeCompare(bTitle);
        break;
      }
    }

    // Final tiebreaker: due date, then created date (newest first)
    if (a.dueDate && b.dueDate) {
      const aDue = new Date(a.dueDate);
      const bDue = new Date(b.dueDate);
      if (aDue.getTime() !== bDue.getTime()) return aDue - bDue;
    }

    const aCreated = new Date(a.createdAt || 0);
    const bCreated = new Date(b.createdAt || 0);
    return bCreated - aCreated;
  });
});

// Methods
const handleTaskClick = (task) => {
  emit('task-click', task);
};

const handleCreateTask = () => {
  emit('create-task');
};

const handleToggleComplete = (task) => {
  emit('toggle-complete', task);
};

const formatPriority = (priority) => {
  const priorityMap = {
    critical: 'Critical',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
  };
  return priorityMap[priority] || 'Medium';
};

const getPrioritySeverity = (priority) => {
  const severityMap = {
    critical: 'danger',
    high: 'warn',
    medium: 'info',
    low: 'secondary',
  };
  return severityMap[priority] || 'info';
};

const formatStatus = (status) => {
  const statusMap = {
    todo: 'To Do',
    'in-progress': 'In Progress',
    review: 'Review',
    complete: 'Complete',
    cancelled: 'Cancelled',
    'on-hold': 'On Hold',
  };
  return statusMap[status] || status;
};

const getStatusSeverity = (status) => {
  const severityMap = {
    todo: 'secondary',
    'in-progress': 'info',
    review: 'warn',
    complete: 'success',
    cancelled: 'danger',
    'on-hold': 'secondary',
  };
  return severityMap[status] || 'secondary';
};

const formatDueDate = (dueDate) => {
  if (!dueDate) return 'No due date';

  const date = new Date(dueDate);
  const now = new Date();
  const diffTime = date - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''}`;
  } else if (diffDays === 0) {
    return 'Due today';
  } else if (diffDays === 1) {
    return 'Due tomorrow';
  } else if (diffDays <= 7) {
    return `Due in ${diffDays} days`;
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
};

const isOverdue = (task) => {
  if (!task.dueDate || task.status === 'complete' || task.status === 'cancelled') {
    return false;
  }
  return new Date(task.dueDate) < new Date();
};

const getDueDateClass = (task) => {
  if (isOverdue(task)) {
    return 'text-red-600 font-semibold';
  }

  if (!task.dueDate) return '';

  const date = new Date(task.dueDate);
  const now = new Date();
  const diffDays = Math.ceil((date - now) / (1000 * 60 * 60 * 24));

  if (diffDays <= 3) {
    return 'text-orange-600 font-semibold';
  }

  return '';
};

const getTaskStatusClass = (task) => {
  if (task.status === 'complete') return 'task-completed';
  if (isOverdue(task)) return 'task-overdue';
  return '';
};

const truncateText = (text, maxLength) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

const getProjectName = (projectId) => {
  const project = projectStore.getProjectById(projectId);
  return project ? project.name : 'Unknown Project';
};

// Dependency helper methods
const hasDependencies = (task) => {
  return task.dependencies && Array.isArray(task.dependencies) && task.dependencies.length > 0;
};

const getDependencyStatus = (task) => {
  if (!hasDependencies(task)) {
    return {
      complete: 0,
      total: 0,
      percentage: 100,
      allComplete: true,
      incompleteDeps: [],
    };
  }

  return calculateDependencyStatus(task, props.tasks);
};

const getDependencyProgressSeverity = (task) => {
  const status = getDependencyStatus(task);
  const percentage = status.percentage;

  if (percentage === 100) return 'success';
  if (percentage >= 67) return 'info';
  if (percentage >= 34) return 'warn';
  return 'danger';
};

const getBlockedByText = (task) => {
  const incompleteDeps = getIncompleteDependencies(task, props.tasks);

  if (incompleteDeps.length === 0) return '';
  if (incompleteDeps.length === 1) return incompleteDeps[0].title;
  if (incompleteDeps.length === 2) {
    return `${incompleteDeps[0].title}, ${incompleteDeps[1].title}`;
  }

  return `${incompleteDeps[0].title} and ${incompleteDeps.length - 1} other${incompleteDeps.length - 1 > 1 ? 's' : ''}`;
};

// Status Icon Methods
const getStatusIcon = (task) => {
  const iconMap = {
    [TASK_STATUSES.TODO]: 'pi pi-circle',
    [TASK_STATUSES.IN_PROGRESS]: 'pi pi-circle-fill',
    [TASK_STATUSES.REVIEW]: 'pi pi-eye',
    [TASK_STATUSES.ON_HOLD]: 'pi pi-pause-circle',
    [TASK_STATUSES.COMPLETE]: 'pi pi-check-circle',
  };
  return iconMap[task.status] || 'pi pi-circle';
};

const getStatusIconForValue = (status) => {
  const iconMap = {
    [TASK_STATUSES.TODO]: 'pi pi-circle',
    [TASK_STATUSES.IN_PROGRESS]: 'pi pi-circle-fill',
    [TASK_STATUSES.REVIEW]: 'pi pi-eye',
    [TASK_STATUSES.ON_HOLD]: 'pi pi-pause-circle',
    [TASK_STATUSES.COMPLETE]: 'pi pi-check-circle',
  };
  return iconMap[status] || 'pi pi-circle';
};

const getStatusTooltip = (task) => {
  const tooltipMap = {
    [TASK_STATUSES.TODO]: 'Click to start (move to In Progress)',
    [TASK_STATUSES.IN_PROGRESS]: 'Click to complete',
    [TASK_STATUSES.REVIEW]: 'Click to complete',
    [TASK_STATUSES.ON_HOLD]: 'Click to resume (move to In Progress)',
    [TASK_STATUSES.COMPLETE]: 'Completed (use dropdown to change status)',
  };
  return tooltipMap[task.status] || 'Click to change status';
};

// Status progression: TODO → IN_PROGRESS → COMPLETE
// Special cases: REVIEW → COMPLETE, ON_HOLD → IN_PROGRESS, COMPLETE → IN_PROGRESS
const handleStatusIconClick = (task) => {
  // Don't allow reopening completed tasks via icon click - they're locked
  if (task.status === TASK_STATUSES.COMPLETE) {
    return; // Locked - must use dropdown to change status
  }

  let nextStatus;

  switch (task.status) {
    case TASK_STATUSES.TODO:
      nextStatus = TASK_STATUSES.IN_PROGRESS;
      break;
    case TASK_STATUSES.IN_PROGRESS:
      nextStatus = TASK_STATUSES.COMPLETE;
      break;
    case TASK_STATUSES.REVIEW:
      nextStatus = TASK_STATUSES.COMPLETE;
      break;
    case TASK_STATUSES.ON_HOLD:
      nextStatus = TASK_STATUSES.IN_PROGRESS;
      break;
    default:
      nextStatus = TASK_STATUSES.IN_PROGRESS;
  }

  handleStatusChange(task, nextStatus);
  activeDropdown.value = null; // Close dropdown if open
};

const toggleStatusDropdown = (task) => {
  activeDropdown.value = activeDropdown.value === task.id ? null : task.id;
};

const handleStatusChange = (task, newStatus) => {
  activeDropdown.value = null; // Close dropdown
  emit('status-change', { task, newStatus });
};

const handleEditTask = (task) => {
  emit('edit-task', task);
};

const handleDeleteTask = (task) => {
  emit('delete-task', task);
};

const toggleExpanded = (taskId) => {
  // Toggle: if clicking the same task, collapse it; otherwise expand the new one
  expandedTaskId.value = expandedTaskId.value === taskId ? null : taskId;
};
</script>

<style scoped>
.task-list {
  width: 100%;
  background: var(--p-surface-0);
  border: 1px solid var(--p-surface-200);
  border-radius: 0.5rem;
  padding: 1rem;
  height: 100%;
}

.task-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.375rem;
}

@media (prefers-color-scheme: dark) {
  .task-list {
    border-color: var(--p-surface-700);
  }
}

.no-data {
  text-align: center;
  padding: 2rem 0.75rem;
  color: #6c757d;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* Accordion Styling - Mobile First */
.task-accordion {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

/* Accordion Panel - Flat List */
.task-accordion-panel {
  background-color: transparent;
  border-bottom: 1px solid #f3f4f6;
  transition: background-color 0.2s ease;
  overflow: hidden;
}

.task-accordion-panel:hover {
  background-color: #f9fafb;
}

/* Priority-based left border */
/* Priority-based left border */
.task-accordion-panel.priority-critical {
  border-left: 3px solid #dc2626;
}

.task-accordion-panel.priority-high {
  border-left: 3px solid #f59e0b;
}

.task-accordion-panel.priority-medium {
  border-left: 3px solid #3b82f6;
}

.task-accordion-panel.priority-low {
  border-left: 3px solid #9ca3af;
}

/* Status-based styling - removed backgrounds for flat design */
.task-accordion-panel.status-complete {
  opacity: 0.75;
}

.task-accordion-panel.status-complete:hover {
  opacity: 1;
}

.task-accordion-panel.task-overdue {
  border-left-width: 3px;
  border-left-color: #ef4444 !important;
}

/* Accordion Header */
.task-accordion-header {
  padding: 0.375rem;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.task-accordion-header:hover {
  background-color: rgba(0, 0, 0, 0.02);
}

.task-accordion-panel.is-expanded .task-accordion-header {
  background-color: rgba(0, 0, 0, 0.03);
}

/* Accordion Content */
.task-accordion-content {
  padding: 0.375rem 0 0.375rem 1.5rem;
  background: transparent;
  animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    max-height: 0;
  }
  to {
    opacity: 1;
    max-height: 1000px;
  }
}

/* Single row layout */
.task-row {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.task-title-area {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  flex: 1;
  min-width: 0;
  cursor: pointer;
  padding: 0.25rem 0.375rem;
  margin: -0.25rem -0.375rem;
  border-radius: 4px;
  transition: background-color 0.15s ease;
}

.task-title-area:hover {
  background-color: rgba(0, 0, 0, 0.04);
}

.expand-icon {
  font-size: 0.75rem;
  color: #6b7280;
  flex-shrink: 0;
  transition: transform 0.2s ease;
}

.task-title {
  font-weight: 500;
  color: #111827;
  font-size: 0.85rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
}

.task-title-area.line-through .task-title {
  text-decoration: line-through;
  color: #6b7280;
}

/* Status Control */
.status-control {
  position: relative;
  display: flex;
  align-items: center;
  gap: 1px;
  flex-shrink: 0;
}

.status-icon-button {
  width: 26px;
  height: 26px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 4px 0 0 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  font-size: 14px;
}

.status-icon-button:hover {
  background-color: #f3f4f6;
}

.status-icon-button.status-todo {
  color: #9ca3af;
}

.status-icon-button.status-in-progress {
  color: #3b82f6;
}

.status-icon-button.status-review {
  color: #f59e0b;
}

.status-icon-button.status-on-hold {
  color: #eab308;
}

.status-icon-button.status-complete {
  color: #22c55e;
}

.status-dropdown-button {
  width: 18px;
  height: 28px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 0 4px 4px 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  color: #6b7280;
}

.status-icons-row {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-start;
}

.status-icon-option {
  background: transparent;
  border: none;
  padding: 0.25rem;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
  color: #9ca3af; /* Gray for non-active */
}

.status-icon-option.active.status-todo {
  color: #3b82f6;
}

.status-icon-option.active.status-in-progress {
  color: #3b82f6;
}

.status-icon-option.active.status-review {
  color: #f59e0b;
}

.status-icon-option.active.status-on-hold {
  color: #eab308;
}

.status-icon-option.active.status-complete {
  color: #22c55e;
}

.status-icon-option.active.status-cancelled {
  color: #ef4444;
}

.status-dropdown-button:hover {
  background-color: #f3f4f6;
  color: #111827;
}

.status-dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 4px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06);
  z-index: 100;
  min-width: 160px;
  overflow: hidden;
}

.status-menu-item {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.5rem 0.875rem;
  cursor: pointer;
  transition: background-color 0.15s ease;
  font-size: 0.85rem;
}

.status-menu-item:hover {
  background-color: #f3f4f6;
}

.status-menu-item.active {
  background-color: #eff6ff;
  color: #3b82f6;
  font-weight: 500;
}

.status-menu-item i:first-child {
  width: 16px;
  text-align: center;
}

.status-menu-item .pi-check {
  color: #22c55e;
}

/* Action Buttons */
.task-actions {
  display: flex;
  gap: 0.125rem;
  align-items: center;
  margin-left: auto;
  flex-shrink: 0;
}

.task-accordion-panel.is-expanded .task-actions {
  display: none;
}

.task-expanded-actions {
  display: flex;
  gap: 0.375rem;
  align-items: center;
}

/* Expanded Card Content */
.task-card-expanded {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  padding-top: 0.25rem;
  overflow: visible;
}

.task-expanded-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.task-tags-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.task-tags-row .p-tag {
  font-size: 10px !important;
  font-weight: 400 !important;
}

.task-project,
.task-assignee,
.task-due-date,
.task-estimated-hours,
.task-category {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  color: var(--p-text-muted-color);
}

.task-description {
  padding: 0.625rem;
  background-color: var(--p-surface-50);
  border-radius: 6px;
  border-left: 2px solid var(--p-primary-color);
}

.task-dependencies {
  padding: 0.625rem;
  background-color: var(--p-surface-50);
  border-radius: 6px;
  border-left: 2px solid var(--p-orange-500);
}

.dependency-header {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin-bottom: 0.375rem;
}

/* Desktop Enhancements (min-width: 768px) */
@media (min-width: 768px) {
  .task-accordion {
    gap: 0.25rem;
  }

  .task-accordion-header {
    padding: 0.625rem;
  }

  .task-accordion-content {
    padding: 0.625rem;
  }

  .task-card-expanded {
    gap: 0.625rem;
    padding-top: 0.375rem;
  }

  .task-row {
    gap: 0.625rem;
  }

  .task-title {
    font-size: 0.9rem;
  }
}

/* Mobile Adjustments (max-width: 767px) */
@media (max-width: 767px) {
  .task-row {
    gap: 0.375rem;
  }

  .task-title {
    font-size: 0.8rem;
  }

  .status-icon-button {
    width: 22px;
    height: 22px;
    font-size: 12px;
  }

  .status-dropdown-button {
    width: 14px;
    height: 22px;
  }

  .task-card-expanded {
    gap: 0.375rem;
  }

  .task-description,
  .task-dependencies {
    padding: 0.5rem;
  }

  .task-actions {
    display: none;
  }

  .task-expanded-actions {
    display: flex;
  }
}
</style>
