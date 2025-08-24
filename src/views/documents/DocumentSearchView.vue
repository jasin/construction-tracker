<!-- SIMPLIFIED DocumentSearchView.vue using new reusable components -->
<template>
  <div class="h-full flex flex-col bg-gray-50">
    <!-- Header -->
    <div class="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
      <div class="flex justify-between items-center">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Document Search</h1>
          <p class="text-sm text-gray-500 mt-1">
            Search and filter documents across all projects
          </p>
        </div>
        <div class="flex gap-2">
          <Button
            @click="exportResults"
            icon="pi pi-download"
            severity="secondary"
            size="small"
            label="Export Results"
            :disabled="filteredDocuments.length === 0"
          />
          <Button
            @click="refreshDocuments"
            icon="pi pi-refresh"
            severity="secondary"
            size="small"
            :loading="loading"
          />
        </div>
      </div>
    </div>

    <!-- Search and Filters Section -->
    <div class="bg-white border-b border-gray-200 px-6 py-4">
      <!-- Main Search Bar -->
      <div class="flex gap-4 items-center mb-4">
        <div class="flex-1 relative">
          <i class="pi pi-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
          <InputText
            v-model="searchQuery"
            placeholder="Search documents, descriptions, tags, or content..."
            class="w-full pl-15 pr-4 py-3 text-lg"
          />
        </div>
        <Button
          @click="performSearch"
          icon="pi pi-search"
          label="Search"
          size="large"
          :loading="searching"
        />
        <Button
          @click="clearAllFilters"
          icon="pi pi-times"
          label="Clear"
          severity="secondary"
          size="large"
          v-show="hasActiveFilters"
        />
      </div>

      <!-- Filters would go here - we'll create AdvancedFilters component next -->
      <div class="bg-gray-50 rounded-lg border border-gray-200 p-4">

      </div>
    </div>

    <!-- Results Section -->
    <div class="flex-1 overflow-y-auto p-6">
      <!-- Loading State -->
      <div v-if="loading" class="flex justify-center py-12">
        <div class="text-center">
          <ProgressSpinner />
          <p class="mt-4 text-gray-500">Loading documents...</p>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="text-center py-12">
        <i class="pi pi-exclamation-triangle text-4xl text-red-400 mb-4"></i>
        <h3 class="text-lg font-medium text-gray-900 mb-2">Error Loading Documents</h3>
        <p class="text-red-600 mb-4">{{ error }}</p>
        <Button @click="refreshDocuments" label="Try Again" severity="secondary" />
      </div>

      <!-- Document Display Component -->
      <DocumentDisplay
        v-else
        :documents="paginatedDocuments"
        :show-project="true"
        :show-description="true"
        :show-tags="true"
        :show-stats="true"
        :projects="projects"
        :selectable="false"
        :sortable="true"
        default-view-mode="grid"
        initial-sort="uploadedAt-desc"
        @document-click="openDocument"
        @document-action="handleDocumentAction"
        @view-mode-change="handleViewModeChange"
      >
        <!-- Custom header actions -->
        <template #header-actions>
          <span class="text-xs text-gray-500 mr-2">
            {{ formatFileSize(searchStats.totalSize) }} total
          </span>
        </template>

        <!-- Empty state -->
        <template #empty>
          <div class="text-center py-12">
            <i class="pi pi-search text-4xl text-gray-400 mb-4"></i>
            <h3 class="text-lg font-medium text-gray-900 mb-2">
              {{ searchQuery || hasActiveFilters ? 'No documents found' : 'Start searching documents' }}
            </h3>
            <p class="text-gray-500 mb-6">
              {{
                searchQuery || hasActiveFilters
                  ? 'Try adjusting your search terms or filters'
                  : 'Use the search bar above to find documents across all projects'
              }}
            </p>
          </div>
        </template>
      </DocumentDisplay>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="flex justify-between items-center mt-6">
        <div class="text-sm text-gray-700">
          Showing {{ (currentPage - 1) * pageSize + 1 }} to
          {{ Math.min(currentPage * pageSize, filteredDocuments.length) }} of
          {{ filteredDocuments.length }} results
        </div>
        <Paginator
          v-model:first="first"
          :rows="pageSize"
          :total-records="filteredDocuments.length"
          :rows-per-page-options="[10, 25, 50, 100]"
          @page="onPageChange"
        />
      </div>
    </div>

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
import { ref, computed, onMounted, watch } from 'vue'
import {
  Button,
  InputText,
  ProgressSpinner,
  Paginator
} from 'primevue'
import firebaseService from '@/services/firebase/firebaseService'
import DocumentDisplay from '@/components/widgets/DocumentDisplay.vue'
import DocumentViewer from '@/components/features/documents/DocumentViewer.vue'
import AdvancedFilters from '@/components/widgets/AdvancedFilters.vue'
import { formatFileSize, loadUsers, loadProjects } from '@/utils/index'

// Reactive state - Much cleaner now!
const loading = ref(true)
const searching = ref(false)
const error = ref('')
const searchQuery = ref('')

// Data
const allDocuments = ref([])
const projects = ref([])
const users = ref([])

// Simple filters for this example
const filters = ref({
  projectIds: [],
  categories: [],
  tags: []
})

// Pagination
const currentPage = ref(1)
const pageSize = ref(25)
const first = ref(0)

// Document viewer
const showDocumentViewer = ref(false)
const selectedDocument = ref(null)

// Computed properties
const hasActiveFilters = computed(() => {
  return (
    filters.value.projectIds.length > 0 ||
    filters.value.categories.length > 0 ||
    filters.value.tags.length > 0 ||
    searchQuery.value
  )
})

const filteredDocuments = computed(() => {
  let docs = [...allDocuments.value]

  // Text search
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    docs = docs.filter(doc =>
      doc.name?.toLowerCase().includes(query) ||
      doc.description?.toLowerCase().includes(query) ||
      doc.tags?.some(tag => tag.toLowerCase().includes(query))
    )
  }

  // Add other filters here...

  return docs
})

const paginatedDocuments = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredDocuments.value.slice(start, end)
})

const totalPages = computed(() =>
  Math.ceil(filteredDocuments.value.length / pageSize.value)
)

const searchStats = computed(() => {
  const docs = filteredDocuments.value
  return {
    total: docs.length,
    totalSize: docs.reduce((sum, doc) => sum + (doc.fileSize || 0), 0)
  }
})

// Methods - Much simpler now!
const loadAllDocuments = async () => {
  try {
    loading.value = true
    error.value = ''

    const [projectsData, usersData] = await Promise.all([
      loadProjects(),
      loadUsers()
    ])

    projects.value = projectsData
    users.value = usersData

    // Load documents from all projects
    const allProjectDocs = await Promise.all(
      projectsData.map(project =>
        firebaseService.getDocumentsByProject(project.id).catch(() => [])
      )
    )

    allDocuments.value = allProjectDocs.flat()

  } catch (err) {
    console.error('Error loading documents:', err)
    error.value = err.message || 'Failed to load documents'
  } finally {
    loading.value = false
  }
}

const performSearch = async () => {
  searching.value = true
  setTimeout(() => {
    searching.value = false
    currentPage.value = 1
    first.value = 0
  }, 300)
}

const refreshDocuments = () => {
  loadAllDocuments()
}

const clearAllFilters = () => {
  searchQuery.value = ''
  filters.value = {
    projectIds: [],
    categories: [],
    tags: []
  }
  currentPage.value = 1
  first.value = 0
}

const onPageChange = (event) => {
  currentPage.value = Math.floor(event.first / event.rows) + 1
  first.value = event.first
}

// Document actions - Now handled through the reusable component events
const openDocument = (document) => {
  selectedDocument.value = document
  showDocumentViewer.value = true
}

const handleDocumentAction = ({ action, document }) => {
  switch (action) {
    case 'view':
      if (document.googleDriveLink) {
        window.open(document.googleDriveLink, '_blank')
      }
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
    case 'edit':
      openDocument(document)
      break
  }
}

const handleViewModeChange = (mode) => {
  console.log('View mode changed to:', mode)
  // Could save to localStorage or user preferences
}

const handleDocumentUpdated = (updatedDocument) => {
  const index = allDocuments.value.findIndex(doc => doc.id === updatedDocument.id)
  if (index !== -1) {
    allDocuments.value[index] = updatedDocument
  }
}

const exportResults = () => {
  // Export logic here
  console.log('Exporting results...')
}

// Watchers
watch(() => searchQuery.value, () => {
  if (searchQuery.value.length > 2 || searchQuery.value.length === 0) {
    performSearch()
  }
}, { debounce: 500 })

// Lifecycle
onMounted(() => {
  loadAllDocuments()
})
</script>

<style scoped>
/* Much cleaner styles since most are in the reusable components */
</style>
