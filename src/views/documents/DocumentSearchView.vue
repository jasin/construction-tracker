<!-- COMPLETE DocumentSearchView.vue with Advanced Filters -->
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
          @click="toggleFilters"
          :icon="showFilters ? 'pi pi-filter-slash' : 'pi pi-filter'"
          :label="showFilters ? 'Hide Filters' : 'Show Filters'"
          severity="secondary"
          size="large"
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

      <!-- Advanced Filters -->
      <div v-show="showFilters" class="bg-gray-50 rounded-lg border border-gray-200 p-4">
        <AdvancedFilters
          v-model="filters"
          title="Document Filters"
          :expanded="showFilters"
          :columns="4"
          :filters="filterConfig"
          :quick-filters="quickFilterConfig"
          @filter-change="handleFilterChange"
          @quick-filter="handleQuickFilter"
          @clear-filters="handleClearFilters"
        >
          <!-- Custom file size filter -->
          <template #filter-customFileSize="{ value, updateFilter }">
            <div class="space-y-2">
              <div class="flex items-center gap-2">
                <input
                  type="radio"
                  id="size-any"
                  :checked="!value"
                  @change="updateFilter(null)"
                  class="text-primary-600"
                />
                <label for="size-any" class="text-sm">Any size</label>
              </div>
              <div class="flex items-center gap-2">
                <input
                  type="radio"
                  id="size-small"
                  :checked="value === 'small'"
                  @change="updateFilter('small')"
                  class="text-primary-600"
                />
                <label for="size-small" class="text-sm">Small (&lt; 1MB)</label>
              </div>
              <div class="flex items-center gap-2">
                <input
                  type="radio"
                  id="size-medium"
                  :checked="value === 'medium'"
                  @change="updateFilter('medium')"
                  class="text-primary-600"
                />
                <label for="size-medium" class="text-sm">Medium (1-10MB)</label>
              </div>
              <div class="flex items-center gap-2">
                <input
                  type="radio"
                  id="size-large"
                  :checked="value === 'large'"
                  @change="updateFilter('large')"
                  class="text-primary-600"
                />
                <label for="size-large" class="text-sm">Large (&gt; 10MB)</label>
              </div>
            </div>
          </template>

          <!-- Custom version filter -->
          <template #filter-versionFilter="{ value, updateFilter }">
            <div class="flex items-center gap-2">
              <Checkbox
                :model-value="value?.latestOnly"
                @update:model-value="updateFilter({ ...value, latestOnly: $event })"
                input-id="latest-only"
                :binary="true"
              />
              <label for="latest-only" class="text-sm">Latest versions only</label>
            </div>
          </template>

          <!-- Custom date range filter -->
          <template #filter-dateRange="{ value, updateFilter }">
            <div class="space-y-3">
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">From</label>
                <Calendar
                  :model-value="value?.from"
                  @update:model-value="updateFilter({ ...value, from: $event })"
                  placeholder="Start date"
                  class="w-full"
                  :show-time="false"
                  date-format="mm/dd/yy"
                />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">To</label>
                <Calendar
                  :model-value="value?.to"
                  @update:model-value="updateFilter({ ...value, to: $event })"
                  placeholder="End date"
                  class="w-full"
                  :show-time="false"
                  date-format="mm/dd/yy"
                />
              </div>
            </div>
          </template>

          <!-- Custom footer with filter summary -->
          <template #footer="{ activeFilters, clearAllFilters }">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-4">
                <span class="text-xs text-gray-600">
                  {{ Object.keys(activeFilters).length }} active filters
                </span>
                <Button
                  @click="saveFilterPreset"
                  label="Save as Preset"
                  size="small"
                  text
                  icon="pi pi-bookmark"
                  v-show="Object.keys(activeFilters).length > 2"
                />
              </div>
              <Button
                v-if="Object.keys(activeFilters).length > 0"
                @click="clearAllFilters"
                label="Reset All Filters"
                size="small"
                text
                icon="pi pi-refresh"
              />
            </div>
          </template>
        </AdvancedFilters>
      </div>
    </div>

    <!-- Results Section -->
    <div class="flex-1 overflow-y-auto p-6">
      <!-- Search Stats Bar -->
      <div v-if="!loading && filteredDocuments.length > 0" class="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div class="flex items-center justify-between text-sm">
          <div class="flex items-center gap-4">
            <span class="font-medium text-blue-900">
              {{ filteredDocuments.length }} documents found
            </span>
            <span class="text-blue-700">
              Total size: {{ formatFileSize(searchStats.totalSize) }}
            </span>
            <span class="text-blue-700">
              Across {{ searchStats.projectCount }} projects
            </span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-blue-700">Sort:</span>
            <Dropdown
              v-model="sortOption"
              :options="sortOptions"
              option-label="label"
              option-value="value"
              class="w-40"
            />
          </div>
        </div>
      </div>

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
            <Button
              v-if="hasActiveFilters"
              @click="clearAllFilters"
              label="Clear All Filters"
              severity="secondary"
              icon="pi pi-times"
            />
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
  Paginator,
  Dropdown,
  Calendar,
  Checkbox
} from 'primevue'
import firebaseService from '@/services/firebase/firebaseService'
import DocumentDisplay from '@/components/widgets/DocumentDisplay.vue'
import DocumentViewer from '@/components/features/documents/DocumentViewer.vue'
import AdvancedFilters from '@/components/widgets/AdvancedFilters.vue'
import { formatFileSize, loadUsers, loadProjects } from '@/utils/index'

// Reactive state
const loading = ref(true)
const searching = ref(false)
const error = ref('')
const searchQuery = ref('')
const showFilters = ref(false)

// Data
const allDocuments = ref([])
const projects = ref([])
const users = ref([])

// Sorting
const sortOption = ref('uploadedAt-desc')
const sortOptions = [
  { label: 'Newest First', value: 'uploadedAt-desc' },
  { label: 'Oldest First', value: 'uploadedAt-asc' },
  { label: 'Name A-Z', value: 'name-asc' },
  { label: 'Name Z-A', value: 'name-desc' },
  { label: 'Size Largest', value: 'fileSize-desc' },
  { label: 'Size Smallest', value: 'fileSize-asc' },
  { label: 'Most Recent Update', value: 'updatedAt-desc' }
]

// Advanced filters
const filters = ref({
  projectIds: [],
  categories: [],
  tags: [],
  fileTypes: [],
  uploadedBy: [],
  customFileSize: null,
  versionFilter: { latestOnly: false },
  dateRange: { from: null, to: null }
})

// Filter configurations
const filterConfig = computed(() => [
  {
    key: 'projectIds',
    label: 'Projects',
    type: 'multiselect',
    options: projects.value.map(p => ({ label: p.name, value: p.id })),
    placeholder: 'Select projects...'
  },
  {
    key: 'categories',
    label: 'Categories',
    type: 'multiselect',
    options: [
      { label: 'Research', value: 'research' },
      { label: 'Documentation', value: 'documentation' },
      { label: 'Presentation', value: 'presentation' },
      { label: 'Spreadsheet', value: 'spreadsheet' },
      { label: 'Image', value: 'image' },
      { label: 'Video', value: 'video' },
      { label: 'Other', value: 'other' }
    ],
    placeholder: 'Select categories...'
  },
  {
    key: 'fileTypes',
    label: 'File Types',
    type: 'multiselect',
    options: [
      { label: 'PDF', value: 'pdf' },
      { label: 'Word Document', value: 'docx' },
      { label: 'Excel', value: 'xlsx' },
      { label: 'PowerPoint', value: 'pptx' },
      { label: 'Image', value: 'image' },
      { label: 'Text', value: 'txt' },
      { label: 'Other', value: 'other' }
    ],
    placeholder: 'Select file types...'
  },
  {
    key: 'uploadedBy',
    label: 'Uploaded By',
    type: 'multiselect',
    options: users.value.map(u => ({ label: u.name || u.email, value: u.id })),
    placeholder: 'Select users...'
  },
  {
    key: 'customFileSize',
    label: 'File Size',
    type: 'custom',
    component: 'customFileSize'
  },
  {
    key: 'versionFilter',
    label: 'Version Options',
    type: 'custom',
    component: 'versionFilter'
  },
  {
    key: 'dateRange',
    label: 'Date Range',
    type: 'custom',
    component: 'dateRange'
  },
  {
    key: 'tags',
    label: 'Tags',
    type: 'tags',
    placeholder: 'Enter tags...'
  }
])

const quickFilterConfig = computed(() => [
  {
    key: 'recent',
    label: 'Recent (Last 7 days)',
    icon: 'pi pi-clock',
    action: () => setDateFilter(7)
  },
  {
    key: 'thisMonth',
    label: 'This Month',
    icon: 'pi pi-calendar',
    action: () => setDateFilter(30)
  },
  {
    key: 'myDocuments',
    label: 'My Documents',
    icon: 'pi pi-user',
    action: () => setUserFilter()
  },
  {
    key: 'large',
    label: 'Large Files (>10MB)',
    icon: 'pi pi-file',
    action: () => filters.value.customFileSize = 'large'
  }
])

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
    filters.value.fileTypes.length > 0 ||
    filters.value.uploadedBy.length > 0 ||
    filters.value.customFileSize ||
    filters.value.versionFilter.latestOnly ||
    filters.value.dateRange.from ||
    filters.value.dateRange.to ||
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
      doc.tags?.some(tag => tag.toLowerCase().includes(query)) ||
      doc.content?.toLowerCase().includes(query)
    )
  }

  // Project filter
  if (filters.value.projectIds.length > 0) {
    docs = docs.filter(doc => filters.value.projectIds.includes(doc.projectId))
  }

  // Category filter
  if (filters.value.categories.length > 0) {
    docs = docs.filter(doc => filters.value.categories.includes(doc.category))
  }

  // File type filter
  if (filters.value.fileTypes.length > 0) {
    docs = docs.filter(doc => {
      const fileType = getFileType(doc.name || doc.fileName)
      return filters.value.fileTypes.includes(fileType)
    })
  }

  // Uploaded by filter
  if (filters.value.uploadedBy.length > 0) {
    docs = docs.filter(doc => filters.value.uploadedBy.includes(doc.uploadedBy))
  }

  // File size filter
  if (filters.value.customFileSize) {
    docs = docs.filter(doc => {
      const size = doc.fileSize || 0
      const sizeInMB = size / (1024 * 1024)

      switch (filters.value.customFileSize) {
        case 'small': return sizeInMB < 1
        case 'medium': return sizeInMB >= 1 && sizeInMB <= 10
        case 'large': return sizeInMB > 10
        default: return true
      }
    })
  }

  // Date range filter
  if (filters.value.dateRange.from || filters.value.dateRange.to) {
    docs = docs.filter(doc => {
      const docDate = new Date(doc.uploadedAt || doc.createdAt)
      const fromDate = filters.value.dateRange.from
      const toDate = filters.value.dateRange.to

      if (fromDate && docDate < fromDate) return false
      if (toDate && docDate > toDate) return false
      return true
    })
  }

  // Tags filter
  if (filters.value.tags.length > 0) {
    docs = docs.filter(doc =>
      doc.tags?.some(tag =>
        filters.value.tags.some(filterTag =>
          tag.toLowerCase().includes(filterTag.toLowerCase())
        )
      )
    )
  }

  // Version filter (latest only)
  if (filters.value.versionFilter.latestOnly) {
    // Group by document name/base name and keep only the latest version
    const groupedDocs = docs.reduce((groups, doc) => {
      const baseName = doc.name?.replace(/\s*\(v\d+\)/, '') || doc.fileName
      if (!groups[baseName] || new Date(doc.uploadedAt) > new Date(groups[baseName].uploadedAt)) {
        groups[baseName] = doc
      }
      return groups
    }, {})
    docs = Object.values(groupedDocs)
  }

  // Apply sorting
  docs = sortDocuments(docs, sortOption.value)

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
  const projectIds = new Set(docs.map(doc => doc.projectId))

  return {
    total: docs.length,
    totalSize: docs.reduce((sum, doc) => sum + (doc.fileSize || 0), 0),
    projectCount: projectIds.size
  }
})

// Helper methods
const getFileType = (fileName) => {
  if (!fileName) return 'other'
  const ext = fileName.split('.').pop()?.toLowerCase()

  const typeMap = {
    pdf: 'pdf',
    doc: 'docx',
    docx: 'docx',
    xls: 'xlsx',
    xlsx: 'xlsx',
    ppt: 'pptx',
    pptx: 'pptx',
    jpg: 'image',
    jpeg: 'image',
    png: 'image',
    gif: 'image',
    txt: 'txt'
  }

  return typeMap[ext] || 'other'
}

const sortDocuments = (docs, sortBy) => {
  const [field, direction] = sortBy.split('-')

  return docs.sort((a, b) => {
    let aVal = a[field]
    let bVal = b[field]

    if (field === 'name') {
      aVal = (a.name || a.fileName || '').toLowerCase()
      bVal = (b.name || b.fileName || '').toLowerCase()
    } else if (field === 'uploadedAt' || field === 'updatedAt') {
      aVal = new Date(aVal || 0)
      bVal = new Date(bVal || 0)
    } else if (field === 'fileSize') {
      aVal = aVal || 0
      bVal = bVal || 0
    }

    if (aVal < bVal) return direction === 'asc' ? -1 : 1
    if (aVal > bVal) return direction === 'asc' ? 1 : -1
    return 0
  })
}

// Methods
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

const toggleFilters = () => {
  showFilters.value = !showFilters.value
}

const clearAllFilters = () => {
  searchQuery.value = ''
  filters.value = {
    projectIds: [],
    categories: [],
    tags: [],
    fileTypes: [],
    uploadedBy: [],
    customFileSize: null,
    versionFilter: { latestOnly: false },
    dateRange: { from: null, to: null }
  }
  currentPage.value = 1
  first.value = 0
}

// Filter event handlers
const handleFilterChange = (filterKey, value) => {
  filters.value[filterKey] = value
  currentPage.value = 1
  first.value = 0
}

const handleQuickFilter = (filterKey) => {
  // Quick filters are handled by their individual actions
  currentPage.value = 1
  first.value = 0
}

const handleClearFilters = () => {
  clearAllFilters()
}

// Quick filter actions
const setDateFilter = (days) => {
  const date = new Date()
  date.setDate(date.getDate() - days)
  filters.value.dateRange.from = date
  filters.value.dateRange.to = null
}

const setUserFilter = () => {
  // Assuming current user ID is available
  const currentUserId = 'current-user-id' // Replace with actual current user ID
  filters.value.uploadedBy = [currentUserId]
}

const saveFilterPreset = () => {
  // Implementation for saving filter presets
  console.log('Saving filter preset...', filters.value)
  // Could save to localStorage or user preferences
}

const onPageChange = (event) => {
  currentPage.value = Math.floor(event.first / event.rows) + 1
  first.value = event.first
}

// Document actions
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
  const dataToExport = filteredDocuments.value.map(doc => ({
    name: doc.name || doc.fileName,
    project: projects.value.find(p => p.id === doc.projectId)?.name,
    category: doc.category,
    fileSize: formatFileSize(doc.fileSize || 0),
    uploadedAt: new Date(doc.uploadedAt).toLocaleDateString(),
    uploadedBy: users.value.find(u => u.id === doc.uploadedBy)?.name,
    tags: doc.tags?.join(', ') || ''
  }))

  console.log('Exporting results...', dataToExport)
  // Could generate CSV/Excel export
}

// Watchers
watch(() => searchQuery.value, () => {
  if (searchQuery.value.length > 2 || searchQuery.value.length === 0) {
    performSearch()
  }
}, { debounce: 500 })

watch(() => sortOption.value, () => {
  currentPage.value = 1
  first.value = 0
})

// Lifecycle
onMounted(() => {
  loadAllDocuments()
})
</script>

<style scoped>
/* Custom styles for the search view */
.pi-search {
  font-size: 1rem;
}

.search-stats {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
}
</style>
