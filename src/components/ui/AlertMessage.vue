<!-- src/components/ui/AlertMessage.vue -->
<template>
  <div v-if="message" :class="alertClasses">
    <div class="flex">
      <i :class="iconClass"></i>
      <div class="ml-3">
        <p :class="textClasses">{{ message }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  message: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    default: 'error',
    validator: (value) => ['error', 'success', 'warning', 'info'].includes(value)
  }
})

const alertClasses = computed(() => {
  const base = 'rounded-md p-4'
  const types = {
    error: 'bg-red-50',
    success: 'bg-green-50',
    warning: 'bg-yellow-50',
    info: 'bg-blue-50'
  }
  return `${base} ${types[props.type]}`
})

const textClasses = computed(() => {
  const types = {
    error: 'text-sm text-red-800',
    success: 'text-sm text-green-800',
    warning: 'text-sm text-yellow-800',
    info: 'text-sm text-blue-800'
  }
  return types[props.type]
})

const iconClass = computed(() => {
  const base = 'h-5 w-5 flex-shrink-0'
  const types = {
    error: 'pi pi-times-circle text-red-400',
    success: 'pi pi-check-circle text-green-400',
    warning: 'pi pi-exclamation-triangle text-yellow-400',
    info: 'pi pi-info-circle text-blue-400'
  }
  return `${base} ${types[props.type]}`
})
</script>
