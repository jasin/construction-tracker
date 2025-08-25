<template>
  <div class="bg-white border-b border-gray-200 px-6 py-4">
    <!-- Main Search Bar -->
    <div class="flex gap-4 items-center mb-4">
      <div class="flex-1 relative">
        <i
          class="pi pi-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
        ></i>
        <InputText
          :model-value="searchQuery"
          @update:model-value="$emit('update:searchQuery', $event)"
          placeholder="Search documents, descriptions, tags, or content..."
          class="w-full pl-10 pr-4 py-3 text-lg"
        />
      </div>
      <Button
        @click="$emit('search')"
        icon="pi pi-search"
        label="Search"
        size="large"
        :loading="searching"
      />
      <Button
        @click="$emit('update:showAdvanced', !showAdvanced)"
        :icon="showAdvanced ? 'pi pi-filter-slash' : 'pi pi-filter'"
        :label="showAdvanced ? 'Hide Filters' : 'Show Filters'"
        severity="secondary"
        size="large"
      />
      <Button
        @click="$emit('clear-filters')"
        icon="pi pi-times"
        label="Clear"
        severity="secondary"
        size="large"
        v-show="hasActiveFilters"
      />
    </div>

    <!-- Advanced Filters -->
    <AdvancedFilters
      v-if="showAdvanced"
      :model-value="filters"
      @update:model-value="$emit('update:filters', $event)"
      title="Document Filters"
      :expanded="showAdvanced"
      :columns="4"
      :filters="filterConfig"
      :quick-filters="quickFilterConfig"
      @filter-change="$emit('filter-change', $event)"
      @clear-filters="$emit('clear-filters')"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Button, InputText } from 'primevue'
import AdvancedFilters from '@/components/widgets/AdvancedFilters.vue'

const props = defineProps({
  searchQuery: String,
  filters: Object,
  showAdvanced: Boolean,
  searching: Boolean,
  projects: Array,
  users: Array,
  filterConfig: Array,
  showProjectFilter: { type: Boolean, default: true },
})

defineEmits([
  'update:searchQuery',
  'update:filters',
  'update:showAdvanced',
  'search',
  'filter-change',
  'clear-filters',
])

const hasActiveFilters = computed(() => {
  return (
    Object.values(props.filters || {}).some((value) => {
      if (Array.isArray(value)) return value.length > 0
      if (typeof value === 'object' && value !== null) {
        return Object.values(value).some((v) => v !== null && v !== '')
      }
      return value !== null && value !== ''
    }) || !!props.searchQuery
  )
})

const quickFilterConfig = computed(() => [
  {
    key: 'recent',
    label: 'Recent (Last 7 days)',
    icon: 'pi pi-clock',
    filters: {
      dateRange: {
        from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        to: null,
      },
    },
  },
  {
    key: 'thisMonth',
    label: 'This Month',
    icon: 'pi pi-calendar',
    filters: {
      dateRange: {
        from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        to: null,
      },
    },
  },
  {
    key: 'large',
    label: 'Large Files (>10MB)',
    icon: 'pi pi-file',
    filters: { customFileSize: 'large' },
  },
])
</script>
