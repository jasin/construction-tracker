<template>
  <Dialog
    v-model:visible="isOpen"
    modal
    :header="props.task?.id ? 'Edit Task' : 'Create Task'"
    :style="{ width: '600px' }"
    @hide="closeModal"
  >
    <div class="task-dialog-content">
      <form @submit.prevent="handleSubmit" class="space-y-5">
        <!-- Task Type Selector (only for new tasks) -->
        <div v-if="!props.task?.id" class="task-type-selector">
          <label class="block text-sm font-semibold text-surface-900 mb-2">Task Type</label>
          <div class="grid grid-cols-2 gap-3">
            <div
              class="task-type-card"
              :class="{ active: taskType === 'quick' }"
              @click="taskType = 'quick'"
            >
              <i class="pi pi-check-circle text-xl mb-2"></i>
              <div class="font-medium">Quick Task</div>
              <div class="text-xs text-surface-600 mt-1">Simple to-do item</div>
            </div>
            <div
              class="task-type-card"
              :class="{ active: taskType === 'project' }"
              @click="taskType = 'project'"
            >
              <i class="pi pi-briefcase text-xl mb-2"></i>
              <div class="font-medium">Project Task</div>
              <div class="text-xs text-surface-600 mt-1">Detailed work item</div>
            </div>
          </div>
        </div>

        <!-- Title (Always shown) -->
        <div>
          <label class="block text-sm font-semibold text-surface-900 mb-2">
            Task Title <span class="text-red-500">*</span>
          </label>
          <InputText
            v-model="form.title"
            class="w-full"
            placeholder="What needs to be done?"
            :class="{ 'p-invalid': errors.title }"
            autofocus
          />
          <small v-if="errors.title" class="p-error">{{ errors.title }}</small>
        </div>

        <!-- Description (Always shown) -->
        <div>
          <label class="block text-sm font-semibold text-surface-900 mb-2">Description</label>
          <Textarea
            v-model="form.description"
            rows="3"
            class="w-full"
            placeholder="Add more details..."
          />
        </div>

        <!-- Quick Task Fields -->
        <template v-if="taskType === 'quick'">
          <div class="grid grid-cols-2 gap-4">
            <!-- Priority -->
            <div>
              <label class="block text-sm font-semibold text-surface-900 mb-2">Priority</label>
              <Select
                v-model="form.priority"
                :options="priorityOptions"
                option-label="label"
                option-value="value"
                placeholder="Select priority"
                class="w-full"
              />
            </div>

            <!-- Due Date -->
            <div>
              <label class="block text-sm font-semibold text-surface-900 mb-2">Due Date</label>
              <DatePicker
                v-model="form.dueDate"
                class="w-full"
                placeholder="Select date"
                date-format="mm/dd/yy"
                show-icon
              />
            </div>
          </div>

          <!-- Assigned To (Auto-assigned to current user) -->
          <div class="bg-surface-50 border border-surface-200 rounded-lg p-3">
            <div class="flex items-center gap-2 text-surface-700">
              <i class="pi pi-user text-lg"></i>
              <div>
                <div class="text-sm font-medium">Assigned to you</div>
                <div class="text-xs text-surface-600">
                  Quick tasks are automatically assigned to the creator
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- Project Task Fields -->
        <template v-if="taskType === 'project'">
          <!-- Project Selection -->
          <div>
            <label class="block text-sm font-semibold text-surface-900 mb-2">
              Project <span class="text-red-500">*</span>
            </label>
            <Select
              v-model="form.projectId"
              :options="projectOptions"
              option-label="label"
              option-value="value"
              placeholder="Select project"
              class="w-full"
              :class="{ 'p-invalid': errors.projectId }"
            />
            <small v-if="errors.projectId" class="p-error">{{ errors.projectId }}</small>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <!-- Priority -->
            <div>
              <label class="block text-sm font-semibold text-surface-900 mb-2">Priority</label>
              <Select
                v-model="form.priority"
                :options="priorityOptions"
                option-label="label"
                option-value="value"
                placeholder="Select priority"
                class="w-full"
              >
                <template #value="slotProps">
                  <div v-if="slotProps.value" class="flex align-items-center">
                    <Tag
                      :value="getPriorityLabel(slotProps.value)"
                      :severity="getPrioritySeverity(slotProps.value)"
                    />
                  </div>
                  <span v-else>{{ slotProps.placeholder }}</span>
                </template>
                <template #option="slotProps">
                  <Tag
                    :value="slotProps.option.label"
                    :severity="getPrioritySeverity(slotProps.option.value)"
                  />
                </template>
              </Select>
            </div>

            <!-- Status -->
            <div>
              <label class="block text-sm font-semibold text-surface-900 mb-2">Status</label>
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

          <!-- Assigned To & Category -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-semibold text-surface-900 mb-2">Assign To</label>
              <Select
                v-model="form.assignedTo"
                :options="userOptions"
                option-label="label"
                option-value="value"
                placeholder="Select team member"
                class="w-full"
                :filter="true"
                show-clear
              />
            </div>

            <div>
              <label class="block text-sm font-semibold text-surface-900 mb-2">Category</label>
              <Select
                v-model="form.category"
                :options="categoryOptions"
                option-label="label"
                option-value="value"
                placeholder="Select category"
                class="w-full"
              />
            </div>
          </div>

          <!-- Due Date & Estimated Hours -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-semibold text-surface-900 mb-2">Due Date</label>
              <DatePicker
                v-model="form.dueDate"
                class="w-full"
                placeholder="Select date"
                date-format="mm/dd/yy"
                show-icon
              />
            </div>

            <div>
              <label class="block text-sm font-semibold text-surface-900 mb-2">
                Estimated Hours
              </label>
              <InputNumber
                v-model="form.estimatedHours"
                mode="decimal"
                :min="0"
                :max-fraction-digits="1"
                class="w-full"
                placeholder="0.0"
                suffix=" hrs"
              />
            </div>
          </div>

          <!-- Dependencies (Project tasks only) -->
          <div v-if="filteredAvailableTasks.length > 0">
            <label class="block text-sm font-semibold text-surface-900 mb-2">Dependencies</label>
            <MultiSelect
              v-model="form.dependencies"
              :options="filteredAvailableTasks"
              option-label="title"
              option-value="id"
              placeholder="Select dependent tasks"
              class="w-full"
              display="chip"
              :max-selected-labels="3"
              :filter="true"
              @change="validateTaskDependencies"
            >
              <template #option="slotProps">
                <div class="flex items-center justify-between w-full gap-2">
                  <span class="flex-1 truncate">{{ slotProps.option.title }}</span>
                  <Tag
                    v-if="slotProps.option.status === 'complete'"
                    value="Complete"
                    severity="success"
                    class="text-xs"
                  />
                  <Tag
                    v-else-if="slotProps.option.status === 'in-progress'"
                    value="In Progress"
                    severity="info"
                    class="text-xs"
                  />
                  <Tag v-else value="To Do" severity="secondary" class="text-xs" />
                </div>
              </template>
            </MultiSelect>
            <small class="text-surface-600"
              >Select tasks that must be completed before this task can finish</small
            >

            <!-- Validation Messages -->
            <Message
              v-if="dependencyErrors.length > 0"
              severity="error"
              :closable="false"
              class="mt-2"
            >
              <ul class="list-disc pl-4 mb-0">
                <li v-for="(err, idx) in dependencyErrors" :key="idx">{{ err }}</li>
              </ul>
            </Message>

            <Message
              v-if="dependencyWarnings.length > 0 && dependencyErrors.length === 0"
              severity="warn"
              :closable="false"
              class="mt-2"
            >
              <ul class="list-disc pl-4 mb-0">
                <li v-for="(warn, idx) in dependencyWarnings" :key="idx">{{ warn }}</li>
              </ul>
            </Message>
          </div>
        </template>

        <!-- Attachments (only for existing tasks) -->
        <div v-if="props.task?.id" class="border-t pt-4">
          <label class="block text-sm font-semibold text-surface-900 mb-3">Attachments</label>
          <EntityAttachments
            entity-type="task"
            :entity-id="props.task.id"
            :project-id="form.projectId"
            :can-attach="true"
            view-mode="list"
            @attachments-changed="handleAttachmentsChanged"
            @error="handleAttachmentError"
          />
        </div>

        <!-- Error Message -->
        <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>

        <!-- Success Message -->
        <Message v-if="success" severity="success" :closable="false">{{ success }}</Message>
      </form>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button
          label="Cancel"
          severity="secondary"
          outlined
          @click="closeModal"
          :disabled="loading"
        />
        <Button
          :label="props.task?.id ? 'Update Task' : 'Create Task'"
          icon="pi pi-check"
          @click="handleSubmit"
          :loading="loading"
        />
      </div>
    </template>
  </Dialog>
</template>

<script setup>
import { useProjectStore } from '@/stores';
import { useAuthStore } from '@/stores/auth';
import { ref, watch, computed, onMounted } from 'vue';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Select from 'primevue/select';
import MultiSelect from 'primevue/multiselect';
import DatePicker from 'primevue/datepicker';
import InputNumber from 'primevue/inputnumber';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import Message from 'primevue/message';
import EntityAttachments from '@/components/widgets/EntityAttachments.vue';
import UserRepository from '@/services/firebase/Repositories/UserRepository';
import TaskRepository from '@/services/firebase/Repositories/TaskRepository';
import {
  wouldCreateCircularDependency,
  validateDependencies,
  calculateDependencyStatus,
} from '@/utils/taskDependencies';

// Props
const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  task: {
    type: Object,
    default: null,
  },
  projectId: {
    type: String,
    required: false,
    default: null,
  },
  availableTasks: {
    type: Array,
    default: () => [],
  },
});

// Emits
const emit = defineEmits(['update:visible', 'task-saved']);

// Reactive state
const loading = ref(false);
const error = ref('');
const success = ref('');
const errors = ref({});
const users = ref([]);
const projectStore = useProjectStore();
const authStore = useAuthStore();
const taskType = ref('quick'); // 'quick' or 'project'

// Computed
const isOpen = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value),
});

const projectOptions = computed(() => {
  return projectStore.projects.map((project) => ({
    label: `${project.jobNumber || ''} ${project.name}`.trim(),
    value: project.id,
  }));
});

const filteredAvailableTasks = computed(() => {
  let tasks = [];

  if (Array.isArray(props.availableTasks)) {
    tasks = props.availableTasks;
  } else if (props.availableTasks && typeof props.availableTasks === 'object') {
    tasks = Object.values(props.availableTasks).filter((task) => task && typeof task === 'object');
  }

  tasks = tasks.filter((task) => task && task.id && task.title);

  // Exclude self-reference
  if (props.task?.id) {
    tasks = tasks.filter((task) => task.id !== props.task.id);
  }

  // Exclude tasks that would create circular dependencies
  if (props.task?.id) {
    tasks = tasks.filter((task) => {
      return !wouldCreateCircularDependency(props.task.id, task.id, props.availableTasks);
    });
  }

  // Sort: completed tasks first, then by title
  return tasks.sort((a, b) => {
    if (a.status === 'complete' && b.status !== 'complete') return -1;
    if (a.status !== 'complete' && b.status === 'complete') return 1;
    return (a.title || '').localeCompare(b.title || '');
  });
});

// Dependency validation warnings
const dependencyWarnings = ref([]);
const dependencyErrors = ref([]);

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
  projectId: null,
  dependencies: [],
});

// Options
const priorityOptions = [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
  { label: 'Critical', value: 'critical' },
];

const statusOptions = [
  { label: 'To Do', value: 'todo' },
  { label: 'In Progress', value: 'in-progress' },
  { label: 'Review', value: 'review' },
  { label: 'Complete', value: 'complete' },
  { label: 'On Hold', value: 'on-hold' },
];

const categoryOptions = [
  { label: 'Planning', value: 'planning' },
  { label: 'Design', value: 'design' },
  { label: 'Construction', value: 'construction' },
  { label: 'Inspection', value: 'inspection' },
  { label: 'Documentation', value: 'documentation' },
  { label: 'Administrative', value: 'administrative' },
];

const userOptions = computed(() => {
  return users.value
    .filter((user) => user.active)
    .map((user) => ({
      label: user.name || user.email,
      value: user.id,
    }));
});

// Helper methods
const getPriorityLabel = (value) => {
  const option = priorityOptions.find((opt) => opt.value === value);
  return option ? option.label : value;
};

const getPrioritySeverity = (priority) => {
  const severityMap = {
    critical: 'danger',
    high: 'warn',
    medium: 'info',
    low: 'secondary',
  };
  return severityMap[priority] || 'info';
};

// Load users from Firebase
const loadUsers = async () => {
  try {
    const allUsers = await UserRepository.getAllUsers();
    users.value = allUsers;
  } catch (err) {
    console.error('Error loading users:', err);
    users.value = [];
  }
};

// Load task data into form (for editing)
const loadTaskData = () => {
  if (props.task) {
    // Determine task type based on whether it has a projectId
    taskType.value = props.task.projectId ? 'project' : 'quick';

    form.value = {
      title: props.task.title || '',
      description: props.task.description || '',
      priority: props.task.priority || 'medium',
      status: props.task.status || 'todo',
      assignedTo: props.task.assignedTo || '',
      dueDate: props.task.dueDate ? new Date(props.task.dueDate) : null,
      estimatedHours: props.task.estimatedHours || null,
      category: props.task.category || '',
      projectId: props.task.projectId || props.projectId || null,
      dependencies: Array.isArray(props.task.dependencies) ? props.task.dependencies : [],
    };
  } else {
    // For new tasks, default to quick if no projectId is provided
    taskType.value = props.projectId ? 'project' : 'quick';
    resetForm();
    if (props.projectId) {
      form.value.projectId = props.projectId;
    }
  }
};

// Dependency validation
const validateTaskDependencies = () => {
  dependencyErrors.value = [];
  dependencyWarnings.value = [];

  if (!form.value.dependencies || form.value.dependencies.length === 0) {
    return;
  }

  // Validate dependencies using utility function
  const validation = validateDependencies(
    props.task?.id || 'new-task',
    form.value.dependencies,
    props.availableTasks
  );

  if (!validation.valid) {
    dependencyErrors.value = validation.errors;
  }

  if (validation.warnings.length > 0) {
    dependencyWarnings.value = validation.warnings;
  }
};

// Form validation
const validateForm = () => {
  errors.value = {};

  if (!form.value.title?.trim()) {
    errors.value.title = 'Task title is required';
  }

  if (taskType.value === 'project' && !form.value.projectId) {
    errors.value.projectId = 'Project is required for project tasks';
  }

  // Validate dependencies
  validateTaskDependencies();

  if (dependencyErrors.value.length > 0) {
    errors.value.dependencies = 'Please fix dependency errors';
  }

  return Object.keys(errors.value).length === 0;
};

// Handle changed attachments
const handleAttachmentsChanged = (attachmentData) => {
  console.log('Task attachments changed:', attachmentData);
};

// Handle any errors encountered
const handleAttachmentError = (error) => {
  console.error('Attachment error:', error);
};

// Handle form submission
const handleSubmit = async () => {
  if (!validateForm()) {
    return;
  }

  loading.value = true;
  error.value = '';
  success.value = '';

  try {
    // Determine assignedTo and assignedToName
    let assignedTo = form.value.assignedTo;
    let assignedToName = null;

    if (taskType.value === 'quick') {
      // Quick tasks are always assigned to the current user
      assignedTo = authStore.user?.uid || authStore.user?.id || null;
      assignedToName =
        authStore.user?.name || authStore.user?.displayName || authStore.user?.email || null;
    } else if (assignedTo) {
      // For project tasks, get the assigned user's name from the users list
      const assignedUser = users.value.find((u) => u.id === assignedTo);
      assignedToName = assignedUser?.name || assignedUser?.email || null;
    }

    const taskData = {
      title: form.value.title.trim(),
      description: form.value.description?.trim() || '',
      priority: form.value.priority,
      status: form.value.status,
      assignedTo: assignedTo,
      assignedToName: assignedToName,
      dueDate: form.value.dueDate ? form.value.dueDate.toISOString() : null,
      projectId: taskType.value === 'project' ? form.value.projectId : null,
    };

    // Only include project-specific fields for project tasks
    if (taskType.value === 'project') {
      taskData.estimatedHours = form.value.estimatedHours || 0;
      taskData.category = form.value.category || '';
      taskData.dependencies = Array.isArray(form.value.dependencies) ? form.value.dependencies : [];
    }

    let taskSaved;

    if (props.task?.id) {
      const updates = {
        ...taskData,
        updatedAt: new Date().toISOString(),
      };

      await TaskRepository.updateTask(props.task.id, updates);
      success.value = 'Task updated successfully!';
      taskSaved = { ...props.task, ...updates };
    } else {
      taskSaved = await TaskRepository.createTask(taskData);
      success.value = 'Task created successfully!';
    }

    emit('task-saved', taskSaved);

    setTimeout(() => {
      closeModal();
    }, 1000);
  } catch (err) {
    console.error('Error saving task:', err);
    error.value = err.message || `Failed to ${props.task?.id ? 'update' : 'create'} task`;
  } finally {
    loading.value = false;
  }
};

// Close modal
const closeModal = () => {
  emit('update:visible', false);
  resetForm();
  error.value = '';
  success.value = '';
};

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
    projectId: props.projectId || null,
    dependencies: [],
  };
  errors.value = {};
  dependencyErrors.value = [];
  dependencyWarnings.value = [];
  taskType.value = props.projectId ? 'project' : 'quick';
};

// Watch for visibility changes
watch(
  () => props.visible,
  (newVal) => {
    if (newVal) {
      loadUsers();
      loadTaskData();
    }
  }
);

watch(
  () => props.task,
  () => {
    if (props.visible) {
      loadTaskData();
    }
  },
  { deep: true }
);

onMounted(() => {
  loadUsers();
});
</script>

<style scoped>
.task-dialog-content {
  padding: 0.5rem 0;
}

.task-type-selector {
  margin-bottom: 1rem;
}

.task-type-card {
  padding: 1.25rem;
  border: 2px solid var(--surface-border);
  border-radius: 8px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
  background: var(--surface-0);
}

.task-type-card:hover {
  border-color: var(--primary-color);
  background: var(--primary-50);
}

.task-type-card.active {
  border-color: var(--primary-color);
  background: var(--primary-50);
  box-shadow: 0 0 0 1px var(--primary-color);
}

.task-type-card i {
  color: var(--primary-color);
}

.space-y-5 > * + * {
  margin-top: 1.25rem;
}
</style>
