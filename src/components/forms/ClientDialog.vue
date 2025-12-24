<template>
  <Dialog
    v-model:visible="isOpen"
    modal
    :header="props.client?.id ? 'Edit Client' : 'New Client'"
    :style="dialogStyle"
    :position="dialogPosition"
    @hide="closeModal"
  >
    <div class="flex-1 overflow-y-auto p-3">
      <form @submit.prevent="handleSubmit" class="space-y-3">
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
import { ref, watch, computed, onMounted, onUnmounted } from 'vue';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Button from 'primevue/button';
import { createClient, updateClient } from '@/services/api/clientsApi';
import { handleError } from '@/utils/errorHandler';

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
});

// Emits
const emit = defineEmits(['update:visible', 'client-created', 'client-updated']);

// Reactive state
const loading = ref(false);
const error = ref('');
const success = ref('');
const errors = ref({});
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

// Form data
const form = ref({
  name: '',
  company: '',
  email: '',
  phone: '',
  address: '',
  notes: '',
});

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
    };
  } else {
    // Reset form for new client
    form.value = {
      name: '',
      company: '',
      email: '',
      phone: '',
      address: '',
      notes: '',
    };
  }
};

// Validation
const validateForm = () => {
  errors.value = {};

  if (!form.value.name?.trim()) {
    errors.value.name = 'Name is required';
  }

  if (!form.value.email?.trim()) {
    errors.value.email = 'Email is required';
  } else if (!isValidEmail(form.value.email)) {
    errors.value.email = 'Invalid email format';
  }

  return Object.keys(errors.value).length === 0;
};

const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
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
    const clientData = {
      name: form.value.name.trim(),
      company: form.value.company?.trim() || '',
      email: form.value.email.trim(),
      phone: form.value.phone?.trim() || '',
      address: form.value.address?.trim() || '',
      notes: form.value.notes?.trim() || '',
      updatedAt: new Date().toISOString(),
    };

    let savedClient;

    if (props.client?.id) {
      savedClient = await updateClient(props.client.id, clientData);
      success.value = 'Client updated successfully';
      emit('client-updated', savedClient);
    } else {
      savedClient = await createClient(clientData);
      success.value = 'Client created successfully';
      emit('client-created', savedClient);
    }

    // Close modal after a brief delay
    setTimeout(() => {
      closeModal();
    }, 1500);
  } catch (err) {
    console.error('Error saving client:', err);
    error.value = err.message || 'Failed to save client';
    handleError(err, 'Save client');
  } finally {
    loading.value = false;
  }
};

// Close modal
const closeModal = () => {
  emit('update:visible', false);
  error.value = '';
  success.value = '';
};

// Window resize handler for responsive dialog
const handleResize = () => {
  windowWidth.value = window.innerWidth;
};

// Lifecycle hooks
onMounted(() => {
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
});

// Watch for visibility changes
watch(
  () => props.visible,
  (newVal) => {
    if (newVal) {
      loadClientData();
    }
  }
);

watch(
  () => props.client,
  () => {
    if (props.visible) {
      loadClientData();
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
:deep(.p-textarea) {
  font-size: 0.813rem;
  padding: 0.5rem;
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
