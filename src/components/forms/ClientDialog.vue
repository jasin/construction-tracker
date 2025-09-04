<template>
  <Dialog
    v-model:visible="isOpen"
    modal
    :header="props.client?.id ? 'Edit Client' : 'New Client'"
    :style="{ width: '50vw' }"
    @hide="closeModal"
  >
    <div class="flex-1 overflow-y-auto p-4">
      <form @submit.prevent="handleSubmit" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Name *</label>
          <InputText
            v-model="form.name"
            class="w-full text-sm"
            placeholder="Enter client name"
            :class="{ 'border-red-500': errors.name }"
          />
          <span v-if="errors.name" class="text-red-500 text-xs mt-1">{{ errors.name }}</span>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Company</label>
          <InputText
            v-model="form.company"
            class="w-full text-sm"
            placeholder="Enter company name"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Email *</label>
          <InputText
            v-model="form.email"
            class="w-full text-sm"
            placeholder="Enter email address"
            :class="{ 'border-red-500': errors.email }"
          />
          <span v-if="errors.email" class="text-red-500 text-xs mt-1">{{ errors.email }}</span>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Phone</label>
          <InputText v-model="form.phone" class="w-full text-sm" placeholder="Enter phone number" />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Address</label>
          <Textarea
            v-model="form.address"
            rows="2"
            class="w-full text-sm"
            placeholder="Enter address"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <Textarea
            v-model="form.notes"
            rows="3"
            class="w-full text-sm"
            placeholder="Enter any notes"
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

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button
          label="Cancel"
          severity="secondary"
          size="small"
          @click="closeModal"
          :disabled="loading"
        />
        <Button label="Save" size="small" @click="handleSubmit" :loading="loading" />
      </div>
    </template>
  </Dialog>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Button from 'primevue/button'
import ClientRepository from '@/services/firebase/Repositories/ClientRepository'

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
const isOpen = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value),
})

// Form data
const form = ref({
  name: '',
  company: '',
  email: '',
  phone: '',
  address: '',
  notes: '',
})

// Load client data into form
const loadClientData = () => {
  if (props.client && props.client.id) {
    form.value = {
      name: props.client.name || '',
      company: props.client.company || '',
      email: props.client.email || '',
      phone: props.client.phone || '',
      address: props.client.address || '',
      notes: props.client.notes || '',
    }
  } else {
    // Reset form for new client
    form.value = {
      name: '',
      company: '',
      email: '',
      phone: '',
      address: '',
      notes: '',
    }
  }
}

// Validation
const validateForm = () => {
  errors.value = {}

  if (!form.value.name?.trim()) {
    errors.value.name = 'Name is required'
  }

  if (!form.value.email?.trim()) {
    errors.value.email = 'Email is required'
  } else if (!isValidEmail(form.value.email)) {
    errors.value.email = 'Invalid email format'
  }

  return Object.keys(errors.value).length === 0
}

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
      email: form.value.email.trim(),
      phone: form.value.phone?.trim() || '',
      address: form.value.address?.trim() || '',
      notes: form.value.notes?.trim() || '',
      updatedAt: new Date().toISOString(),
    }

    let updatedClient

    if (props.client?.id) {
      await ClientRepository.updateClient(props.client.id, clientData)
      success.value = 'Client updated successfully'
      updatedClient = { id: props.client.id, ...clientData }
      emit('client-updated', updatedClient)
    } else {
      updatedClient = await ClientRepository.createClient(clientData)
      success.value = 'Client created successfully'
      emit('client-created', updatedClient)
    }

    // Close modal after a brief delay
    setTimeout(() => {
      closeModal()
    }, 1500)
  } catch (err) {
    console.error('Error saving client:', err)
    error.value = err.message || 'Failed to save client'
  } finally {
    loading.value = false
  }
}

// Close modal
const closeModal = () => {
  emit('update:visible', false)
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
/* Add any additional styles or rely on Tailwind */
</style>
