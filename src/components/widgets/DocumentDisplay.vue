<template>
  <div>
    <!-- View Toggle Header -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-4">
        <span class="text-sm text-gray-700 font-medium">
          {{ documents.length }} documents found
          <span v-if="showStats && totalSize > 0" class="text-gray-500">
            ({{ formatFileSize(totalSize) }} total)
          </span>
        </span>

        <!-- Sort dropdown -->
        <Select
          v-if="sortable"
          v-model="currentSort"
          :options="sortOptions"
          option-label="label"
          option-value="value"
          placeholder="Sort by"
          class="text-sm"
          @change="handleSortChange"
        />
      </div>

      <!-- View Toggle -->
      <div class="flex items-center gap-2">
        <!-- Custom header actions slot -->
        <slot name="header-actions" />

        <div class="flex border border-gray-300 rounded">
          <Button
            @click="viewMode = 'grid'"
            :severity="viewMode === 'grid' ? 'primary' : 'secondary'"
            icon="pi pi-th-large"
            size="small"
            text
            v-tooltip.top="'Grid View'"
          />
          <Button
            @click="viewMode = 'list'"
            :severity="viewMode === 'list' ? 'primary' : 'secondary'"
            icon="pi pi-list"
            size="small"
            text
            v-tooltip.top="'List View'"
          />
        </div>
      </div>
    </div>

    <!-- Grid View -->
    <DocumentGrid
      v-if="viewMode === 'grid'"
      :documents="sortedDocuments"
      :show-project="showProject"
      :show-description="showDescription"
      :show-tags="showTags"
      :show-actions="showActions"
      :show-drive-link="showDriveLink"
      :show-file-extension="showFileExtension"
      :max-visible-tags="maxVisibleTags"
      :selected-documents="selectedDocuments"
      :projects="projects"
      :can-edit="canEdit"
      @document-click="handleDocumentClick"
      @document-action="handleDocumentAction"
      @document-select="handleDocumentSelect"
    >
      <template #metadata="{ document }">
        <slot name="grid-metadata" :document="document" />
      </template>
      <template #actions="{ document, handleAction }">
        <slot name="grid-actions" :document="document" :handleAction="handleAction" />
      </template>
      <template #empty>
        <slot name="empty" />
      </template>
    </DocumentGrid>

    <!-- Table View -->
    <DocumentTable
      v-else
      :documents="sortedDocuments"
      :show-project="showProject"
      :show-description="showTableDescription"
      :show-actions="showActions"
      :show-drive-link="showDriveLink"
      :selectable="selectable"
      :sortable="sortable"
      :selected-documents="selectedDocuments"
      :sort-field="sortField"
      :sort-order="sortOrder"
      :projects="projects"
      :can-edit="canEdit"
      @document-click="handleDocumentClick"
      @document-action="handleDocumentAction"
      @document-select="handleDocumentSelect"
      @select-all="handleSelectAll"
      @sort-change="handleTableSort"
    >
      <template #custom-headers="{ handleSort, getSortIcon }">
        <slot name="table-headers" :handleSort="handleSort" :getSortIcon="getSortIcon" />
      </template>
      <template #custom-cells="{ document }">
        <slot name="table-cells" :document="document" />
      </template>
      <template #actions="{ document, handleAction }">
        <slot name="table-actions" :document="document" :handleAction="handleAction" />
      </template>
      <template #empty>
        <slot name="empty" />
      </template>
    </DocumentTable>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Button, Select } from 'primevue'
import DocumentGrid from './DocumentGrid.vue'
import DocumentTable from './DocumentTable.vue'
import { formatFileSize } from '@/utils/index'

// Props
const props = defineProps({
  // Required
  documents: {
    type: Array,
    required: true
  },

  // Display options
  showProject: {
    type: Boolean,
    default: false
  },
  showDescription: {
    type: Boolean,
    default: true
  },
  showTableDescription: {
    type: Boolean,
    default: false
  },
  showTags: {
    type: Boolean,
    default: true
  },
  showActions: {
    type: Boolean,
    default: true
  },
  showDriveLink: {
    type: Boolean,
    default: true
  },
  showFileExtension: {
    type: Boolean,
    default: false
  },
  showStats: {
    type: Boolean,
    default: true
  },

  // Configuration
  maxVisibleTags: {
    type: Number,
    default: 3
  },
  defaultViewMode: {
    type: String,
    default: 'grid',
    validator: (value) => ['grid', 'list'].includes(value)
  },

  // Functionality
  selectable: {
    type: Boolean,
    default: false
  },
  sortable: {
    type: Boolean,
    default: true
  },

  // Selection
  selectedDocuments: {
    type: Array,
    default: () => []
  },

  // Data mappings
  projects: {
    type: Array,
    default: () => []
  },

  // Permission functions
  canEdit: {
    type: Function,
    default: () => true
  },

  // Initial sort
  initialSort: {
    type: String,
    default: 'uploadedAt-desc'
  }
})

// Emits
const emit = defineEmits([
  'document-click',
  'document-action',
  'document-select',
  'select-all',
  'view-mode-change'
])

// Reactive state
const viewMode = ref(props.defaultViewMode)
const currentSort = ref(props.initialSort)

// Computed
const [sortField, sortOrder] = computed(() => {
  const [field, order] = currentSort.value.split('-')
  return [field, order || 'asc']
}).value

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

const totalSize = computed(() =>
  props.documents.reduce((sum, doc) => sum + (doc.fileSize || 0), 0)
)

const sortedDocuments = computed(() => {
  const docs = [...props.documents]
  const [field, direction] = currentSort.value.split('-')

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
        aVal = getProjectName(a.projectId) || ''
        bVal = getProjectName(b.projectId) || ''
        break
      case 'category':
        aVal = a.category || ''
        bVal = b.category || ''
        break
      case 'status':
        aVal = a.status || ''
        bVal = b.status || ''
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

// Helper functions
const getProjectName = (projectId) => {
  if (!props.showProject) return ''

  const project = props.projects.find(p => p.id === projectId)
  return project ? `${project.jobNumber} - ${project.name}` : 'Unknown Project'
}

// Event handlers
const handleDocumentClick = (document) => {
  emit('document-click', document)
}

const handleDocumentAction = (payload) => {
  emit('document-action', payload)
}

const handleDocumentSelect = (document) => {
  emit('document-select', document)
}

const handleSelectAll = (selectAll) => {
  emit('select-all', selectAll)
}

const handleSortChange = () => {
  // Sort change is handled through reactivity
}

const handleTableSort = ({ field, order }) => {
  currentSort.value = `${field}-${order}`
}

// Watch for view mode changes
watch(viewMode, (newMode) => {
  emit('view-mode-change', newMode)
})
</script>

<style scoped>
/* Any additional styling */
</style>
