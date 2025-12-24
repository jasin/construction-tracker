<template>
  <div class="h-full flex flex-col bg-gray-50">
    <!-- Header -->
    <div class="bg-white border-b border-gray-200 px-6 py-4 shrink-0">
      <div class="flex justify-between items-center">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Clients</h1>
          <p class="text-sm text-gray-500 mt-1">Manage client information and relationships</p>
        </div>
        <Button @click="openCreateClient" icon="pi pi-plus" label="New Client" size="small" />
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <ProgressSpinner />
        <p class="mt-4 text-gray-500">Loading clients...</p>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <i class="pi pi-exclamation-triangle text-4xl text-red-400 mb-4"></i>
        <h3 class="text-lg font-medium text-gray-900 mb-2">Error Loading Clients</h3>
        <p class="text-red-600 mb-4">{{ error }}</p>
        <Button @click="loadClients" label="Try Again" severity="secondary" />
      </div>
    </div>

    <!-- Main Content - Client Table -->
    <div v-else class="flex-1 overflow-y-auto p-6">
      <!-- Stats Summary -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div class="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div class="flex items-center">
            <i class="pi pi-users text-2xl text-blue-500 mr-3"></i>
            <div>
              <p class="text-sm font-medium text-gray-600">Total Clients</p>
              <p class="text-2xl font-bold text-gray-900">{{ totalClients }}</p>
            </div>
          </div>
        </div>

        <div class="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div class="flex items-center">
            <i class="pi pi-briefcase text-2xl text-green-500 mr-3"></i>
            <div>
              <p class="text-sm font-medium text-gray-600">Active Projects</p>
              <p class="text-2xl font-bold text-gray-900">{{ activeProjectsCount }}</p>
            </div>
          </div>
        </div>

        <div class="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div class="flex items-center">
            <i class="pi pi-clock text-2xl text-orange-500 mr-3"></i>
            <div>
              <p class="text-sm font-medium text-gray-600">Recent Activity</p>
              <p class="text-2xl font-bold text-gray-900">{{ recentActivityCount }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Search and Filter Bar -->
      <div class="bg-white rounded-lg border border-gray-200 shadow-sm mb-6 p-4">
        <div class="flex gap-4 items-center">
          <div class="flex-1">
            <InputText
              v-model="searchQuery"
              placeholder="Search clients by name, email, or company..."
              class="w-full"
            />
          </div>
          <Button
            @click="clearSearch"
            icon="pi pi-times"
            severity="secondary"
            text
            v-show="searchQuery"
          />
        </div>
      </div>

      <!-- Clients Table -->
      <div class="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <!-- Table Header -->
        <div class="px-6 py-3 border-b border-gray-200 bg-gray-50">
          <div class="flex justify-between items-center">
            <h3 class="text-sm font-semibold text-gray-900">
              Client List ({{ filteredClients.length }})
            </h3>
            <div class="text-xs text-gray-500">Last updated: {{ lastUpdated }}</div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="filteredClients.length === 0" class="text-center py-12">
          <i class="pi pi-search text-4xl text-gray-400 mb-4"></i>
          <h3 class="text-lg font-medium text-gray-900 mb-2">No clients found</h3>
          <p class="text-gray-500 mb-6">
            {{
              searchQuery
                ? 'Try adjusting your search terms'
                : 'Get started by adding your first client'
            }}
          </p>
          <Button
            @click="openCreateClient"
            icon="pi pi-plus"
            label="Add First Client"
            size="small"
          />
        </div>

        <!-- Table Content -->
        <div v-else class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Client
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Contact Info
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Projects
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Created
                </th>
                <th
                  class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr
                v-for="client in filteredClients"
                :key="client.id"
                class="hover:bg-gray-50 transition-colors cursor-pointer"
                @click="viewClientDetails(client)"
              >
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <div class="h-10 w-10 shrink-0">
                      <div
                        class="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center"
                      >
                        <span class="text-sm font-medium text-blue-700">
                          {{ getClientInitials(client) }}
                        </span>
                      </div>
                    </div>
                    <div class="ml-4">
                      <div class="text-sm font-medium text-gray-900">
                        {{ client.name || 'Unnamed Client' }}
                      </div>
                      <div class="text-sm text-gray-500">{{ client.company || 'No company' }}</div>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-gray-900">{{ client.email || 'No email' }}</div>
                  <div class="text-sm text-gray-500">{{ client.phone || 'No phone' }}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {{ getClientProjectCount(client) }} projects
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {{ formatDate(client.createdAt) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Button
                    @click.stop="editClient(client)"
                    icon="pi pi-pencil"
                    severity="secondary"
                    text
                    size="small"
                  />
                  <Button
                    @click.stop="deleteClient(client.id)"
                    icon="pi pi-trash"
                    severity="danger"
                    text
                    size="small"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Client Slide-Over -->
    <ClientDialog
      :visible="isModalVisible"
      :client="modalClient"
      @update:visible="closeModal"
      @client-created="handleClientCreated"
      @client-updated="handleClientUpdated"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import ProgressSpinner from 'primevue/progressspinner';
import { getAllClients, deleteClient as deleteClientApi } from '@/services/api/clientsApi';
import { handleError } from '@/utils/errorHandler';
import ClientDialog from '@/components/forms/ClientDialog.vue';

// ==================== REACTIVE STATE ====================
// These are Vue 3 "ref" - they create reactive data that Vue watches for changes

const loading = ref(true); // Boolean: shows/hides loading spinner
const error = ref(null); // String or null: holds error messages
const clients = ref([]); // Array: holds all client data from Firebase
const searchQuery = ref(''); // String: holds the search input value
const showCreateClient = ref(false); // Boolean: controls create client modal
const editingClient = ref(null); // Object or null: holds client being edited
const lastUpdated = ref(''); // String: shows when data was last loaded

// ==================== COMPUTED PROPERTIES ====================
// These are reactive and automatically update when their dependencies change

// Filters clients based on search query
const filteredClients = computed(() => {
  if (!searchQuery.value) {
    return clients.value; // If no search, return all clients
  }

  const query = searchQuery.value.toLowerCase();
  return clients.value.filter((client) => {
    // Search in multiple fields
    return (
      client.name?.toLowerCase().includes(query) ||
      client.email?.toLowerCase().includes(query) ||
      client.company?.toLowerCase().includes(query) ||
      client.phone?.toLowerCase().includes(query)
    );
  });
});

// Calculate total number of clients
const totalClients = computed(() => {
  return clients.value.length;
});

// This is a placeholder - we'll calculate this properly later
const activeProjectsCount = computed(() => {
  // TODO: We'll need to fetch and count projects by client
  return 0;
});

// This is a placeholder - we'll calculate this properly later
const recentActivityCount = computed(() => {
  // TODO: We'll need to fetch recent activities
  return 0;
});

// Determine if modal should be visible
const isModalVisible = computed(() => {
  return showCreateClient.value || editingClient.value !== null;
});

// Get the client for editing (or null for new client)
const modalClient = computed(() => {
  return editingClient.value;
});

// ==================== METHODS ====================
// These are functions that can be called from the template or other methods

// Load all clients from backend API
const loadClients = async () => {
  try {
    loading.value = true;
    error.value = null;

    console.log('Starting to load clients from backend API...');

    // Call API to get all clients
    const clientData = await getAllClients();

    console.log('Loaded client data:', clientData);

    // Update our reactive data
    clients.value = clientData;
    lastUpdated.value = new Date().toLocaleTimeString();
  } catch (err) {
    console.error('Error loading clients:', err);
    error.value = err.message || 'Failed to load clients';
    handleError(err, 'Load clients');
  } finally {
    // Always set loading to false, whether success or error
    loading.value = false;
  }
};

// Helper function to get client initials for avatar
const getClientInitials = (client) => {
  if (!client.name) return '??';

  return client.name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2); // Only take first 2 letters
};

// Helper function to count projects per client
const getClientProjectCount = (client) => {
  // TODO: We'll implement this when we link clients to projects
  return 0;
};

// Helper function to format dates
const formatDate = (dateString) => {
  if (!dateString) return 'Unknown';

  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

// Clear search functionality
const clearSearch = () => {
  searchQuery.value = '';
};

// Open modal for creating new client
const openCreateClient = () => {
  editingClient.value = null;
  showCreateClient.value = true;
};

// Open modal for editing existing client
const editClient = (client) => {
  console.log('Edit client:', client);
  showCreateClient.value = false;
  editingClient.value = client;
};

// Close the modal
const closeModal = () => {
  showCreateClient.value = false;
  editingClient.value = null;
};

// Handle when a new client is created
const handleClientCreated = (newClient) => {
  console.log('New client created:', newClient);

  // Add the new client to our list
  clients.value.unshift(newClient);

  // Close the modal
  closeModal();
};

// Handle when a client is updated
const handleClientUpdated = (updatedClient) => {
  console.log('Client updated:', updatedClient);

  // Find and replace the client in our list
  const index = clients.value.findIndex((c) => c.id === updatedClient.id);
  if (index !== -1) {
    clients.value[index] = updatedClient;
  }

  // Close the modal
  closeModal();
};

// Placeholder functions for future development
const viewClientDetails = (client) => {
  console.log('View client details:', client);
  // TODO: Navigate to client detail page or show modal
};

const deleteClient = async (clientId) => {
  console.log('Delete client:', clientId);

  // TODO: Show confirmation dialog first
  if (confirm('Are you sure you want to delete this client?')) {
    try {
      await deleteClientApi(clientId);

      // Remove from local list
      clients.value = clients.value.filter((c) => c.id !== clientId);

      console.log('Client deleted successfully');
    } catch (err) {
      console.error('Error deleting client:', err);
      error.value = 'Failed to delete client';
      handleError(err, 'Delete client');
    }
  }
};

// ==================== LIFECYCLE HOOKS ====================
// These run at specific times in the component's life

// onMounted runs after the component is added to the DOM
onMounted(() => {
  console.log('ClientsPage component mounted, loading data...');
  loadClients();
});
</script>

<style scoped>
/* Custom styles specific to this component */
.hover\:bg-gray-50:hover {
  background-color: #f9fafb;
}

/* Custom scrollbar for the table area */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}
</style>
