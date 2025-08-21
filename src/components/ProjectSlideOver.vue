<template>
  <div>
    <!-- Slide-Over Panel -->
    <div
      class="fixed inset-y-0 right-0 z-40 transform transition-transform duration-300 ease-in-out"
      :class="[
        isOpen ? 'translate-x-0' : 'translate-x-full',
        'w-full sm:w-96 lg:w-[32rem]'
      ]"
    >
      <div class="h-full bg-white border-l border-gray-200 shadow-xl flex flex-col">
        <!-- Header -->
        <div class="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 pt-5rem">
          <h3 class="text-lg font-semibold text-gray-900">{{props.project?.id ? 'Edit Project' : 'New Project'}}</h3>
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
              <label class="block text-sm font-medium text-gray-700 mb-1">Client *</label>
              <Select
                v-model="form.clientId"
                :options="clientOptions"
                option-label="label"
                option-value="value"
                placeholder="Select a client"
                class="w-full text-sm"
                :class="{ 'border-red-500': errors.clientId }"
                filter
                show-clear
              />
              <span v-if="errors.clientId" class="text-red-500 text-xs mt-1">{{ errors.clientId }}</span>
              <small class="text-gray-500 text-xs">
                Don't see your client?
                <Button
                  @click="openCreateClient"
                  label="Add new client"
                  size="small"
                  text
                  class="!p-0 !h-auto text-xs underline text-blue-600 hover:text-blue-700"
                />
              </small>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Architect</label>
              <InputText
                v-model="form.architect"
                class="w-full text-sm"
                placeholder="Enter architect name"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Project Manager</label>
              <InputText
                v-model="form.projectManager"
                class="w-full text-sm"
                placeholder="Enter project manager name"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Superintendent</label>
              <InputText
                v-model="form.superintendent"
                class="w-full text-sm"
                placeholder="Enter superintendent name"
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
                <DatePicker
                  v-model="form.startDate"
                  class="w-full text-sm"
                  placeholder="Select start date"
                  date-format="mm/dd/yy"
                  show-icon
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <DatePicker
                  v-model="form.endDate"
                  class="w-full text-sm"
                  placeholder="Select end date"
                  date-format="mm/dd/yy"
                  show-icon
                />
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <Textarea
                v-model="form.address"
                rows="2"
                class="w-full text-sm"
                placeholder="Enter project address"
              />
            </div>

            <div>
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
              label="Save"
              size="small"
              @click="handleSubmit"
              :loading="loading"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Overlay -->
    <div
      v-if="isOpen"
      class="fixed inset-0 z-30 transition-opacity duration-300"
      style="background-color: rgba(107, 114, 128, 0.1);"
      @click="closeSlideOver"
    ></div>

    <!-- Nested client slide over (Higher z-index) -->
    <ClientSlideOver
      :visible="showCreateClient"
      @update:visible="handleClientModalVisibility"
      @client-created="handleClientCreated"
    />
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Select from 'primevue/select'
import InputNumber from 'primevue/inputnumber'
import Checkbox from 'primevue/checkbox'
import DatePicker from 'primevue/datepicker'
import Button from 'primevue/button'
import firebaseService from '@/firebaseService'
import ClientSlideOver from './ClientSlideOver.vue'

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
const emit = defineEmits(['update:visible', 'project-updated'])

// Reactive state
const loading = ref(false)
const error = ref('')
const success = ref('')
const errors = ref({})
const clients = ref([])
const showCreateClient = ref(false)

// Computed
const isOpen = computed(() => props.visible)

const clientOptions = computed(() => {
  return clients.value
    .filter(client => client.name)
    .map(client => ({
      label: `${client.name}${client.company ? ` (${client.company})` : ''}`,
      value: client.id
    }))
})

// Form data
const form = ref({
  name: '',
  jobNumber: '',
  clientId: '',
  architect: '',
  projectManager: '',
  superintendent: '',
  phase: 'pre-construction',
  cost: null,
  contractSigned: false,
  startDate: null,
  endDate: null,
  address: '',
  description: ''
})

// Phase options
const phaseOptions = [
  { label: 'Pre-Construction', value: 'pre-construction' },
  { label: 'Construction', value: 'construction' },
  { label: 'Close-Out', value: 'close-out' },
  { label: 'Complete', value: 'complete' }
]

// Load project data into form
const loadProjectData = () => {
  if (props.project && props.project.id) {
    form.value = {
      name: props.project.name || '',
      jobNumber: props.project.jobNumber || '',
      client: props.project.clientId || '',
      architect: props.project.architect || '',
      projectManager: props.project.projectManager || '',
      superintendent: props.project.superintendent || '',
      phase: props.project.phase || 'pre-construction',
      cost: props.project.cost || null,
      contractSigned: props.project.contractSigned || false,
      startDate: props.project.startDate ? new Date(props.project.startDate) : null,
      endDate: props.project.endDate ? new Date(props.project.endDate) : null,
      address: props.project.address || '',
      description: props.project.description || ''
    }
  }
}

// Load Client data
const loadClients = async () => {
  try {
    const clientData = await firebaseService.getAllClients()
    clients.value = clientData
    console.log('Loaded clients for project form:', clientData)
  } catch(err) {
    console.error('Error loading clients:', err.message)
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

  if(!form.value.clientId) {
    errors.value.clientId = 'Client is required'
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
      client: form.value.clientId?.trim() || '',
      architect: form.value.architect?.trim() || '',
      projectManager: form.value.projectManager?.trim() || '',
      superintendent: form.value.superintendent?.trim() || '',
      phase: form.value.phase,
      cost: form.value.cost || 0,
      contractSigned: form.value.contractSigned,
      startDate: form.value.startDate ? form.value.startDate.toISOString() : null,
      endDate: form.value.endDate ? form.value.endDate.toISOString() : null,
      address: form.value.address?.trim() || '',
      description: form.value.description?.trim() || '',
      updatedAt: new Date().toISOString()
    }

    let newProject

    if (props.project?.id) {
      await firebaseService.updateProject(props.project.id, projectData)
      success.value = 'Project updated successfully'
    } else {
      newProject = await firebaseService.createProject(projectData)
      success.value = 'Project created successfully'
    }

    emit('project-updated', props.project?.id ? { ...props.project, ...projectData} : newProject)

    // Close slide-over after a brief delay
    setTimeout(() => {
      closeSlideOver()
    }, 1500)

  } catch (err) {
    console.error('Error updating project:', err)
    error.value = err.message || 'Failed to update project'
  } finally {
    loading.value = false
  }
}

const openCreateClient = () => {
  showCreateClient.value = true
}

const handleClientModalVisibility = (visible) => {
  showCreateClient.value = visible
}

const handleClientCreated = (newClient) => {
  // Add to client list
  clients.value.unshift(newClient)

  // Select new client in form
  form.value.clientId = newClient.id

  // Close the client modal
  showCreateClient.value = false
}

// Close slide-over
const closeSlideOver = () => {
  emit('update:visible', false)
  error.value = ''
  success.value = ''
}

// Watch for visibility changes
watch(() => props.visible, (newVal) => {
  if (newVal) {
    loadClients()
    loadProjectData()
  }
})

watch(() => props.project, () => {
  if (props.visible) {
    loadProjectData()
  }
}, { deep: true })
</script>

<style scoped>
/* Make sure client slide over is on top */
:deep(.ClientSlideOver) {
  z-index: 50;
}
</style>
