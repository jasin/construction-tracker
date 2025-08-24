<template>
  <div class="h-full flex flex-col bg-gray-50">
    <!-- Header -->
    <div class="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
      <div class="flex justify-between items-center">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">
            Documents
            <span v-if="projectName" class="text-gray-500">- {{ projectName }}</span>
          </h1>
          <p class="text-sm text-gray-500 mt-1">
            Manage project documents and files
            <span v-if="documentStats.total > 0" class="ml-2">
              ({{ documentStats.total }} documents, {{ formatFileSize(documentStats.totalSize) }})
            </span>
          </p>
        </div>
        <div class="flex gap-2">
          <Button
            @click="refreshDocuments"
            icon="pi pi-refresh"
            severity="secondary"
            size="small"
            :loading="loading"
          />
          <Button
            @click="showUploadDialog = true"
            icon="pi pi-upload"
            label="Upload Document"
            size="small"
          />
        </div>
      </div>
    </div>

    <!-- Filters and Search -->
    <div class="bg-white border-b border-gray-200 px-6 py-4">
      <div class="flex flex-wrap gap-4 items-center">
        <!-- Search -->
        <div class="flex-1 min-w-0">
          <InputText
            v-model="searchQuery"
            placeholder="Search documents..."
            class="w-full"
            icon="pi pi-search"
          />
        </div>

        <!-- Category Filter -->
        <div class="min-w-48">
          <Select
            v-model="selectedCategory"
            :options="categoryOptions"
            option-label="label"
            option-value="value"
            placeholder="All Categories"
            class="w-full"
            show-clear
          />
        </div>

        <!-- Status Filter -->
        <div class="min-w-40">
          <Select
            v-model="selectedStatus"
            :options="statusOptions"
            option-label="label"
            option-value="value"
            placeholder="All Status"
            class="w-full"
            show-clear
          />
        </div>

        <!-- View Toggle -->
        <div class="flex border border-gray-300 rounded">
          <Button
            @click="viewMode = 'grid'"
            :severity="viewMode === 'grid' ? 'primary' : 'secondary'"
            icon="pi pi-th-large"
            size="small"
            text
          />
          <Button
            @click="viewMode = 'list'"
            :severity="viewMode === 'list' ? 'primary' : 'secondary'"
            icon="pi pi-list"
            size="small"
            text
          />
        </div>
      </div>
    </div>

    <!-- Documents Content -->
    <div class="flex-1 overflow-y-auto p-6">
      <!-- Loading State -->
      <div v-if="loading" class="flex justify-center py-12">
        <ProgressSpinner />
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="text-center py-12">
        <i class="pi pi-exclamation-triangle text-4xl text-red-400 mb-4"></i>
        <h3 class="text-lg font-medium text-gray-900 mb-2">Error Loading Documents</h3>
        <p class="text-red-600 mb-4">{{ error }}</p>
        <Button @click="refreshDocuments" label="Try Again" severity="secondary" />
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredDocuments.length === 0" class="text-center py-12">
        <i class="pi pi-file text-4xl text-gray-400 mb-4"></i>
        <h3 class="text-lg font-medium text-gray-900 mb-2">
          {{
            searchQuery || selectedCategory || selectedStatus
              ? 'No documents found'
              : 'No documents yet'
          }}
        </h3>
        <p class="text-gray-500 mb-6">
          {{
            searchQuery || selectedCategory || selectedStatus
              ? 'Try adjusting your filters'
              : 'Upload your first document to get started'
          }}
        </p>
        <Button
          @click="showUploadDialog = true"
          icon="pi pi-upload"
          label="Upload Document"
          size="small"
        />
      </div>

      <!-- Documents Grid View -->
      <div
        v-else-if="viewMode === 'grid'"
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
      >
        <div
          v-for="document in filteredDocuments"
          :key="document.id"
          @click="openDocument(document)"
          class="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 cursor-pointer transition-all p-4"
        >
          <!-- Document Header -->
          <div class="flex items-start justify-between mb-3">
            <div class="flex items-center gap-2 flex-1 min-w-0">
              <i
                :class="getDocumentIcon(document.name, document.category)"
                class="text-xl text-gray-600"
              ></i>
              <div class="flex-1 min-w-0">
                <h3 class="font-medium text-gray-900 truncate" :title="document.name">
                  {{ document.name }}
                </h3>
                <p class="text-xs text-gray-500">v{{ document.version }}</p>
              </div>
            </div>
            <DocumentStatusBadge :status="document.status" size="small" />
          </div>

          <!-- Document Meta -->
          <div class="space-y-2">
            <div class="flex items-center justify-between text-xs text-gray-500">
              <span>{{ getCategoryLabel(document.category) }}</span>
              <span>{{ formatFileSize(document.fileSize) }}</span>
            </div>

            <div class="flex items-center justify-between text-xs text-gray-500">
              <span>{{ document.uploadedByName || 'Unknown' }}</span>
              <span>{{ formatDate(document.uploadedAt) }}</span>
            </div>

            <div v-if="document.description" class="text-xs text-gray-600 line-clamp-2">
              {{ document.description }}
            </div>
          </div>

          <!-- Quick Actions -->
          <div class="flex gap-1 mt-3 pt-3 border-t border-gray-100">
            <Button
              @click.stop="viewDocument(document)"
              icon="pi pi-eye"
              severity="secondary"
              size="small"
              text
              v-tooltip.top="'View'"
            />
            <Button
              @click.stop="downloadDocument(document)"
              icon="pi pi-download"
              severity="secondary"
              size="small"
              text
              v-tooltip.top="'Download'"
            />
            <Button
              v-if="canEdit(document)"
              @click.stop="editDocument(document)"
              icon="pi pi-pencil"
              severity="secondary"
              size="small"
              text
              v-tooltip.top="'Edit'"
            />
            <Button
              v-if="canDelete(document)"
              @click.stop="deleteDocument(document)"
              icon="pi pi-trash"
              severity="danger"
              size="small"
              text
              v-tooltip.top="'Delete'"
            />
          </div>
        </div>
      </div>

      <!-- Documents List View -->
      <div v-else class="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Document
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Category
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Status
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Size
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Uploaded
                </th>
                <th
                  class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr
                v-for="document in filteredDocuments"
                :key="document.id"
                @click="openDocument(document)"
                class="hover:bg-gray-50 cursor-pointer"
              >
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <i
                      :class="getDocumentIcon(document.name, document.category)"
                      class="text-xl text-gray-600 mr-3"
                    ></i>
                    <div>
                      <div class="text-sm font-medium text-gray-900">{{ document.name }}</div>
                      <div class="text-sm text-gray-500">Version {{ document.version }}</div>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span
                    class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800"
                  >
                    {{ getCategoryLabel(document.category) }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <DocumentStatusBadge :status="document.status" />
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {{ formatFileSize(document.fileSize) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div>{{ formatDate(document.uploadedAt) }}</div>
                  <div class="text-xs">by {{ document.uploadedByName || 'Unknown' }}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div class="flex justify-end gap-1">
                    <Button
                      @click.stop="viewDocument(document)"
                      icon="pi pi-eye"
                      severity="secondary"
                      size="small"
                      text
                    />
                    <Button
                      @click.stop="downloadDocument(document)"
                      icon="pi pi-download"
                      severity="secondary"
                      size="small"
                      text
                    />
                    <Button
                      v-if="canEdit(document)"
                      @click.stop="editDocument(document)"
                      icon="pi pi-pencil"
                      severity="secondary"
                      size="small"
                      text
                    />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Upload Dialog -->
    <DocumentUploader
      :visible="showUploadDialog"
      :project-id="projectId"
      @update:visible="showUploadDialog = $event"
      @document-uploaded="handleDocumentUploaded"
    />

    <!-- Document Viewer -->
    <DocumentViewer
      :visible="showDocumentViewer"
      :document="selectedDocument"
      @update:visible="showDocumentViewer = $event"
      @document-updated="handleDocumentUpdated"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { Button, InputText, Select, ProgressSpinner } from 'primevue'
import firebaseService from '@/services/firebaseService'
import googleDriveService from '@/services/googleDriveService'
import { DOCUMENT_CATEGORIES } from '@/constants/documentCategories'
import DocumentUploader from './DocumentUploader.vue'
import DocumentViewer from './DocumentViewer.vue'
import DocumentStatusBadge from './DocumentStatusBadge.vue'

// Props
const props = defineProps({
  projectId: {
    type: String,
    required: true,
  },
  projectName: {
    type: String,
    default: '',
  },
})

// Reactive state
const loading = ref(true)
const error = ref('')
const documents = ref([])
const documentStats = ref({
  total: 0,
  totalSize: 0,
  byCategory: {},
  byStatus: {},
})

// UI state
const searchQuery = ref('')
const selectedCategory = ref(null)
const selectedStatus = ref(null)
const viewMode = ref('grid') // 'grid' or 'list'
const showUploadDialog = ref(false)
const showDocumentViewer = ref(false)
const selectedDocument = ref(null)

// Realtime subscription
let documentsSubscription = null

// Helper functions
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
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

// Computed
const categoryOptions = computed(() => {
  return Object.entries(DOCUMENT_CATEGORIES).map(([key, config]) => ({
    label: config.label,
    value: key,
  }))
})

const statusOptions = computed(() => [
  { label: 'Draft', value: 'draft' },
  { label: 'Pending Review', value: 'pending' },
  { label: 'Under Review', value: 'review' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Superseded', value: 'superseded' },
])

const filteredDocuments = computed(() => {
  let filtered = [...documents.value]

  // Search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(
      (doc) =>
        doc.name?.toLowerCase().includes(query) ||
        doc.description?.toLowerCase().includes(query) ||
        doc.tags?.some((tag) => tag.toLowerCase().includes(query)),
    )
  }

  // Category filter
  if (selectedCategory.value) {
    filtered = filtered.filter((doc) => doc.category === selectedCategory.value)
  }

  // Status filter
  if (selectedStatus.value) {
    filtered = filtered.filter((doc) => doc.status === selectedStatus.value)
  }

  return filtered
})

// Methods
const loadDocuments = async () => {
  try {
    loading.value = true
    error.value = ''

    const [documentsData, statsData] = await Promise.all([
      firebaseService.getDocumentsByProject(props.projectId),
      firebaseService.getDocumentStatistics(props.projectId),
    ])

    documents.value = documentsData
    documentStats.value = statsData
  } catch (err) {
    console.error('Error loading documents:', err)
    error.value = err.message || 'Failed to load documents'
  } finally {
    loading.value = false
  }
}

const setupRealtimeListener = () => {
  documentsSubscription = firebaseService.subscribeToProjectDocuments(
    props.projectId,
    (documentsData) => {
      documents.value = documentsData
      // Update stats when documents change
      firebaseService
        .getDocumentStatistics(props.projectId)
        .then((stats) => (documentStats.value = stats))
        .catch(console.error)
    },
  )
}

const refreshDocuments = () => {
  loadDocuments()
}

const getCategoryLabel = (category) => {
  const config = DOCUMENT_CATEGORIES[category]
  return config ? config.label : category
}

const openDocument = (document) => {
  selectedDocument.value = document
  showDocumentViewer.value = true
}

const viewDocument = (document) => {
  if (document.googleDriveLink) {
    window.open(document.googleDriveLink, '_blank')
  }
}

const downloadDocument = async (document) => {
  if (document.googleDriveFileId) {
    // Create download link
    const downloadLink = `https://drive.google.com/uc?export=download&id=${document.googleDriveFileId}`
    window.open(downloadLink, '_blank')
  }
}

const editDocument = (document) => {
  selectedDocument.value = document
  showDocumentViewer.value = true
}

const deleteDocument = async (document) => {
  if (
    !confirm(`Are you sure you want to delete "${document.name}"? This action cannot be undone.`)
  ) {
    return
  }

  try {
    // Delete from Firebase
    await firebaseService.deleteDocument(document.id)

    // Optionally delete from Google Drive
    if (document.googleDriveFileId) {
      try {
        await googleDriveService.deleteFile(document.googleDriveFileId)
      } catch (driveError) {
        console.warn('Could not delete file from Google Drive:', driveError)
      }
    }
  } catch (err) {
    console.error('Error deleting document:', err)
    alert('Failed to delete document')
  }
}

const canEdit = (document) => {
  // For now, allow all users to edit
  // You can add more sophisticated permission logic here
  return true
}

const canDelete = (document) => {
  // For now, allow all users to delete their own documents
  // You can add more sophisticated permission logic here
  return true
}

const handleDocumentUploaded = (newDocument) => {
  // Document will be updated via realtime listener
  console.log('Document uploaded:', newDocument.name)
}

const handleDocumentUpdated = (updatedDocument) => {
  // Document will be updated via realtime listener
  console.log('Document updated:', updatedDocument.name)
}

// Lifecycle
onMounted(async () => {
  await loadDocuments()
  setupRealtimeListener()
})

onBeforeUnmount(() => {
  if (documentsSubscription) {
    firebaseService.unsubscribe(documentsSubscription)
  }
})

// Watch for project changes
watch(
  () => props.projectId,
  (newProjectId) => {
    if (newProjectId) {
      // Clean up old subscription
      if (documentsSubscription) {
        firebaseService.unsubscribe(documentsSubscription)
      }

      // Load new project documents
      loadDocuments()
      setupRealtimeListener()
    }
  },
)
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  line-clamp: 2;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
