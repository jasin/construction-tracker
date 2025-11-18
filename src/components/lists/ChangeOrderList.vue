<template>
  <div class="change-order-list">
    <div class="change-order-list-header">
      <h3 class="text-base font-semibold text-surface-900">{{ title }}</h3>
    </div>

    <div class="change-order-list-content">
      <div v-if="loading" class="flex justify-center py-8">
        <ProgressSpinner style="width: 50px; height: 50px" />
      </div>

      <div v-else-if="changeOrders.length === 0" class="text-center py-8 text-surface-500">
        <i class="pi pi-inbox text-4xl mb-3"></i>
        <p>No change orders yet</p>
        <p class="text-sm">Click + to create your first change order</p>
      </div>

      <div v-else class="task-accordion">
        <div
          v-for="changeOrder in changeOrders"
          :key="changeOrder.id"
          class="task-accordion-panel"
          :class="[
            { 'is-expanded': expandedChangeOrderId === changeOrder.id },
            getStatusClass(changeOrder.status),
          ]"
          @click="toggleExpanded(changeOrder.id)"
        >
          <div class="task-accordion-header">
            <div class="task-row">
              <div class="task-title-area">
                <span class="task-title">
                  {{ changeOrder.title }}
                </span>
              </div>

              <div class="task-actions" @click.stop>
                <Button
                  icon="pi pi-pencil"
                  severity="secondary"
                  text
                  rounded
                  size="small"
                  @click="$emit('edit-change-order', changeOrder)"
                  v-tooltip.top="'Edit Change Order'"
                />
                <Button
                  icon="pi pi-trash"
                  severity="danger"
                  text
                  rounded
                  size="small"
                  @click="$emit('delete-change-order', changeOrder)"
                  v-tooltip.top="'Delete Change Order'"
                />
              </div>
            </div>
          </div>

          <div
            v-if="expandedChangeOrderId === changeOrder.id"
            class="task-accordion-content"
            @click.stop="$emit('change-order-click', changeOrder)"
          >
            <div class="change-order-expanded-title">
              {{ changeOrder.title }}
            </div>

            <div class="task-tags-row" @click.stop>
              <Tag
                :severity="getStatusSeverity(changeOrder.status)"
                :value="formatStatus(changeOrder.status)"
                size="small"
                class="text-[10px] font-normal"
              />
              <Tag
                :severity="getTypeSeverity(changeOrder.type)"
                :value="formatType(changeOrder.type)"
                size="small"
                class="text-[10px] font-normal"
              />
            </div>

            <div v-if="changeOrder.costImpact !== undefined" class="task-due-date">
              <i class="pi pi-dollar text-xs"></i>
              <span class="text-xs text-surface-700">
                Cost Impact: {{ formatCurrency(changeOrder.costImpact) }}
              </span>
            </div>

            <div v-if="changeOrder.timeImpact" class="task-due-date">
              <i class="pi pi-clock text-xs"></i>
              <span class="text-xs text-surface-700">
                Time Impact: {{ changeOrder.timeImpact }} days
              </span>
            </div>

            <div v-if="changeOrder.requestedByName" class="task-due-date">
              <i class="pi pi-user text-xs"></i>
              <span class="text-xs text-surface-700">
                Requested by: {{ changeOrder.requestedByName }}
              </span>
            </div>

            <div v-if="changeOrder.requestedAt" class="task-due-date">
              <i class="pi pi-calendar text-xs"></i>
              <span class="text-xs text-surface-700">
                Requested: {{ formatDate(changeOrder.requestedAt) }}
              </span>
            </div>

            <div v-if="changeOrder.description" class="task-description">
              {{ changeOrder.description }}
            </div>

            <div class="task-expanded-actions">
              <Button
                icon="pi pi-pencil"
                severity="secondary"
                text
                rounded
                size="small"
                @click.stop="$emit('edit-change-order', changeOrder)"
                v-tooltip.top="'Edit Change Order'"
              />
              <Button
                icon="pi pi-trash"
                severity="danger"
                text
                rounded
                size="small"
                @click.stop="$emit('delete-change-order', changeOrder)"
                v-tooltip.top="'Delete Change Order'"
              />
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
  changeOrders: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    default: 'Change Orders',
  },
});

defineEmits([
  'create-change-order',
  'change-order-click',
  'edit-change-order',
  'delete-change-order',
]);

const expandedChangeOrderId = ref(null);

const toggleExpanded = (id) => {
  expandedChangeOrderId.value = expandedChangeOrderId.value === id ? null : id;
};

const getStatusSeverity = (status) => {
  const severityMap = {
    proposed: 'info',
    submitted: 'warn',
    under_review: 'warn',
    approved: 'success',
    rejected: 'danger',
    executed: 'contrast',
  };
  return severityMap[status] || 'secondary';
};

const getTypeSeverity = (type) => {
  const severityMap = {
    addition: 'success',
    deletion: 'danger',
    modification: 'info',
    credit: 'warn',
  };
  return severityMap[type] || 'secondary';
};

const formatStatus = (status) => {
  if (!status) return '';
  return status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const formatType = (type) => {
  if (!type) return '';
  return type.charAt(0).toUpperCase() + type.slice(1);
};

const formatCurrency = (amount) => {
  if (amount === undefined || amount === null) return '$0.00';
  const absAmount = Math.abs(amount);
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(absAmount);
  return amount < 0 ? `(${formatted})` : formatted;
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString();
};

const getStatusClass = (status) => {
  const classMap = {
    proposed: 'co-proposed',
    submitted: 'co-submitted',
    under_review: 'co-under-review',
    approved: 'co-approved',
    rejected: 'co-rejected',
    executed: 'co-executed',
  };
  return classMap[status] || '';
};
</script>

<style scoped>
@import '@/styles/list-styles.css';

/* Component-specific styles only */
.change-order-list {
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

.change-order-list-content {
  overflow-y: scroll;
  overflow-x: hidden;
  flex: 1 1 auto;
  min-height: 0;
}

/* Subtle scrollbar styling */
.change-order-list-content::-webkit-scrollbar {
  width: 6px;
}

.change-order-list-content::-webkit-scrollbar-track {
  background: transparent;
}

.change-order-list-content::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 3px;
}

.change-order-list-content::-webkit-scrollbar-thumb:hover {
  background-color: rgba(0, 0, 0, 0.2);
}

/* Firefox */
.change-order-list-content {
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 0, 0, 0.1) transparent;
}

/* Expanded title styling */
.change-order-expanded-title {
  font-weight: 600;
  font-size: 0.95rem;
  color: var(--p-surface-900);
  margin-bottom: 0.75rem;
  display: none; /* Hidden by default on desktop */
}

/* Status-based left border colors */
.task-accordion-panel.co-proposed {
  border-left: 3px solid #3b82f6; /* Blue */
}

.task-accordion-panel.co-submitted {
  border-left: 3px solid #eab308; /* Yellow */
}

.task-accordion-panel.co-under-review {
  border-left: 3px solid #f97316; /* Orange */
}

.task-accordion-panel.co-approved {
  border-left: 3px solid #22c55e; /* Green */
}

.task-accordion-panel.co-rejected {
  border-left: 3px solid #ef4444; /* Red */
}

.task-accordion-panel.co-executed {
  border-left: 3px solid #8b5cf6; /* Purple */
}

/* Mobile: Hide header, show expanded title, hide panel header when expanded */
@media (max-width: 767px) {
  .change-order-expanded-title {
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
  .change-order-list {
    border-color: var(--p-surface-700);
  }

  .change-order-list-content::-webkit-scrollbar-thumb {
    background-color: rgba(255, 255, 255, 0.2);
  }

  .change-order-list-content::-webkit-scrollbar-thumb:hover {
    background-color: rgba(255, 255, 255, 0.3);
  }

  .change-order-list-content {
    scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
  }

  .change-order-expanded-title {
    color: var(--p-surface-0);
  }
}
</style>
