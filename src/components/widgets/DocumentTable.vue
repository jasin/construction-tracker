<template>
  <div class="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200">
        <!-- Table Header -->
        <thead class="bg-gray-50">
          <tr>
            <!-- Selection column -->
            <th v-if="selectable" class="px-6 py-3 w-12">
              <input
                type="checkbox"
                :checked="allSelected"
                :indeterminate="someSelected"
                @change="toggleSelectAll"
                class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
            </th>

            <!-- Document column -->
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <button
                v-if="sortable"
                @click="handleSort('name')"
                class="flex items-center gap-1 hover:text-gray-700"
              >
                Document
                <i :class="getSortIcon('name')" class="text-xs"></i>
              </button>
              <span v-else>Document</span>
            </th>

            <!-- Project column (conditional) -->
            <th
              v-if="showProject"
              class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              <button
                v-if="sortable"
                @click="handleSort('project')"
                class="flex items-center gap-1 hover:text-gray-700"
              >
                Project
                <i :class="getSortIcon('project')" class="text-xs"></i>
              </button>
              <span v-else>Project</span>
            </th>

            <!-- Category column -->
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <button
                v-if="sortable"
                @click="handleSort('category')"
                class="flex items-center gap-1 hover:text-gray-700"
              >
                Category
                <i :class="getSortIcon('category')" class="text-xs"></i>
              </button>
              <span v-else>Category</span>
            </th>

            <!-- Status column -->
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <button
                v-if="sortable"
                @click="handleSort('status')"
                class="flex items-center gap-1 hover:text-gray-700"
              >
                Status
                <i :class="getSortIcon('status')" class="text-xs"></i>
              </button>
              <span v-else>Status</span>
            </th>

            <!-- Size column -->
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <button
                v-if="sortable"
                @click="handleSort('fileSize')"
                class="flex items-center gap-1 hover:text-gray-700"
              >
                Size
                <i :class="getSortIcon('fileSize')" class="text-xs"></i>
              </button>
              <span v-else>Size</span>
            </th>

            <!-- Upload Info column -->
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <button
                v-if="sortable"
                @click="handleSort('uploadedAt')"
                class="flex items-center gap-1 hover:text-gray-700"
              >
                Uploaded
                <i :class="getSortIcon('uploadedAt')" class="text-xs"></i>
              </button>
              <span v-else>Uploaded</span>
            </th>

            <!-- Custom columns slot -->
            <slot name="custom-headers" :handleSort="handleSort" :getSortIcon="getSortIcon" />

            <!-- Actions column -->
            <th
              v-if="showActions"
              class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Actions
            </th>
          </tr>
        </thead>

        <!-- Table Body -->
        <tbody class="bg-white divide-y divide-gray-200">
          <tr
            v-for="document in documents"
            :key="document.id"
            @click="handleRowClick(document)"
            class="hover:bg-gray-50 cursor-pointer transition-colors"
            :class="{ 'bg-primary-50': isSelected(document) }"
          >
            <!-- Selection column -->
            <td v-if="selectable" class="px-6 py-4 whitespace-nowrap w-12">
              <input
                type="checkbox"
                :checked="isSelected(document)"
                @change="toggleSelection(document)"
                @click.stop
                class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
            </td>

            <!-- Document column -->
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="flex items-center min-w-0">
                <i
                  :class="getDocumentIcon(document.name, document.category)"
                  class="text-xl text-gray-600 mr-3 flex-shrink-0"
                ></i>
                <div class="min-w-0 flex-1">
                  <div class="text-sm font-medium text-gray-900 truncate">
                    {{ document.name }}
                  </div>
                  <div class="text-sm text-gray-500">
                    Version {{ document.version || 1 }}
                    <span v-if="document.description && showDescription" class="ml-2 italic">
                      {{ truncateText(document.description, 50) }}
                    </span>
                  </div>
                </div>
              </div>
            </td>

            <!-- Project column (conditional) -->
            <td v-if="showProject" class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm text-gray-900 truncate max-w-xs">
                {{ getProjectName(document.projectId) }}
              </div>
            </td>

            <!-- Category column -->
            <td class="px-6 py-4 whitespace-nowrap">
              <span
                class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full"
                :class="getCategoryBadgeClass(document.category)"
              >
                {{ getCategoryLabel(document.category) }}
              </span>
            </td>

            <!-- Status column -->
            <td class="px-6 py-4 whitespace-nowrap">
              <DocumentStatusBadge :status="document.status" />
            </td>

            <!-- Size column -->
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {{ formatFileSize(document.fileSize) }}
            </td>

            <!-- Upload Info column -->
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              <div>{{ formatDate(document.uploadedAt) }}</div>
              <div class="text-xs text-gray-400">
                by {{ document.uploadedByName || 'Unknown' }}
              </div>
            </td>

            <!-- Custom columns slot -->
            <slot name="custom-cells" :document="document" />

            <!-- Actions column -->
            <td v-if="showActions" class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
              <div class="flex justify-end gap-1">
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
                  v-if="showDriveLink"
                  @click.stop="handleAction('drive', document)"
                  icon="pi pi-external-link"
                  severity="secondary"
                  size="small"
                  text
                  v-tooltip.top="'Open in Drive'"
                />

                <!-- Custom action buttons slot -->
                <slot name="actions" :document="document" :handleAction="handleAction" />

                <Button
                  v-if="canEdit(document)"
                  @click.stop="handleAction('edit', document)"
                  icon="pi pi-pencil"
                  severity="secondary"
                  size="small"
                  text
                  v-tooltip.top="'Edit'"
                />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Empty state -->
    <div v-if="documents.length === 0" class="p-12">
      <slot name="empty">
        <div class="text-center">
          <i class="pi pi-file text-4xl text-gray-400 mb-4"></i>
          <h3 class="text-lg font-medium text-gray-900 mb-2">No documents found</h3>
          <p class="text-gray-500">No documents match your current criteria.</p>
        </div>
      </slot>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Button } from 'primevue'
import { DOCUMENT_CATEGORIES, getDocumentIcon } from '@/constants/documentCategories'
import DocumentStatusBadge from '@/components/features/documents/DocumentStatusBadge.vue'
import { formatFileSize, formatDate } from '@/utils/index'

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
    default: false
  },
  showActions: {
    type: Boolean,
    default: true
  },
  showDriveLink: {
    type: Boolean,
    default: true
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

  // Sorting
  sortField: {
    type: String,
    default: ''
  },
  sortOrder: {
    type: String,
    default: 'asc',
    validator: (value) => ['asc', 'desc'].includes(value)
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
  }
})

// Emits
const emit = defineEmits([
  'document-click',
  'document-action',
  'document-select',
  'select-all',
  'sort-change'
])

// Selection computed
const allSelected = computed(() => {
  return props.documents.length > 0 && props.selectedDocuments.length === props.documents.length
})

const someSelected = computed(() => {
  return props.selectedDocuments.length > 0 && props.selectedDocuments.length < props.documents.length
})

// Helper functions
const getCategoryLabel = (category) => {
  const config = DOCUMENT_CATEGORIES[category]
  return config ? config.label : (category || 'Uncategorized')
}

const getCategoryBadgeClass = (category) => {
  // You can customize these colors based on category
  const colorMap = {
    contracts: 'bg-green-100 text-green-800',
    permits: 'bg-red-100 text-red-800',
    plans: 'bg-blue-100 text-blue-800',
    photos: 'bg-orange-100 text-orange-800',
    reports: 'bg-purple-100 text-purple-800'
  }
  return colorMap[category] || 'bg-gray-100 text-gray-800'
}

const getProjectName = (projectId) => {
  if (!props.showProject) return ''

  const project = props.projects.find(p => p.id === projectId)
  return project ? `${project.jobNumber} - ${project.name}` : 'Unknown Project'
}

const truncateText = (text, maxLength) => {
  if (!text || text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

const isSelected = (document) => {
  return props.selectedDocuments.some(doc => doc.id === document.id)
}

const getSortIcon = (field) => {
  if (props.sortField !== field) return 'pi pi-sort text-gray-300'
  return props.sortOrder === 'asc' ? 'pi pi-sort-up' : 'pi pi-sort-down'
}

// Event handlers
const handleRowClick = (document) => {
  emit('document-click', document)
}

const handleAction = (action, document) => {
  emit('document-action', { action, document })
}

const toggleSelection = (document) => {
  emit('document-select', document)
}

const toggleSelectAll = () => {
  emit('select-all', !allSelected.value)
}

const handleSort = (field) => {
  const newOrder = props.sortField === field && props.sortOrder === 'asc' ? 'desc' : 'asc'
  emit('sort-change', { field, order: newOrder })
}
</script>

<style scoped>
/* Ensure table is responsive */
.min-w-full {
  min-width: 100%;
}

/* Custom styling for selected rows */
.bg-primary-50 {
  --tw-bg-opacity: 1;
  background-color: rgb(239 246 255 / var(--tw-bg-opacity));
}
</style>
