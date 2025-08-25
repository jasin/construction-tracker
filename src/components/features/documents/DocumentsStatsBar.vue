<template>
  <div class="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
    <div class="flex items-center justify-between text-sm">
      <div class="flex items-center gap-4">
        <span class="font-medium text-blue-900"> {{ searchStats.total }} documents found </span>
        <span class="text-blue-700"> Total size: {{ formatFileSize(searchStats.totalSize) }} </span>
        <span v-if="searchStats.projectCount > 1" class="text-blue-700">
          Across {{ searchStats.projectCount }} projects
        </span>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-blue-700">Sort:</span>
        <Select
          :model-value="sortOption"
          @update:model-value="$emit('sort-change', $event)"
          :options="sortOptions"
          option-label="label"
          option-value="value"
          class="w-40"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { Select } from 'primevue'
import { formatFileSize } from '@/utils/index'

defineProps({
  documents: Array,
  searchStats: Object,
  sortOption: String,
  sortOptions: Array,
})

defineEmits(['sort-change'])
</script>
