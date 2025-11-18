<template>
  <Dialog
    v-model:visible="isOpen"
    modal
    :header="document?.id ? 'Edit Document' : 'Upload Document'"
    :style="dialogStyle"
    :position="dialogPosition"
    :draggable="false"
    @hide="closeModal"
  >
    <form @submit.prevent="handleSubmit" class="space-y-3">
      <!-- File Name -->
      <div class="space-y-2">
        <label for="doc-name" class="block text-sm font-semibold text-surface-900">
          Document Name <span class="text-red-500">*</span>
        </label>
        <InputText
          id="doc-name"
          v-model="form.name"
          placeholder="Enter document name"
          :class="{ 'border-red-500': errors.name }"
          class="w-full"
        />
        <small v-if="errors.name" class="text-red-500">{{ errors.name }}</small>
      </div>

      <!-- Description -->
      <div class="space-y-2">
        <label for="doc-description" class="block text-sm font-semibold text-surface-900"
          >Description</label
        >
        <Textarea
          id="doc-description"
          v-model="form.description"
          placeholder="Enter document description"
          rows="3"
          class="w-full"
        />
      </div>

      <!-- Project -->
      <div class="space-y-2">
        <label for="doc-project" class="block text-sm font-semibold text-surface-900"
          >Project</label
        >
        <Select
          id="doc-project"
          v-model="form.projectId"
          :options="projectOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="Select a project (optional)"
          class="w-full"
          :disabled="!!projectId"
          showClear
        />
      </div>

      <!-- Category -->
      <div class="space-y-2">
        <label for="doc-category" class="block text-sm font-semibold text-surface-900">
          Category <span class="text-red-500">*</span>
        </label>
        <Select
          id="doc-category"
          v-model="form.category"
          :options="categoryOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="Select a category"
          :class="{ 'p-invalid': errors.category }"
          class="w-full"
        />
        <small v-if="errors.category" class="text-red-500">{{ errors.category }}</small>
      </div>

      <!-- Google Drive File ID -->
      <div class="space-y-2">
        <label for="doc-drive-id" class="block text-sm font-semibold text-surface-900">
          Google Drive File ID
          <span v-if="!document?.id" class="text-red-500">*</span>
        </label>
        <InputText
          id="doc-drive-id"
          v-model="form.googleDriveFileId"
          placeholder="Enter Google Drive file ID"
          :class="{ 'border-red-500': errors.googleDriveFileId }"
          class="w-full"
        />
        <small v-if="errors.googleDriveFileId" class="text-red-500">{{
          errors.googleDriveFileId
        }}</small>
        <small class="text-surface-500"
          >The file ID from the Google Drive share link (e.g.,
          1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p)</small
        >
      </div>

      <!-- Google Drive Link -->
      <div class="space-y-2">
        <label for="doc-drive-link" class="block text-sm font-semibold text-surface-900"
          >Google Drive Link</label
        >
        <InputText
          id="doc-drive-link"
          v-model="form.googleDriveLink"
          placeholder="Enter full Google Drive share link"
          class="w-full"
        />
      </div>

      <!-- File Size -->
      <div class="space-y-2">
        <label for="doc-size" class="block text-sm font-semibold text-surface-900"
          >File Size (bytes)</label
        >
        <InputNumber
          id="doc-size"
          v-model="form.fileSize"
          placeholder="Enter file size in bytes"
          class="w-full"
        />
      </div>

      <!-- MIME Type -->
      <div class="space-y-2">
        <label for="doc-mime" class="block text-sm font-semibold text-surface-900">MIME Type</label>
        <InputText
          id="doc-mime"
          v-model="form.mimeType"
          placeholder="e.g., application/pdf"
          class="w-full"
        />
      </div>

      <!-- Status -->
      <div class="space-y-2">
        <label for="doc-status" class="block text-sm font-semibold text-surface-900">Status</label>
        <Select
          id="doc-status"
          v-model="form.status"
          :options="statusOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="Select status"
          class="w-full"
        />
      </div>

      <!-- Review Comments (only show if status is approved/rejected) -->
      <div v-if="document?.id && ['approved', 'rejected'].includes(form.status)" class="space-y-2">
        <label for="doc-comments" class="block text-sm font-semibold text-surface-900"
          >Review Comments</label
        >
        <Textarea
          id="doc-comments"
          v-model="form.reviewComments"
          placeholder="Enter review comments"
          rows="3"
          class="w-full"
        />
      </div>

      <!-- Tags -->
      <div class="space-y-2">
        <label for="doc-tags" class="block text-sm font-semibold text-surface-900">Tags</label>
        <InputText
          id="doc-tags"
          v-model="tagsInput"
          placeholder="Enter tags separated by commas"
          class="w-full"
        />
        <small class="text-surface-500"
          >Separate tags with commas (e.g., structural, approved, final)</small
        >
      </div>
    </form>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button label="Cancel" severity="secondary" @click="closeModal" :disabled="loading" />
        <Button
          :label="document?.id ? 'Update' : 'Upload'"
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
import DocumentRepository from '@/services/firebase/Repositories/DocumentRepository';
import { DOCUMENT_CATEGORIES } from '@/constants/documentCategories';

import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Select from 'primevue/select';
import InputNumber from 'primevue/inputnumber';
import Button from 'primevue/button';

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  document: {
    type: Object,
    default: null,
  },
  projectId: {
    type: String,
    default: null,
  },
});

const emit = defineEmits(['update:visible', 'document-saved']);

const toast = useToast();
const projectStore = useProjectStore();
const { projects } = storeToRefs(projectStore);

const loading = ref(false);
const errors = ref({});
const windowWidth = ref(window.innerWidth);
const tagsInput = ref('');

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

const categoryOptions = computed(() => {
  return Object.entries(DOCUMENT_CATEGORIES).map(([key, value]) => ({
    label: value.label,
    value: key,
  }));
});

const statusOptions = [
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Archived', value: 'archived' },
];

const form = ref({
  name: '',
  description: '',
  projectId: '',
  category: '',
  googleDriveFileId: '',
  googleDriveLink: '',
  fileSize: null,
  mimeType: '',
  status: 'pending',
  reviewComments: '',
  tags: [],
});

// Load document data when editing
async function loadDocumentData() {
  if (props.document?.id) {
    form.value = {
      name: props.document.name || '',
      description: props.document.description || '',
      projectId: props.document.projectId || props.projectId || '',
      category: props.document.category || '',
      googleDriveFileId: props.document.googleDriveFileId || '',
      googleDriveLink: props.document.googleDriveLink || '',
      fileSize: props.document.fileSize || null,
      mimeType: props.document.mimeType || '',
      status: props.document.status || 'pending',
      reviewComments: props.document.reviewComments || '',
      tags: props.document.tags || [],
    };
    tagsInput.value = (props.document.tags || []).join(', ');
  } else {
    // New document - set defaults
    form.value = {
      name: '',
      description: '',
      projectId: props.projectId || '',
      category: '',
      googleDriveFileId: '',
      googleDriveLink: '',
      fileSize: null,
      mimeType: '',
      status: 'pending',
      reviewComments: '',
      tags: [],
    };
    tagsInput.value = '';
  }
}

// Validate form
function validateForm() {
  errors.value = {};

  if (!form.value.name?.trim()) {
    errors.value.name = 'Document name is required';
  }

  if (!form.value.category) {
    errors.value.category = 'Category is required';
  }

  if (!props.document?.id && !form.value.googleDriveFileId?.trim()) {
    errors.value.googleDriveFileId = 'Google Drive File ID is required for new documents';
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
    // Parse tags from input
    const tags = tagsInput.value
      ? tagsInput.value
          .split(',')
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0)
      : [];

    const documentData = {
      name: form.value.name.trim(),
      description: form.value.description?.trim() || '',
      projectId: form.value.projectId || null,
      category: form.value.category,
      googleDriveFileId: form.value.googleDriveFileId?.trim() || '',
      googleDriveLink: form.value.googleDriveLink?.trim() || '',
      fileSize: form.value.fileSize || null,
      mimeType: form.value.mimeType?.trim() || '',
      status: form.value.status || 'pending',
      tags: tags,
    };

    // Add review comments if applicable
    if (form.value.reviewComments?.trim()) {
      documentData.reviewComments = form.value.reviewComments.trim();
    }

    let result;
    if (props.document?.id) {
      // Update existing document
      result = await DocumentRepository.updateDocument(props.document.id, documentData);
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Document updated successfully',
        life: 3000,
      });
    } else {
      // Create new document
      result = await DocumentRepository.createDocument(documentData);
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Document uploaded successfully',
        life: 3000,
      });
    }

    emit('document-saved', result);
    closeModal();
  } catch (error) {
    console.error('Error saving document:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to save document',
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
  tagsInput.value = '';
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
      loadDocumentData();
    }
  },
  { deep: true }
);

// Lifecycle hooks
onMounted(() => {
  window.addEventListener('resize', handleResize);
  if (props.visible) {
    loadDocumentData();
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
