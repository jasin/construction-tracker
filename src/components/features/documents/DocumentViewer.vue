<template>
  <Dialog
    v-model:visible="isVisible"
    modal
    :header="document?.name || 'Document'"
    :style="{ width: '80rem' }"
    :breakpoints="{ '1199px': '90vw', '575px': '95vw' }"
    maximizable
  >
    <div v-if="document" class="space-y-6">
      <!-- Document Header Info -->
      <div class="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
        <div class="flex items-start gap-4">
          <i
            :class="getDocumentIcon(document.name, document.category)"
            class="text-3xl text-gray-600"
          ></i>
          <div>
            <h3 class="text-lg font-semibold text-gray-900">{{ document.name }}</h3>
            <div class="flex items-center gap-4 text-sm text-gray-600 mt-1">
              <span>{{ formatFileSize(document.fileSize) }}</span>
              <span>•</span>
              <span>{{ document.category }}</span>
              <span>•</span>
              <span>Uploaded {{ formatTimeAgo(document.uploadedAt) }}</span>
              <span>•</span>
              <span>by {{ document.uploadedByName }}</span>
            </div>
            <p v-if="document.description" class="text-sm text-gray-600 mt-2">
              {{ document.description }}
            </p>
          </div>
        </div>

        <!-- Status and Actions -->
        <div class="flex items-center gap-3">
          <DocumentStatusBadge :status="document.status" />

          <!-- Action Buttons -->
          <div class="flex gap-2">
            <Button
              @click="downloadDocument"
              icon="pi pi-download"
              severity="secondary"
              size="small"
              v-tooltip="'Download'"
            />
            <Button
              @click="openInDrive"
              icon="pi pi-external-link"
              severity="secondary"
              size="small"
              v-tooltip="'Open in Google Drive'"
            />
            <Button
              v-if="canEdit"
              @click="editDocument"
              icon="pi pi-pencil"
              severity="secondary"
              size="small"
              v-tooltip="'Edit'"
            />
            <Button
              v-if="canApprove && document.status === 'pending'"
              @click="approveDocument"
              icon="pi pi-check"
              severity="success"
              size="small"
              v-tooltip="'Approve'"
            />
          </div>
        </div>
      </div>

      <!-- Document Preview -->
      <div class="border border-gray-200 rounded-lg overflow-hidden bg-white">
        <div class="flex items-center justify-between p-3 bg-gray-50 border-b">
          <h4 class="text-sm font-medium text-gray-900">Document Preview</h4>
          <div class="flex items-center gap-2">
            <Button
              @click="refreshPreview"
              icon="pi pi-refresh"
              severity="secondary"
              size="small"
              text
            />
            <Button
              @click="toggleFullscreen"
              :icon="isFullscreen ? 'pi pi-window-minimize' : 'pi pi-window-maximize'"
              severity="secondary"
              size="small"
              text
            />
          </div>
        </div>

        <!-- Google Drive Embedded Viewer -->
        <div class="relative" :class="{ 'h-96': !isFullscreen, 'h-screen': isFullscreen }">
          <iframe
            v-if="document.googleDriveFileId"
            ref="previewIframe"
            :src="getEmbedUrl(document.googleDriveFileId)"
            class="w-full h-full border-0"
            allow="autoplay; clipboard-read; clipboard-write"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            loading="lazy"
            @error="handleIframeError"
          ></iframe>

          <!-- Fallback for unsupported files -->
          <div v-else class="flex flex-col items-center justify-center h-full p-8 text-gray-500">
            <i class="pi pi-file text-4xl mb-4"></i>
            <p class="text-lg font-medium mb-2">Preview not available</p>
            <p class="text-sm text-center mb-4">
              This file type cannot be previewed. You can download it to view the contents.
            </p>
            <Button
              @click="downloadDocument"
              icon="pi pi-download"
              label="Download File"
              severity="secondary"
            />
          </div>
        </div>
      </div>

      <!-- Document Metadata -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Document Details -->
        <div class="space-y-4">
          <h4 class="text-sm font-semibold text-gray-900">Document Details</h4>

          <div class="space-y-3 text-sm">
            <div class="flex justify-between">
              <span class="text-gray-600">Category:</span>
              <span class="font-medium">{{ formatCategory(document.category) }}</span>
            </div>

            <div class="flex justify-between">
              <span class="text-gray-600">Version:</span>
              <span class="font-medium">v{{ document.version || 1 }}</span>
            </div>

            <div class="flex justify-between">
              <span class="text-gray-600">File Type:</span>
              <span class="font-medium">{{
                document.mimeType || getFileExtension(document.name)
              }}</span>
            </div>

            <div class="flex justify-between">
              <span class="text-gray-600">Size:</span>
              <span class="font-medium">{{ formatFileSize(document.fileSize) }}</span>
            </div>

            <div v-if="document.tags && document.tags.length > 0" class="flex justify-between">
              <span class="text-gray-600">Tags:</span>
              <div class="flex flex-wrap gap-1">
                <Tag v-for="tag in document.tags" :key="tag" :value="tag" severity="secondary" />
              </div>
            </div>
          </div>
        </div>

        <!-- Version History -->
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <h4 class="text-sm font-semibold text-gray-900">Version History</h4>
            <Button
              v-if="canEdit"
              @click="uploadNewVersion"
              icon="pi pi-upload"
              label="New Version"
              severity="secondary"
              size="small"
            />
          </div>

          <div class="space-y-2 max-h-48 overflow-y-auto">
            <div
              v-for="version in versionHistory"
              :key="version.version"
              class="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
              :class="{ 'bg-blue-50 border-blue-200': version.isCurrent }"
            >
              <div>
                <div class="flex items-center gap-2">
                  <span class="text-sm font-medium">v{{ version.version }}</span>
                  <span
                    v-if="version.isCurrent"
                    class="px-2 py-1 bg-green-100 text-green-800 text-xs rounded"
                  >
                    Current
                  </span>
                </div>
                <div class="text-xs text-gray-500">
                  {{ formatDate(version.uploadedAt) }} by {{ version.uploadedByName }}
                </div>
                <p v-if="version.versionNotes" class="text-xs text-gray-600 mt-1">
                  {{ version.versionNotes }}
                </p>
              </div>

              <div class="flex gap-1">
                <Button
                  v-if="!version.isCurrent"
                  @click="viewVersion(version)"
                  icon="pi pi-eye"
                  severity="secondary"
                  size="small"
                  text
                  v-tooltip="'View this version'"
                />
                <Button
                  v-if="!version.isCurrent"
                  @click="downloadVersion(version)"
                  icon="pi pi-download"
                  severity="secondary"
                  size="small"
                  text
                  v-tooltip="'Download this version'"
                />
              </div>
            </div>

            <div v-if="versionHistory.length === 0" class="text-center py-4 text-gray-500 text-sm">
              No version history available
            </div>
          </div>
        </div>
      </div>

      <!-- Approval Section -->
      <div v-if="showApprovalSection" class="border border-gray-200 rounded-lg p-4">
        <h4 class="text-sm font-semibold text-gray-900 mb-3">Document Approval</h4>

        <div v-if="document.status === 'approved'" class="flex items-center gap-2 text-green-700">
          <i class="pi pi-check-circle"></i>
          <span class="text-sm">
            Approved by {{ document.approvedByName }} on {{ formatDate(document.approvedAt) }}
          </span>
        </div>

        <div
          v-else-if="document.status === 'rejected'"
          class="flex items-center gap-2 text-red-700"
        >
          <i class="pi pi-times-circle"></i>
          <span class="text-sm">
            Rejected by {{ document.reviewedByName }} on {{ formatDate(document.reviewedAt) }}
          </span>
        </div>

        <div v-else-if="canApprove" class="space-y-3">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Review Comments</label>
            <Textarea
              v-model="reviewComments"
              rows="3"
              class="w-full"
              placeholder="Add comments about this document..."
            />
          </div>

          <div class="flex gap-2">
            <Button
              @click="approveDocument"
              icon="pi pi-check"
              label="Approve"
              severity="success"
              size="small"
            />
            <Button
              @click="rejectDocument"
              icon="pi pi-times"
              label="Reject"
              severity="danger"
              size="small"
            />
          </div>
        </div>

        <div v-if="document.reviewComments" class="mt-3 p-3 bg-gray-50 rounded">
          <p class="text-sm font-medium text-gray-700">Review Comments:</p>
          <p class="text-sm text-gray-600 mt-1">{{ document.reviewComments }}</p>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-else class="flex items-center justify-center py-12">
      <ProgressSpinner />
    </div>

    <!-- Document Upload Dialog for New Versions -->
    <DocumentUploader
      v-if="showVersionUploader"
      :visible="showVersionUploader"
      :project-id="document?.projectId"
      :existing-document="document"
      upload-mode="single"
      @uploaded="handleVersionUploaded"
      @close="showVersionUploader = false"
    />
  </Dialog>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { Dialog, Button, Textarea, Tag, ProgressSpinner } from 'primevue'
import DocumentStatusBadge from './DocumentStatusBadge.vue'
import DocumentUploader from './DocumentUploader.vue'
import firebaseService from '@/services/firebase/firebaseService'
import { formatFileSize, formatTimeAgo, formatDate } from '@/utils/index'
import { getDocumentIcon, DOCUMENT_CATEGORIES } from '@/constants/documentCategories'

// Props
const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  document: {
    type: Object,
    default: null,
  },
})

// Emits
const emit = defineEmits([
  'update:visible',
  'document-updated',
  'document-approved',
  'document-rejected',
])

// Reactive state
const isFullscreen = ref(false)
const reviewComments = ref('')
const versionHistory = ref([])
const showVersionUploader = ref(false)
const loading = ref(false)

// Computed
const isVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value),
})

const canEdit = computed(() => {
  // Add your permission logic here
  return true // Placeholder
})

const canApprove = computed(() => {
  // Add your permission logic here
  return props.document?.status === 'pending' || props.document?.status === 'review'
})

const showApprovalSection = computed(() => {
  return (
    props.document?.status &&
    ['pending', 'review', 'approved', 'rejected'].includes(props.document.status)
  )
})

// Methods
const getEmbedUrl = (fileId) => {
  //return `https://drive.google.com/file/d/${fileId}/preview`
  //return `https://drive.google.com/file/d/${fileId}/preview?rm=minimal&embedded=true`
  return `https://docs.google.com/viewer?srcid=${fileId}&pid=explorer&efh=false&a=v&chrome=false&embedded=true`
}

const getFileExtension = (filename) => {
  return filename.split('.').pop().toUpperCase()
}

const formatCategory = (category) => {
  const config = DOCUMENT_CATEGORIES[category]
  return config ? config.label : category
}

// Template ref for the iframe
const previewIframe = ref(null)

const refreshPreview = () => {
  // Force iframe reload using template ref
  if (previewIframe.value) {
    const currentSrc = previewIframe.value.src
    previewIframe.value.src = ''
    // Small delay to ensure the iframe resets, then reload
    setTimeout(() => {
      previewIframe.value.src = currentSrc
    }, 100)
  }
}

const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value
}

const downloadDocument = () => {
  if (props.document?.googleDriveFileId) {
    const downloadUrl = `https://drive.google.com/uc?export=download&id=${props.document.googleDriveFileId}`
    window.open(downloadUrl, '_blank')
  }
}

const openInDrive = () => {
  if (props.document?.googleDriveLink) {
    window.open(props.document.googleDriveLink, '_blank')
  }
}

const editDocument = async () => {
  console.log('Edit document:', document.id)

  // Instead of calling Google Drive API directly,
  // just update the status in Firebase
  try {
    const updates = {
      status: 'approved', // or whatever status change you want
      updatedAt: new Date().toISOString(),
    }

    await firebaseService.updateDocument(document.id, updates)
    console.log('Document updated successfully')

    // Emit the update to parent component
    emit('document-updated', { ...document, ...updates })
  } catch (error) {
    console.error('Error updating document:', error)
    // Show user-friendly error message
    alert('Failed to update document. Please try again.')
  }
}

const uploadNewVersion = () => {
  showVersionUploader.value = true
}

const approveDocument = async () => {
  try {
    loading.value = true
    await firebaseService.updateDocumentStatus(props.document.id, 'approved', reviewComments.value)

    emit('document-approved', {
      ...props.document,
      status: 'approved',
      reviewComments: reviewComments.value,
    })

    reviewComments.value = ''
  } catch (error) {
    console.error('Error approving document:', error)
  } finally {
    loading.value = false
  }
}

const rejectDocument = async () => {
  if (!reviewComments.value.trim()) {
    alert('Please provide rejection comments')
    return
  }

  try {
    loading.value = true
    await firebaseService.updateDocumentStatus(props.document.id, 'rejected', reviewComments.value)

    emit('document-rejected', {
      ...props.document,
      status: 'rejected',
      reviewComments: reviewComments.value,
    })

    reviewComments.value = ''
  } catch (error) {
    console.error('Error rejecting document:', error)
  } finally {
    loading.value = false
  }
}

const viewVersion = (version) => {
  console.log('View version:', version.version)
  // Implement version viewing
}

const downloadVersion = (version) => {
  if (version.googleDriveFileId) {
    const downloadUrl = `https://drive.google.com/uc?export=download&id=${version.googleDriveFileId}`
    window.open(downloadUrl, '_blank')
  }
}

const handleVersionUploaded = (newVersion) => {
  emit('document-updated', newVersion)
  showVersionUploader.value = false
  loadVersionHistory()
}

const loadVersionHistory = async () => {
  if (!props.document?.id) return

  try {
    const history = await firebaseService.getDocumentVersionHistory(props.document.id)
    versionHistory.value = history
  } catch (error) {
    console.error('Error loading version history:', error)
    versionHistory.value = []
  }
}

const handleIframeError = () => {
  console.log('Iframe failed to load, showing fallback')
  // You could show a fallback UI or direct link to Google Drive
}

// Watch for document changes
watch(
  () => props.document,
  (newDoc) => {
    if (newDoc) {
      loadVersionHistory()
      reviewComments.value = ''
    }
  },
  { immediate: true },
)

// Load version history when component mounts
onMounted(() => {
  if (props.document) {
    loadVersionHistory()
  }
})
</script>

<style scoped>
/* Custom scrollbar for version history */
.overflow-y-auto::-webkit-scrollbar {
  width: 4px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 2px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* Ensure iframe takes full space */
iframe {
  min-height: 100%;
}
</style>
