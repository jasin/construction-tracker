<template>
  <div class="entity-attachments">
    <!-- Header with stats and actions -->
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-3">
        <h3 class="text-sm font-semibold text-gray-900">Attachments</h3>
        <span
          v-if="attachmentStats.count > 0"
          class="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium"
        >
          {{ attachmentStats.count }} files
        </span>
        <span v-if="attachmentStats.totalSize > 0" class="text-xs text-gray-500">
          {{ formatFileSize(attachmentStats.totalSize) }}
        </span>
      </div>

      <div class="flex gap-2">
        <Button
          v-if="canAttach"
          @click="showAttachExisting = true"
          icon="pi pi-link"
          severity="secondary"
          size="small"
          text
          v-tooltip.top="'Attach Existing Document'"
          :disabled="loading"
        />
        <Button
          v-if="canAttach"
          @click="showUploader = true"
          icon="pi pi-upload"
          severity="secondary"
          size="small"
          text
          v-tooltip.top="'Upload New Attachment'"
          :disabled="loading"
        />
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center py-8">
      <ProgressSpinner />
    </div>

    <!-- Error State -->
    <div v-if="error" class="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
      <div class="flex items-center gap-2">
        <i class="pi pi-exclamation-circle text-red-600"></i>
        <p class="text-sm text-red-800">{{ error }}</p>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-if="!loading && attachments.length === 0"
      class="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg"
    >
      <i class="pi pi-file text-3xl text-gray-400 mb-3"></i>
      <h4 class="text-sm font-medium text-gray-900 mb-2">No attachments</h4>
      <p class="text-sm text-gray-500 mb-4">
        Attach relevant documents to this {{ formatEntityType(entityType) }}
      </p>
      <div class="flex justify-center gap-2">
        <Button
          v-if="canAttach"
          @click="showUploader = true"
          icon="pi pi-upload"
          label="Upload Files"
          size="small"
        />
        <Button
          v-if="canAttach"
          @click="showAttachExisting = true"
          icon="pi pi-link"
          label="Attach Existing"
          severity="secondary"
          size="small"
        />
      </div>
    </div>

    <!-- Attachments Display -->
    <DocumentDisplay
      v-if="!loading && attachments.length > 0"
      :documents="attachments"
      :show-project="false"
      :show-description="true"
      :show-tags="false"
      :show-stats="false"
      :show-actions="true"
      :default-view-mode="viewMode"
      :sortable="false"
      @document-click="handleDocumentClick"
      @document-action="handleDocumentAction"
    >
      <!-- Custom actions for attachments -->
      <template #grid-actions="{ document, handleAction }">
        <Button
          @click.stop="handleAction('view', document)"
          icon="pi pi-eye"
          severity="secondary"
          size="small"
          text
          v-tooltip.top="'View'"
        />
        <Button
          @click.stop="handleAction('download', document)"
          icon="pi pi-download"
          severity="secondary"
          size="small"
          text
          v-tooltip.top="'Download'"
        />
        <Button
          v-if="canAttach"
          @click.stop="handleDetach(document)"
          icon="pi pi-times"
          severity="danger"
          size="small"
          text
          v-tooltip.top="'Detach'"
        />
      </template>

      <!-- Same actions for table view -->
      <template #table-actions="{ document, handleAction }">
        <Button
          @click.stop="handleAction('view', document)"
          icon="pi pi-eye"
          severity="secondary"
          size="small"
          text
          v-tooltip.top="'View'"
        />
        <Button
          @click.stop="handleAction('download', document)"
          icon="pi pi-download"
          severity="secondary"
          size="small"
          text
          v-tooltip.top="'Download'"
        />
        <Button
          v-if="canAttach"
          @click.stop="handleDetach(document)"
          icon="pi pi-times"
          severity="danger"
          size="small"
          text
          v-tooltip.top="'Detach'"
        />
      </template>
    </DocumentDisplay>

    <!-- Document Uploader for New Attachments -->
    <DocumentUploader
      :visible="showUploader"
      :project-id="projectId"
      :category="getDefaultCategory()"
      upload-mode="multiple"
      @update:visible="showUploader = $event"
      @document-uploaded="handleDocumentUploaded"
    />

    <!-- Attach Existing Documents Modal -->
    <AttachExistingModal
      :visible="showAttachExisting"
      :project-id="projectId"
      :entity-type="entityType"
      :entity-id="entityId"
      :excluded-document-ids="attachedDocumentIds"
      @update:visible="showAttachExisting = $event"
      @documents-attached="handleDocumentsAttached"
    />

    <!-- Document Viewer -->
    <DocumentViewer
      :visible="showViewer"
      :document="selectedDocument"
      @update:visible="showViewer = $event"
      @document-updated="handleDocumentUpdated"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { Button, ProgressSpinner } from 'primevue'
import DocumentDisplay from './DocumentDisplay.vue'
import DocumentUploader from '@/components/features/documents/DocumentUploader.vue'
import DocumentViewer from '@/components/features/documents/DocumentViewer.vue'
import AttachExistingModal from '@/components/modals/AttachExistingModal.vue'
import firebaseService from '@/services/firebase/firebaseService'
import ProjectRepository from '@/services/firebase/Repositories/ProjectRepository'
import { formatFileSize } from '@/utils/index'
import AttatchmentRepository from '../../services/firebase/Repositories/AttatchmentRepository'

// Props
const props = defineProps({
  // Entity context
  entityType: {
    type: String,
    required: true,
    validator: (value) => ['rfi', 'submittal', 'changeOrder', 'task'].includes(value),
  },
  entityId: {
    type: String,
    required: true,
  },
  projectId: {
    type: String,
    required: true,
  },

  // Display options
  viewMode: {
    type: String,
    default: 'grid',
    validator: (value) => ['grid', 'list'].includes(value),
  },

  // Permissions
  canAttach: {
    type: Boolean,
    default: true,
  },

  // Real-time updates
  enableRealtime: {
    type: Boolean,
    default: true,
  },
})

// Emits
const emit = defineEmits([
  'attachments-changed',
  'attachment-uploaded',
  'attachment-detached',
  'error',
])

// Reactive state
const attachments = ref([])
const loading = ref(true)
const error = ref('')

// UI state
const showUploader = ref(false)
const showAttachExisting = ref(false)
const showViewer = ref(false)
const selectedDocument = ref(null)

// Real-time subscription
let attachmentsSubscription = null

// Computed
const attachmentStats = computed(() => ({
  count: attachments.value.length,
  totalSize: attachments.value.reduce((sum, doc) => sum + (doc.fileSize || 0), 0),
}))

const attachedDocumentIds = computed(() => attachments.value.map((doc) => doc.id))

// Methods
const loadAttachments = async () => {
  try {
    loading.value = true
    error.value = ''

    const attachmentData = await AttatchmentRepository.getEntityAttachments(
      props.entityType,
      props.entityId,
    )

    attachments.value = attachmentData

    // Emit change event
    emit('attachments-changed', {
      count: attachmentData.length,
      totalSize: attachmentStats.value.totalSize,
      attachments: attachmentData,
    })
  } catch (err) {
    console.error('Error loading attachments:', err)
    error.value = 'Failed to load attachments'
    emit('error', err)
  } finally {
    loading.value = false
  }
}

const setupRealtimeListener = () => {
  if (!props.enableRealtime) return

  // Subscribe to documents where linkedEntityId matches our entityId
  // This is a simplified version - you might want to create a specific
  // Firebase method for this subscription
  attachmentsSubscription = ProjectRepository.subscribeToProjectDocuments(
    props.projectId,
    (allDocs) => {
      const entityAttachments = allDocs.filter(
        (doc) =>
          doc.linkedEntityType === props.entityType &&
          doc.linkedEntityId === props.entityId &&
          doc.isAttachment === true,
      )

      attachments.value = entityAttachments

      emit('attachments-changed', {
        count: entityAttachments.length,
        totalSize: attachmentStats.value.totalSize,
        attachments: entityAttachments,
      })
    },
  )
}

const handleDocumentClick = (document) => {
  selectedDocument.value = document
  showViewer.value = true
}

const handleDocumentAction = ({ action, document }) => {
  switch (action) {
    case 'view':
      handleDocumentClick(document)
      break
    case 'download':
      if (document.googleDriveFileId) {
        const downloadUrl = `https://drive.google.com/uc?export=download&id=${document.googleDriveFileId}`
        window.open(downloadUrl, '_blank')
      }
      break
    case 'drive':
      if (document.googleDriveLink) {
        window.open(document.googleDriveLink, '_blank')
      }
      break
  }
}

const handleDocumentUploaded = async (newDocument) => {
  try {
    // Link the uploaded document to our entity
    await firebaseService.attachDocumentToEntity(newDocument.id, props.entityType, props.entityId)

    // Refresh attachments if not using real-time
    if (!props.enableRealtime) {
      await loadAttachments()
    }

    emit('attachment-uploaded', newDocument)
    showUploader.value = false
  } catch (err) {
    console.error('Error linking uploaded document:', err)
    error.value = 'Failed to attach uploaded document'
  }
}

const handleDocumentsAttached = async (documentIds) => {
  try {
    // Attach each selected document
    await Promise.all(
      documentIds.map((docId) =>
        firebaseService.attachDocumentToEntity(docId, props.entityType, props.entityId),
      ),
    )

    // Refresh attachments if not using real-time
    if (!props.enableRealtime) {
      await loadAttachments()
    }

    showAttachExisting.value = false
  } catch (err) {
    console.error('Error attaching existing documents:', err)
    error.value = 'Failed to attach documents'
  }
}

const handleDetach = async (document) => {
  if (!confirm(`Detach "${document.name}" from this ${formatEntityType(props.entityType)}?`)) {
    return
  }

  try {
    await firebaseService.detachDocumentFromEntity(document.id, props.entityType, props.entityId)

    // Refresh attachments if not using real-time
    if (!props.enableRealtime) {
      await loadAttachments()
    }

    emit('attachment-detached', document)
  } catch (err) {
    console.error('Error detaching document:', err)
    error.value = 'Failed to detach document'
  }
}

const handleDocumentUpdated = (updatedDocument) => {
  const index = attachments.value.findIndex((doc) => doc.id === updatedDocument.id)
  if (index !== -1) {
    attachments.value[index] = updatedDocument
  }
}

// Helper methods
const formatEntityType = (type) => {
  const typeMap = {
    rfi: 'RFI',
    submittal: 'Submittal',
    changeOrder: 'Change Order',
  }
  return typeMap[type] || type
}

const getDefaultCategory = () => {
  const categoryMap = {
    rfi: 'rfis',
    submittal: 'submittals',
    changeOrder: 'changeOrders',
  }
  return categoryMap[props.entityType] || 'correspondence'
}

// Lifecycle
onMounted(async () => {
  await loadAttachments()

  if (props.enableRealtime) {
    setupRealtimeListener()
  }
})

onBeforeUnmount(() => {
  if (attachmentsSubscription) {
    firebaseService.unsubscribe(attachmentsSubscription)
  }
})

// Watch for entity changes
watch(
  () => [props.entityType, props.entityId],
  async () => {
    // Clean up old subscription
    if (attachmentsSubscription) {
      firebaseService.unsubscribe(attachmentsSubscription)
      attachmentsSubscription = null
    }

    // Reload for new entity
    await loadAttachments()

    if (props.enableRealtime) {
      setupRealtimeListener()
    }
  },
)
</script>

<style scoped></style>
