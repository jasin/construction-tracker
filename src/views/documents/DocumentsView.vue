<!-- src/views/documents/DocumentsView.vue - Unified document management -->
<template>
  <div class="h-full flex flex-col bg-gray-50">
    <!-- Header -->
    <div class="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
      <div class="flex justify-between items-center">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">
            {{ pageTitle }}
          </h1>
          <p class="text-sm text-gray-500 mt-1">
            {{ pageDescription }}
            <span v-if="documentStats.total > 0" class="ml-2">
              ({{ documentStats.total }} documents, {{ formatFileSize(documentStats.totalSize) }})
            </span>
          </p>
        </div>
        <div class="flex gap-2">
          <Button
            v-if="canExport"
            @click="exportResults"
            icon="pi pi-download"
            severity="secondary"
            size="small"
            label="Export"
            :disabled="filteredDocuments.length === 0"
          />
          <Button
            @click="refreshDocuments"
            icon="pi pi-refresh"
            severity="secondary"
            size="small"
            :loading="loading"
          />
          <Button
            v-if="canUpload"
            @click="showUploadDialog = true"
            icon="pi pi-upload"
            label="Upload Document"
            size="small"
          />
        </div>
      </div>
    </div>

    <!-- Search and Filters Section -->
    <DocumentsSearchFilters
      v-model:search-query="searchQuery"
      v-model:filters="activeFilters"
      v-model:show-advanced="showAdvancedFilters"
      :projects="projects"
      :users="users"
      :filter-config="filterConfig"
      :show-project-filter="!isProjectSpecific"
      @search="performSearch"
      @filter-change="handleFilterChange"
      @clear-filters="clearAllFilters"
    />

    <!-- Results Section -->
    <div class="flex-1 overflow-y-auto p-6">
      <!-- Search Stats Bar -->
      <DocumentsStatsBar
        v-if="!loading && filteredDocuments.length > 0"
        :documents="filteredDocuments"
        :search-stats="searchStats"
        :sort-option="sortOption"
        :sort-options="sortOptions"
        @sort-change="handleSortChange"
      />

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

      <!-- Document Display -->
      <DocumentDisplay
        v-else
        :documents="paginatedDocuments"
        :show-project="!isProjectSpecific"
        :show-description="true"
        :show-tags="true"
        :show-stats="true"
        :projects="projects"
        :selectable="false"
        :sortable="true"
        :default-view-mode="defaultViewMode"
        :initial-sort="sortOption"
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
          <DocumentsEmptyState
            :search-query="searchQuery"
            :has-active-filters="hasActiveFilters"
            :can-upload="canUpload"
            @clear-filters="clearAllFilters"
            @upload="showUploadDialog = true"
          />
        </template>
      </DocumentDisplay>

      <!-- Pagination -->
      <DocumentsPagination
        v-if="totalPages > 1"
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :total-documents="filteredDocuments.length"
        :paginated-documents="paginatedDocuments"
        @page-change="onPageChange"
      />
    </div>

    <!-- Upload Dialog -->
    <DocumentUploader
      v-if="canUpload"
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
import { computed } from 'vue'
import { Button, ProgressSpinner } from 'primevue'
import DocumentDisplay from '@/components/widgets/DocumentDisplay.vue'
import DocumentUploader from '@/components/features/documents/DocumentUploader.vue'
import DocumentViewer from '@/components/features/documents/DocumentViewer.vue'
import DocumentsSearchFilters from '@/components/features/documents/DocumentsSearchFilters.vue'
import DocumentsStatsBar from '@/components/features/documents/DocumentsStatsBar.vue'
import DocumentsEmptyState from '@/components/features/documents/DocumentsEmptyState.vue'
import DocumentsPagination from '@/components/features/documents/DocumentsPagination.vue'
import { useDocuments } from '@/composables/useDocuments'
import { formatFileSize } from '@/utils/index'

// Props define the mode of operation
const props = defineProps({
  // Project-specific mode
  projectId: {
    type: String,
    default: null,
  },
  projectName: {
    type: String,
    default: '',
  },
  // Search mode configuration
  mode: {
    type: String,
    default: 'search', // 'search' | 'project' | 'manage'
    validator: (value) => ['search', 'project', 'manage'].includes(value),
  },
  // UI customization
  defaultViewMode: {
    type: String,
    default: 'grid',
  },
  allowUpload: {
    type: Boolean,
    default: true,
  },
  allowExport: {
    type: Boolean,
    default: true,
  },
})

// Use the documents composable
const {
  // State
  loading,
  error,
  allDocuments,
  documentStats,
  projects,
  users,

  // Search & Filters
  searchQuery,
  activeFilters,
  showAdvancedFilters,
  filteredDocuments,
  searchStats,

  // Sorting & Pagination
  sortOption,
  sortOptions,
  currentPage,
  pageSize,
  paginatedDocuments,
  totalPages,

  // UI State
  showUploadDialog,
  showDocumentViewer,
  selectedDocument,

  // Methods
  loadDocuments,
  refreshDocuments,
  performSearch,
  handleFilterChange,
  clearAllFilters,
  handleSortChange,
  onPageChange,
  openDocument,
  handleDocumentAction,
  handleViewModeChange,
  handleDocumentUploaded,
  handleDocumentUpdated,
  exportResults,

  // Config
  filterConfig,
} = useDocuments({
  projectId: props.projectId,
  mode: props.mode,
})

// Computed properties for UI customization
const isProjectSpecific = computed(() => !!props.projectId)

const pageTitle = computed(() => {
  if ((props.mode === 'project' || props.mode === 'manage') && props.projectName) {
    const action = props.mode === 'manage' ? 'Manage Documents' : 'Documents'
    return `${action} - ${props.projectName}`
  } else if (props.mode === 'search') {
    return 'Document Search'
  } else if (props.mode === 'manage') {
    return 'Manage Documents'
  }
  return 'Documents'
})

const pageDescription = computed(() => {
  if (props.mode === 'project') {
    return 'Manage project documents and files'
  } else if (props.mode === 'search') {
    return 'Search and filter documents across all projects'
  } else if (props.mode === 'manage') {
    return 'Advanced document management and organization'
  }
  return 'Manage and organize documents'
})

const canUpload = computed(
  () => props.allowUpload && (props.mode === 'project' || props.mode === 'manage'),
)

const canExport = computed(() => props.allowExport)

const hasActiveFilters = computed(() => {
  return (
    Object.values(activeFilters.value).some((value) => {
      if (Array.isArray(value)) return value.length > 0
      if (typeof value === 'object' && value !== null) {
        return Object.values(value).some((v) => v !== null && v !== '')
      }
      return value !== null && value !== ''
    }) || !!searchQuery.value
  )
})
</script>

<style scoped>
/* Styles handled by child components */
</style>
