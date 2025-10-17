<template>
  <Dialog
    v-model:visible="isOpen"
    modal
    :header="props.projectId ? 'Edit Project' : 'New Project'"
    :style="{ width: '50vw' }"
    @hide="closeModal"
  >
    <div class="flex-1 overflow-y-auto p-4">
      <form @submit.prevent="saveProject" class="space-y-4">
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
          <span v-if="errors.jobNumber" class="text-red-500 text-xs mt-1">{{
            errors.jobNumber
          }}</span>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Client *</label>
          <AutoComplete
            v-model="selectedClient"
            :suggestions="filteredClients"
            @complete="searchClients"
            option-label="name"
            placeholder="Search clients..."
            class="w-full text-sm"
            :class="{ 'border-red-500': errors.clientId }"
            dropdown
          />
          <span v-if="errors.clientId" class="text-red-500 text-xs mt-1">{{
            errors.clientId
          }}</span>
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
          <Checkbox v-model="form.contractSigned" binary input-id="contract-signed" />
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
import { ref, watch, computed, onMounted } from 'vue'; // Added onMounted
import { useProjectStore } from '@/stores/project'; // Added store import
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
import AutoComplete from 'primevue/autocomplete';

import ClientRepository from '@/services/firebase/Repositories/ClientRepository';
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
const showCreateClient = ref(false);
const filteredClients = ref([]);
const selectedClient = ref(null);

// Computed
const isOpen = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value),
});

// Form data
const form = ref({
  name: '',
  jobNumber: '',
  clientId: '',
  architect: '',
  projectManager: '',
  superintendent: '',
  phase: 'preConstruction',
  cost: null,
  contractSigned: false,
  startDate: null,
  endDate: null,
  address: '',
  description: '',
});

// Phase options
const phaseOptions = [
  { label: 'Pre-Construction', value: 'preConstruction' },
  { label: 'Construction', value: 'construction' },
  { label: 'Close-Out', value: 'closeOut' },
  { label: 'Complete', value: 'complete' },
];

/**
 * Loads all clients from repository.
 * @async
 */
const loadClients = async () => {
  try {
    clients.value = await ClientRepository.getAllClients();
    console.log('Loaded clients for project form:', clients.value);
  } catch (err) {
    console.error('Error loading clients:', err.message);
    throw new Error(`Clients load failed: ${err.message}`);
  }
};

/**
 * Handles fuzzy search for clients.
 * @param {Object} event - AutoComplete event with query.
 */
const searchClients = (event) => {
  const query = event.query.toLowerCase();
  filteredClients.value = clients.value.filter((client) =>
    client.name.toLowerCase().includes(query)
  );
};

/**
 * Loads or resets form data based on props.
 * For new projects, pre-selects client if initialClientId provided.
 */
const resetToNewMode = () => {
  form.value = {
    name: '',
    jobNumber: '',
    clientId: props.initialClientId || '',
    architect: '',
    projectManager: '',
    superintendent: '',
    phase: 'preConstruction',
    cost: null,
    contractSigned: false,
    startDate: null,
    endDate: null,
    address: '',
    description: '',
  };
  selectedClient.value = clients.value.find((c) => c.id === props.initialClientId) || null;
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
        jobNumber: projectData.jobNumber || '',
        clientId: projectData.clientId || '',
        architect: projectData.architect || '',
        projectManager: projectData.projectManager || '',
        superintendent: projectData.superintendent || '',
        phase: projectData.phase || 'preConstruction',
        cost: projectData.cost || null,
        contractSigned: projectData.contractSigned || false,
        startDate: projectData.startDate ? new Date(projectData.startDate) : null,
        endDate: projectData.endDate ? new Date(projectData.endDate) : null,
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

// Add onMounted for initial load
onMounted(async () => {
  console.log('ProjectDialog mounted, visible:', props.visible, 'projectId:', props.projectId);
  if (props.visible) {
    // Ensure load on mount if already visible
    await loadClients();
    await loadProjectData();
    // Sync client
    if (form.value.clientId && clients.value.length > 0) {
      selectedClient.value = clients.value.find((c) => c.id === form.value.clientId) || null;
      console.log('onMounted synced selectedClient:', selectedClient.value);
    }
  }
});

// Validation
const validateForm = () => {
  errors.value = {};

  if (!form.value.name?.trim()) {
    errors.value.name = 'Project name is required';
  }

  if (!form.value.jobNumber?.trim()) {
    errors.value.jobNumber = 'Job number is required';
  }

  if (!form.value.clientId) {
    errors.value.clientId = 'Client is required';
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
      jobNumber: form.value.jobNumber.trim(),
      clientId: selectedClient.value ? selectedClient.value.id : null,
      architect: form.value.architect.trim(),
      projectManager: form.value.projectManager.trim(),
      superintendent: form.value.superintendent.trim(),
      phase: form.value.phase || 'preConstruction',
      cost: form.value.cost || 0,
      contractSigned: form.value.contractSigned || false,
      startDate: form.value.startDate || null,
      endDate: form.value.endDate || null,
      address: form.value.address.trim(),
      description: form.value.description.trim(),
    };

    // Additional validation
    if (!formData.clientId) {
      errors.value.clientId = 'Client is required';
      loading.value = false;
      return;
    }

    const isEditing = !!props.projectId;
    let result;
    let operation = isEditing ? 'updated' : 'created';

    if (isEditing) {
      result = await projectStore.updateAndLogProject(props.projectId, formData);
      success.value = `Project ${operation} successfully`;
    } else {
      result = await projectStore.createAndLogProject(formData);
      success.value = `Project ${operation} successfully`;
    }

    if (result && result.id) {
      console.log(`Project ${operation}:`, result.id);
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: success.value,
        life: 3000,
      });
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
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: err.message || `${operation} failed`,
      life: 3000,
    });
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
  selectedClient.value = newClient;
  form.value.clientId = newClient.id;

  // Close the client modal
  showCreateClient.value = false;
};

// Close modal
const closeModal = () => {
  emit('update:visible', false);
  error.value = '';
  success.value = '';
};

// Watch selectedClient to sync clientId
watch(selectedClient, (newVal) => {
  form.value.clientId = newVal?.id || '';
});

// Watch for visibility changes
watch(
  () => props.visible,
  async (newVal) => {
    if (newVal) {
      await loadClients();
      await loadProjectData();
      // Sync client from pre-filled clientId (store data)
      if (form.value.clientId && clients.value.length > 0) {
        selectedClient.value = clients.value.find((c) => c.id === form.value.clientId) || null;
        console.log('Watch synced selectedClient from store data:', selectedClient.value);
      }
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
/* Add any additional styles or rely on Tailwind */
</style>
