<template>
  <div class="submittal-list">
    <div class="submittal-list-header">
      <h3 class="text-base font-semibold text-surface-900">{{ title }}</h3>
    </div>

    <div class="submittal-list-content">
      <div v-if="loading" class="flex justify-center py-8">
        <ProgressSpinner style="width: 50px; height: 50px" />
      </div>

      <div v-else-if="submittals.length === 0" class="text-center py-8 text-surface-500">
        <i class="pi pi-inbox text-4xl mb-3"></i>
        <p>No submittals yet</p>
        <p class="text-sm">Click + to create your first submittal</p>
      </div>

      <div v-else class="task-accordion">
        <div
          v-for="submittal in submittals"
          :key="submittal.id"
          class="task-accordion-panel"
          :class="[
            { 'is-expanded': expandedSubmittalId === submittal.id },
            getDueDateClass(submittal.reviewedDate),
          ]"
          @click="toggleExpanded(submittal.id, submittal)"
        >
          <div class="task-accordion-header">
            <div class="task-row">
              <div class="task-title-area">
                <span class="task-title">
                  {{ submittal.title }}
                </span>
              </div>
            </div>
          </div>

          <div
            v-if="expandedSubmittalId === submittal.id"
            class="task-accordion-content"
            @click.stop="$emit('submittal-click', submittal)"
          >
            <div class="submittal-expanded-title">
              {{ submittal.title }}
            </div>

            <div class="task-tags-row" @click.stop>
              <Tag
                :severity="getStatusSeverity(submittal.status)"
                :value="submittal.status"
                size="small"
                class="text-[10px] font-normal"
              />
            </div>

            <div v-if="submittal.submittedDate" class="task-due-date">
              <i class="pi pi-calendar text-xs"></i>
              <span class="text-xs text-surface-700">
                Submitted: {{ formatDate(submittal.submittedDate) }}
              </span>
            </div>

            <div v-if="submittal.reviewedDate" class="task-due-date">
              <i class="pi pi-calendar text-xs"></i>
              <span class="text-xs text-surface-700">
                Reviewed: {{ formatDate(submittal.reviewedDate) }}
              </span>
            </div>

            <div class="task-description">
              {{ submittal.description }}
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
  submittals: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    default: 'Submittals',
  },
  projectId: {
    type: String,
    required: false,
  },
  onItemExpanded: {
    type: Function,
    default: () => {},
  },
});

defineEmits(['create-submittal', 'submittal-click', 'edit-submittal', 'delete-submittal']);

const expandedSubmittalId = ref(null);

const toggleExpanded = (id, submittal) => {
  const wasExpanded = expandedSubmittalId.value === id;
  expandedSubmittalId.value = wasExpanded ? null : id;

  // Call handler when expanding (not collapsing)
  if (!wasExpanded && props.projectId && props.onItemExpanded) {
    props.onItemExpanded(submittal);
  }
};

const getStatusSeverity = (status) => {
  const severityMap = {
    pending: 'info',
    'under-review': 'warning',
    approved: 'success',
    rejected: 'danger',
    'approved-as-noted': 'info',
  };
  return severityMap[status] || 'secondary';
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString();
};

const getDueDateClass = (reviewedDate) => {
  if (!reviewedDate) return '';

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const reviewed = new Date(reviewedDate);
  reviewed.setHours(0, 0, 0, 0);

  const diffTime = reviewed - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return 'submittal-overdue'; // Past review date - red
  } else if (diffDays <= 3) {
    return 'submittal-due-soon'; // Within 3 days - blue
  } else {
    return 'submittal-on-track'; // More than 3 days - green
  }
};
</script>

<style scoped>
@import '@/styles/list-styles.css';

/* Component-specific styles only */
.submittal-list {
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

.submittal-list-content {
  overflow-y: scroll;
  overflow-x: hidden;
  flex: 1 1 auto;
  min-height: 0;
}

/* Subtle scrollbar styling */
.submittal-list-content::-webkit-scrollbar {
  width: 6px;
}

.submittal-list-content::-webkit-scrollbar-track {
  background: transparent;
}

.submittal-list-content::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 3px;
}

.submittal-list-content::-webkit-scrollbar-thumb:hover {
  background-color: rgba(0, 0, 0, 0.2);
}

/* Firefox */
.submittal-list-content {
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 0, 0, 0.1) transparent;
}

/* Expanded title styling */
.submittal-expanded-title {
  font-weight: 600;
  font-size: 0.95rem;
  color: var(--p-surface-900);
  margin-bottom: 0.75rem;
  display: none; /* Hidden by default on desktop */
}

/* Review date-based left border colors */
.task-accordion-panel.submittal-on-track {
  border-left: 3px solid #22c55e; /* Green - more than 3 days */
}

.task-accordion-panel.submittal-due-soon {
  border-left: 3px solid #3b82f6; /* Blue - within 3 days */
}

.task-accordion-panel.submittal-overdue {
  border-left: 3px solid #ef4444; /* Red - past review date */
}

/* Mobile: Hide header, show expanded title, hide panel header when expanded */
@media (max-width: 767px) {
  .submittal-expanded-title {
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
  .submittal-list {
    border-color: var(--p-surface-700);
  }

  .submittal-list-content::-webkit-scrollbar-thumb {
    background-color: rgba(255, 255, 255, 0.2);
  }

  .submittal-list-content::-webkit-scrollbar-thumb:hover {
    background-color: rgba(255, 255, 255, 0.3);
  }

  .submittal-list-content {
    scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
  }

  .submittal-expanded-title {
    color: var(--p-surface-0);
  }
}
</style>
