<template>
  <Dialog
    :visible="visible"
    @update:visible="$emit('update:visible', $event)"
    :modal="true"
    :closable="true"
    :draggable="false"
    class="w-full max-w-2xl"
    :header="isEditing ? 'Edit RFI' : 'Create New RFI'"
  >
    <form @submit.prevent="handleSubmit" class="space-y-6">
      <!-- RFI Number -->
      <div v-if="isEditing">
        <label class="block text-sm font-medium text-gray-700 mb-1">RFI Number</label>
        <InputText
          :model-value="form.number"
          disabled
          class="w-full bg-gray-50"
        />
      </div>

      <!-- Title -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Title <span class="text-red-500">*</span>
        </label>
        <InputText
          v-model="form.title"
          placeholder="Brief description of the RFI"
          class="w-full"
          :class="{ 'border-red-500': errors.title }"
        />
        <small v-if="errors.title" class="text-red-500">{{ errors.title }}</small>
      </div>

      <!-- Description -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Description <span class="text-red-500">*</span>
        </label>
        <Textarea
          v-model="form.description"
          placeholder="Detailed description of the request for information..."
          rows="4"
          class="w-full"
          :class="{ 'border-red-500': errors.description }"
        />
        <small v-if="errors.description" class="text-red-500">{{ errors.description }}</small>
      </div>

      <!-- Priority and Status Row -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Priority</label>
          <Select
            v-model="form.priority"
            :options="priorityOptions"
            option-label="label"
            option-value="value"
            placeholder="Select priority"
            class="w-full"
          />
        </div>
        <div v-if="isEditing">
          <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <Select
            v-model="form.status"
            :options="statusOptions"
            option-label="label"
            option-value="value"
            placeholder="Select status"
            class="w-full"
          />
        </div>
      </div>

      <!-- Assignment and Due Date Row -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
          <Select
            v-model="form.assignedTo"
            :options="userOptions"
            option-label="label"
            option-value="value"
            placeholder="Select assignee"
            class="w-full"
            filter
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
          <DatePicker
            v-model="form.dueDate"
            placeholder="Select due date"
            class="w-full"
            show-icon
            :min-date="new Date()"
          />
        </div>
      </div>

      <!-- Trade/Location Row -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Trade</label>
          <InputText
            v-model="form.trade"
            placeholder="e.g., Electrical, Plumbing, HVAC"
            class="w-full"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Location</label>
          <InputText
            v-model="form.location"
            placeholder="e.g., Building A, Floor 2"
            class="w-full"
          />
        </div>
      </div>

      <!-- Response Section (for editing existing RFIs) -->
      <div v-if="isEditing && canAddResponse">
        <label class="block text-sm font-medium text-gray-700 mb-1">Response</label>
        <Textarea
          v-model="form.response"
          placeholder="Response to the RFI..."
          rows="3"
          class="w-full"
        />
      </div>

      <!-- Error Message -->
      <Message v-if="generalError" severity="error" :closable="false">
        {{ generalError }}
      </Message>

      <!-- Form Actions -->
      <div class="flex justify-end gap-3 pt-4 border-t">
        <Button
          @click="$emit('update:visible', false)"
          label="Cancel"
          severity="secondary"
          :disabled="loading"
        />
        <Button
          type="submit"
          :label="isEditing ? 'Update RFI' : 'Create RFI'"
          :loading="loading"
        />
      </div>
    </form>
  </Dialog>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import {
  Dialog,
  InputText,
  Textarea,
  Select,
  DatePicker,
  Button,
  Message
} from 'primevue'
import RFIRepository from '@/services/firebase/Repositories/RFIRepository'
import UserRepository from '@/services/firebase/Repositories/UserRepository'

// Props
const props = defineProps({
  visible: Boolean,
  projectId: String,
  rfi: {
    type: Object,
    default: null
  }
})

// Emits
const emit = defineEmits(['update:visible', 'rfi-saved'])

// State
const loading = ref(false)
const users = ref([])
const generalError = ref('')
const errors = ref({})

// Form data
const form = ref({
  title: '',
  description: '',
  priority: 'medium',
  status: 'draft',
  assignedTo: null,
  dueDate: null,
  trade: '',
  location: '',
  response: ''
})

// Computed
const isEditing = computed(() => !!props.rfi)

const canAddResponse = computed(() => {
  return isEditing.value && ['submitted', 'under_review'].includes(form.value.status)
})

const userOptions = computed(() =>
  users.value.map(user => ({
    label: user.name || user.email,
    value: user.id
  }))
)

const priorityOptions = [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
  { label: 'Urgent', value: 'urgent' }
]

const statusOptions = [
  { label: 'Draft', value: 'draft' },
  { label: 'Submitted', value: 'submitted' },
  { label: 'Under Review', value: 'under_review' },
  { label: 'Responded', value: 'responded' },
  { label: 'Closed', value: 'closed' }
]

// Methods
const resetForm = () => {
  form.value = {
    title: '',
    description: '',
    priority: 'medium',
    status: 'draft',
    assignedTo: null,
    dueDate: null,
    trade: '',
    location: '',
    response: ''
  }
  errors.value = {}
  generalError.value = ''
}

const populateForm = () => {
  if (props.rfi) {
    form.value = {
      title: props.rfi.title || '',
      description: props.rfi.description || '',
      priority: props.rfi.priority || 'medium',
      status: props.rfi.status || 'draft',
      assignedTo: props.rfi.assignedTo || null,
      dueDate: props.rfi.dueDate ? new Date(props.rfi.dueDate) : null,
      trade: props.rfi.trade || '',
      location: props.rfi.location || '',
      response: props.rfi.response || '',
      number: props.rfi.number || ''
    }
  }
}

const validateForm = () => {
  errors.value = {}

  if (!form.value.title.trim()) {
    errors.value.title = 'Title is required'
  }

  if (!form.value.description.trim()) {
    errors.value.description = 'Description is required'
  }

  return Object.keys(errors.value).length === 0
}

const handleSubmit = async () => {
  if (!validateForm()) return

  try {
    loading.value = true
    generalError.value = ''

    const rfiData = {
      title: form.value.title.trim(),
      description: form.value.description.trim(),
      priority: form.value.priority,
      assignedTo: form.value.assignedTo,
      dueDate: form.value.dueDate ? form.value.dueDate.toISOString() : null,
      trade: form.value.trade.trim() || null,
      location: form.value.location.trim() || null
    }

    let savedRFI

    if (isEditing.value) {
      // Update existing RFI
      const updates = {
        ...rfiData,
        status: form.value.status
      }

      // If adding a response
      if (form.value.response && form.value.response.trim()) {
        updates.response = form.value.response.trim()
        updates.status = 'responded'
      }

      await RFIRepository.updateRFI(props.rfi.id, updates)
      savedRFI = { ...props.rfi, ...updates }
    } else {
      // Create new RFI
      savedRFI = await RFIRepository.createRFI({
        ...rfiData,
        projectId: props.projectId
      })
    }

    emit('rfi-saved', savedRFI)
    emit('update:visible', false)
    resetForm()

  } catch (error) {
    console.error('Error saving RFI:', error)
    generalError.value = error.message || 'Failed to save RFI'
  } finally {
    loading.value = false
  }
}

const loadUsers = async () => {
  try {
    users.value = await UserRepository.getActiveUsers()
  } catch (error) {
    console.error('Error loading users:', error)
  }
}

// Watchers
watch(() => props.visible, (newVisible) => {
  if (newVisible) {
    if (props.rfi) {
      populateForm()
    } else {
      resetForm()
    }
  }
})

// Lifecycle
onMounted(() => {
  loadUsers()
})
</script>
