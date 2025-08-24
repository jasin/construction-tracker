<template>
  <div class="h-full flex flex-col bg-gray-50">
    <!-- Header -->
    <div class="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
      <div class="flex justify-between items-center">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Document Search</h1>
          <p class="text-sm text-gray-500 mt-1">
            Search and filter documents across all projects
            <span v-if="searchStats.total > 0" class="ml-2">
              ({{ searchStats.total }} documents found, {{ formatFileSize(searchStats.totalSize) }})
            </span>
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

    <!-- Search and Advanced Filters -->
    <div class="bg-white border-b border-gray-200 px-6 py-4">
      <!-- Main Search Bar -->
      <div class="flex gap-4 items-center mb-4">
        <div class="flex-1 relative">
          <i class="pi pi-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
          <InputText
            v-model="searchQuery"
            placeholder="Search documents, descriptions, tags, or content..."
            class="w-full pl-10 pr-4 py-3 text-lg"
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

      <!-- Advanced Filters Panel -->
      <div class="bg-gray-50 rounded-lg border border-gray-200 p-4">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-semibold text-gray-900">Advanced Filters</h3>
          <Button
            @click="showAdvancedFilters = !showAdvancedFilters"
            :icon="showAdvancedFilters ? 'pi pi-chevron-up' : 'pi pi-chevron-down'"
            :label="showAdvancedFilters ? 'Hide' : 'Show'"
            severity="secondary"
            size="small"
            text
          />
        </div>

        <div v-show="showAdvancedFilters" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- Project Filter -->
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Project</label>
            <MultiSelect
              v-model="filters.projectIds"
              :options="projectOptions"
              option-label="label"
              option-value="value"
              placeholder="Select projects"
              class="w-full text-sm"
              display="chip"
              :max-selected-labels="2"
            />
          </div>

          <!-- Category Filter -->
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Category</label>
            <MultiSelect
              v-model="filters.categories"
              :options="categoryOptions"
              option-label="label"
              option-value="value"
              placeholder="Select categories"
              class="w-full text-sm"
              display="chip"
              :max-selected-labels="2"
            />
          </div>

          <!-- Status Filter -->
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Status</label>
            <MultiSelect
              v-model="filters.statuses"
              :options="statusOptions"
              option-label="label"
              option-value="value"
              placeholder="Select statuses"
              class="w-full text-sm"
              display="chip"
              :max-selected-labels="2"
            />
          </div>

          <!-- File Type Filter -->
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">File Type</label>
            <MultiSelect
              v-model="filters.fileTypes"
              :options="fileTypeOptions"
              option-label="label"
              option-value="value"
              placeholder="Select file types"
              class="w-full text-sm"
              display="chip"
              :max-selected-labels="2"
            />
          </div>

          <!-- Uploaded By Filter -->
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Uploaded By</label>
            <MultiSelect
              v-model="filters.uploadedBy"
              :options="userOptions"
              option-label="label"
              option-value="value"
              placeholder="Select users"
              class="w-full text-sm"
              display="chip"
              :max-selected-labels="2"
            />
          </div>

          <!-- Date Range Filter -->
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Upload Date</label>
            <DatePicker
              v-model="filters.dateRange"
              selection-mode="range"
              class="w-full text-sm"
              placeholder="Select date range"
              show-icon
              date-format="mm/dd/yy"
            />
          </div>

          <!-- File Size Filter -->
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">File Size</label>
            <Select
              v-model="filters.sizeRange"
              :options="sizeRangeOptions"
              option-label="label"
              option-value="value"
              placeholder="Any size"
              class="w-full text-sm"
              show-clear
            />
          </div>

          <!-- Tags Filter -->
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Tags</label>
            <Chips
              v-model="filters.tags"
              class="w-full text-sm"
              placeholder="Add tags to search"
            />
          </div>
        </div>

        <!-- Quick Filter Buttons -->
        <div class="flex gap-2 mt-4 pt-4 border-t border-gray-200">
          <Button
            @click="applyQuickFilter('recent')"
            label="Recent (7 days)"
            severity="secondary"
            size="small"
            outlined
          />
          <Button
            @click="applyQuickFilter('pending')"
            label="Pending Approval"
            severity="warning"
            size="small"
            outlined
          />
          <Button
            @click="applyQuickFilter('large-files')"
            label="Large Files (>10MB)"
            severity="secondary"
            size="small"
            outlined
          />
          <Button
            @click="applyQuickFilter('drawings')"
            label="Plans & Drawings"
            severity="info"
            size="small"
            outlined
          />
        </div>
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

      <!-- Empty State -->
      <div v-else-if="filteredDocuments.length === 0 && !searching" class="text-center py-12">
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

      <!-- Search Results -->
      <div v-else>
        <!-- Sort and View Options -->
        <div class="flex items-center justify-between mb-6">
          <div class="flex items-center gap-4">
            <span class="text-sm text-gray-700 font-medium">
              {{ filteredDocuments.length }} documents found
            </span>
            <Select
              v-model="sortBy"
              :options="sortOptions"
              option-label="label"
              option-value="value"
              placeholder="Sort by"
              class="text-sm"
              @change="applySorting"
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

        <!-- Grid View -->
        <div
          v-if="viewMode === 'grid'"
          class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >
          <div
            v-for="document in paginatedDocuments"
            :key="document.id"
            @click="openDocument(document)"
            class="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 cursor-pointer transition-all p-4"
          >
            <!-- Document Header -->
            <div class="flex items-start justify-between mb-3">
              <div class="flex items-center gap-2 flex-1 min-w-0">
                <i
                  :class="getDocumentIcon(document.name, document.category)"
                  class="text-xl text-gray-600 flex-shrink-0"
                ></i>
                <div class="flex-1 min-w-0">
                  <h3 class="font-medium text-gray-900 truncate" :title="document.name">
                    {{ document.name }}
                  </h3>
                  <p class="text-xs text-gray-500">v{{ document.version || 1 }}</p>
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

              <div class="text-xs text-gray-600 truncate">
                {{ getProjectName(document.projectId) }}
              </div>

              <div class="flex items-center justify-between text-xs text-gray-500">
                <span>{{ document.uploadedByName || 'Unknown' }}</span>
                <span>{{ formatDate(document.uploadedAt) }}</span>
              </div>

              <div v-if="document.description" class="text-xs text-gray-600 line-clamp-2">
                {{ document.description }}
              </div>

              <!-- Tags -->
              <div v-if="document.tags && document.tags.length > 0" class="flex flex-wrap gap-1">
                <span
                  v-for="tag in document.tags.slice(0, 3)"
                  :key="tag"
                  class="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded"
                >
                  {{ tag }}
                </span>
                <span
                  v-if="document.tags.length > 3"
                  class="text-xs text-gray-500"
                >
                  +{{ document.tags.length - 3 }}
                </span>
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
                @click.stop="openInDrive(document)"
                icon="pi pi-external-link"
                severity="secondary"
                size="small"
                text
                v-tooltip.top="'Open in Drive'"
              />
            </div>
          </div>
        </div>

        <!-- List View -->
        <div v-else class="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Document
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Project
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Size
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Uploaded
                  </th>
                  <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr
                  v-for="document in paginatedDocuments"
                  :key="document.id"
                  @click="openDocument(document)"
                  class="hover:bg-gray-50 cursor-pointer"
                >
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                      <i
                        :class="getDocumentIcon(document.name, document.category)"
                        class="text-xl text-gray-600 mr-3 flex-shrink-0"
                      ></i>
                      <div class="min-w-0">
                        <div class="text-sm font-medium text-gray-900 truncate">{{ document.name }}</div>
                        <div class="text-sm text-gray-500">Version {{ document.version || 1 }}</div>
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900 truncate max-w-xs">
                      {{ getProjectName(document.projectId) }}
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
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
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

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
  MultiSelect,
  Select,
  DatePicker,
  Chips,
  ProgressSpinner,
  Paginator
} from 'primevue'
import firebaseService from '@/services/firebase/firebaseService'
import { DOCUMENT_CATEGORIES, getDocumentIcon } from '@/constants/documentCategories'
import DocumentStatusBadge from '@/components/features/documents/DocumentStatusBadge.vue'
import DocumentViewer from '@/components/features/documents/DocumentViewer.vue'
import { formatFileSize, formatDate, loadUsers, loadProjects } from '@/utils/index'

// Reactive state
const loading = ref(true)
const searching = ref(false)
const error = ref('')
const searchQuery = ref('')
const showAdvancedFilters = ref(false)
const viewMode = ref('grid')
const sortBy = ref('uploadedAt-desc')

// Data
const allDocuments = ref([])
const projects = ref([])
const users = ref([])

// Filters
const filters = ref({
  projectIds: [],
  categories: [],
  statuses: [],
  fileTypes: [],
  uploadedBy: [],
  dateRange: null,
  sizeRange: null,
  tags: []
})

// Pagination
const currentPage = ref(1)
const pageSize = ref(25)
const first = ref(0)

// Document viewer
const showDocumentViewer = ref(false)
const selectedDocument = ref(null)

// Options for filters
const categoryOptions = computed(() =>
  Object.entries(DOCUMENT_CATEGORIES).map(([key, config]) => ({
    label: config.label,
    value: key
  }))
)

const statusOptions = [
  { label: 'Draft', value: 'draft' },
  { label: 'Pending Review', value: 'pending' },
  { label: 'Under Review', value: 'review' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Superseded', value: 'superseded' }
]

const fileTypeOptions = [
  { label: 'PDF Documents', value: 'pdf' },
  { label: 'Word Documents', value: 'doc,docx' },
  { label: 'Excel Files', value: 'xls,xlsx' },
  { label: 'Images', value: 'jpg,jpeg,png,gif' },
  { label: 'CAD Drawings', value: 'dwg,dxf' },
  { label: 'Text Files', value: 'txt,csv' }
]

const sizeRangeOptions = [
  { label: 'Small (< 1MB)', value: 'small' },
  { label: 'Medium (1MB - 10MB)', value: 'medium' },
  { label: 'Large (10MB - 50MB)', value: 'large' },
  { label: 'Very Large (> 50MB)', value: 'xlarge' }
]

const sortOptions = [
  { label: 'Upload Date (Newest)', value: 'uploadedAt-desc' },
  { label: 'Upload Date (Oldest)', value: 'uploadedAt-asc' },
  { label: 'Name (A-Z)', value: 'name-asc' },
  { label: 'Name (Z-A)', value: 'name-desc' },
  { label: 'File Size (Largest)', value: 'fileSize-desc' },
  { label: 'File Size (Smallest)', value: 'fileSize-asc' },
  { label: 'Project', value: 'project-asc' },
  { label: 'Category', value: 'category-asc' }
]

const projectOptions = computed(() =>
  projects.value.map(project => ({
    label: `${project.jobNumber} - ${project.name}`,
    value: project.id
  }))
)

const userOptions = computed(() =>
  users.value.map(user => ({
    label: user.name || user.email,
    value: user.id
  }))
)

// Computed properties
const hasActiveFilters = computed(() => {
  return (
    filters.value.projectIds.length > 0 ||
    filters.value.categories.length > 0 ||
    filters.value.statuses.length > 0 ||
    filters.value.fileTypes.length > 0 ||
    filters.value.uploadedBy.length > 0 ||
    filters.value.dateRange ||
    filters.value.sizeRange ||
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

  // Project filter
  if (filters.value.projectIds.length > 0) {
    docs = docs.filter(doc => filters.value.projectIds.includes(doc.projectId))
  }

  // Category filter
  if (filters.value.categories.length > 0) {
    docs = docs.filter(doc => filters.value.categories.includes(doc.category))
  }

  // Status filter
  if (filters.value.statuses.length > 0) {
    docs = docs.filter(doc => filters.value.statuses.includes(doc.status))
  }

  // File type filter
  if (filters.value.fileTypes.length > 0) {
    docs = docs.filter(doc => {
      const extension = doc.name.split('.').pop().toLowerCase()
      return filters.value.fileTypes.some(type =>
        type.split(',').includes(extension)
      )
    })
  }

  // Uploaded by filter
  if (filters.value.uploadedBy.length > 0) {
    docs = docs.filter(doc => filters.value.uploadedBy.includes(doc.uploadedBy))
  }

  // Date range filter
  if (filters.value.dateRange && filters.value.dateRange.length === 2) {
    const [startDate, endDate] = filters.value.dateRange
    docs = docs.filter(doc => {
      const docDate = new Date(doc.uploadedAt)
      return docDate >= startDate && docDate <= endDate
    })
  }

  // Size filter
  if (filters.value.sizeRange) {
    docs = docs.filter(doc => {
      const size = doc.fileSize || 0
      switch (filters.value.sizeRange) {
        case 'small': return size < 1024 * 1024
        case 'medium': return size >= 1024 * 1024 && size < 10 * 1024 * 1024
        case 'large': return size >= 10 * 1024 * 1024 && size < 50 * 1024 * 1024
        case 'xlarge': return size >= 50 * 1024 * 1024
        default: return true
      }
    })
  }

  // Tags filter
  if (filters.value.tags.length > 0) {
    docs = docs.filter(doc =>
      doc.tags && filters.value.tags.some(tag =>
        doc.tags.map(t => t.toLowerCase()).includes(tag.toLowerCase())
      )
    )
  }

  return docs
})

const sortedDocuments = computed(() => {
  const docs = [...filteredDocuments.value]
  const [field, direction] = sortBy.value.split('-')

  docs.sort((a, b) => {
    let aVal, bVal

    switch (field) {
      case 'name':
        aVal = a.name?.toLowerCase() || ''
        bVal = b.name?.toLowerCase() || ''
        break
      case 'uploadedAt':
        aVal = new Date(a.uploadedAt || 0)
        bVal = new Date(b.uploadedAt || 0)
        break
      case 'fileSize':
        aVal = a.fileSize || 0
        bVal = b.fileSize || 0
        break
      case 'project':
        aVal = getProjectName(a.projectId)
        bVal = getProjectName(b.projectId)
        break
      case 'category':
        aVal = getCategoryLabel(a.category)
        bVal = getCategoryLabel(b.category)
        break
      default:
        return 0
    }

    if (aVal < bVal) return direction === 'asc' ? -1 : 1
    if (aVal > bVal) return direction === 'asc' ? 1 : -1
    return 0
  })

  return docs
})

const paginatedDocuments = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return sortedDocuments.value.slice(start, end)
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

// Helper functions
const getCategoryLabel = (category) => {
  const config = DOCUMENT_CATEGORIES[category]
  return config ? config.label : category
}

const getProjectName = (projectId) => {
  const project = projects.value.find(p => p.id === projectId)
  return project ? `${project.jobNumber} - ${project.name}` : 'Unknown Project'
}

// Methods
const loadAllDocuments = async () => {
  try {
    loading.value = true
    error.value = ''

    // Load documents from all projects
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

    // Flatten and combine all documents
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
  // Add a small delay for better UX
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
    statuses: [],
    fileTypes: [],
    uploadedBy: [],
    dateRange: null,
    sizeRange: null,
    tags: []
  }
  currentPage.value = 1
  first.value = 0
}

const applyQuickFilter = (filterType) => {
  clearAllFilters()

  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  switch (filterType) {
    case 'recent':
      filters.value.dateRange = [sevenDaysAgo, now]
      break
    case 'pending':
      filters.value.statuses = ['pending', 'review']
      break
    case 'large-files':
      filters.value.sizeRange = 'large'
      break
    case 'drawings':
      filters.value.categories = ['plans']
      break
  }
}

const applySorting = () => {
  currentPage.value = 1
  first.value = 0
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

const viewDocument = (document) => {
  if (document.googleDriveLink) {
    window.open(document.googleDriveLink, '_blank')
  }
}

const downloadDocument = (document) => {
  if (document.googleDriveFileId) {
    const downloadUrl = `https://drive.google.com/uc?export=download&id=${document.googleDriveFileId}`
    window.open(downloadUrl, '_blank')
  }
}

const openInDrive = (document) => {
  if (document.googleDriveLink) {
    window.open(document.googleDriveLink, '_blank')
  }
}

const handleDocumentUpdated = (updatedDocument) => {
  const index = allDocuments.value.findIndex(doc => doc.id === updatedDocument.id)
  if (index !== -1) {
    allDocuments.value[index] = updatedDocument
  }
}

const exportResults = () => {
  const docs = filteredDocuments.value
  const csvContent = [
    // CSV Header
    ['Name', 'Project', 'Category', 'Status', 'Size', 'Upload Date', 'Uploaded By', 'Tags'].join(','),
    // CSV Data
    ...docs.map(doc => [
      `"${doc.name || ''}"`,
      `"${getProjectName(doc.projectId)}"`,
      `"${getCategoryLabel(doc.category)}"`,
      `"${doc.status || ''}"`,
      `"${formatFileSize(doc.fileSize)}"`,
      `"${formatDate(doc.uploadedAt)}"`,
      `"${doc.uploadedByName || ''}"`,
      `"${(doc.tags || []).join('; ')}"`
    ].join(','))
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `document-search-results-${new Date().toISOString().split('T')[0]}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// Watchers
watch(() => searchQuery.value, () => {
  if (searchQuery.value.length > 2 || searchQuery.value.length === 0) {
    performSearch()
  }
}, { debounce: 500 })

watch(() => filters.value, () => {
  currentPage.value = 1
  first.value = 0
}, { deep: true })

// Lifecycle
onMounted(() => {
  loadAllDocuments()
})
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  line-clamp: 2;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Custom scrollbar */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>
