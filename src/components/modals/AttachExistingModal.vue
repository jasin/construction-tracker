<template>
  <Dialog
    v-model:visible="isVisible"
    modal
    header="Attach Existing Documents"
    :style="{ width: '70rem' }"
    :breakpoints="{ '1199px': '85vw', '575px': '95vw' }"
    :closable="!processing"
  >
    <!-- Search and Filter Bar -->
    <div class="mb-4 space-y-3">
      <!-- Search Input -->
      <div class="flex gap-3">
        <div class="flex-1">
          <InputText
            v-model="searchQuery"
            placeholder="Search documents by name, description, or tags..."
            class="w-full"
            :disabled="loading"
          />
        </div>
        <Button
          @click="loadAvailableDocuments"
          icon="pi pi-refresh"
          severity="secondary"
          :loading="loading"
          v-tooltip.top="'Refresh'"
        />
      </div>

      <!-- Quick Filters -->
      <div class="flex flex-wrap gap-2">
        <Button
          v-for="filter in quickFilters"
          :key="filter.key"
          @click="applyQuickFilter(filter)"
          :label="filter.label"
          :severity="activeQuickFilter === filter.key ? 'primary' : 'secondary'"
          size="small"
          outlined
        />
        <Button
          v-if="activeQuickFilter"
          @click="clearQuickFilter"
          label="Clear Filter"
          severity="secondary"
          size="small"
          text
          icon="pi pi-times"
        />
      </div>
    </div>

    <!-- Selection Summary -->
    <div
      v-if="selectedDocuments.size > 0"
      class="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg"
    >
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <i class="pi pi-check-circle text-blue-600"></i>
          <span class="text-sm font-medium text-blue-900">
            {{ selectedDocuments.size }} document{{ selectedDocuments.size !== 1 ? 's' : '' }}
            selected
          </span>
          <span class="text-sm text-blue-700"> ({{ formatFileSize(selectedTotalSize) }}) </span>
        </div>
        <Button
          @click="clearSelection"
          label="Clear Selection"
          severity="secondary"
          size="small"
          text
        />
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center py-12">
      <div class="text-center">
        <ProgressSpinner />
        <p class="mt-3 text-gray-500">Loading available documents...</p>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="text-center py-8">
      <i class="pi pi-exclamation-triangle text-4xl text-red-400 mb-3"></i>
      <h3 class="text-lg font-medium text-gray-900 mb-2">Error Loading Documents</h3>
      <p class="text-red-600 mb-4">{{ error }}</p>
      <Button @click="loadAvailableDocuments" label="Try Again" severity="secondary" />
    </div>

    <!-- Empty State -->
    <div v-else-if="filteredDocuments.length === 0" class="text-center py-8">
      <i class="pi pi-search text-4xl text-gray-400 mb-3"></i>
      <h3 class="text-lg font-medium text-gray-900 mb-2">
        {{ searchQuery ? 'No documents found' : 'No available documents' }}
      </h3>
      <p class="text-gray-500">
        {{
          searchQuery
            ? 'Try adjusting your search terms or filters'
            : 'All project documents are already attached to this ' + formatEntityType(entityType)
        }}
      </p>
    </div>

    <!-- Document Selection Grid -->
    <div v-else class="max-h-96 overflow-y-auto">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <div
          v-for="document in filteredDocuments"
          :key="document.id"
          @click="toggleDocumentSelection(document)"
          class="relative p-3 border border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer transition-all"
          :class="{
            'border-blue-500 bg-blue-50': selectedDocuments.has(document.id),
            'hover:bg-gray-50': !selectedDocuments.has(document.id),
          }"
        >
          <!-- Selection Checkbox -->
          <div class="absolute top-2 right-2">
            <div
              class="w-5 h-5 rounded border-2 flex items-center justify-center transition-colors"
              :class="{
                'border-blue-500 bg-blue-500': selectedDocuments.has(document.id),
                'border-gray-300': !selectedDocuments.has(document.id),
              }"
            >
              <i
                v-if="selectedDocuments.has(document.id)"
                class="pi pi-check text-white text-xs"
              ></i>
            </div>
          </div>

          <!-- Document Info -->
          <div class="flex items-start gap-3 pr-8">
            <i
              :class="getDocumentIcon(document.name, document.category)"
              class="text-xl text-gray-600 shrink-0 mt-1"
            ></i>

            <div class="flex-1 min-w-0">
              <h4 class="font-medium text-gray-900 text-sm truncate" :title="document.name">
                {{ document.name }}
              </h4>
              <div class="flex items-center gap-2 mt-1">
                <DocumentStatusBadge :status="document.status" size="small" />
                <span class="text-xs text-gray-500"> v{{ document.version || 1 }} </span>
              </div>
              <div class="text-xs text-gray-500 mt-1">
                {{ getCategoryLabel(document.category) }} •
                {{ formatFileSize(document.fileSize) }} •
                {{ formatTimeAgo(document.uploadedAt) }}
              </div>
              <p v-if="document.description" class="text-xs text-gray-600 mt-1 line-clamp-2">
                {{ document.description }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer Actions -->
    <template #footer>
      <div class="flex justify-between items-center">
        <div class="text-sm text-gray-500">{{ filteredDocuments.length }} available documents</div>
        <div class="flex gap-2">
          <Button @click="closeModal" label="Cancel" severity="secondary" :disabled="processing" />
          <Button
            @click="attachSelectedDocuments"
            :label="`Attach ${selectedDocuments.size} Document${selectedDocuments.size !== 1 ? 's' : ''}`"
            :disabled="selectedDocuments.size === 0"
            :loading="processing"
          />
        </div>
      </div>
    </template>
  </Dialog>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { Dialog, Button, InputText, ProgressSpinner } from 'primevue';
import { DOCUMENT_CATEGORIES, getDocumentIcon } from '@/constants/documentCategories';
import DocumentStatusBadge from '@/components/features/documents/DocumentStatusBadge.vue';
import { getDocumentsByProject } from '@/services/api/documentsApi';
import { handleError } from '@/utils/errorHandler';
import { formatFileSize, formatTimeAgo } from '@/utils/index';

// Props
const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  projectId: {
    type: String,
    required: false,
    default: null,
  },
  entityType: {
    type: String,
    required: true,
    validator: (value) => ['rfi', 'submittal', 'changeOrder', 'task'].includes(value),
  },
  entityId: {
    type: String,
    required: true,
  },
  excludedDocumentIds: {
    type: Array,
    default: () => [],
  },
});

// Emits
const emit = defineEmits(['update:visible', 'documents-attached']);

// Reactive state
const loading = ref(false);
const processing = ref(false);
const error = ref('');
const searchQuery = ref('');
const activeQuickFilter = ref(null);
const allDocuments = ref([]);
const selectedDocuments = ref(new Set());

// Quick filters
const quickFilters = [
  { key: 'recent', label: 'Recent (7 days)', days: 7 },
  { key: 'approved', label: 'Approved Only', status: 'approved' },
  { key: 'large', label: 'Large Files (>5MB)', minSize: 5 * 1024 * 1024 },
  { key: 'images', label: 'Images', types: ['.jpg', '.jpeg', '.png', '.gif'] },
  { key: 'pdfs', label: 'PDFs', types: ['.pdf'] },
];

// Computed
const isVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value),
});

const availableDocuments = computed(() => {
  return allDocuments.value.filter(
    (doc) => !props.excludedDocumentIds.includes(doc.id) && !doc.linkedEntityId // Don't include documents that are already linked to entities
  );
});

const filteredDocuments = computed(() => {
  let docs = [...availableDocuments.value];

  // Apply search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    docs = docs.filter(
      (doc) =>
        doc.name?.toLowerCase().includes(query) ||
        doc.description?.toLowerCase().includes(query) ||
        doc.tags?.some((tag) => tag.toLowerCase().includes(query))
    );
  }

  // Apply quick filter
  if (activeQuickFilter.value) {
    const filter = quickFilters.find((f) => f.key === activeQuickFilter.value);
    if (filter) {
      if (filter.days) {
        const cutoff = new Date(Date.now() - filter.days * 24 * 60 * 60 * 1000);
        docs = docs.filter((doc) => new Date(doc.uploadedAt) > cutoff);
      }
      if (filter.status) {
        docs = docs.filter((doc) => doc.status === filter.status);
      }
      if (filter.minSize) {
        docs = docs.filter((doc) => (doc.fileSize || 0) > filter.minSize);
      }
      if (filter.types) {
        docs = docs.filter((doc) => {
          const ext = '.' + (doc.name?.split('.').pop()?.toLowerCase() || '');
          return filter.types.includes(ext);
        });
      }
    }
  }

  // Sort by upload date (newest first)
  return docs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
});

const selectedTotalSize = computed(() => {
  return Array.from(selectedDocuments.value).reduce((total, docId) => {
    const doc = allDocuments.value.find((d) => d.id === docId);
    return total + (doc?.fileSize || 0);
  }, 0);
});

// Methods
const loadAvailableDocuments = async () => {
  try {
    loading.value = true;
    error.value = '';

    const documents = await getDocumentsByProject(props.projectId);

    allDocuments.value = documents;
  } catch (err) {
    handleError(err, 'Failed to load documents');
    error.value = err.message || 'Failed to load documents';
  } finally {
    loading.value = false;
  }
};

const toggleDocumentSelection = (document) => {
  const newSelection = new Set(selectedDocuments.value);

  if (newSelection.has(document.id)) {
    newSelection.delete(document.id);
  } else {
    newSelection.add(document.id);
  }

  selectedDocuments.value = newSelection;
};

const clearSelection = () => {
  selectedDocuments.value = new Set();
};

const applyQuickFilter = (filter) => {
  if (activeQuickFilter.value === filter.key) {
    clearQuickFilter();
  } else {
    activeQuickFilter.value = filter.key;
  }
};

const clearQuickFilter = () => {
  activeQuickFilter.value = null;
};

const attachSelectedDocuments = async () => {
  if (selectedDocuments.value.size === 0) return;

  try {
    processing.value = true;

    const documentIds = Array.from(selectedDocuments.value);

    // Emit the selected document IDs back to parent
    emit('documents-attached', documentIds);

    // Close modal
    closeModal();
  } catch (err) {
    console.error('Error attaching documents:', err);
    error.value = err.message || 'Failed to attach documents';
  } finally {
    processing.value = false;
  }
};

const closeModal = () => {
  // Reset state
  selectedDocuments.value = new Set();
  searchQuery.value = '';
  activeQuickFilter.value = null;
  error.value = '';

  emit('update:visible', false);
};

// Helper methods
const formatEntityType = (type) => {
  const typeMap = {
    rfi: 'RFI',
    submittal: 'Submittal',
    changeOrder: 'Change Order',
  };
  return typeMap[type] || type;
};

const getCategoryLabel = (category) => {
  const config = DOCUMENT_CATEGORIES[category];
  return config ? config.label : category || 'Uncategorized';
};

// Lifecycle
onMounted(() => {
  if (props.visible) {
    loadAvailableDocuments();
  }
});

// Watch for visibility changes
watch(
  () => props.visible,
  (newVal) => {
    if (newVal) {
      loadAvailableDocuments();
    } else {
      // Reset when closing
      selectedDocuments.value = new Set();
      searchQuery.value = '';
      activeQuickFilter.value = null;
      error.value = '';
    }
  }
);

// Watch for excluded documents changes
watch(
  () => props.excludedDocumentIds,
  () => {
    // Clear selection of any now-excluded documents
    const newSelection = new Set();
    selectedDocuments.value.forEach((docId) => {
      if (!props.excludedDocumentIds.includes(docId)) {
        newSelection.add(docId);
      }
    });
    selectedDocuments.value = newSelection;
  },
  { deep: true }
);
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
