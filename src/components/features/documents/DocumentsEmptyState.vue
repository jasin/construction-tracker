<!-- src/components/features/documents/DocumentsEmptyState.vue -->
<template>
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
    <div class="flex gap-2 justify-center">
      <Button
        v-if="hasActiveFilters"
        @click="$emit('clear-filters')"
        label="Clear All Filters"
        severity="secondary"
        icon="pi pi-times"
      />
      <Button
        v-if="canUpload && !searchQuery && !hasActiveFilters"
        @click="$emit('upload')"
        label="Upload Document"
        icon="pi pi-upload"
      />
    </div>
  </div>
</template>

<script setup>
import { Button } from 'primevue'

defineProps({
  searchQuery: String,
  hasActiveFilters: Boolean,
  canUpload: Boolean,
})

defineEmits(['clear-filters', 'upload'])
</script>
