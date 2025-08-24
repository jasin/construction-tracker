<template>
  <div class="bg-gray-50 rounded-lg border border-gray-200 p-4">
    <!-- Filter Header -->
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-3">
        <h3 class="text-sm font-semibold text-gray-900">
          {{ title }}
        </h3>
        <span v-if="activeFilterCount > 0" class="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded-full">
          {{ activeFilterCount }} active
        </span>
      </div>

      <div class="flex items-center gap-2">
        <Button
          v-if="activeFilterCount > 0"
          @click="clearAllFilters"
          label="Clear All"
          size="small"
          text
          icon="pi pi-times"
        />
        <Button
          @click="toggleExpanded"
          :icon="expanded ? 'pi pi-chevron-up' : 'pi pi-chevron-down'"
          :label="expanded ? 'Hide' : 'Show'"
          severity="secondary"
          size="small"
          text
        />
      </div>
    </div>

    <!-- Filter Content -->
    <div v-show="expanded" class="space-y-4">
      <!-- Dynamic Filter Grid -->
      <div :class="gridClass">
        <!-- Text Search Filter -->
        <div
          v-for="filter in textFilters"
          :key="filter.field"
          class="space-y-1"
        >
          <label class="block text-xs font-medium text-gray-700">
            {{ filter.label }}
            <span v-if="filter.required" class="text-red-500">*</span>
          </label>
          <InputText
            :model-value="getFilterValue(filter.field)"
            @update:model-value="updateFilter(filter.field, $event)"
            :placeholder="filter.placeholder || `Search ${filter.label.toLowerCase()}...`"
            class="w-full text-sm"
            :disabled="filter.disabled"
          />
          <small v-if="filter.description" class="text-gray-500">{{ filter.description }}</small>
        </div>

        <!-- Multi-Select Filters -->
        <div
          v-for="filter in multiSelectFilters"
          :key="filter.field"
          class="space-y-1"
        >
          <label class="block text-xs font-medium text-gray-700">
            {{ filter.label }}
            <span v-if="filter.required" class="text-red-500">*</span>
          </label>
          <MultiSelect
            :model-value="getFilterValue(filter.field)"
            @update:model-value="updateFilter(filter.field, $event)"
            :options="filter.options"
            :option-label="filter.optionLabel || 'label'"
            :option-value="filter.optionValue || 'value'"
            :placeholder="filter.placeholder || `Select ${filter.label.toLowerCase()}`"
            class="w-full text-sm"
            display="chip"
            :max-selected-labels="filter.maxSelectedLabels || 2"
            :disabled="filter.disabled"
            :filter="filter.searchable !== false"
            :show-clear="!filter.required"
          />
          <small v-if="filter.description" class="text-gray-500">{{ filter.description }}</small>
        </div>

        <!-- Single Select Filters -->
        <div
          v-for="filter in selectFilters"
          :key="filter.field"
          class="space-y-1"
        >
          <label class="block text-xs font-medium text-gray-700">
            {{ filter.label }}
            <span v-if="filter.required" class="text-red-500">*</span>
          </label>
          <Select
            :model-value="getFilterValue(filter.field)"
            @update:model-value="updateFilter(filter.field, $event)"
            :options="filter.options"
            :option-label="filter.optionLabel || 'label'"
            :option-value="filter.optionValue || 'value'"
            :placeholder="filter.placeholder || `Select ${filter.label.toLowerCase()}`"
            class="w-full text-sm"
            :disabled="filter.disabled"
            :show-clear="!filter.required"
          />
          <small v-if="filter.description" class="text-gray-500">{{ filter.description }}</small>
        </div>

        <!-- Date Range Filters -->
        <div
          v-for="filter in dateRangeFilters"
          :key="filter.field"
          class="space-y-1"
        >
          <label class="block text-xs font-medium text-gray-700">
            {{ filter.label }}
            <span v-if="filter.required" class="text-red-500">*</span>
          </label>
          <DatePicker
            :model-value="getFilterValue(filter.field)"
            @update:model-value="updateFilter(filter.field, $event)"
            selection-mode="range"
            class="w-full text-sm"
            :placeholder="filter.placeholder || 'Select date range'"
            show-icon
            :date-format="filter.dateFormat || 'mm/dd/yy'"
            :disabled="filter.disabled"
            :show-clear="!filter.required"
          />
          <small v-if="filter.description" class="text-gray-500">{{ filter.description }}</small>
        </div>

        <!-- Date Filters (Single Date) -->
        <div
          v-for="filter in dateFilters"
          :key="filter.field"
          class="space-y-1"
        >
          <label class="block text-xs font-medium text-gray-700">
            {{ filter.label }}
            <span v-if="filter.required" class="text-red-500">*</span>
          </label>
          <DatePicker
            :model-value="getFilterValue(filter.field)"
            @update:model-value="updateFilter(filter.field, $event)"
            class="w-full text-sm"
            :placeholder="filter.placeholder || 'Select date'"
            show-icon
            :date-format="filter.dateFormat || 'mm/dd/yy'"
            :disabled="filter.disabled"
            :show-clear="!filter.required"
          />
          <small v-if="filter.description" class="text-gray-500">{{ filter.description }}</small>
        </div>

        <!-- Number Range Filters -->
        <div
          v-for="filter in numberRangeFilters"
          :key="filter.field"
          class="space-y-1"
        >
          <label class="block text-xs font-medium text-gray-700">
            {{ filter.label }}
            <span v-if="filter.required" class="text-red-500">*</span>
          </label>
          <div class="flex gap-2">
            <InputNumber
              :model-value="getFilterValue(filter.field)?.min"
              @update:model-value="updateNumberRange(filter.field, 'min', $event)"
              :placeholder="filter.minPlaceholder || 'Min'"
              class="flex-1 text-sm"
              :min="filter.min"
              :max="filter.max"
              :step="filter.step || 1"
              :disabled="filter.disabled"
            />
            <span class="self-center text-gray-500">to</span>
            <InputNumber
              :model-value="getFilterValue(filter.field)?.max"
              @update:model-value="updateNumberRange(filter.field, 'max', $event)"
              :placeholder="filter.maxPlaceholder || 'Max'"
              class="flex-1 text-sm"
              :min="filter.min"
              :max="filter.max"
              :step="filter.step || 1"
              :disabled="filter.disabled"
            />
          </div>
          <small v-if="filter.description" class="text-gray-500">{{ filter.description }}</small>
        </div>

        <!-- Chips/Tags Filters -->
        <div
          v-for="filter in chipsFilters"
          :key="filter.field"
          class="space-y-1"
        >
          <label class="block text-xs font-medium text-gray-700">
            {{ filter.label }}
            <span v-if="filter.required" class="text-red-500">*</span>
          </label>
          <Chips
            :model-value="getFilterValue(filter.field)"
            @update:model-value="updateFilter(filter.field, $event)"
            :placeholder="filter.placeholder || `Add ${filter.label.toLowerCase()}`"
            class="w-full text-sm"
            :disabled="filter.disabled"
            :allow-duplicate="filter.allowDuplicate || false"
          />
          <small v-if="filter.description" class="text-gray-500">{{ filter.description }}</small>
        </div>

        <!-- Boolean/Toggle Filters -->
        <div
          v-for="filter in booleanFilters"
          :key="filter.field"
          class="space-y-1"
        >
          <div class="flex items-center gap-2">
            <Checkbox
              :model-value="getFilterValue(filter.field)"
              @update:model-value="updateFilter(filter.field, $event)"
              :input-id="filter.field"
              :binary="true"
              :disabled="filter.disabled"
            />
            <label :for="filter.field" class="text-xs font-medium text-gray-700">
              {{ filter.label }}
              <span v-if="filter.required" class="text-red-500">*</span>
            </label>
          </div>
          <small v-if="filter.description" class="text-gray-500">{{ filter.description }}</small>
        </div>

        <!-- Custom Filter Slots -->
        <div
          v-for="filter in customFilters"
          :key="filter.field"
          class="space-y-1"
        >
          <label v-if="filter.label" class="block text-xs font-medium text-gray-700">
            {{ filter.label }}
            <span v-if="filter.required" class="text-red-500">*</span>
          </label>
          <slot
            :name="`filter-${filter.field}`"
            :filter="filter"
            :value="getFilterValue(filter.field)"
            :updateFilter="(value) => updateFilter(filter.field, value)"
          />
          <small v-if="filter.description" class="text-gray-500">{{ filter.description }}</small>
        </div>
      </div>

      <!-- Quick Filter Buttons -->
      <div v-if="quickFilters && quickFilters.length > 0" class="pt-4 border-t border-gray-200">
        <div class="flex items-center gap-2 mb-2">
          <span class="text-xs font-medium text-gray-700">Quick Filters:</span>
        </div>
        <div class="flex flex-wrap gap-2">
          <Button
            v-for="quickFilter in quickFilters"
            :key="quickFilter.key"
            @click="applyQuickFilter(quickFilter)"
            :label="quickFilter.label"
            :severity="quickFilter.severity || 'secondary'"
            size="small"
            outlined
            :icon="quickFilter.icon"
          />
        </div>
      </div>

      <!-- Custom Footer Slot -->
      <div v-if="$slots.footer" class="pt-4 border-t border-gray-200">
        <slot name="footer" :activeFilters="activeFilters" :clearAllFilters="clearAllFilters" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import {
  Button,
  InputText,
  MultiSelect,
  Select,
  DatePicker,
  InputNumber,
  Chips,
  Checkbox
} from 'primevue'

// Props
const props = defineProps({
  // Required
  modelValue: {
    type: Object,
    required: true
  },

  // Configuration
  title: {
    type: String,
    default: 'Advanced Filters'
  },
  expanded: {
    type: Boolean,
    default: false
  },
  columns: {
    type: Number,
    default: 4,
    validator: value => value >= 1 && value <= 6
  },

  // Filter Definitions
  filters: {
    type: Array,
    default: () => [],
    validator: (filters) => {
      return filters.every(filter =>
        filter.field &&
        filter.type &&
        ['text', 'multiselect', 'select', 'daterange', 'date', 'numberrange', 'chips', 'boolean', 'custom'].includes(filter.type)
      )
    }
  },

  // Quick Filter Buttons
  quickFilters: {
    type: Array,
    default: () => []
  },

  // Behavior
  debounce: {
    type: Number,
    default: 300
  }
})

// Emits
const emit = defineEmits([
  'update:modelValue',
  'filter-change',
  'quick-filter',
  'clear-filters'
])

// Reactive state
const expanded = ref(props.expanded)

// Computed
const gridClass = computed(() => {
  const cols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
    6: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6'
  }
  return `grid gap-4 ${cols[props.columns]}`
})

// Filter type computed arrays with null safety
const textFilters = computed(() =>
  props.filters?.filter(f => f.type === 'text') || []
)

const multiSelectFilters = computed(() =>
  props.filters?.filter(f => f.type === 'multiselect') || []
)

const selectFilters = computed(() =>
  props.filters?.filter(f => f.type === 'select') || []
)

const dateRangeFilters = computed(() =>
  props.filters?.filter(f => f.type === 'daterange') || []
)

const dateFilters = computed(() =>
  props.filters?.filter(f => f.type === 'date') || []
)

const numberRangeFilters = computed(() =>
  props.filters?.filter(f => f.type === 'numberrange') || []
)

const chipsFilters = computed(() =>
  props.filters?.filter(f => f.type === 'chips') || []
)

const booleanFilters = computed(() =>
  props.filters?.filter(f => f.type === 'boolean') || []
)

const customFilters = computed(() =>
  props.filters?.filter(f => f.type === 'custom') || []
)

const activeFilters = computed(() => {
  if (!props.modelValue) return {}

  const active = {}
  Object.entries(props.modelValue).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      if (Array.isArray(value) && value.length > 0) {
        active[key] = value
      } else if (!Array.isArray(value) && value !== '') {
        active[key] = value
      }
    }
  })
  return active
})

const activeFilterCount = computed(() =>
  Object.keys(activeFilters.value).length
)

// Methods
const getFilterValue = (field) => {
  return props.modelValue?.[field]
}

const updateFilter = (field, value) => {
  const newFilters = {
    ...props.modelValue,
    [field]: value
  }
  emit('update:modelValue', newFilters)
  emit('filter-change', { field, value, allFilters: newFilters })
}

const updateNumberRange = (field, type, value) => {
  const currentRange = props.modelValue?.[field] || {}
  const newRange = {
    ...currentRange,
    [type]: value
  }
  updateFilter(field, newRange)
}

const toggleExpanded = () => {
  expanded.value = !expanded.value
}

const clearAllFilters = () => {
  const clearedFilters = {}
  props.filters?.forEach(filter => {
    switch (filter.type) {
      case 'multiselect':
      case 'chips':
        clearedFilters[filter.field] = []
        break
      case 'boolean':
        clearedFilters[filter.field] = false
        break
      case 'numberrange':
        clearedFilters[filter.field] = { min: null, max: null }
        break
      default:
        clearedFilters[filter.field] = null
    }
  })

  emit('update:modelValue', clearedFilters)
  emit('clear-filters')
}

const applyQuickFilter = (quickFilter) => {
  if (quickFilter.filters) {
    const newFilters = {
      ...props.modelValue,
      ...quickFilter.filters
    }
    emit('update:modelValue', newFilters)
  }
  emit('quick-filter', quickFilter)
}

// Watch for external expanded changes
watch(() => props.expanded, (newVal) => {
  expanded.value = newVal
})
</script>

<style scoped>
/* Custom styling for the filter component */
</style>
