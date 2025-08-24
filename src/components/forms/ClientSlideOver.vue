<template>
  <div>
    <!-- Slide-Over Panel -->
    <div
      class="fixed inset-y-0 right-0 z-40 transform transition-transform duration-300 ease-in-out"
      :class="[isOpen ? 'translate-x-0' : 'translate-x-full', 'w-full sm:w-96 lg:w-[28rem]']"
    >
      <div class="h-full bg-white border-l border-gray-200 shadow-xl flex flex-col">
        <!-- Header -->
        <div class="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <h3 class="text-lg font-semibold text-gray-900">
            {{ isEditing ? 'Edit Client' : 'Add New Client' }}
          </h3>
          <Button
            @click="closeSlideOver"
            icon="pi pi-times"
            severity="secondary"
            size="small"
            text
          />
        </div>

        <!-- Form Content -->
        <div class="flex-1 overflow-y-auto p-4">
          <form @submit.prevent="handleSubmit" class="space-y-4">
            <!-- Client Name -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Client Name *</label>
              <InputText
                v-model="form.name"
                class="w-full text-sm"
                placeholder="Enter client name"
                :class="{ 'border-red-500': errors.name }"
              />
              <span v-if="errors.name" class="text-red-500 text-xs mt-1">{{ errors.name }}</span>
            </div>

            <!-- Company -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Company</label>
              <InputText
                v-model="form.company"
                class="w-full text-sm"
                placeholder="Enter company name"
              />
            </div>

            <!-- Email -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <InputText
                v-model="form.email"
                type="email"
                class="w-full text-sm"
                placeholder="Enter email address"
                :class="{ 'border-red-500': errors.email }"
              />
              <span v-if="errors.email" class="text-red-500 text-xs mt-1">{{ errors.email }}</span>
            </div>

            <!-- Phone -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <InputText
                v-model="form.phone"
                type="tel"
                class="w-full text-sm"
                placeholder="Enter phone number"
              />
            </div>

            <!-- Address -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <Textarea
                v-model="form.address"
                rows="3"
                class="w-full text-sm"
                placeholder="Enter full address"
              />
            </div>

            <!-- Notes -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <Textarea
                v-model="form.notes"
                rows="3"
                class="w-full text-sm"
                placeholder="Additional notes about this client"
              />
            </div>

            <!-- Error Message -->
            <div v-if="error" class="rounded-md bg-red-50 p-3">
              <p class="text-sm text-red-800">{{ error }}</p>
            </div>

            <!-- Success Message -->
            <div v-if="success" class="rounded-md bg-green-50 p-3">
              <p class="text-sm text-green-800">{{ success }}</p>
            </div>
          </form>
        </div>

        <!-- Footer Actions -->
        <div class="border-t border-gray-200 p-4 bg-gray-50">
          <div class="flex justify-end gap-2">
            <Button
              label="Cancel"
              severity="secondary"
              size="small"
              @click="closeSlideOver"
              :disabled="loading"
            />
            <Button
              :label="isEditing ? 'Update Client' : 'Create Client'"
              size="small"
              @click="handleSubmit"
              :loading="loading"
              :disabled="!isFormValid"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Overlay -->
    <div
      v-if="isOpen"
      class="fixed inset-0 z-30 transition-opacity duration-300"
      style="background-color: rgba(107, 114, 128, 0.1)"
      @click="closeSlideOver"
    ></div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Button from 'primevue/button'
import firebaseService from '@/services/firebase/firebaseService'

// Props
const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  client: {
    type: Object,
    default: null,
  },
})

// Emits
const emit = defineEmits(['update:visible', 'client-created', 'client-updated'])

// Reactive state
const loading = ref(false)
const error = ref('')
const success = ref('')
const errors = ref({})

// Computed
const isOpen = computed(() => props.visible)
const isEditing = computed(() => !!(props.client && props.client.id))

// Form data
const form = ref({
  name: '',
  company: '',
  email: '',
  phone: '',
  address: '',
  notes: '',
})

// Form validation
const isFormValid = computed(() => {
  return form.value.name.trim() && form.value.email.trim() && Object.keys(errors.value).length === 0
})

// Load client data into form (for editing)
const loadClientData = () => {
  if (isEditing.value && props.client) {
    form.value = {
      name: props.client.name || '',
      company: props.client.company || '',
      email: props.client.email || '',
      phone: props.client.phone || '',
      address: props.client.address || '',
      notes: props.client.notes || '',
    }
  } else {
    resetForm()
  }
}

// Validation
const validateForm = () => {
  errors.value = {}

  if (!form.value.name?.trim()) {
    errors.value.name = 'Client name is required'
  }

  if (!form.value.email?.trim()) {
    errors.value.email = 'Email is required'
  } else if (!isValidEmail(form.value.email)) {
    errors.value.email = 'Please enter a valid email address'
  }

  return Object.keys(errors.value).length === 0
}

// Simple email validation
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Handle form submission
const handleSubmit = async () => {
  if (!validateForm()) {
    return
  }

  loading.value = true
  error.value = ''
  success.value = ''

  try {
    const clientData = {
      name: form.value.name.trim(),
      company: form.value.company?.trim() || '',
      email: form.value.email.trim().toLowerCase(),
      phone: form.value.phone?.trim() || '',
      address: form.value.address?.trim() || '',
      notes: form.value.notes?.trim() || '',
    }

    if (isEditing.value) {
      // Update existing client
      const updates = {
        ...clientData,
        updatedAt: new Date().toISOString(),
      }

      await firebaseService.updateClient(props.client.id, updates)
      success.value = 'Client updated successfully!'
      emit('client-updated', { ...props.client, ...updates })
    } else {
      // Create new client
      const newClient = await firebaseService.createClient(clientData)
      success.value = 'Client created successfully!'
      emit('client-created', newClient)
    }

    // Close slide-over after a brief delay
    setTimeout(() => {
      closeSlideOver()
    }, 1500)
  } catch (err) {
    console.error('Error saving client:', err)
    error.value = err.message || `Failed to ${isEditing.value ? 'update' : 'create'} client`
  } finally {
    loading.value = false
  }
}

// Close slide-over
const closeSlideOver = () => {
  emit('update:visible', false)
  error.value = ''
  success.value = ''
}

// Reset form
const resetForm = () => {
  form.value = {
    name: '',
    company: '',
    email: '',
    phone: '',
    address: '',
    notes: '',
  }
  errors.value = {}
  error.value = ''
  success.value = ''
}

// Watch for visibility changes
watch(
  () => props.visible,
  (newVal) => {
    if (newVal) {
      loadClientData()
    }
  },
)

watch(
  () => props.client,
  () => {
    if (props.visible) {
      loadClientData()
    }
  },
  { deep: true },
)
</script>

<style scoped>
/* Responsive width classes are handled in template */
</style>
