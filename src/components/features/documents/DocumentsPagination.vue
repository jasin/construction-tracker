<template>
  <div class="flex justify-between items-center mt-6">
    <div class="text-sm text-gray-700">
      Showing {{ (currentPage - 1) * pageSize + 1 }} to
      {{ Math.min(currentPage * pageSize, totalDocuments) }} of {{ totalDocuments }} results
    </div>
    <Paginator
      :first="(currentPage - 1) * pageSize"
      :rows="pageSize"
      :total-records="totalDocuments"
      :rows-per-page-options="[10, 25, 50, 100]"
      @page="$emit('page-change', $event)"
    />
  </div>
</template>

<script setup>
import { Paginator } from 'primevue'

defineProps({
  currentPage: Number,
  pageSize: Number,
  totalDocuments: Number,
  paginatedDocuments: Array,
})

defineEmits(['page-change'])
</script>
