<template>
  <Dialog
    v-model:visible="isOpen"
    modal
    :header="rfi?.id ? 'Edit RFI' : 'Create RFI'"
    :style="dialogStyle"
    :position="dialogPosition"
    :draggable="false"
    @hide="closeModal"
  >
    <form @submit.prevent="handleSubmit" class="space-y-3">
      <!-- Title -->
      <div class="space-y-2">
        <label for="rfi-title" class="block text-sm font-semibold text-surface-900">
          Title <span class="text-red-500">*</span>
        </label>
        <InputText
          id="rfi-title"
          v-model="form.title"
          placeholder="Enter RFI title"
          :class="{ 'border-red-500': errors.title }"
          class="w-full"
        />
        <small v-if="errors.title" class="text-red-500">{{ errors.title }}</small>
      </div>

      <!-- Description -->
      <div class="space-y-2">
        <label for="rfi-description" class="block text-sm font-semibold text-surface-900"
          >Description</label
        >
        <Textarea
          id="rfi-description"
          v-model="form.description"
          placeholder="Enter RFI description"
          rows="4"
          class="w-full"
        />
      </div>

      <!-- Project -->
      <div class="space-y-2">
        <label for="rfi-project" class="block text-sm font-semibold text-surface-900">
          Project <span class="text-red-500">*</span>
        </label>
        <Select
          id="rfi-project"
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

      <!-- Assigned To -->
      <div class="space-y-2">
        <label for="rfi-assignedTo" class="block text-sm font-semibold text-surface-900"
          >Assigned To</label
        >
        <Select
          id="rfi-assignedTo"
          v-model="form.assignedTo"
          :options="userOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="Select a user"
          class="w-full"
          showClear
        />
      </div>

      <!-- Due Date -->
      <div class="space-y-2">
        <label for="rfi-dueDate" class="block text-sm font-semibold text-surface-900"
          >Due Date</label
        >
        <DatePicker
          id="rfi-dueDate"
          v-model="form.dueDate"
          placeholder="Select due date"
          dateFormat="mm/dd/yy"
          showIcon
          class="w-full"
        />
      </div>

      <!-- Status -->
      <div class="space-y-2">
        <label for="rfi-status" class="block text-sm font-semibold text-surface-900">Status</label>
        <Select
          id="rfi-status"
          v-model="form.status"
          :options="statusOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="Select status"
          class="w-full"
        />
      </div>

      <!-- Response (only show if RFI has been responded to) -->
      <div v-if="rfi?.id && form.status === 'responded'" class="space-y-2">
        <label for="rfi-response" class="block text-sm font-semibold text-surface-900"
          >Response</label
        >
        <Textarea
          id="rfi-response"
          v-model="form.response"
          placeholder="Enter response"
          rows="4"
          class="w-full"
        />
      </div>
    </form>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button label="Cancel" severity="secondary" @click="closeModal" :disabled="loading" />
        <Button
          :label="rfi?.id ? 'Update' : 'Create'"
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
import RFIRepository from '@/services/firebase/Repositories/RFIRepository';
import { getActiveUsers } from '@/services/api/usersApi';
import { RFI_STATUS_OPTIONS } from '@/constants/rfiConstants';

import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Select from 'primevue/select';
import DatePicker from 'primevue/datepicker';
import Button from 'primevue/button';

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  rfi: {
    type: Object,
    default: null,
  },
  projectId: {
    type: String,
    default: null,
  },
});

const emit = defineEmits(['update:visible', 'rfi-saved']);

const toast = useToast();
const projectStore = useProjectStore();
const { projects } = storeToRefs(projectStore);

const loading = ref(false);
const errors = ref({});
const users = ref([]);
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

const userOptions = computed(() => {
  return users.value.map((user) => ({
    label: user.name || user.email,
    value: user.id,
  }));
});

const statusOptions = RFI_STATUS_OPTIONS;

const form = ref({
  title: '',
  description: '',
  projectId: '',
  assignedTo: '',
  dueDate: null,
  status: 'draft',
  response: '',
});

// Load users
async function loadUsers() {
  try {
    users.value = await getActiveUsers();
  } catch (error) {
    console.error('Error loading users:', error);
  }
}

// Load RFI data when editing
async function loadRFIData() {
  if (props.rfi?.id) {
    form.value = {
      title: props.rfi.title || '',
      description: props.rfi.description || '',
      projectId: props.rfi.projectId || props.projectId || '',
      assignedTo: props.rfi.assignedTo || '',
      dueDate: props.rfi.dueDate ? new Date(props.rfi.dueDate) : null,
      status: props.rfi.status || 'draft',
      response: props.rfi.response || '',
    };
  } else {
    // New RFI - set defaults
    form.value = {
      title: '',
      description: '',
      projectId: props.projectId || '',
      assignedTo: '',
      dueDate: null,
      status: 'draft',
      response: '',
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
    const rfiData = {
      title: form.value.title.trim(),
      description: form.value.description?.trim() || '',
      projectId: form.value.projectId,
      assignedTo: form.value.assignedTo || null,
      assignedToName: form.value.assignedTo
        ? users.value.find((u) => u.id === form.value.assignedTo)?.name || ''
        : null,
      dueDate: form.value.dueDate ? form.value.dueDate.toISOString().split('T')[0] : null,
      status: form.value.status || 'draft',
      response: form.value.response?.trim() || null,
    };

    let result;
    if (props.rfi?.id) {
      // Update existing RFI
      result = await RFIRepository.updateRFI(props.rfi.id, rfiData);
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'RFI updated successfully',
        life: 3000,
      });
    } else {
      // Create new RFI
      result = await RFIRepository.createRFI(rfiData);
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'RFI created successfully',
        life: 3000,
      });
    }

    emit('rfi-saved', result);
    closeModal();
  } catch (error) {
    console.error('Error saving RFI:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to save RFI',
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
      loadUsers();
      loadRFIData();
    }
  },
  { deep: true }
);

// Lifecycle hooks
onMounted(() => {
  window.addEventListener('resize', handleResize);
  if (props.visible) {
    loadUsers();
    loadRFIData();
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
:deep(.p-textarea),
:deep(.p-datepicker-input) {
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
