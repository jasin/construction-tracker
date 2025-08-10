<template>
  <Dialog
    :visible="visible"
    @update:visible="$emit('update:visible', $event)"
    modal
    :header="isEditing ? 'Edit Project' : 'Create New Project'"
    :style="{ width: '32rem' }"
  >
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Project Name *</label>
        <InputText
          v-model="form.name"
          class="w-full text-sm"
          placeholder="Enter project name"
          :class="{ 'border-red-500': errors.name }"
        />
        <span v-if="errors.name" class="text-red-500 text-xs mt-1">{{ errors.name }}</span>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Job Number *</label>
        <InputText
          v-model="form.jobNumber"
          class="w-full text-sm"
          placeholder="Enter job number"
          :class="{ 'border-red-500': errors.jobNumber }"
        />
        <span v-if="errors.jobNumber" class="text-red-500 text-xs mt-1">{{ errors.jobNumber }}</span>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Client</label>
        <InputText
          v-model="form.client"
          class="w-full text-sm"
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
          class="w-full text-sm"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Project Cost</label>
        <InputNumber
          v-model="form.cost"
          mode="currency"
          currency="USD"
          locale="en-US"
          class="w-full text-sm"
        />
      </div>

      <div class="flex items-center space-x-2">
        <Checkbox
          v-model="form.contractSigned"
          binary
          input-id="contract-signed"
        />
        <label for="contract-signed" class="text-sm font-medium text-gray-700">
          Contract Signed
        </label>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
          <Calendar
            v-model="form.startDate"
            class="w-full text-sm"
            placeholder="Select start date"
            date-format="mm/dd/yy"
            show-icon
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">End Date</label>
          <Calendar
            v-model="form.endDate"
            class="w-full text-sm"
            placeholder="Select end date"
            date-format="mm/dd/yy"
            show-icon
          />
        </div>
      </div>

      <!-- Extended fields for new projects -->
      <div v-if="!isEditing">
        <label class="block text-sm font-medium text-gray-700 mb-1">Architect</label>
        <InputText
          v-model="form.architect"
          class="w-full text-sm"
          placeholder="Enter architect name"
        />
      </div>

      <div v-if="!isEditing">
        <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <Textarea
          v-model="form.description"
          rows="3"
          class="w-full text-sm"
          placeholder="Enter project description"
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

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button
          label="Cancel"
          severity="secondary"
          size="small"
          @click="closeModal"
          :disabled="loading"
        />
        <Button
          :label="isEditing ? 'Save Changes' : 'Create Project'"
          size="small"
          @click="handleSubmit"
          :loading="loading"
        />
      </div>
    </template>
  </Dialog>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import InputNumber from 'primevue/inputnumber'
import Checkbox from 'primevue/checkbox'
import Calendar from 'primevue/calendar'
import Textarea from 'primevue/textarea'
import Button from 'primevue/button'
import firebaseService from '@/firebaseService'

// Props
const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  project: {
    type: Object,
    default: null
  }
})

// Emits
const emit = defineEmits(['update:visible', 'project-created', 'project-updated'])

// Reactive state
const loading = ref(false)
const error = ref('')
const success = ref('')
const errors = ref({})

// Computed
const isEditing = computed(() => !!(props.project && props.project.id))

// Form data
const form = ref({
  name: '',
  jobNumber: '',
  client: '',
  phase: 'pre-construction',
  cost: null,
  contractSigned: false,
  startDate: null,
  endDate: null,
  architect: '',
  description: ''
})

// Phase options
const phaseOptions = [
  { label: 'Pre-Construction', value: 'pre-construction' },
  { label: 'Construction', value: 'construction' },
  { label: 'Close-Out', value: 'close-out' },
  { label: 'Complete', value: 'complete' }
]

// Load project data into form (for editing)
const loadProjectData = () => {
  if (isEditing.value) {
    form.value = {
      name: props.project.name || '',
      jobNumber: props.project.jobNumber || '',
      client: props.project.client || '',
      phase: props.project.phase || 'pre-construction',
      cost: props.project.cost || null,
      contractSigned: props.project.contractSigned || false,
      startDate: props.project.startDate ? new Date(props.project.startDate) : null,
      endDate: props.project.endDate ? new Date(props.project.endDate) : null,
      architect: props.project.architect || '',
      description: props.project.description || ''
    }
  } else {
    resetForm()
  }
}

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
      contractSigned: form.value.contractSigned,
      startDate: form.value.startDate ? form.value.startDate.toISOString() : null,
      endDate: form.value.endDate ? form.value.endDate.toISOString() : null,
      architect: form.value.architect?.trim() || '',
      description: form.value.description?.trim() || ''
    }

    if (isEditing.value) {
      // Update existing project
      const updates = {
        ...projectData,
        updatedAt: new Date().toISOString()
      }

      await firebaseService.updateProject(props.project.id, updates)
      success.value = 'Project updated successfully!'
      emit('project-updated', { ...props.project, ...updates })
    } else {
      // Create new project
      const newProjectData = {
        ...projectData,
        status: 'active'
      }

      const newProject = await firebaseService.createProject(newProjectData)
      success.value = 'Project created successfully!'
      emit('project-created', newProject)
    }

    // Close modal after a brief delay
    setTimeout(() => {
      closeModal()
    }, 1500)

  } catch (err) {
    console.error('Error saving project:', err)
    error.value = err.message || `Failed to ${isEditing.value ? 'update' : 'create'} project`
  } finally {
    loading.value = false
  }
}

// Close modal and reset
const closeModal = () => {
  emit('update:visible', false)
  error.value = ''
  success.value = ''
}

// Reset form
const resetForm = () => {
  form.value = {
    name: '',
    jobNumber: '',
    client: '',
    phase: 'pre-construction',
    cost: null,
    contractSigned: false,
    startDate: null,
    endDate: null,
    architect: '',
    description: ''
  }
  errors.value = {}
  error.value = ''
  success.value = ''
}

// Watch for modal visibility and project changes
watch(() => props.visible, (newVal) => {
  if (newVal) {
    loadProjectData()
  }
})

watch(() => props.project, () => {
  if (props.visible) {
    loadProjectData()
  }
}, { deep: true })
</script>
