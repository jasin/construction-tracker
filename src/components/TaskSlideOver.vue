<template>
  <div>
    <!-- Slide-Over Panel -->
    <div
      class="fixed inset-y-0 right-0 z-40 transform transition-transform duration-300 ease-in-out"
      :class="[
        isOpen ? 'translate-x-0' : 'translate-x-full',
        'w-full sm:w-96 lg:w-[28rem]'
      ]"
    >
      <div class="h-full bg-white border-l border-gray-200 shadow-xl flex flex-col">
        <!-- Header -->
        <div class="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <h3 class="text-lg font-semibold text-gray-900">
            {{ isEditing ? 'Edit Task' : 'Add New Task' }}
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
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Task Title *</label>
              <InputText
                v-model="form.title"
                class="w-full text-sm"
                placeholder="Enter task title"
                :class="{ 'border-red-500': errors.title }"
              />
              <span v-if="errors.title" class="text-red-500 text-xs mt-1">{{ errors.title }}</span>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <Textarea
                v-model="form.description"
                rows="3"
                class="w-full text-sm"
                placeholder="Enter task description"
              />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <Select
                  v-model="form.priority"
                  :options="priorityOptions"
                  option-label="label"
                  option-value="value"
                  placeholder="Select priority"
                  class="w-full text-sm"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <Select
                  v-model="form.status"
                  :options="statusOptions"
                  option-label="label"
                  option-value="value"
                  placeholder="Select status"
                  class="w-full text-sm"
                />
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
              <Select
                v-model="form.assignedTo"
                :options="userOptions"
                option-label="label"
                option-value="value"
                placeholder="Select assignee"
                class="w-full text-sm"
                filter
              />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <DatePicker
                  v-model="form.dueDate"
                  class="w-full text-sm"
                  placeholder="Select due date"
                  date-format="mm/dd/yy"
                  show-icon
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Estimated Hours</label>
                <InputNumber
                  v-model="form.estimatedHours"
                  mode="decimal"
                  :min="0"
                  :max-fraction-digits="2"
                  class="w-full text-sm"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <Select
                v-model="form.category"
                :options="categoryOptions"
                option-label="label"
                option-value="value"
                placeholder="Select category"
                class="w-full text-sm"
              />
            </div>

            <!-- Dependencies -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Dependencies</label>
              <MultiSelect
                v-model="form.dependencies"
                :options="availableTasks"
                option-label="title"
                option-value="id"
                placeholder="Select dependent tasks"
                class="w-full text-sm"
                display="chip"
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
              :label="isEditing ? 'Update Task' : 'Create Task'"
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
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Select from 'primevue/select'
import MultiSelect from 'primevue/multiselect'
import DatePicker from 'primevue/datepicker'
import InputNumber from 'primevue/inputnumber'
import Button from 'primevue/button'
import firebaseService from '@/firebaseService'

// Props
const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  task: {
    type: Object,
    default: null
  },
  projectId: {
    type: String,
    required: true
  },
  availableTasks: {
    type: Array,
    default: () => []
  }
})

// Emits
const emit = defineEmits(['update:visible', 'task-created', 'task-updated'])

// Reactive state
const loading = ref(false)
const error = ref('')
const success = ref('')
const errors = ref({})

// Computed
const isOpen = computed(() => props.visible)
const isEditing = computed(() => !!(props.task && props.task.id))

// Form data
const form = ref({
  title: '',
  description: '',
  priority: 'medium',
  status: 'todo',
  assignedTo: '',
  dueDate: null,
  estimatedHours: null,
  category: '',
  dependencies: []
})

// Options
const priorityOptions = [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
  { label: 'Critical', value: 'critical' }
]

const statusOptions = [
  { label: 'To Do', value: 'todo' },
  { label: 'In Progress', value: 'in-progress' },
  { label: 'Review', value: 'review' },
  { label: 'Complete', value: 'complete' },
  { label: 'On Hold', value: 'on-hold' }
]

const categoryOptions = [
  { label: 'Planning', value: 'planning' },
  { label: 'Design', value: 'design' },
  { label: 'Construction', value: 'construction' },
  { label: 'Inspection', value: 'inspection' },
  { label: 'Documentation', value: 'documentation' },
  { label: 'Administrative', value: 'administrative' }
]

// TODO: Load from user management system
const userOptions = [
  { label: 'John Smith', value: 'user1' },
  { label: 'Jane Doe', value: 'user2' },
  { label: 'Mike Johnson', value: 'user3' }
]

// Load task data into form (for editing)
const loadTaskData = () => {
  if (isEditing.value) {
    form.value = {
      title: props.task.title || '',
      description: props.task.description || '',
      priority: props.task.priority || 'medium',
      status: props.task.status || 'todo',
      assignedTo: props.task.assignedTo || '',
      dueDate: props.task.dueDate ? new Date(props.task.dueDate) : null,
      estimatedHours: props.task.estimatedHours || null,
      category: props.task.category || '',
      dependencies: props.task.dependencies || []
    }
  } else {
    resetForm()
  }
}

// Validation
const validateForm = () => {
  errors.value = {}

  if (!form.value.title?.trim()) {
    errors.value.title = 'Task title is required'
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
    const taskData = {
      title: form.value.title.trim(),
      description: form.value.description?.trim() || '',
      priority: form.value.priority,
      status: form.value.status,
      assignedTo: form.value.assignedTo || null,
      dueDate: form.value.dueDate ? form.value.dueDate.toISOString() : null,
      estimatedHours: form.value.estimatedHours || 0,
      category: form.value.category || '',
      dependencies: form.value.dependencies || [],
      projectId: props.projectId
    }

    if (isEditing.value) {
      // Update existing task
      const updates = {
        ...taskData,
        updatedAt: new Date().toISOString()
      }

      await firebaseService.updateTask(props.task.id, updates)
      success.value = 'Task updated successfully!'
      emit('task-updated', { ...props.task, ...updates })
    } else {
      // Create new task
      const newTask = await firebaseService.createTask(taskData)
      success.value = 'Task created successfully!'
      emit('task-created', newTask)
    }

    // Close slide-over after a brief delay
    setTimeout(() => {
      closeSlideOver()
    }, 1500)

  } catch (err) {
    console.error('Error saving task:', err)
    error.value = err.message || `Failed to ${isEditing.value ? 'update' : 'create'} task`
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
    title: '',
    description: '',
    priority: 'medium',
    status: 'todo',
    assignedTo: '',
    dueDate: null,
    estimatedHours: null,
    category: '',
    dependencies: []
  }
  errors.value = {}
  error.value = ''
  success.value = ''
}

// Watch for visibility changes
watch(() => props.visible, (newVal) => {
  if (newVal) {
    loadTaskData()
  }
})

watch(() => props.task, () => {
  if (props.visible) {
    loadTaskData()
  }
}, { deep: true })
</script>

<style scoped>
/* Responsive width classes are handled in template */
</style>
