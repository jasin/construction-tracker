<template>
  <div class="task-list">
    <div class="task-list-header">
      <h3 class="text-lg font-semibold text-surface-900">{{ title }}</h3>
    </div>

    <div v-if="loading" class="flex justify-center py-8">
      <ProgressSpinner style="width: 50px; height: 50px" />
    </div>

    <div v-else-if="!tasks || tasks.length === 0" class="no-data">
      <i class="pi pi-inbox text-4xl text-surface-400 mb-2"></i>
      <p class="text-surface-600">{{ emptyMessage }}</p>
    </div>

    <ul v-else class="task-items">
      <li
        v-for="task in sortedTasks"
        :key="task.id"
        class="task-item"
        :class="getTaskStatusClass(task)"
        :data-priority="task.priority"
        :data-status="task.status"
      >
        <!-- Single Line: Status Icon → Title → Edit → Delete -->
        <div class="task-row">
          <!-- Status Icon with Dropdown -->
          <div class="status-control" @click.stop>
            <button
              class="status-icon-button"
              :class="`status-${task.status}`"
              @click="handleStatusIconClick(task)"
              :title="getStatusTooltip(task)"
            >
              <i :class="getStatusIcon(task)"></i>
            </button>
            <button
              class="status-dropdown-button"
              @click="toggleStatusDropdown(task)"
              :title="'Change status'"
            >
              <i class="pi pi-chevron-down text-xs"></i>
            </button>

            <!-- Status Dropdown Menu -->
            <div v-if="activeDropdown === task.id" class="status-dropdown-menu" @click.stop>
              <div
                v-for="status in statusOptions"
                :key="status.value"
                class="status-menu-item"
                :class="{ active: task.status === status.value }"
                @click="handleStatusChange(task, status.value)"
              >
                <i :class="getStatusIconForValue(status.value)"></i>
                <span>{{ status.label }}</span>
                <i v-if="task.status === status.value" class="pi pi-check ml-auto"></i>
              </div>
            </div>
          </div>

          <!-- Task Title -->
          <span class="task-title" :class="{ 'line-through': task.status === 'complete' }">
            {{ task.title }}
          </span>

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
      </li>
    </ul>
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
const descriptionMode = computed(
  () => userSettingsStore.settings?.taskDisplay?.taskDescriptionMode || 'click'
);

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
const expandedDescriptions = ref(new Set());

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

const handleMouseEnter = (task) => {
  if (descriptionMode.value === 'hover' && getDescriptionPreview(task.description).hasMore) {
    expandedDescriptions.value.add(task.id);
  }
};

const handleMouseLeave = (task) => {
  if (descriptionMode.value === 'hover') {
    expandedDescriptions.value.delete(task.id);
  }
};

const toggleDescription = (taskId) => {
  if (expandedDescriptions.value.has(taskId)) {
    expandedDescriptions.value.delete(taskId);
  } else {
    expandedDescriptions.value.add(taskId);
  }
};

const getDescriptionPreview = (desc) => {
  if (!desc) return { truncated: '', hasMore: false };
  const firstLine = desc.split('\n')[0];
  const truncated = truncateText(firstLine, 60);
  const isTruncated = firstLine !== truncated;
  const hasMore = desc.includes('\n') || isTruncated;
  return { truncated, hasMore };
};
</script>

<style scoped>
.task-list {
  width: 100%;
}

.task-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.no-data {
  text-align: center;
  padding: 3rem 1rem;
  color: #6c757d;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.task-items {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.task-item {
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
  background-color: #ffffff;
  transition: all 0.2s ease;
  position: relative;
}

/* Priority-based left border */
.task-item[data-priority='critical'] {
  border-left: 3px solid #dc2626;
}

.task-item[data-priority='high'] {
  border-left: 3px solid #f59e0b;
}

.task-item[data-priority='medium'] {
  border-left: 3px solid #3b82f6;
}

.task-item[data-priority='low'] {
  border-left: 3px solid #9ca3af;
}

/* Status-based styling */
.task-item[data-status='in-progress'] {
  background-color: #eff6ff;
}

.task-item[data-status='complete'] {
  opacity: 0.7;
}

.task-item[data-status='on-hold'] {
  background-color: #fef9c3;
}

.task-item:hover {
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
  border-color: #d1d5db;
}

.task-item[data-status='complete']:hover {
  opacity: 1;
}

.task-item.task-overdue:not([data-status='complete']) {
  border-left-width: 3px;
  border-left-color: #ef4444 !important;
}

/* Single row layout */
.task-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.task-title {
  font-weight: 500;
  color: #111827;
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
}

.task-title.line-through {
  text-decoration: line-through;
  color: #6b7280;
}

/* Status Control */
.status-control {
  position: relative;
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.status-icon-button {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 4px 0 0 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  font-size: 16px;
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
  min-width: 180px;
  overflow: hidden;
}

.status-menu-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 1rem;
  cursor: pointer;
  transition: background-color 0.15s ease;
  font-size: 0.875rem;
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
  width: 18px;
  text-align: center;
}

.status-menu-item .pi-check {
  color: #22c55e;
}

/* Action Buttons */
.task-actions {
  display: flex;
  gap: 0.25rem;
  align-items: center;
  margin-left: auto;
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .task-row {
    gap: 0.5rem;
  }

  .task-title {
    font-size: 0.85rem;
  }

  .status-icon-button {
    width: 24px;
    height: 24px;
    font-size: 14px;
  }

  .status-dropdown-button {
    width: 16px;
    height: 24px;
  }
}
</style>
