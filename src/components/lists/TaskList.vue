<template>
  <div class="task-list">
    <div class="task-list-header">
      <h3 class="text-lg font-semibold text-surface-900">{{ title }}</h3>
      <Button
        v-if="showCreateButton"
        label="New Task"
        icon="pi pi-plus"
        size="small"
        @click="handleCreateTask"
      />
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
        @click="handleTaskClick(task)"
      >
        <div class="task-header">
          <div class="task-title-row">
            <Checkbox
              v-model="task.status"
              :binary="false"
              :value="'complete'"
              @click.stop="handleToggleComplete(task)"
              class="task-checkbox"
            />
            <span class="task-title" :class="{ 'line-through': task.status === 'complete' }">
              {{ task.title }}
            </span>
          </div>
          <div class="task-badges">
            <Tag
              :value="formatPriority(task.priority)"
              :severity="getPrioritySeverity(task.priority)"
              class="text-xs"
            />
            <Tag
              :value="formatStatus(task.status)"
              :severity="getStatusSeverity(task.status)"
              class="text-xs"
            />
          </div>
        </div>

        <div v-if="task.description" class="task-description">
          {{ truncateText(task.description, 100) }}
        </div>

        <div class="task-meta">
          <div v-if="task.assignedToName" class="meta-item">
            <i class="pi pi-user text-xs"></i>
            <span>{{ task.assignedToName }}</span>
          </div>

          <div v-if="task.dueDate" class="meta-item" :class="getDueDateClass(task)">
            <i class="pi pi-calendar text-xs"></i>
            <span>{{ formatDueDate(task.dueDate) }}</span>
            <i v-if="isOverdue(task)" class="pi pi-exclamation-triangle text-xs ml-1"></i>
          </div>

          <div v-if="showProjectName && task.projectId" class="meta-item">
            <i class="pi pi-folder text-xs"></i>
            <span>{{ getProjectName(task.projectId) }}</span>
          </div>

          <div v-if="task.estimatedHours" class="meta-item">
            <i class="pi pi-clock text-xs"></i>
            <span>{{ task.estimatedHours }}h</span>
          </div>

          <div v-if="task.category" class="meta-item">
            <i class="pi pi-tag text-xs"></i>
            <span>{{ task.category }}</span>
          </div>
        </div>

        <div v-if="task.progress !== undefined && task.progress !== null" class="task-progress">
          <ProgressBar :value="task.progress" :show-value="true" class="h-2" />
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useProjectStore } from '@/stores/project';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import Checkbox from 'primevue/checkbox';
import ProgressBar from 'primevue/progressbar';
import ProgressSpinner from 'primevue/progressspinner';

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
    default: 'dueDate', // 'dueDate', 'priority', 'status', 'title'
  },
});

// Emits
const emit = defineEmits(['task-click', 'create-task', 'toggle-complete']);

// Store
const projectStore = useProjectStore();

// Computed
const sortedTasks = computed(() => {
  if (!props.tasks || props.tasks.length === 0) return [];

  const tasksCopy = [...props.tasks];

  return tasksCopy.sort((a, b) => {
    // First, sort by completion status (incomplete first)
    if (a.status === 'complete' && b.status !== 'complete') return 1;
    if (a.status !== 'complete' && b.status === 'complete') return -1;

    // Then apply the requested sort
    switch (props.sortBy) {
      case 'priority': {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        const aPriority = priorityOrder[a.priority] ?? 2;
        const bPriority = priorityOrder[b.priority] ?? 2;
        if (aPriority !== bPriority) return aPriority - bPriority;
        break;
      }

      case 'dueDate': {
        const aDate = a.dueDate ? new Date(a.dueDate) : new Date('2099-12-31');
        const bDate = b.dueDate ? new Date(b.dueDate) : new Date('2099-12-31');
        if (aDate.getTime() !== bDate.getTime()) return aDate - bDate;
        break;
      }

      case 'status': {
        const statusOrder = { 'todo': 0, 'in-progress': 1, 'review': 2, 'complete': 3, 'cancelled': 4 };
        const aStatus = statusOrder[a.status] ?? 1;
        const bStatus = statusOrder[b.status] ?? 1;
        if (aStatus !== bStatus) return aStatus - bStatus;
        break;
      }

      case 'title': {
        const aTitle = (a.title || '').toLowerCase();
        const bTitle = (b.title || '').toLowerCase();
        if (aTitle !== bTitle) return aTitle.localeCompare(bTitle);
        break;
      }
    }

    // Final tiebreaker: created date (newest first)
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
    'todo': 'To Do',
    'in-progress': 'In Progress',
    'review': 'Review',
    'complete': 'Complete',
    'cancelled': 'Cancelled',
    'on-hold': 'On Hold',
  };
  return statusMap[status] || status;
};

const getStatusSeverity = (status) => {
  const severityMap = {
    'todo': 'secondary',
    'in-progress': 'info',
    'review': 'warn',
    'complete': 'success',
    'cancelled': 'danger',
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
  gap: 0.75rem;
}

.task-item {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1rem;
  background-color: #ffffff;
  cursor: pointer;
  transition: all 0.2s ease;
}

.task-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border-color: #d1d5db;
}

.task-item.task-completed {
  background-color: #f9fafb;
  opacity: 0.7;
}

.task-item.task-overdue {
  border-left: 4px solid #ef4444;
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.5rem;
  gap: 0.5rem;
}

.task-title-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
  min-width: 0;
}

.task-checkbox {
  flex-shrink: 0;
}

.task-title {
  font-weight: 500;
  color: #111827;
  font-size: 0.95rem;
  word-break: break-word;
}

.task-title.line-through {
  text-decoration: line-through;
  color: #6b7280;
}

.task-badges {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}

.task-description {
  color: #6b7280;
  font-size: 0.875rem;
  line-height: 1.4;
  margin-bottom: 0.75rem;
  margin-left: 2.25rem;
}

.task-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  font-size: 0.8rem;
  color: #6b7280;
  margin-left: 2.25rem;
  margin-bottom: 0.5rem;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.task-progress {
  margin-left: 2.25rem;
  margin-top: 0.5rem;
}

@media (max-width: 768px) {
  .task-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .task-badges {
    margin-left: 2.25rem;
  }

  .task-meta {
    flex-direction: column;
    gap: 0.375rem;
  }
}
</style>
