<template>
  <span
    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
    :class="badgeClasses"
  >
    <i v-if="showIcon" :class="iconClass" class="mr-1"></i>
    {{ statusLabel }}
  </span>
</template>

<script setup>
import { computed } from 'vue'

// Document status configuration
const DOCUMENT_STATUS = {
  draft: {
    label: 'Draft',
    color: '#6b7280',
    icon: 'pi pi-file',
  },
  pending: {
    label: 'Pending Review',
    color: '#eab308',
    icon: 'pi pi-clock',
  },
  review: {
    label: 'Under Review',
    color: '#3b82f6',
    icon: 'pi pi-eye',
  },
  approved: {
    label: 'Approved',
    color: '#059669',
    icon: 'pi pi-check',
  },
  rejected: {
    label: 'Rejected',
    color: '#dc2626',
    icon: 'pi pi-times',
  },
  superseded: {
    label: 'Superseded',
    color: '#6b7280',
    icon: 'pi pi-history',
  },
}

// Props
const props = defineProps({
  status: {
    type: String,
    required: true,
  },
  size: {
    type: String,
    default: 'normal', // 'small', 'normal', 'large'
    validator: (value) => ['small', 'normal', 'large'].includes(value),
  },
  showIcon: {
    type: Boolean,
    default: false,
  },
})

// Computed
const statusConfig = computed(() => {
  return DOCUMENT_STATUS[props.status] || DOCUMENT_STATUS.draft
})

const statusLabel = computed(() => {
  return statusConfig.value.label
})

const iconClass = computed(() => {
  return statusConfig.value.icon
})

const badgeClasses = computed(() => {
  const baseClasses = 'inline-flex items-center rounded-full font-medium'

  // Size classes
  const sizeClasses = {
    small: 'px-2 py-0.5 text-xs',
    normal: 'px-2.5 py-0.5 text-xs',
    large: 'px-3 py-1 text-sm',
  }

  // Status color classes
  const colorClasses = {
    draft: 'bg-gray-100 text-gray-800',
    pending: 'bg-yellow-100 text-yellow-800',
    review: 'bg-blue-100 text-blue-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    superseded: 'bg-gray-100 text-gray-800',
  }

  return [
    baseClasses,
    sizeClasses[props.size],
    colorClasses[props.status] || colorClasses.draft,
  ].join(' ')
})
</script>
