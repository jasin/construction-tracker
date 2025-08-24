<template>
  <Dialog
    v-model:visible="isVisible"
    modal
    :header="uploadMode === 'single' ? 'Upload Document' : 'Upload Multiple Documents'"
    :style="{ width: '50rem' }"
    :breakpoints="{ '1199px': '75vw', '575px': '90vw' }"
  >
    <div class="space-y-6">
      <!-- Upload Mode Toggle -->
      <div class="flex items-center gap-4">
        <span class="text-sm font-medium text-gray-700">Upload Mode:</span>
        <div class="flex border border-gray-300 rounded">
          <Button
            @click="uploadMode = 'single'"
            :severity="uploadMode === 'single' ? 'primary' : 'secondary'"
            label="Single File"
            size="small"
            text
          />
          <Button
            @click="uploadMode = 'multiple'"
            :severity="uploadMode === 'multiple' ? 'primary' : 'secondary'"
            label="Multiple Files"
            size="small"
            text
          />
        </div>
      </div>

      <!-- File Upload Area -->
      <div
        @drop="handleDrop"
        @dragover.prevent
        @dragenter.prevent="isDragging = true"
        @dragleave.prevent="isDragging = false"
        class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors"
        :class="{ 'border-primary-500 bg-primary-50': isDragging }"
      >
        <i class="pi pi-cloud-upload text-4xl text-gray-400 mb-4"></i>
        <h3 class="text-lg font-medium text-gray-900 mb-2">Drop files here or click to browse</h3>
        <p class="text-gray-600 mb-4">
          {{
            uploadMode === 'single' ? 'Select a file to upload' : 'Select multiple files to upload'
          }}
        </p>
        <input
          ref="fileInput"
          type="file"
          :multiple="uploadMode === 'multiple'"
          @change="handleFileSelect"
          class="hidden"
          :accept="acceptedFileTypes"
        />
        <Button
          @click="$refs.fileInput.click()"
          icon="pi pi-folder-open"
          label="Browse Files"
          severity="secondary"
        />
      </div>

      <!-- File List -->
      <div v-if="selectedFiles.length > 0" class="space-y-4">
        <h4 class="text-sm font-medium text-gray-900">
          Selected Files ({{ selectedFiles.length }})
        </h4>

        <div class="space-y-3 max-h-60 overflow-y-auto">
          <div
            v-for="(file, index) in selectedFiles"
            :key="index"
            class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
          >
            <div class="flex items-center gap-3 flex-1 min-w-0">
              <i :class="getFileIcon(file.name)" class="text-xl text-gray-600"></i>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-900 truncate">{{ file.name }}</p>
                <p class="text-xs text-gray-500">{{ formatFileSize(file.size) }}</p>
              </div>
            </div>

            <!-- File Upload Progress -->
            <div v-if="uploadProgress[index] !== undefined" class="flex items-center gap-2">
              <ProgressBar :value="uploadProgress[index]" class="w-20" :show-value="false" />
              <span class="text-xs text-gray-600">{{ uploadProgress[index] }}%</span>
            </div>

            <!-- Remove File Button -->
            <Button
              v-else
              @click="removeFile(index)"
              icon="pi pi-times"
              severity="danger"
              size="small"
              text
            />
          </div>
        </div>
      </div>

      <!-- Upload Configuration -->
      <div v-if="selectedFiles.length > 0" class="space-y-4">
        <!-- Category Selection -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Category *</label>
          <Select
            v-model="selectedCategory"
            :options="categoryOptions"
            option-label="label"
            option-value="value"
            placeholder="Select document category"
            class="w-full"
            :class="{ 'border-red-500': errors.category }"
          />
          <small v-if="errors.category" class="text-red-500">{{ errors.category }}</small>
          <small v-else-if="selectedCategoryConfig" class="text-gray-500 mt-1">
            {{ selectedCategoryConfig.description }}
          </small>
        </div>

        <!-- Subfolder Selection (for categories that have subfolders) -->
        <div v-if="selectedCategoryConfig?.subfolders">
          <label class="block text-sm font-medium text-gray-700 mb-2">Subfolder</label>
          <Select
            v-model="selectedSubfolder"
            :options="subfolderOptions"
            option-label="label"
            option-value="value"
            placeholder="Select subfolder (optional)"
            class="w-full"
            show-clear
          />
        </div>

        <!-- Description -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Description</label>
          <Textarea
            v-model="description"
            rows="3"
            class="w-full"
            placeholder="Enter a description for the document(s)"
          />
        </div>

        <!-- Tags -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Tags</label>
          <Chips v-model="tags" class="w-full" placeholder="Add tags (press Enter to add)" />
          <small class="text-gray-500">Add tags to help organize and search for documents</small>
        </div>

        <!-- Version Information (for single file updates) -->
        <div v-if="uploadMode === 'single' && isUpdate">
          <label class="block text-sm font-medium text-gray-700 mb-2">Version Notes</label>
          <InputText
            v-model="versionNotes"
            class="w-full"
            placeholder="What changed in this version?"
          />
        </div>

        <!-- Approval Required Notice -->
        <div
          v-if="selectedCategoryConfig?.requiresApproval"
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

        <!-- File Validation Warnings -->
        <div v-if="validationWarnings.length > 0" class="space-y-2">
          <div
            v-for="warning in validationWarnings"
            :key="warning.file"
            class="bg-red-50 border border-red-200 rounded-lg p-3"
          >
            <div class="flex items-start gap-2">
              <i class="pi pi-exclamation-triangle text-red-600 mt-0.5"></i>
              <div>
                <p class="text-sm font-medium text-red-800">{{ warning.file }}</p>
                <p class="text-sm text-red-700">{{ warning.message }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Upload Progress Summary -->
      <div v-if="uploading" class="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div class="flex items-center gap-3">
          <ProgressSpinner class="w-6 h-6" />
          <div>
            <p class="text-sm font-medium text-blue-800">
              Uploading {{ uploadedCount }}/{{ selectedFiles.length }} files...
            </p>
            <p class="text-sm text-blue-700">{{ currentUploadFile }}</p>
          </div>
        </div>
      </div>

      <!-- Error Messages -->
      <div v-if="error" class="bg-red-50 border border-red-200 rounded-lg p-3">
        <div class="flex items-start gap-2">
          <i class="pi pi-exclamation-circle text-red-600 mt-0.5"></i>
          <div>
            <p class="text-sm font-medium text-red-800">Upload Error</p>
            <p class="text-sm text-red-700">{{ error }}</p>
          </div>
        </div>
      </div>

      <!-- Success Message -->
      <div v-if="success" class="bg-green-50 border border-green-200 rounded-lg p-3">
        <div class="flex items-start gap-2">
          <i class="pi pi-check-circle text-green-600 mt-0.5"></i>
          <div>
            <p class="text-sm font-medium text-green-800">Upload Successful</p>
            <p class="text-sm text-green-700">{{ success }}</p>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button @click="closeDialog" label="Cancel" severity="secondary" :disabled="uploading" />
        <Button
          @click="uploadFiles"
          :label="
            uploadMode === 'single' ? 'Upload Document' : `Upload ${selectedFiles.length} Documents`
          "
          :loading="uploading"
          :disabled="!canUpload"
        />
      </div>
    </template>
  </Dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import {
  Dialog,
  Button,
  Select,
  Textarea,
  InputText,
  Chips,
  ProgressBar,
  ProgressSpinner,
} from 'primevue'
import firebaseService from '@/services/firebase/firebaseService'
import googleDriveService from '@/services/api/googleDriveService'
import { DOCUMENT_CATEGORIES } from '@/constants/documentCategories'

// Props
const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  projectId: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    default: null,
  },
  existingDocument: {
    type: Object,
    default: null,
  },
})

// Emits
const emit = defineEmits(['update:visible', 'document-uploaded'])

// Reactive state
const uploadMode = ref('single')
const selectedFiles = ref([])
const selectedCategory = ref(props.category)
const selectedSubfolder = ref(null)
const description = ref('')
const tags = ref([])
const versionNotes = ref('')
const isDragging = ref(false)
const uploading = ref(false)
const uploadProgress = ref({})
const uploadedCount = ref(0)
const currentUploadFile = ref('')
const error = ref('')
const success = ref('')
const errors = ref({})

// Helper functions
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const getDocumentIcon = (filename, category = null) => {
  const extension = filename.split('.').pop().toLowerCase()

  // Use category icon if available
  if (category) {
    const config = DOCUMENT_CATEGORIES[category]
    if (config) return config.icon
  }

  // Default icons by file type
  const iconMap = {
    pdf: 'pi pi-file-pdf',
    doc: 'pi pi-file-word',
    docx: 'pi pi-file-word',
    xls: 'pi pi-file-excel',
    xlsx: 'pi pi-file-excel',
    jpg: 'pi pi-image',
    jpeg: 'pi pi-image',
    png: 'pi pi-image',
    gif: 'pi pi-image',
    dwg: 'pi pi-map',
    txt: 'pi pi-file',
    csv: 'pi pi-table',
  }

  return iconMap[extension] || 'pi pi-file'
}

const isValidFileType = (filename, category) => {
  const validTypes = getValidFileTypes(category)
  if (validTypes.length === 0) return true // No restrictions

  const extension = '.' + filename.split('.').pop().toLowerCase()
  return validTypes.includes(extension)
}

const getValidFileTypes = (category) => {
  const config = DOCUMENT_CATEGORIES[category]
  return config ? config.allowedTypes : []
}

const getMaxFileSize = (category) => {
  const config = DOCUMENT_CATEGORIES[category]
  return config ? config.maxFileSize : 25 * 1024 * 1024 // Default 25MB
}

// Computed
const isVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value),
})

const isUpdate = computed(() => !!props.existingDocument)

const categoryOptions = computed(() => {
  return Object.entries(DOCUMENT_CATEGORIES).map(([key, config]) => ({
    label: config.label,
    value: key,
  }))
})

const selectedCategoryConfig = computed(() => {
  return selectedCategory.value ? DOCUMENT_CATEGORIES[selectedCategory.value] : null
})

const subfolderOptions = computed(() => {
  if (!selectedCategoryConfig.value?.subfolders) return []

  return Object.entries(selectedCategoryConfig.value.subfolders).map(([key, label]) => ({
    label,
    value: key,
  }))
})

const acceptedFileTypes = computed(() => {
  if (!selectedCategoryConfig.value) return '*'
  return selectedCategoryConfig.value.allowedTypes.join(',')
})

const validationWarnings = computed(() => {
  const warnings = []

  selectedFiles.value.forEach((file) => {
    // Check file type
    if (selectedCategory.value && !isValidFileType(file.name, selectedCategory.value)) {
      warnings.push({
        file: file.name,
        message: `File type not allowed for ${selectedCategoryConfig.value.label}`,
      })
    }

    // Check file size
    const maxSize = selectedCategory.value
      ? getMaxFileSize(selectedCategory.value)
      : 50 * 1024 * 1024
    if (file.size > maxSize) {
      warnings.push({
        file: file.name,
        message: `File size (${formatFileSize(file.size)}) exceeds maximum allowed (${formatFileSize(maxSize)})`,
      })
    }
  })

  return warnings
})

const canUpload = computed(() => {
  return (
    selectedFiles.value.length > 0 &&
    selectedCategory.value &&
    validationWarnings.value.length === 0 &&
    !uploading.value
  )
})

// Methods
const handleFileSelect = (event) => {
  const files = Array.from(event.target.files)
  addFiles(files)
}

const handleDrop = (event) => {
  event.preventDefault()
  isDragging.value = false

  const files = Array.from(event.dataTransfer.files)
  addFiles(files)
}

const addFiles = (files) => {
  if (uploadMode.value === 'single') {
    selectedFiles.value = files.slice(0, 1)
  } else {
    selectedFiles.value = [...selectedFiles.value, ...files]
  }

  // Reset file input
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

const removeFile = (index) => {
  selectedFiles.value.splice(index, 1)
}

const getFileIcon = (filename) => {
  return getDocumentIcon(filename, selectedCategory.value)
}

const validateForm = () => {
  errors.value = {}

  if (!selectedCategory.value) {
    errors.value.category = 'Please select a category'
  }

  if (selectedFiles.value.length === 0) {
    errors.value.files = 'Please select at least one file'
  }

  return Object.keys(errors.value).length === 0
}

const uploadFiles = async () => {
  if (!validateForm()) {
    return
  }

  uploading.value = true
  uploadedCount.value = 0
  uploadProgress.value = {}
  error.value = ''
  success.value = ''

  try {
    // Initialize Google Drive if needed
    if (!googleDriveService.isSignedIn()) {
      await googleDriveService.signIn()
    }

    const uploadedDocuments = []

    for (let i = 0; i < selectedFiles.value.length; i++) {
      const file = selectedFiles.value[i]
      currentUploadFile.value = file.name
      uploadProgress.value[i] = 0

      try {
        // Upload to Google Drive
        const driveFile = await googleDriveService.uploadDocument(
          file,
          null, // We'll implement folder structure later
          {
            name: file.name,
            description: description.value,
          },
        )

        uploadProgress.value[i] = 50

        // Create document record in Firebase
        const documentData = {
          name: file.name,
          description: description.value,
          category: selectedCategory.value,
          subfolder: selectedSubfolder.value,
          tags: tags.value,
          projectId: props.projectId,

          // Google Drive data
          googleDriveFileId: driveFile.id,
          googleDriveLink: googleDriveService.getShareableLink(driveFile.id),
          mimeType: file.type,
          fileSize: file.size,

          // Status
          status: selectedCategoryConfig.value?.requiresApproval ? 'pending' : 'approved',
        }

        // Handle version updates
        if (isUpdate.value) {
          const updatedDoc = await firebaseService.updateDocumentVersion(
            props.existingDocument.id,
            {
              googleDriveFileId: driveFile.id,
              googleDriveLink: googleDriveService.getShareableLink(driveFile.id),
              fileSize: file.size,
              mimeType: file.type,
            },
            {
              description: description.value,
              versionNotes: versionNotes.value,
              tags: tags.value,
            },
          )
          uploadedDocuments.push(updatedDoc)
        } else {
          const newDoc = await firebaseService.createDocument(documentData)
          uploadedDocuments.push(newDoc)
        }

        uploadProgress.value[i] = 100
        uploadedCount.value++
      } catch (fileError) {
        console.error(`Error uploading ${file.name}:`, fileError)
        uploadProgress.value[i] = -1 // Error state
        throw new Error(`Failed to upload ${file.name}: ${fileError.message}`)
      }
    }

    // Success
    const fileCount = uploadedDocuments.length
    success.value = `Successfully uploaded ${fileCount} document${fileCount > 1 ? 's' : ''}`

    // Emit events
    uploadedDocuments.forEach((doc) => {
      emit('document-uploaded', doc)
    })

    // Reset form after successful upload
    setTimeout(() => {
      resetForm()
      closeDialog()
    }, 2000)
  } catch (err) {
    console.error('Upload error:', err)
    error.value = err.message || 'Failed to upload documents'
  } finally {
    uploading.value = false
    currentUploadFile.value = ''
  }
}

const resetForm = () => {
  selectedFiles.value = []
  selectedCategory.value = props.category
  selectedSubfolder.value = null
  description.value = ''
  tags.value = []
  versionNotes.value = ''
  uploadProgress.value = {}
  uploadedCount.value = 0
  error.value = ''
  success.value = ''
  errors.value = {}
}

const closeDialog = () => {
  if (!uploading.value) {
    resetForm()
    emit('update:visible', false)
  }
}

// Watch for prop changes
watch(
  () => props.visible,
  (newVal) => {
    if (newVal) {
      resetForm()
      if (props.existingDocument) {
        // Pre-fill form for updates
        selectedCategory.value = props.existingDocument.category
        description.value = props.existingDocument.description || ''
        tags.value = props.existingDocument.tags || []
      }
    }
  },
)

watch(
  () => props.category,
  (newCategory) => {
    if (newCategory) {
      selectedCategory.value = newCategory
    }
  },
)
</script>

<style scoped>
.border-dashed {
  border-style: dashed;
}
</style>
