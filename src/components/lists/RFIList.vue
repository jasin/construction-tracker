<template>
  <div class="rfi-list">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-semibold">RFIs</h3>
      <Button icon="pi pi-plus" size="small" rounded @click="$emit('create-rfi')" />
    </div>

    <div v-if="loading" class="flex justify-center py-8">
      <ProgressSpinner style="width: 50px; height: 50px" />
    </div>

    <div v-else-if="rfis.length === 0" class="text-center py-8 text-surface-500">
      <i class="pi pi-inbox text-4xl mb-3"></i>
      <p>No RFIs yet</p>
      <p class="text-sm">Click + to create your first RFI</p>
    </div>

    <div v-else class="space-y-2">
      <Card
        v-for="rfi in rfis"
        :key="rfi.id"
        class="cursor-pointer hover:shadow-md transition-shadow"
        @click="$emit('rfi-click', rfi)"
      >
        <template #content>
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="font-semibold text-surface-900 mb-1">
                {{ rfi.title }}
              </div>
              <div class="text-sm text-surface-600 mb-2">
                {{ rfi.description }}
              </div>
              <div class="flex items-center gap-2 text-xs text-surface-500">
                <Tag :severity="getPrioritySeverity(rfi.priority)" :value="rfi.priority" />
                <Tag :severity="getStatusSeverity(rfi.status)" :value="rfi.status" />
                <span v-if="rfi.dueDate">Due: {{ formatDate(rfi.dueDate) }}</span>
              </div>
            </div>
          </div>
        </template>
      </Card>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import Button from 'primevue/button';
import Card from 'primevue/card';
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
});

defineEmits(['create-rfi', 'rfi-click']);

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
</script>

<style scoped>
.rfi-list {
  background: var(--p-surface-0);
  border: 1px solid var(--p-surface-200);
  border-radius: 0.5rem;
  padding: 1rem;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.space-y-2 > * + * {
  margin-top: 0.5rem;
}

@media (prefers-color-scheme: dark) {
  .rfi-list {
    border-color: var(--p-surface-700);
  }
}
</style>
