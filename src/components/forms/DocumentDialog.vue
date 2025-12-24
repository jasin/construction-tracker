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
    <div class="space-y-4">
      <!-- File Upload Area (only for new documents) -->
      <div v-if="!document?.id" class="space-y-2">
        <label class="block text-sm font-semibold text-surface-900">
          Document File <span class="text-red-500">*</span>
        </label>
        <div
          @drop="handleDrop"
          @dragover.prevent
          @dragenter.prevent="isDragging = true"
          @dragleave.prevent="isDragging = false"
          class="border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer"
          :class="{
            'border-primary-500 bg-primary-50': isDragging,
            'border-surface-300 hover:border-surface-400': !isDragging,
            'border-red-500': errors.file,
          }"
          @click="$refs.fileInput?.click()"
        >
          <i class="pi pi-cloud-upload text-3xl text-surface-400 mb-2"></i>
          <p class="text-sm font-medium text-surface-900 mb-1">
            {{ selectedFile ? selectedFile.name : 'Drop file here or click to browse' }}
          </p>
          <p class="text-xs text-surface-500">
            {{ selectedFile ? formatFileSize(selectedFile.size) : 'Select a file to upload' }}
          </p>
          <input
            ref="fileInput"
            type="file"
            @change="handleFileSelect"
            class="hidden"
            :accept="acceptedFileTypes"
          />
        </div>
        <small v-if="errors.file" class="text-red-500">{{ errors.file }}</small>
        <small v-else-if="selectedCategoryConfig?.allowedTypes" class="text-surface-500">
          Allowed types: {{ selectedCategoryConfig.allowedTypes.join(', ') }} (Max:
          {{ formatFileSize(selectedCategoryConfig.maxFileSize) }})
        </small>
      </div>

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
        <small v-else-if="selectedCategoryConfig" class="text-surface-500">
          {{ selectedCategoryConfig.description }}
        </small>
      </div>

      <!-- Subfolder Selection (for categories that have subfolders) -->
      <div v-if="selectedCategoryConfig?.subfolders" class="space-y-2">
        <label for="doc-subfolder" class="block text-sm font-semibold text-surface-900">
          Subfolder
        </label>
        <Select
          id="doc-subfolder"
          v-model="form.subfolder"
          :options="subfolderOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="Select subfolder (optional)"
          class="w-full"
          showClear
        />
      </div>

      <!-- Project -->
      <div class="space-y-2">
        <label for="doc-project" class="block text-sm font-semibold text-surface-900">
          Project <span class="text-red-500">*</span>
        </label>
        <Select
          id="doc-project"
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

      <!-- Description -->
      <div class="space-y-2">
        <label for="doc-description" class="block text-sm font-semibold text-surface-900">
          Description
        </label>
        <Textarea
          id="doc-description"
          v-model="form.description"
          placeholder="Enter document description"
          rows="3"
          class="w-full"
        />
      </div>

      <!-- Tags -->
      <div class="space-y-2">
        <label for="doc-tags" class="block text-sm font-semibold text-surface-900">Tags</label>
        <InputChips
          id="doc-tags"
          v-model="form.tags"
          placeholder="Add tags (press Enter to add)"
          class="w-full"
        />
        <small class="text-surface-500">Add tags to help organize and search for documents</small>
      </div>

      <!-- Status (only show when editing) -->
      <div v-if="document?.id" class="space-y-2">
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

      <!-- Review Comments (only show if editing and status is approved/rejected) -->
      <div v-if="document?.id && ['approved', 'rejected'].includes(form.status)" class="space-y-2">
        <label for="doc-comments" class="block text-sm font-semibold text-surface-900">
          Review Comments
        </label>
        <Textarea
          id="doc-comments"
          v-model="form.reviewComments"
          placeholder="Enter review comments"
          rows="3"
          class="w-full"
        />
      </div>

      <!-- Approval Required Notice -->
      <div
        v-if="selectedCategoryConfig?.requiresApproval && !document?.id"
        class="bg-yellow-50 border border-yellow-200 rounded-lg p-3"
      >
        <div class="flex items-start gap-2">
          <i class="pi pi-info-circle text-yellow-600 mt-0.5"></i>
          <div>
            <p class="text-sm font-medium text-yellow-800">Approval Required</p>
            <p class="text-sm text-yellow-700">
              Documents in this category require approval before they become active.
            </p>
          </div>
        </div>
      </div>

      <!-- File Validation Warning -->
      <div v-if="validationWarning" class="bg-red-50 border border-red-200 rounded-lg p-3">
        <div class="flex items-start gap-2">
          <i class="pi pi-exclamation-triangle text-red-600 mt-0.5"></i>
          <div>
            <p class="text-sm font-medium text-red-800">Invalid File</p>
            <p class="text-sm text-red-700">{{ validationWarning }}</p>
          </div>
        </div>
      </div>

      <!-- Upload Progress -->
      <div v-if="uploading" class="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div class="flex items-center gap-3">
          <ProgressSpinner style="width: 24px; height: 24px" strokeWidth="4" />
          <div class="flex-1">
            <p class="text-sm font-medium text-blue-800">{{ uploadStatus }}</p>
            <ProgressBar v-if="uploadProgress > 0" :value="uploadProgress" class="mt-2" />
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button label="Cancel" severity="secondary" @click="closeModal" :disabled="uploading" />
        <Button
          :label="document?.id ? 'Update' : 'Upload'"
          @click="handleSubmit"
          :loading="uploading"
          :disabled="uploading || !canSubmit"
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
import {
  uploadDocument as uploadDocumentApi,
  updateDocument as updateDocumentApi,
} from '@/services/api/documentsApi';
import googleDriveService from '@/services/api/googleDriveService.js';
import { DOCUMENT_CATEGORIES } from '@/constants/documentCategories';
import { handleError } from '@/utils/errorHandler';

import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Select from 'primevue/select';
import InputChips from 'primevue/inputchips';
import Button from 'primevue/button';
import ProgressBar from 'primevue/progressbar';
import ProgressSpinner from 'primevue/progressspinner';

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
const uploading = ref(false);
const uploadProgress = ref(0);
const uploadStatus = ref('');
const errors = ref({});
const windowWidth = ref(window.innerWidth);
const selectedFile = ref(null);
const isDragging = ref(false);
const fileInput = ref(null);
const validationWarning = ref('');

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

const selectedCategoryConfig = computed(() => {
  return form.value.category ? DOCUMENT_CATEGORIES[form.value.category] : null;
});

const subfolderOptions = computed(() => {
  if (!selectedCategoryConfig.value?.subfolders) return [];

  return Object.entries(selectedCategoryConfig.value.subfolders).map(([key, label]) => ({
    label,
    value: key,
  }));
});

const acceptedFileTypes = computed(() => {
  if (!selectedCategoryConfig.value) return '*';
  return selectedCategoryConfig.value.allowedTypes.join(',');
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
  subfolder: null,
  tags: [],
  status: 'pending',
  reviewComments: '',
});

const canSubmit = computed(() => {
  // For editing, just need valid data
  if (props.document?.id) {
    return form.value.name?.trim() && form.value.category && !uploading.value;
  }

  // For new upload, need file + valid data + no validation warnings
  return (
    selectedFile.value &&
    form.value.name?.trim() &&
    form.value.category &&
    !validationWarning.value &&
    !uploading.value
  );
});

// Helper functions
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const isValidFileType = (filename, category) => {
  const config = DOCUMENT_CATEGORIES[category];
  if (!config || !config.allowedTypes || config.allowedTypes.length === 0) return true;

  const extension = '.' + filename.split('.').pop().toLowerCase();
  return config.allowedTypes.includes(extension);
};

const getMaxFileSize = (category) => {
  const config = DOCUMENT_CATEGORIES[category];
  return config ? config.maxFileSize : 25 * 1024 * 1024; // Default 25MB
};

// Validate selected file
const validateFile = (file) => {
  validationWarning.value = '';

  if (!file) return false;

  // Check file type
  if (form.value.category && !isValidFileType(file.name, form.value.category)) {
    validationWarning.value = `File type not allowed for ${selectedCategoryConfig.value.label}`;
    return false;
  }

  // Check file size
  const maxSize = form.value.category ? getMaxFileSize(form.value.category) : 50 * 1024 * 1024;
  if (file.size > maxSize) {
    validationWarning.value = `File size (${formatFileSize(file.size)}) exceeds maximum allowed (${formatFileSize(maxSize)})`;
    return false;
  }

  return true;
};

// Handle file selection
const handleFileSelect = (event) => {
  const file = event.target.files?.[0];
  if (file) {
    selectedFile.value = file;
    if (!form.value.name) {
      form.value.name = file.name;
    }
    validateFile(file);
  }
};

// Handle drag and drop
const handleDrop = (event) => {
  event.preventDefault();
  isDragging.value = false;

  const file = event.dataTransfer.files?.[0];
  if (file) {
    selectedFile.value = file;
    if (!form.value.name) {
      form.value.name = file.name;
    }
    validateFile(file);

    // Update file input
    if (fileInput.value) {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      fileInput.value.files = dataTransfer.files;
    }
  }
};

// Load document data when editing
async function loadDocumentData() {
  if (props.document?.id) {
    form.value = {
      name: props.document.name || '',
      description: props.document.description || '',
      projectId: props.document.projectId || props.projectId || '',
      category: props.document.category || '',
      subfolder: props.document.subfolder || null,
      tags: props.document.tags || [],
      status: props.document.status || 'pending',
      reviewComments: props.document.reviewComments || '',
    };
  } else {
    // New document - set defaults
    form.value = {
      name: '',
      description: '',
      projectId: props.projectId || '',
      category: '',
      subfolder: null,
      tags: [],
      status: 'pending',
      reviewComments: '',
    };
    selectedFile.value = null;
    validationWarning.value = '';
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

  if (!form.value.projectId) {
    errors.value.projectId = 'Project is required';
  }

  if (!props.document?.id && !selectedFile.value) {
    errors.value.file = 'Please select a file to upload';
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

  // If editing, just update metadata
  if (props.document?.id) {
    await updateDocument();
  } else {
    await uploadDocument();
  }
}

// Upload new document
async function uploadDocument() {
  uploading.value = true;
  uploadProgress.value = 0;
  uploadStatus.value = 'Initializing Google Drive...';

  try {
    // Initialize Google Drive if needed
    if (!googleDriveService.isSignedIn()) {
      uploadStatus.value = 'Signing in to Google Drive...';
      await googleDriveService.signIn();
    }

    uploadProgress.value = 20;

    // Upload to Google Drive
    uploadStatus.value = `Uploading ${selectedFile.value.name} to Google Drive...`;
    const driveFile = await googleDriveService.uploadDocument(
      selectedFile.value,
      null, // folder ID - can be implemented later
      {
        name: form.value.name,
        description: form.value.description,
      }
    );

    uploadProgress.value = 60;

    // Create document record via backend API
    uploadStatus.value = 'Creating document record...';

    // Create FormData for document upload
    const formData = new FormData();
    formData.append('name', form.value.name.trim());
    formData.append('description', form.value.description?.trim() || '');
    formData.append('category', form.value.category);
    formData.append('subfolder', form.value.subfolder || '');
    formData.append('projectId', form.value.projectId);
    formData.append('googleDriveFileId', driveFile.id);
    formData.append('googleDriveLink', googleDriveService.getShareableLink(driveFile.id));
    formData.append('mimeType', selectedFile.value.type);
    formData.append('fileSize', selectedFile.value.size);
    formData.append(
      'status',
      selectedCategoryConfig.value?.requiresApproval ? 'pending' : 'approved'
    );

    // Add tags as JSON array
    if (form.value.tags && form.value.tags.length > 0) {
      formData.append('tags', JSON.stringify(form.value.tags));
    }

    const result = await uploadDocumentApi(formData);

    uploadProgress.value = 100;
    uploadStatus.value = 'Upload complete!';

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Document uploaded successfully',
      life: 3000,
    });

    emit('document-saved', result);
    closeModal();
  } catch (error) {
    console.error('Error uploading document:', error);
    handleError(error, 'Upload document');
    toast.add({
      severity: 'error',
      summary: 'Upload Failed',
      detail: error.message || 'Failed to upload document',
      life: 5000,
    });
  } finally {
    uploading.value = false;
    uploadProgress.value = 0;
    uploadStatus.value = '';
  }
}

// Update existing document metadata
async function updateDocument() {
  loading.value = true;

  try {
    const updates = {
      name: form.value.name.trim(),
      description: form.value.description?.trim() || '',
      category: form.value.category,
      subfolder: form.value.subfolder || null,
      tags: form.value.tags || [],
      status: form.value.status,
    };

    // Add review comments if applicable
    if (form.value.reviewComments?.trim()) {
      updates.reviewComments = form.value.reviewComments.trim();
    }

    const result = await updateDocumentApi(props.document.id, updates);

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Document updated successfully',
      life: 3000,
    });

    emit('document-saved', result);
    closeModal();
  } catch (error) {
    console.error('Error updating document:', error);
    handleError(error, 'Update document');
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to update document',
      life: 5000,
    });
  } finally {
    loading.value = false;
  }
}

// Close modal
function closeModal() {
  if (!uploading.value) {
    isOpen.value = false;
    errors.value = {};
    selectedFile.value = null;
    validationWarning.value = '';
    uploadProgress.value = 0;
    uploadStatus.value = '';
  }
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
  }
);

// Watch for category changes to re-validate file
watch(
  () => form.value.category,
  () => {
    if (selectedFile.value) {
      validateFile(selectedFile.value);
    }
  }
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
:deep(.p-textarea),
:deep(.p-inputchips) {
  font-size: 0.813rem;
  padding: 0.5rem;
}

:deep(.p-select-overlay),
:deep(.p-select-option),
:deep(.p-select-option-label) {
  font-size: 0.813rem;
}

:deep(.p-chip) {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
}

label {
  margin-bottom: 0.25rem;
}

.space-y-4 > * + * {
  margin-top: 1rem;
}

.space-y-2 > * + * {
  margin-top: 0.5rem;
}
</style>
