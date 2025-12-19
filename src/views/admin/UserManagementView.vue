<template>
  <div class="h-full flex flex-col bg-white">
    <!-- Header -->
    <div class="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
      <div class="flex justify-between items-center">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">User Management</h1>
          <p class="text-sm text-gray-500 mt-1">Manage users, roles, and permissions</p>
        </div>
        <button
          @click="showCreateUser = true"
          disabled
          class="bg-gray-400 text-white px-4 py-2 rounded-md text-sm font-medium cursor-not-allowed transition-colors"
          title="Users must register through the signup process"
        >
          Add New User (via Signup)
        </button>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto p-6">
      <!-- Filters -->
      <div class="mb-6 flex gap-4 items-center">
        <div class="flex-1">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search users..."
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>
        <select
          v-model="roleFilter"
          class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
        >
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="project-manager">Project Manager</option>
          <option value="superintendent">Superintendent</option>
          <option value="foreman">Foreman</option>
          <option value="user">User</option>
        </select>
        <select
          v-model="statusFilter"
          class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <!-- Users Table -->
      <div class="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  User
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Role
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Status
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
              <tr v-for="user in filteredUsers" :key="user.id" class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <div class="h-10 w-10 flex-shrink-0">
                      <div
                        class="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center"
                      >
                        <span class="text-sm font-medium text-emerald-700">
                          {{ getInitials(user.name) }}
                        </span>
                      </div>
                    </div>
                    <div class="ml-4">
                      <div class="text-sm font-medium text-gray-900">{{ user.name }}</div>
                      <div class="text-sm text-gray-500">{{ user.email }}</div>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span
                    class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                    :class="getRoleBadgeClass(user.role)"
                  >
                    {{ formatRole(user.role) }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span
                    class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                    :class="user.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
                  >
                    {{ user.active ? 'Active' : 'Inactive' }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {{ getProjectCount(user) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {{ formatDate(user.createdAt) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div class="flex justify-end space-x-2">
                    <button
                      @click="editUser(user)"
                      class="text-emerald-600 hover:text-emerald-900 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      @click="toggleUserStatus(user)"
                      :class="
                        user.active
                          ? 'text-red-600 hover:text-red-900'
                          : 'text-green-600 hover:text-green-900'
                      "
                      class="transition-colors"
                    >
                      {{ user.active ? 'Deactivate' : 'Activate' }}
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Empty State -->
        <div v-if="filteredUsers.length === 0" class="text-center py-12">
          <svg
            class="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
            ></path>
          </svg>
          <h3 class="mt-2 text-sm font-medium text-gray-900">No users found</h3>
          <p class="mt-1 text-sm text-gray-500">
            {{
              searchQuery || roleFilter || statusFilter
                ? 'Try adjusting your filters'
                : 'Get started by adding a new user'
            }}
          </p>
        </div>
      </div>
    </div>

    <!-- Create/Edit User Modal -->
    <div
      v-if="showCreateUser || showEditUser"
      class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50"
    >
      <div class="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
        <div class="mt-3">
          <h3 class="text-lg font-medium text-gray-900 mb-4">
            {{ showEditUser ? 'Edit User' : 'Create New User' }}
          </h3>

          <form @submit.prevent="handleSubmit" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                v-model="userForm.name"
                type="text"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                v-model="userForm.email"
                type="email"
                required
                :disabled="showEditUser"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-gray-100"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select
                v-model="userForm.role"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="">Select Role</option>
                <option value="admin">Admin</option>
                <option value="project-manager">Project Manager</option>
                <option value="superintendent">Superintendent</option>
                <option value="foreman">Foreman</option>
                <option value="user">User</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                v-model="userForm.phone"
                type="tel"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div v-if="showEditUser" class="flex items-center">
              <input
                id="active"
                v-model="userForm.active"
                type="checkbox"
                class="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
              />
              <label for="active" class="ml-2 block text-sm text-gray-900"> Active User </label>
            </div>

            <!-- Error Message -->
            <div v-if="error" class="rounded-md bg-red-50 p-4">
              <p class="text-sm text-red-800">{{ error }}</p>
            </div>

            <!-- Success Message -->
            <div v-if="success" class="rounded-md bg-green-50 p-4">
              <p class="text-sm text-green-800">{{ success }}</p>
            </div>

            <div class="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                @click="closeModal"
                class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="loading"
                class="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                {{ loading ? 'Saving...' : showEditUser ? 'Update User' : 'Create User' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { getAllUsers, updateUser, activateUser, deactivateUser } from '@/services/api/usersApi';
import { handleError } from '@/utils/errorHandler';

// Reactive state
const users = ref([]);
const searchQuery = ref('');
const roleFilter = ref('');
const statusFilter = ref('');
const loading = ref(false);
const error = ref('');
const success = ref('');

// Modal state
const showCreateUser = ref(false);
const showEditUser = ref(false);
const editingUser = ref(null);

// Form state
const userForm = ref({
  name: '',
  email: '',
  role: '',
  phone: '',
  active: true,
});

// Computed properties
const filteredUsers = computed(() => {
  let filtered = users.value;

  // Search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(
      (user) =>
        user.name?.toLowerCase().includes(query) || user.email?.toLowerCase().includes(query)
    );
  }

  // Role filter
  if (roleFilter.value) {
    filtered = filtered.filter((user) => user.role === roleFilter.value);
  }

  // Status filter
  if (statusFilter.value) {
    const isActive = statusFilter.value === 'active';
    filtered = filtered.filter((user) => user.active === isActive);
  }

  return filtered;
});

// Methods
const loadUsers = async () => {
  try {
    loading.value = true;
    users.value = await getAllUsers();
  } catch (err) {
    console.error('Error loading users:', err);
    error.value = 'Failed to load users';
    handleError(err, 'Load users');
  } finally {
    loading.value = false;
  }
};

const getInitials = (name) => {
  if (!name) return '??';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const getRoleBadgeClass = (role) => {
  const classes = {
    admin: 'bg-purple-100 text-purple-800',
    'project-manager': 'bg-blue-100 text-blue-800',
    superintendent: 'bg-indigo-100 text-indigo-800',
    foreman: 'bg-yellow-100 text-yellow-800',
    user: 'bg-gray-100 text-gray-800',
  };
  return classes[role] || 'bg-gray-100 text-gray-800';
};

const formatRole = (role) => {
  const roles = {
    'project-manager': 'Project Manager',
    superintendent: 'Superintendent',
    foreman: 'Foreman',
    admin: 'Admin',
    user: 'User',
  };
  return roles[role] || role;
};

const getProjectCount = (user) => {
  if (!user.projects) return '0 projects';
  const count = Object.keys(user.projects).length;
  return `${count} project${count !== 1 ? 's' : ''}`;
};

const formatDate = (dateString) => {
  if (!dateString) return 'Not set';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const editUser = (user) => {
  editingUser.value = user;
  userForm.value = {
    name: user.name || '',
    email: user.email || '',
    role: user.role || '',
    phone: user.phone || '',
    active: user.active !== undefined ? user.active : true,
  };
  showEditUser.value = true;
  error.value = '';
  success.value = '';
};

const toggleUserStatus = async (user) => {
  try {
    const newStatus = !user.active;

    // Use specific activate/deactivate endpoints
    if (newStatus) {
      await activateUser(user.id);
    } else {
      await deactivateUser(user.id);
    }

    user.active = newStatus;
    success.value = `User ${newStatus ? 'activated' : 'deactivated'} successfully`;
    setTimeout(() => {
      success.value = '';
    }, 3000);
  } catch (err) {
    console.error('Error updating user status:', err);
    error.value = 'Failed to update user status';
    handleError(err, 'Toggle user status');
    setTimeout(() => {
      error.value = '';
    }, 3000);
  }
};

const handleSubmit = async () => {
  if (!userForm.value.name || !userForm.value.email || !userForm.value.role) {
    error.value = 'Please fill in all required fields';
    return;
  }

  loading.value = true;
  error.value = '';
  success.value = '';

  try {
    if (showCreateUser.value) {
      // User creation is handled through the signup/registration process
      error.value =
        'User creation is handled through the registration process. Please use the signup flow.';
      return;
    } else if (showEditUser.value) {
      // Update existing user
      const updates = {
        name: userForm.value.name.trim(),
        role: userForm.value.role,
        phone: userForm.value.phone?.trim() || '',
        active: userForm.value.active,
      };

      const updatedUser = await updateUser(editingUser.value.id, updates);

      // Update local user object
      Object.assign(editingUser.value, updatedUser);

      success.value = 'User updated successfully!';
      closeModal();
    }
  } catch (err) {
    console.error('Error saving user:', err);
    error.value = err.message || 'Failed to save user';
    handleError(err, 'Save user');
  } finally {
    loading.value = false;
  }
};

const closeModal = () => {
  showCreateUser.value = false;
  showEditUser.value = false;
  editingUser.value = null;
  userForm.value = {
    name: '',
    email: '',
    role: '',
    phone: '',
    active: true,
  };
  error.value = '';
  success.value = '';
};

// Lifecycle
onMounted(() => {
  loadUsers();
});
</script>

<style scoped>
/* Custom scrollbar styling */
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

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>
