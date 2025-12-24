<template>
  <div class="rfi-list">
    <div class="rfi-list-header">
      <h3 class="text-base font-semibold text-surface-900">{{ title }}</h3>
    </div>

    <div class="rfi-list-content">
      <div v-if="loading" class="flex justify-center py-8">
        <ProgressSpinner style="width: 50px; height: 50px" />
      </div>

      <div v-else-if="rfis.length === 0" class="text-center py-8 text-surface-500">
        <i class="pi pi-inbox text-4xl mb-3"></i>
        <p>No RFIs yet</p>
      </div>

      <div v-else class="task-accordion">
        <div
          v-for="rfi in rfis"
          :key="rfi.id"
          class="task-accordion-panel"
          :class="[
            { 'is-expanded': expandedRfiId === rfi.id },
            { 'is-unread': isItemUnread(rfi) },
            getDueDateClass(rfi.dueDate),
          ]"
          @click="toggleExpanded(rfi.id, rfi)"
        >
          <div class="task-accordion-header">
            <div class="task-row">
              <div class="task-title-area">
                <div class="flex items-center gap-2">
                  <div v-if="isItemUnread(rfi)" class="unread-indicator" title="New"></div>
                  <span class="task-title">
                    {{ rfi.title }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div
            v-if="expandedRfiId === rfi.id"
            class="task-accordion-content"
            @click.stop="$emit('rfi-click', rfi)"
          >
            <div class="rfi-expanded-title">
              {{ rfi.title }}
            </div>

            <div class="task-tags-row" @click.stop>
              <Tag
                :severity="getPrioritySeverity(rfi.priority)"
                :value="rfi.priority"
                size="small"
                class="text-[10px] font-normal"
              />
              <Tag
                :severity="getStatusSeverity(rfi.status)"
                :value="rfi.status"
                size="small"
                class="text-[10px] font-normal"
              />
            </div>

            <div v-if="rfi.dueDate" class="task-due-date">
              <i class="pi pi-calendar text-xs"></i>
              <span class="text-xs text-surface-700"> Due: {{ formatDate(rfi.dueDate) }} </span>
            </div>

            <div class="task-description">
              {{ rfi.description }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import ProgressSpinner from 'primevue/progressspinner';

const props = defineProps({
  rfis: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    default: 'RFIs',
  },
  projectId: {
    type: String,
    required: false,
  },
  // Function to check if item is unread (passed from parent)
  isItemUnread: {
    type: Function,
    default: () => false,
  },
  // Function to mark item as read (passed from parent)
  onItemExpanded: {
    type: Function,
    default: () => {},
  },
});

const emit = defineEmits(['create-rfi', 'rfi-click', 'edit-rfi', 'delete-rfi']);

const expandedRfiId = ref(null);

const toggleExpanded = (id, rfi) => {
  const wasExpanded = expandedRfiId.value === id;
  expandedRfiId.value = wasExpanded ? null : id;

  // Mark as read when expanding for the first time
  if (!wasExpanded && props.projectId && props.onItemExpanded) {
    props.onItemExpanded(rfi);
  }
};

const getPrioritySeverity = (priority) => {
  const severityMap = {
    critical: 'danger',
    high: 'warning',
    medium: 'info',
    low: 'secondary',
  };
  return severityMap[priority] || 'secondary';
};

const getStatusSeverity = (status) => {
  const severityMap = {
    open: 'info',
    'in-progress': 'warning',
    answered: 'success',
    closed: 'secondary',
  };
  return severityMap[status] || 'secondary';
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString();
};

const getDueDateClass = (dueDate) => {
  if (!dueDate) return '';

  const now = new Date();
  now.setHours(0, 0, 0, 0); // Reset to start of day for accurate comparison

  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0); // Reset to start of day

  const diffTime = due - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return 'rfi-overdue'; // Past due - red
  } else if (diffDays <= 3) {
    return 'rfi-due-soon'; // Within 3 days - blue
  } else {
    return 'rfi-on-track'; // More than 3 days - green
  }
};
</script>

<style scoped>
@import '@/styles/list-styles.css';

/* Component-specific styles only */
.rfi-list {
  /* Inherits most styles from .list-container */
  background: var(--p-surface-0);
  border: 1px solid var(--p-surface-200);
  border-radius: 0.5rem;
  padding: 1rem;
  height: 100%;
  max-height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.rfi-list-content {
  overflow-y: scroll;
  overflow-x: hidden;
  flex: 1 1 auto;
  min-height: 0;
}

/* Subtle scrollbar styling */
.rfi-list-content::-webkit-scrollbar {
  width: 6px;
}

.rfi-list-content::-webkit-scrollbar-track {
  background: transparent;
}

.rfi-list-content::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 3px;
}

.rfi-list-content::-webkit-scrollbar-thumb:hover {
  background-color: rgba(0, 0, 0, 0.2);
}

/* Firefox */
.rfi-list-content {
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 0, 0, 0.1) transparent;
}

.rfi-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.375rem;
}

/* Expanded title styling */
.rfi-expanded-title {
  font-weight: 600;
  font-size: 0.95rem;
  color: var(--p-surface-900);
  margin-bottom: 0.75rem;
  display: none; /* Hidden by default on desktop */
}

/* Unread indicator */
.unread-indicator {
  width: 8px;
  height: 8px;
  background: var(--p-blue-500);
  border-radius: 50%;
  flex-shrink: 0;
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* Unread panel styling */
.task-accordion-panel.is-unread {
  background: var(--p-blue-50);
}

.task-accordion-panel.is-unread .task-title {
  font-weight: 600;
}

/* Due date-based left border colors */
.task-accordion-panel.rfi-on-track {
  border-left: 3px solid #22c55e; /* Green - more than 3 days */
}

.task-accordion-panel.rfi-due-soon {
  border-left: 3px solid #3b82f6; /* Blue - within 3 days */
}

.task-accordion-panel.rfi-overdue {
  border-left: 3px solid #ef4444; /* Red - past due */
}

/* Mobile: Hide header, show expanded title, hide panel header when expanded */
@media (max-width: 767px) {
  .rfi-list-header {
    display: none;
  }

  .rfi-expanded-title {
    display: block;
  }

  .task-accordion-panel.is-expanded .task-accordion-header {
    display: none;
  }

  .task-accordion-panel.is-expanded .task-accordion-content {
    padding-left: 0.5rem;
  }
}

@media (prefers-color-scheme: dark) {
  .rfi-list {
    border-color: var(--p-surface-700);
  }

  .rfi-list-header h3 {
    color: var(--p-surface-0);
  }

  .rfi-expanded-title {
    color: var(--p-surface-0);
  }

  .rfi-list-content::-webkit-scrollbar-thumb {
    background-color: rgba(255, 255, 255, 0.2);
  }

  .rfi-list-content::-webkit-scrollbar-thumb:hover {
    background-color: rgba(255, 255, 255, 0.3);
  }

  .rfi-list-content {
    scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
  }
}
</style>
