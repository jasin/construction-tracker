<template>
  <Dialog
    v-model:visible="isOpen"
    modal
    :header="props.projectId ? 'Edit Project' : 'New Project'"
    :style="dialogStyle"
    :position="dialogPosition"
    @hide="closeModal"
  >
    <div class="flex-1 overflow-y-auto p-3">
      <form @submit.prevent="saveProject" class="space-y-3">
        <div>
          <label class="block text-sm font-medium text-gray-700">Project Name *</label>
          <InputText
            v-model="form.name"
            class="w-full text-sm"
            placeholder="Enter project name"
            :class="{ 'border-red-500': errors.name }"
          />
          <span v-if="errors.name" class="text-red-500 text-xs mt-1">{{ errors.name }}</span>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700">Job Number *</label>
          <InputText
            v-model="form.job_number"
            class="w-full text-sm"
            placeholder="Enter job number"
            :class="{ 'border-red-500': errors.job_number }"
          />
          <span v-if="errors.job_number" class="text-red-500 text-xs mt-1">{{
            errors.job_number
          }}</span>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700">Client *</label>
          <Select
            v-model="form.client_id"
            :options="clients"
            option-label="name"
            option-value="id"
            placeholder="Select client"
            class="w-full text-sm"
            :filter="true"
            show-clear
            :class="{ 'p-invalid': errors.client_id }"
          />
          <span v-if="errors.client_id" class="text-red-500 text-xs mt-1">{{
            errors.client_id
          }}</span>
          <small class="text-gray-500 text-xs">
            Don't see your client?
            <Button
              @click="openCreateClient"
              label="Add new client"
              size="small"
              text
              class="p-0! h-auto! text-xs underline text-blue-600 hover:text-blue-700"
            />
          </small>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700">Architect</label>
          <InputText
            v-model="form.architect"
            class="w-full text-sm"
            placeholder="Enter architect name"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700">Project Manager</label>
          <Select
            v-model="form.projectManager"
            :options="userOptions"
            option-label="label"
            option-value="value"
            placeholder="Select project manager"
            class="w-full text-sm"
            :filter="true"
            show-clear
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700">Superintendent</label>
          <Select
            v-model="form.superintendent"
            :options="userOptions"
            option-label="label"
            option-value="value"
            placeholder="Select superintendent"
            class="w-full text-sm"
            :filter="true"
            show-clear
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700">Phase</label>
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
          <label class="block text-sm font-medium text-gray-700">Project Cost</label>
          <InputNumber
            v-model="form.cost"
            mode="currency"
            currency="USD"
            locale="en-US"
            class="w-full text-sm"
          />
        </div>

        <div class="flex items-center space-x-2">
          <Checkbox v-model="form.contractSigned" binary input-id="contract-signed" />
          <label for="contract-signed" class="text-sm font-medium text-gray-700">
            Contract Signed
          </label>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-sm font-medium text-gray-700">Start Date</label>
            <DatePicker
              v-model="form.startDate"
              class="w-full text-sm"
              placeholder="Select start date"
              date-format="mm/dd/yy"
              show-icon
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">End Date</label>
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
          <label class="block text-sm font-medium text-gray-700">Address</label>
          <Textarea
            v-model="form.address"
            rows="2"
            class="w-full text-sm"
            placeholder="Enter project address"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700">Description</label>
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

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button
          label="Cancel"
          severity="secondary"
          size="small"
          @click="closeModal"
          :disabled="loading"
        />
        <Button label="Save" size="small" @click="saveProject" :loading="loading" />
      </div>
    </template>
  </Dialog>

  <!-- Nested client modal -->
  <ClientDialog v-model:visible="showCreateClient" @client-created="handleClientCreated" />
</template>

<script setup>
import { ref, watch, computed, onMounted, onUnmounted } from 'vue';
import { useProjectStore } from '@/stores/project';
import { createSafeFetcher } from '@/utils/errorHandler';
import { useToast } from 'primevue/usetoast';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Select from 'primevue/select';
import InputNumber from 'primevue/inputnumber';
import Checkbox from 'primevue/checkbox';
import DatePicker from 'primevue/datepicker';
import Button from 'primevue/button';

import { getAllClients } from '@/services/api/clientsApi';
import { getActiveUsers } from '@/services/api/usersApi';
import { handleError } from '@/utils/errorHandler';
import ClientDialog from './ClientDialog.vue';

// Props
const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  // project prop deprecated - use projectId and read from store
  project: {
    type: Object,
    default: null,
  },
  projectId: {
    type: String,
    default: null,
  },
  initialClientId: {
    type: String,
    default: null,
  },
});

const toast = useToast();

const projectStore = useProjectStore();

// Emits
const emit = defineEmits(['update:visible', 'project-saved']);

// Reactive state
const loading = ref(false);
const error = ref('');
const success = ref('');
const errors = ref({});
const clients = ref([]);
const users = ref([]);
const showCreateClient = ref(false);
const windowWidth = ref(window.innerWidth);

// Computed
const isOpen = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value),
});

// Responsive dialog styling
const dialogStyle = computed(() => {
  if (windowWidth.value < 768) {
    // Mobile: Full height flyout
    return {
      width: '100vw',
      height: '100vh',
      margin: 0,
      maxHeight: '100vh',
    };
  } else {
    // Desktop: Smaller, centered dialog
    return {
      width: '600px',
      maxWidth: '90vw',
    };
  }
});

const dialogPosition = computed(() => {
  return windowWidth.value < 768 ? 'bottom' : 'center';
});

// User options for dropdowns
const userOptions = computed(() => {
  return users.value
    .filter((user) => user.active !== false)
    .map((user) => ({
      label: user.name || user.email,
      value: user.id,
    }));
});

// Form data
const form = ref({
  name: '',
  job_number: '',
  client_id: '',
  architect: '',
  project_manager: '',
  superintendent: '',
  phase: 'pre-construction',
  cost: null,
  contract_signed: false,
  start_date: null,
  end_date: null,
  address: '',
  description: '',
});

// Phase options
const phaseOptions = [
  { label: 'Pre-Construction', value: 'pre-construction' },
  { label: 'Construction', value: 'construction' },
  { label: 'Close-Out', value: 'close-out' },
  { label: 'Complete', value: 'complete' },
];

/**
 * Loads all clients from repository.
 * @async
 */
const loadClients = async () => {
  try {
    clients.value = await getAllClients();
    console.log('Loaded clients for project form:', clients.value);
  } catch (err) {
    console.error('Error loading clients:', err.message);
    handleError(err, 'Load clients');
    throw new Error(`Clients load failed: ${err.message}`);
  }
};

/**
 * Loads all active users from repository for dropdowns.
 * @async
 */
const loadUsers = async () => {
  try {
    users.value = await getActiveUsers();
    console.log('Loaded users for project form:', users.value);
  } catch (err) {
    console.error('Error loading users:', err.message);
    throw new Error(`Users load failed: ${err.message}`);
  }
};

/**
 * Loads or resets form data based on props.
 * For new projects, pre-selects client if initialClientId provided.
 */
const resetToNewMode = () => {
  form.value = {
    name: '',
    job_number: '',
    client_id: props.initialClientId || '',
    architect: '',
    project_manager: '',
    superintendent: '',
    phase: 'pre-construction',
    cost: null,
    contract_signed: false,
    start_date: null,
    end_date: null,
    address: '',
    description: '',
  };
  console.log('Reset to new mode - empty form');
};

const loadProjectData = async () => {
  console.log('loadProjectData called - visible:', props.visible, 'projectId:', props.projectId); // Ensure log
  error.value = '';

  const projectIdToUse = props.projectId;
  const isEditing = !!projectIdToUse;

  if (isEditing) {
    console.log('Editing mode - ensuring store has data for', projectIdToUse);
    // Load if not in store (centralized)
    if (projectStore.currentProject.id !== projectIdToUse) {
      await projectStore.setActiveProject(projectIdToUse);
    }
    const projectData = projectStore.currentProject || projectStore.getProjectById(projectIdToUse); // Fallback to list
    console.log('Store projectData for pre-fill:', projectData); // Log to see partial/full
    if (projectData && projectData.id) {
      form.value = {
        name: projectData.name || '',
        job_number: projectData.job_number || '',
        client_id: projectData.client_id || '',
        architect: projectData.architect || '',
        project_manager: projectData.project_manager || '',
        superintendent: projectData.superintendent || '',
        phase: projectData.phase || 'pre-construction',
        cost: projectData.cost || null,
        contract_signed: projectData.contract_signed || false,
        start_date: projectData.start_date ? new Date(projectData.start_date) : null,
        end_date: projectData.end_date ? new Date(projectData.end_date) : null,
        address: projectData.address || '',
        description: projectData.description || '',
      };
      console.log('Prefilled form from store:', form.value); // Log to confirm
    } else {
      console.warn('No store data for pre-fill - fallback new');
      resetToNewMode();
    }
  } else {
    console.log('New project mode - resetting form');
    resetToNewMode();
  }
};

// Window resize handler for responsive dialog
const handleResize = () => {
  windowWidth.value = window.innerWidth;
};

// Add onMounted for initial load
onMounted(async () => {
  console.log('ProjectDialog mounted, visible:', props.visible, 'projectId:', props.projectId);

  // Add resize listener
  window.addEventListener('resize', handleResize);

  if (props.visible) {
    // Ensure load on mount if already visible
    await loadClients();
    await loadUsers();
    await loadProjectData();
  }
});

// Cleanup on unmount
onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
});

// Validation
const validateForm = () => {
  errors.value = {};

  if (!form.value.name?.trim()) {
    errors.value.name = 'Project name is required';
  }

  if (!form.value.job_number?.trim()) {
    errors.value.job_number = 'Job number is required';
  }

  if (!form.value.client_id) {
    errors.value.client_id = 'Client is required';
  }

  return Object.keys(errors.value).length === 0;
};

// Replace or add saveProject (line ~350, after validateForm)
const saveProject = async () => {
  // Clear previous errors
  errors.value = {};

  // Validate
  if (!validateForm()) {
    return; // Errors set, user sees red spans
  }

  try {
    loading.value = true;
    error.value = '';
    success.value = '';

    // Build formData from refs (explicit, no spread to avoid undefined)
    const formData = {
      name: form.value.name.trim(),
      job_number: form.value.job_number.trim(),
      client_id: form.value.client_id || null,
      architect: form.value.architect.trim(),
      project_manager: form.value.project_manager || '',
      superintendent: form.value.superintendent || '',
      phase: form.value.phase,
      cost: form.value.cost || 0,
      contract_signed: form.value.contract_signed || false,
      start_date: form.value.start_date || null,
      end_date: form.value.end_date || null,
      address: form.value.address.trim(),
      description: form.value.description.trim(),
    };

    // Additional validation
    if (!formData.client_id) {
      errors.value.client_id = 'Client is required';
      loading.value = false;
      return;
    }

    const isEditing = !!props.projectId;
    const operation = isEditing ? 'updated' : 'created';
    let result;

    if (isEditing) {
      result = await projectStore.updateAndLogProject(props.projectId, formData);
      success.value = `Project ${operation} successfully`;
    } else {
      result = await projectStore.createAndLogProject(formData);
      success.value = `Project ${operation} successfully`;
    }

    if (result && result.id) {
      console.log(`Project ${operation}:`, result.id);
      emit('project-saved', result);
      emit('update:visible', false); // Close modal
      if (!isEditing) {
        resetToNewMode(); // Reset form only for creation
      }
    } else {
      loading.value = false;
      toast.add({
        severity: 'warn',
        detail: `No project data returned after ${operation} – check data.`,
        life: 3000,
      });
    }
  } catch (err) {
    loading.value = false;
    console.error('Project save error:', err);
  } finally {
    loading.value = false; // Ensure button unloads
  }
};

const openCreateClient = () => {
  showCreateClient.value = true;
};

const handleClientCreated = (newClient) => {
  // Add to client list
  clients.value.unshift(newClient);

  // Select new client
  form.value.client_id = newClient.id;

  // Close the client modal
  showCreateClient.value = false;
};

// Close modal
const closeModal = () => {
  emit('update:visible', false);
  error.value = '';
  success.value = '';
};

// Watch for visibility changes
watch(
  () => props.visible,
  async (newVal) => {
    if (newVal) {
      await loadClients();
      await loadUsers();
      await loadProjectData();
    }
  }
);

// Watch for project changes while visible (e.g., if parent updates object)
watch(
  () => props.project,
  async () => {
    if (props.visible) {
      await loadProjectData();
    }
  },
  { deep: true }
);

watch(
  () => props.project,
  () => {
    if (props.visible) {
      loadProjectData();
    }
  },
  { deep: true }
);
</script>

<style scoped>
/* Reduce dialog border radius */
:deep(.p-dialog) {
  border-radius: 0.5rem;
}

:deep(.p-dialog-header) {
  border-top-left-radius: 0.5rem;
  border-top-right-radius: 0.5rem;
}

/* Smaller text for all inputs */
:deep(.p-inputtext),
:deep(.p-select),
:deep(.p-select-label),
:deep(.p-inputnumber-input),
:deep(.p-textarea),
:deep(.p-datepicker-input) {
  font-size: 0.813rem;
  padding: 0.5rem;
}

/* Select dropdown panel options */
:deep(.p-select-overlay),
:deep(.p-select-option),
:deep(.p-select-option-label) {
  font-size: 0.813rem;
}

/* Smaller label spacing */
label {
  margin-bottom: 0.25rem;
}

/* Tighter spacing in form */
.space-y-3 > * + * {
  margin-top: 0.75rem;
}
</style>
