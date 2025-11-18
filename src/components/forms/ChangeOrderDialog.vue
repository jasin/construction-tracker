<template>
  <Dialog
    v-model:visible="isOpen"
    modal
    :header="changeOrder?.id ? 'Edit Change Order' : 'Create Change Order'"
    :style="dialogStyle"
    :position="dialogPosition"
    :draggable="false"
    @hide="closeModal"
  >
    <form @submit.prevent="handleSubmit" class="space-y-3">
      <!-- Title -->
      <div class="space-y-2">
        <label for="co-title" class="block text-sm font-semibold text-surface-900">
          Title <span class="text-red-500">*</span>
        </label>
        <InputText
          id="co-title"
          v-model="form.title"
          placeholder="Enter change order title"
          :class="{ 'border-red-500': errors.title }"
          class="w-full"
        />
        <small v-if="errors.title" class="text-red-500">{{ errors.title }}</small>
      </div>

      <!-- Description -->
      <div class="space-y-2">
        <label for="co-description" class="block text-sm font-semibold text-surface-900"
          >Description</label
        >
        <Textarea
          id="co-description"
          v-model="form.description"
          placeholder="Enter change order description"
          rows="4"
          class="w-full"
        />
      </div>

      <!-- Project -->
      <div class="space-y-2">
        <label for="co-project" class="block text-sm font-semibold text-surface-900">
          Project <span class="text-red-500">*</span>
        </label>
        <Select
          id="co-project"
          v-model="form.projectId"
          :options="projectOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="Select a project"
          :class="{ 'p-invalid': errors.projectId }"
          class="w-full"
          :disabled="!!projectId"
        />
        <small v-if="errors.projectId" class="text-red-500">{{ errors.projectId }}</small>
      </div>

      <!-- Type -->
      <div class="space-y-2">
        <label for="co-type" class="block text-sm font-semibold text-surface-900">Type</label>
        <Select
          id="co-type"
          v-model="form.type"
          :options="typeOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="Select change order type"
          class="w-full"
        />
      </div>

      <!-- Cost Impact -->
      <div class="space-y-2">
        <label for="co-cost-impact" class="block text-sm font-semibold text-surface-900"
          >Cost Impact ($)</label
        >
        <InputNumber
          id="co-cost-impact"
          v-model="form.costImpact"
          mode="currency"
          currency="USD"
          locale="en-US"
          placeholder="Enter cost impact"
          class="w-full"
        />
        <small class="text-surface-500">Use negative values for cost reductions</small>
      </div>

      <!-- Time Impact -->
      <div class="space-y-2">
        <label for="co-time-impact" class="block text-sm font-semibold text-surface-900"
          >Time Impact (days)</label
        >
        <InputNumber
          id="co-time-impact"
          v-model="form.timeImpact"
          placeholder="Enter time impact in days"
          class="w-full"
        />
        <small class="text-surface-500">Use negative values for schedule compression</small>
      </div>

      <!-- Billable -->
      <div class="space-y-2">
        <div class="flex items-center gap-2">
          <Checkbox v-model="form.billable" inputId="co-billable" :binary="true" />
          <label for="co-billable" class="text-sm font-semibold text-surface-900 cursor-pointer">
            Billable to Client
          </label>
        </div>
      </div>

      <!-- Reason -->
      <div class="space-y-2">
        <label for="co-reason" class="block text-sm font-semibold text-surface-900">Reason</label>
        <Textarea
          id="co-reason"
          v-model="form.reason"
          placeholder="Enter reason for change order"
          rows="3"
          class="w-full"
        />
      </div>

      <!-- Status -->
      <div class="space-y-2">
        <label for="co-status" class="block text-sm font-semibold text-surface-900">Status</label>
        <Select
          id="co-status"
          v-model="form.status"
          :options="statusOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="Select status"
          class="w-full"
        />
      </div>

      <!-- Approval Notes (only show if status is approved/rejected) -->
      <div
        v-if="changeOrder?.id && ['approved', 'rejected', 'executed'].includes(form.status)"
        class="space-y-2"
      >
        <label for="co-notes" class="block text-sm font-semibold text-surface-900">
          {{ form.status === 'approved' ? 'Approval Notes' : 'Notes' }}
        </label>
        <Textarea
          id="co-notes"
          v-model="form.notes"
          placeholder="Enter notes"
          rows="3"
          class="w-full"
        />
      </div>
    </form>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button label="Cancel" severity="secondary" @click="closeModal" :disabled="loading" />
        <Button
          :label="changeOrder?.id ? 'Update' : 'Create'"
          @click="handleSubmit"
          :loading="loading"
          :disabled="loading"
        />
      </div>
    </template>
  </Dialog>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useProjectStore } from '@/stores/project';
import { storeToRefs } from 'pinia';
import ChangeOrderRepository from '@/services/firebase/Repositories/ChangeOrderRepository';
import {
  CHANGE_ORDER_STATUS_OPTIONS,
  CHANGE_ORDER_TYPE_OPTIONS,
} from '@/constants/changeOrderConstants';

import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Select from 'primevue/select';
import InputNumber from 'primevue/inputnumber';
import Checkbox from 'primevue/checkbox';
import Button from 'primevue/button';

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  changeOrder: {
    type: Object,
    default: null,
  },
  projectId: {
    type: String,
    default: null,
  },
});

const emit = defineEmits(['update:visible', 'change-order-saved']);

const toast = useToast();
const projectStore = useProjectStore();
const { projects } = storeToRefs(projectStore);

const loading = ref(false);
const errors = ref({});
const windowWidth = ref(window.innerWidth);

const isOpen = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value),
});

const dialogStyle = computed(() => {
  if (windowWidth.value < 768) {
    return {
      width: '95vw',
      height: 'auto',
      margin: '1rem',
      maxHeight: '90vh',
    };
  } else {
    return {
      width: '600px',
      maxWidth: '90vw',
    };
  }
});

const dialogPosition = computed(() => (windowWidth.value < 768 ? 'bottom' : 'center'));

const projectOptions = computed(() => {
  return projects.value.map((project) => ({
    label: project.name,
    value: project.id,
  }));
});

const statusOptions = CHANGE_ORDER_STATUS_OPTIONS;
const typeOptions = CHANGE_ORDER_TYPE_OPTIONS;

const form = ref({
  title: '',
  description: '',
  projectId: '',
  type: 'addition',
  costImpact: 0,
  timeImpact: 0,
  billable: true,
  reason: '',
  status: 'proposed',
  notes: '',
});

// Load change order data when editing
async function loadChangeOrderData() {
  if (props.changeOrder?.id) {
    form.value = {
      title: props.changeOrder.title || '',
      description: props.changeOrder.description || '',
      projectId: props.changeOrder.projectId || props.projectId || '',
      type: props.changeOrder.type || 'addition',
      costImpact: props.changeOrder.costImpact || 0,
      timeImpact: props.changeOrder.timeImpact || 0,
      billable: props.changeOrder.billable !== false,
      reason: props.changeOrder.reason || '',
      status: props.changeOrder.status || 'proposed',
      notes: props.changeOrder.approvalNotes || props.changeOrder.rejectionReason || '',
    };
  } else {
    // New change order - set defaults
    form.value = {
      title: '',
      description: '',
      projectId: props.projectId || '',
      type: 'addition',
      costImpact: 0,
      timeImpact: 0,
      billable: true,
      reason: '',
      status: 'proposed',
      notes: '',
    };
  }
}

// Validate form
function validateForm() {
  errors.value = {};

  if (!form.value.title?.trim()) {
    errors.value.title = 'Title is required';
  }

  if (!form.value.projectId) {
    errors.value.projectId = 'Project is required';
  }

  return Object.keys(errors.value).length === 0;
}

// Handle form submission
async function handleSubmit() {
  if (!validateForm()) {
    toast.add({
      severity: 'error',
      summary: 'Validation Error',
      detail: 'Please fix the errors before submitting',
      life: 3000,
    });
    return;
  }

  loading.value = true;

  try {
    const changeOrderData = {
      title: form.value.title.trim(),
      description: form.value.description?.trim() || '',
      projectId: form.value.projectId,
      type: form.value.type || 'addition',
      costImpact: form.value.costImpact || 0,
      timeImpact: form.value.timeImpact || 0,
      billable: form.value.billable !== false,
      reason: form.value.reason?.trim() || '',
      status: form.value.status || 'proposed',
    };

    // Add approval/rejection notes if applicable
    if (form.value.status === 'approved' && form.value.notes) {
      changeOrderData.approvalNotes = form.value.notes.trim();
    } else if (form.value.status === 'rejected' && form.value.notes) {
      changeOrderData.rejectionReason = form.value.notes.trim();
    }

    let result;
    if (props.changeOrder?.id) {
      // Update existing change order
      result = await ChangeOrderRepository.updateChangeOrder(props.changeOrder.id, changeOrderData);
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Change order updated successfully',
        life: 3000,
      });
    } else {
      // Create new change order
      result = await ChangeOrderRepository.createChangeOrder(changeOrderData);
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Change order created successfully',
        life: 3000,
      });
    }

    emit('change-order-saved', result);
    closeModal();
  } catch (error) {
    console.error('Error saving change order:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to save change order',
      life: 5000,
    });
  } finally {
    loading.value = false;
  }
}

// Close modal
function closeModal() {
  isOpen.value = false;
  errors.value = {};
}

// Handle window resize
function handleResize() {
  windowWidth.value = window.innerWidth;
}

// Watch for dialog visibility changes
watch(
  () => props.visible,
  (newVal) => {
    if (newVal) {
      loadChangeOrderData();
    }
  },
  { deep: true }
);

// Lifecycle hooks
onMounted(() => {
  window.addEventListener('resize', handleResize);
  if (props.visible) {
    loadChangeOrderData();
  }
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
});
</script>

<style scoped>
:deep(.p-dialog) {
  border-radius: 8px;
}

:deep(.p-dialog-header) {
  padding: 1.25rem;
  border-bottom: 1px solid var(--surface-border);
}

:deep(.p-inputtext),
:deep(.p-select),
:deep(.p-select-label),
:deep(.p-inputnumber-input),
:deep(.p-textarea) {
  font-size: 0.813rem;
  padding: 0.5rem;
}

:deep(.p-select-overlay),
:deep(.p-select-option),
:deep(.p-select-option-label) {
  font-size: 0.813rem;
}

label {
  margin-bottom: 0.25rem;
}

.space-y-3 > * + * {
  margin-top: 0.75rem;
}

.space-y-2 > * + * {
  margin-top: 0.5rem;
}
</style>
