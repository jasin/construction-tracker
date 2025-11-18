<template>
  <Dialog
    v-model:visible="isOpen"
    modal
    :header="submittal?.id ? 'Edit Submittal' : 'Create Submittal'"
    :style="dialogStyle"
    :position="dialogPosition"
    :draggable="false"
    @hide="closeModal"
  >
    <form @submit.prevent="handleSubmit" class="space-y-3">
      <!-- Title -->
      <div class="space-y-2">
        <label for="submittal-title" class="block text-sm font-semibold text-surface-900">
          Title <span class="text-red-500">*</span>
        </label>
        <InputText
          id="submittal-title"
          v-model="form.title"
          placeholder="Enter submittal title"
          :class="{ 'border-red-500': errors.title }"
          class="w-full"
        />
        <small v-if="errors.title" class="text-red-500">{{ errors.title }}</small>
      </div>

      <!-- Description -->
      <div class="space-y-2">
        <label for="submittal-description" class="block text-sm font-semibold text-surface-900"
          >Description</label
        >
        <Textarea
          id="submittal-description"
          v-model="form.description"
          placeholder="Enter submittal description"
          rows="4"
          class="w-full"
        />
      </div>

      <!-- Project -->
      <div class="space-y-2">
        <label for="submittal-project" class="block text-sm font-semibold text-surface-900">
          Project <span class="text-red-500">*</span>
        </label>
        <Select
          id="submittal-project"
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
        <label for="submittal-type" class="block text-sm font-semibold text-surface-900"
          >Type</label
        >
        <Select
          id="submittal-type"
          v-model="form.type"
          :options="typeOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="Select submittal type"
          class="w-full"
        />
      </div>

      <!-- Reviewed By -->
      <div class="space-y-2">
        <label for="submittal-reviewedBy" class="block text-sm font-semibold text-surface-900"
          >Reviewed By</label
        >
        <Select
          id="submittal-reviewedBy"
          v-model="form.reviewedBy"
          :options="userOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="Select a reviewer"
          class="w-full"
          showClear
        />
      </div>

      <!-- Due Date -->
      <div class="space-y-2">
        <label for="submittal-dueDate" class="block text-sm font-semibold text-surface-900"
          >Required Date</label
        >
        <DatePicker
          id="submittal-dueDate"
          v-model="form.dueDate"
          placeholder="Select required date"
          dateFormat="mm/dd/yy"
          showIcon
          class="w-full"
        />
      </div>

      <!-- Spec Section -->
      <div class="space-y-2">
        <label for="submittal-specSection" class="block text-sm font-semibold text-surface-900">
          Specification Section
        </label>
        <InputText
          id="submittal-specSection"
          v-model="form.specSection"
          placeholder="e.g., 03 30 00 - Cast-in-Place Concrete"
          class="w-full"
        />
      </div>

      <!-- Status -->
      <div class="space-y-2">
        <label for="submittal-status" class="block text-sm font-semibold text-surface-900"
          >Status</label
        >
        <Select
          id="submittal-status"
          v-model="form.status"
          :options="statusOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="Select status"
          class="w-full"
        />
      </div>

      <!-- Review Comments (only show if submittal has been reviewed) -->
      <div
        v-if="
          submittal?.id &&
          ['approved', 'approved_with_comments', 'rejected', 'resubmit'].includes(form.status)
        "
        class="space-y-2"
      >
        <label for="submittal-comments" class="block text-sm font-semibold text-surface-900"
          >Review Comments</label
        >
        <Textarea
          id="submittal-comments"
          v-model="form.comments"
          placeholder="Enter review comments"
          rows="4"
          class="w-full"
        />
      </div>
    </form>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button label="Cancel" severity="secondary" @click="closeModal" :disabled="loading" />
        <Button
          :label="submittal?.id ? 'Update' : 'Create'"
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
import SubmittalRepository from '@/services/firebase/Repositories/SubmittalRepository';
import UserRepository from '@/services/firebase/Repositories/UserRepository';
import { SUBMITTAL_STATUS_OPTIONS, SUBMITTAL_TYPE_OPTIONS } from '@/constants/submittalConstants';

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
  submittal: {
    type: Object,
    default: null,
  },
  projectId: {
    type: String,
    default: null,
  },
});

const emit = defineEmits(['update:visible', 'submittal-saved']);

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

const statusOptions = SUBMITTAL_STATUS_OPTIONS;
const typeOptions = SUBMITTAL_TYPE_OPTIONS;

const form = ref({
  title: '',
  description: '',
  projectId: '',
  type: 'product_data',
  reviewedBy: '',
  dueDate: null,
  specSection: '',
  status: 'not_submitted',
  comments: '',
});

// Load users
async function loadUsers() {
  try {
    const allUsers = await UserRepository.getAll();
    users.value = allUsers.filter((user) => user.active !== false);
  } catch (error) {
    console.error('Error loading users:', error);
  }
}

// Load submittal data when editing
async function loadSubmittalData() {
  if (props.submittal?.id) {
    form.value = {
      title: props.submittal.title || '',
      description: props.submittal.description || '',
      projectId: props.submittal.projectId || props.projectId || '',
      type: props.submittal.type || 'product_data',
      reviewedBy: props.submittal.reviewedBy || '',
      dueDate: props.submittal.dueDate ? new Date(props.submittal.dueDate) : null,
      specSection: props.submittal.specSection || '',
      status: props.submittal.status || 'not_submitted',
      comments: props.submittal.comments || '',
    };
  } else {
    // New submittal - set defaults
    form.value = {
      title: '',
      description: '',
      projectId: props.projectId || '',
      type: 'product_data',
      reviewedBy: '',
      dueDate: null,
      specSection: '',
      status: 'not_submitted',
      comments: '',
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
    const submittalData = {
      title: form.value.title.trim(),
      description: form.value.description?.trim() || '',
      projectId: form.value.projectId,
      type: form.value.type || 'product_data',
      reviewedBy: form.value.reviewedBy || null,
      reviewedByName: form.value.reviewedBy
        ? users.value.find((u) => u.id === form.value.reviewedBy)?.name || ''
        : null,
      dueDate: form.value.dueDate ? form.value.dueDate.toISOString().split('T')[0] : null,
      specSection: form.value.specSection?.trim() || null,
      status: form.value.status || 'not_submitted',
      comments: form.value.comments?.trim() || null,
    };

    let result;
    if (props.submittal?.id) {
      // Update existing submittal
      result = await SubmittalRepository.updateSubmittal(props.submittal.id, submittalData);
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Submittal updated successfully',
        life: 3000,
      });
    } else {
      // Create new submittal
      result = await SubmittalRepository.createSubmittal(submittalData);
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Submittal created successfully',
        life: 3000,
      });
    }

    emit('submittal-saved', result);
    closeModal();
  } catch (error) {
    console.error('Error saving submittal:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to save submittal',
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
      loadSubmittalData();
    }
  },
  { deep: true }
);

// Lifecycle hooks
onMounted(() => {
  window.addEventListener('resize', handleResize);
  if (props.visible) {
    loadUsers();
    loadSubmittalData();
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
