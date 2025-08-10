<template>
  <Dialog
    :visible="visible"
    @update:visible="$emit('update:visible', $event)"
    modal
    header="Create New Project"
    :style="{ width: '32rem' }"
  >
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Project Name *</label>
        <InputText
          v-model="form.name"
          class="w-full"
          placeholder="Enter project name"
          :class="{ 'border-red-500': errors.name }"
        />
        <span v-if="errors.name" class="text-red-500 text-xs mt-1">{{ errors.name }}</span>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Job Number *</label>
        <InputText
          v-model="form.jobNumber"
          class="w-full"
          placeholder="Enter job number"
          :class="{ 'border-red-500': errors.jobNumber }"
        />
        <span v-if="errors.jobNumber" class="text-red-500 text-xs mt-1">{{ errors.jobNumber }}</span>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Client</label>
        <InputText
          v-model="form.client"
          class="w-full"
          placeholder="Enter client name"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Phase</label>
        <Select
          v-model="form.phase"
          :options="phaseOptions"
          option-label="label"
          option-value="value"
          placeholder="Select phase"
          class="w-full"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Project Cost</label>
        <InputNumber
          v-model="form.cost"
          mode="currency"
          currency="USD"
          locale="en-US"
          class="w-full"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <Textarea
          v-model="form.description"
          rows="3"
          class="w-full"
          placeholder="Enter project description"
        />
      </div>

      <!-- Error Message -->
      <div v-if="error" class="rounded-md bg-red-50 p-4">
        <p class="text-sm text-red-800">{{ error }}</p>
      </div>

      <!-- Success Message -->
      <div v-if="success" class="rounded-md bg-green-50 p-4">
        <p class="text-sm text-green-800">{{ success }}</p>
      </div>
    </form>

    <template #footer>
      <Button
        label="Cancel"
        severity="secondary"
        @click="closeModal"
        :disabled="loading"
      />
      <Button
        label="Create Project"
        @click="handleSubmit"
        :loading="loading"
      />
    </template>
  </Dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import InputNumber from 'primevue/inputnumber'
import Textarea from 'primevue/textarea'
import Button from 'primevue/button'
import firebaseService from '@/firebaseService'

// Props
const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits(['update:visible', 'project-created'])

// Reactive state
const loading = ref(false)
const error = ref('')
const success = ref('')
const errors = ref({})

// Form data
const form = ref({
  name: '',
  jobNumber: '',
  client: '',
  phase: 'pre-construction',
  cost: null,
  description: ''
})

// Phase options
const phaseOptions = [
  { label: 'Pre-Construction', value: 'pre-construction' },
  { label: 'Construction', value: 'construction' },
  { label: 'Close-Out', value: 'close-out' },
  { label: 'Complete', value: 'complete' }
]

// Validation
const validateForm = () => {
  errors.value = {}

  if (!form.value.name?.trim()) {
    errors.value.name = 'Project name is required'
  }

  if (!form.value.jobNumber?.trim()) {
    errors.value.jobNumber = 'Job number is required'
  }

  return Object.keys(errors.value).length === 0
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
    const projectData = {
      name: form.value.name.trim(),
      jobNumber: form.value.jobNumber.trim(),
      client: form.value.client?.trim() || '',
      phase: form.value.phase,
      cost: form.value.cost || 0,
      description: form.value.description?.trim() || '',
      contractSigned: false,
      startDate: null,
      endDate: null,
      status: 'active'
    }

    const newProject = await firebaseService.createProject(projectData)

    success.value = 'Project created successfully!'
    emit('project-created', newProject)

    // Close modal after a brief delay
    setTimeout(() => {
      closeModal()
    }, 1500)

  } catch (err) {
    console.error('Error creating project:', err)
    error.value = err.message || 'Failed to create project'
  } finally {
    loading.value = false
  }
}

// Close modal and reset form
const closeModal = () => {
  emit('update:visible', false)
  resetForm()
}

// Reset form
const resetForm = () => {
  form.value = {
    name: '',
    jobNumber: '',
    client: '',
    phase: 'pre-construction',
    cost: null,
    description: ''
  }
  errors.value = {}
  error.value = ''
  success.value = ''
}

// Watch for modal visibility changes
watch(() => props.visible, (newVal) => {
  if (newVal) {
    resetForm()
  }
})
</script>
