<template>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
    <div
      v-for="document in documents"
      :key="document.id"
      @click="handleDocumentClick(document)"
      class="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 cursor-pointer transition-all p-4"
      :class="{ 'ring-2 ring-primary-500': isSelected(document) }"
    >
      <!-- Document Header -->
      <div class="flex items-start justify-between mb-3">
        <div class="flex items-center gap-2 flex-1 min-w-0">
          <i
            :class="getDocumentIcon(document.name, document.category)"
            class="text-xl text-gray-600 flex-shrink-0"
          ></i>
          <div class="flex-1 min-w-0">
            <!-- Project Info - Job Number and Name -->
            <div
              class="text-xs text-gray-600 font-medium mb-1 truncate"
              :title="getProjectName(document.projectId)"
            >
              {{ getProjectName(document.projectId) }}
            </div>
            <!-- Document Name -->
            <h3 class="font-medium text-gray-900 truncate text-sm" :title="document.name">
              {{ document.name }}
            </h3>
          </div>
        </div>
        <DocumentStatusBadge :status="document.status" size="small" />
      </div>

      <!-- Notes - More prominent -->
      <div
        v-if="document.notes"
        class="mb-3 text-sm text-gray-700 line-clamp-2"
        :title="document.notes"
      >
        <span class="text-xs font-semibold text-gray-600">Notes:</span> {{ document.notes }}
      </div>

      <!-- Document Meta -->
      <div class="space-y-2">
        <!-- Category, Version, and Size -->
        <div class="flex items-center justify-between text-xs text-gray-500">
          <span class="flex items-center gap-1.5">
            <span>{{ getCategoryLabel(document.category) }}</span>
            <span class="text-gray-400">•</span>
            <span>v{{ document.version || 1 }}</span>
          </span>
          <span>{{ formatFileSize(document.fileSize) }}</span>
        </div>

        <!-- Uploader and Date -->
        <div class="flex items-center justify-between text-xs text-gray-500">
          <span class="truncate">{{ document.uploadedByName || 'Unknown' }}</span>
          <span class="flex-shrink-0 ml-2">{{ formatDate(document.uploadedAt) }}</span>
        </div>

        <!-- Tags -->
        <div
          v-if="document.tags && document.tags.length > 0 && showTags"
          class="flex flex-wrap gap-1"
        >
          <span
            v-for="tag in document.tags.slice(0, maxVisibleTags)"
            :key="tag"
            class="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded"
          >
            {{ tag }}
          </span>
          <span v-if="document.tags.length > maxVisibleTags" class="text-xs text-gray-500 px-1">
            +{{ document.tags.length - maxVisibleTags }}
          </span>
        </div>

        <!-- Custom metadata slot -->
        <div v-if="$slots.metadata" class="text-xs">
          <slot name="metadata" :document="document" />
        </div>
      </div>

      <!-- Quick Actions -->
      <div v-if="showActions" class="flex gap-1 mt-3 pt-3 border-t border-gray-100">
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
    </div>

    <!-- Empty state slot -->
    <div v-if="documents.length === 0" class="col-span-full">
      <slot name="empty">
        <div class="text-center py-12">
          <i class="pi pi-file text-4xl text-gray-400 mb-4"></i>
          <h3 class="text-lg font-medium text-gray-900 mb-2">No documents found</h3>
          <p class="text-gray-500">No documents match your current criteria.</p>
        </div>
      </slot>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { Button } from 'primevue';
import { DOCUMENT_CATEGORIES, getDocumentIcon } from '@/constants/documentCategories';
import DocumentStatusBadge from '@/components/features/documents/DocumentStatusBadge.vue';
import { formatFileSize, formatDate } from '@/utils/index';

// Props
const props = defineProps({
  // Required
  documents: {
    type: Array,
    required: true,
  },

  // Display options
  showProject: {
    type: Boolean,
    default: false,
  },
  showDescription: {
    type: Boolean,
    default: true,
  },
  showTags: {
    type: Boolean,
    default: true,
  },
  showActions: {
    type: Boolean,
    default: true,
  },
  showDriveLink: {
    type: Boolean,
    default: true,
  },
  showFileExtension: {
    type: Boolean,
    default: false,
  },

  // Configuration
  maxVisibleTags: {
    type: Number,
    default: 3,
  },

  // Selection
  selectedDocuments: {
    type: Array,
    default: () => [],
  },

  // Data mappings (for cross-app compatibility)
  projects: {
    type: Array,
    default: () => [],
  },

  // Permission functions
  canEdit: {
    type: Function,
    default: () => true,
  },
});

// Emits
const emit = defineEmits(['document-click', 'document-action', 'document-select']);

// Helper functions
const getCategoryLabel = (category) => {
  const config = DOCUMENT_CATEGORIES[category];
  return config ? config.label : category || 'Uncategorized';
};

const getProjectName = (projectId) => {
  const project = props.projects.find((p) => p.id === projectId);
  if (!project) return 'Unknown Project';

  return `${project.jobNumber} - ${project.name}`;
};

const getFileExtension = (filename) => {
  if (!filename) return '';
  return filename.split('.').pop().toUpperCase();
};

const isSelected = (document) => {
  return props.selectedDocuments.some((doc) => doc.id === document.id);
};

// Event handlers
const handleDocumentClick = (document) => {
  emit('document-click', document);
};

const handleAction = (action, document) => {
  emit('document-action', { action, document });
};
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
