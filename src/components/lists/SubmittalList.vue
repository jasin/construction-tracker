<template>
  <div class="submittal-list">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-semibold">Submittals</h3>
      <Button icon="pi pi-plus" size="small" rounded @click="$emit('create-submittal')" />
    </div>

    <div v-if="loading" class="flex justify-center py-8">
      <ProgressSpinner style="width: 50px; height: 50px" />
    </div>

    <div v-else-if="submittals.length === 0" class="text-center py-8 text-surface-500">
      <i class="pi pi-inbox text-4xl mb-3"></i>
      <p>No submittals yet</p>
      <p class="text-sm">Click + to create your first submittal</p>
    </div>

    <div v-else class="space-y-2">
      <Card
        v-for="submittal in submittals"
        :key="submittal.id"
        class="cursor-pointer hover:shadow-md transition-shadow"
        @click="$emit('submittal-click', submittal)"
      >
        <template #content>
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="font-semibold text-surface-900 mb-1">
                {{ submittal.title }}
              </div>
              <div class="text-sm text-surface-600 mb-2">
                {{ submittal.description }}
              </div>
              <div class="flex items-center gap-2 text-xs text-surface-500">
                <Tag :severity="getStatusSeverity(submittal.status)" :value="submittal.status" />
                <span v-if="submittal.submittedDate">
                  Submitted: {{ formatDate(submittal.submittedDate) }}
                </span>
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
  submittals: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
});

defineEmits(['create-submittal', 'submittal-click']);

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
</script>

<style scoped>
.submittal-list {
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
  .submittal-list {
    border-color: var(--p-surface-700);
  }
}
</style>
