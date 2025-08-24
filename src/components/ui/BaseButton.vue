<template>
  <button
    :class="buttonClasses"
    :disabled="disabled || loading"
    v-bind="$attrs"
    @click="$emit('click', $event)"
  >
    <i v-if="loading" class="pi pi-spin pi-spinner mr-2"></i>
    <i v-else-if="icon" :class="icon" class="mr-2"></i>
    <slot />
  </button>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  variant: {
    type: String,
    default: 'primary',
    validator: (value) => ['primary', 'secondary', 'success', 'warning', 'danger'].includes(value)
  },
  size: {
    type: String,
    default: 'medium',
    validator: (value) => ['small', 'medium', 'large'].includes(value)
  },
  disabled: {
    type: Boolean,
    default: false
  },
  loading: {
    type: Boolean,
    default: false
  },
  icon: {
    type: String,
    default: ''
  },
  outlined: {
    type: Boolean,
    default: false
  }
})

defineEmits(['click'])

const buttonClasses = computed(() => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200'

  const sizeClasses = {
    small: 'px-3 py-1.5 text-sm',
    medium: 'px-4 py-2 text-sm',
    large: 'px-6 py-3 text-base'
  }

  const variantClasses = {
    primary: props.outlined
      ? 'bg-transparent border border-blue-600 text-blue-600 hover:bg-blue-50'
      : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: props.outlined
      ? 'bg-transparent border border-gray-600 text-gray-600 hover:bg-gray-50'
      : 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500',
    success: props.outlined
      ? 'bg-transparent border border-green-600 text-green-600 hover:bg-green-50'
      : 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
    warning: props.outlined
      ? 'bg-transparent border border-yellow-600 text-yellow-600 hover:bg-yellow-50'
      : 'bg-yellow-600 text-white hover:bg-yellow-700 focus:ring-yellow-500',
    danger: props.outlined
      ? 'bg-transparent border border-red-600 text-red-600 hover:bg-red-50'
      : 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
  }

  const disabledClasses = 'opacity-50 cursor-not-allowed'

  return [
    baseClasses,
    sizeClasses[props.size],
    variantClasses[props.variant],
    (props.disabled || props.loading) && disabledClasses
  ].filter(Boolean).join(' ')
})
</script>