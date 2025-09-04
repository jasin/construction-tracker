<template>
  <div v-if="authLoading">Loading...</div>
  <div v-else>
    <LoginView v-if="!isAuthenticated" />
    <div v-else class="flex flex-col h-screen" @contextmenu.prevent="showContextMenu($event)">
      <!-- Header -->
      <header class="flex items-center justify-between p-4 bg-white border-b">
        <div class="flex items-center">
          <div class="text-xl font-bold">Construction Tracker</div>
          <!-- Project Selector with fuzzy search -->
          <AutoComplete
            ref="autoCompleteRef"
            v-model="selectedProject"
            :suggestions="filteredProjects"
            @complete="handleProjectSearch"
            optionLabel="name"
            optionGroupLabel="name"
            optionGroupChildren="items"
            placeholder="Select a project"
            class="ml-4 w-64 text-xs"
            @item-select="handleProjectSelect"
            size="small"
            dropdown
          >
            <template #optiongroup="slotProps">
              <div class="font-semibold text-sm text-gray-700">{{ slotProps.option.name }}</div>
            </template>
            <template #header>
              <div
                v-if="selectedProject"
                class="p-3 text-sm font-medium text-blue-600 cursor-pointer hover:bg-blue-50"
                @click="resetToDashboard"
              >
                ← Back to Dashboard
              </div>
            </template>
            <template #option="slotProps">
              <div class="text-xs text-gray-800">{{ slotProps.option.name }}</div>
            </template>
          </AutoComplete>
        </div>
        <div class="flex items-center gap-4">
          <Button icon="pi pi-bell" severity="secondary" text />
          <div class="flex items-center gap-2 cursor-pointer" @click="toggleUserMenu">
            <Avatar :label="userInitials" shape="circle" />
            <span>{{ user?.name || 'User' }}</span>
          </div>
          <Menu ref="userMenu" :model="userMenuItems" :popup="true" />
        </div>
      </header>
      <!-- Main content area (full width after sidebar removal) -->
      <main class="flex-1 p-4 overflow-auto">
        <template v-if="selectedProject">
          <ProjectDetailView :project-id="selectedProject.id" />
        </template>
        <template v-else>
          <DashboardView />
        </template>
      </main>
      <!-- Context Menu for actions (right-click anywhere) -->
      <ContextMenu ref="contextMenu" :model="contextMenuItems" />
      <Toast />
      <ProjectDialog v-model:visible="showProjectDialog" @project-saved="handleProjectUpdated" />
      <TaskDialog v-model:visible="showTaskDialog" @task-saved="handleTaskUpdated" />
      <RFIDialog v-model:visible="showRFIDialog" @rfi-saved="handleRFISaved" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores' // Centralized store import via index.js
import ProjectRepository from '@/services/firebase/Repositories/ProjectRepository' // Singleton repository import
import DocumentRepository from '@/services/firebase/Repositories/DocumentRepository' // Singleton for document uploads
import SubmittalRepository from '@/services/firebase/Repositories/SubmittalRepository' // Singleton for submittals
import ChangeOrderRepository from '@/services/firebase/Repositories/ChangeOrderRepository' // Singleton for change orders
import { useToast } from 'primevue/usetoast' // Composable for toast notifications
import LoginView from '@/views/auth/LoginView.vue'
import DashboardView from '@/views/dashboard/DashboardView.vue'
import ProjectDetailView from '@/views/projects/ProjectDetailView.vue'
import AutoComplete from 'primevue/autocomplete'
import Button from 'primevue/button'
import Avatar from 'primevue/avatar'
import Menu from 'primevue/menu'
import ContextMenu from 'primevue/contextmenu' // PrimeVue ContextMenu for right-click menu
import Toast from 'primevue/toast' // PrimeVue Toast component for notifications
import ProjectDialog from './components/forms/ProjectDialog.vue'
import TaskDialog from './components/forms/TaskDialog.vue'
import RFIDialog from './components/forms/RFIDialog.vue'

let projectUnsubscribe = null

const router = useRouter()
const authStore = useAuthStore() // Use centralized auth store
const toast = useToast() // PrimeVue toast for success/error messages

const projects = ref([])
const selectedProject = ref(null)
const filteredProjects = ref([])
const userMenu = ref()
const contextMenu = ref() // Ref for ContextMenu component
const autoCompleteRef = ref()
const showProjectDialog = ref(false)
const showTaskDialog = ref(false)
const showRFIDialog = ref(false)

// Define functions before refs for proper initialization order

/**
 * Handles the project-updated event from the ProjectDialog.
 * Since realtime subscriptions are in place, we don't need to manually refresh projects.value.
 * This can be used for additional UI feedback if needed.
 * @param {Object} project - The created or updated project data.
 */
const handleProjectUpdated = (project) => {
  showProjectDialog.value = false
  toast.add({
    severity: 'success',
    summary: 'Success',
    detail: project.id ? 'Project updated successfully' : 'Project created successfully',
    life: 3000,
  })
}

/**
 * Uploads a document.
 */
const uploadDocument = async () => {
  try {
    await DocumentRepository.create({ name: 'New Document', projectId: selectedProject.value?.id })
    toast.add({ severity: 'success', summary: 'Success', detail: 'Document uploaded', life: 3000 })
  } catch (error) {
    console.error('Upload document error:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to upload document',
      life: 3000,
    })
    throw new Error(`Failed to upload document: ${error.message}`)
  }
}

/**
 * Handles the task-updated event from TaskDialog.
 * Since realtime subscriptions are in place, we don't need to manually refresh tasks.value.
 * This can be used for additional UI feedback if needed.
 * @param {Object} task - The created or updated task data.
 */
const handleTaskUpdated = (task) => {
  showTaskDialog.value = false
  toast.add({
    severity: 'success',
    summary: 'Success',
    detail: task.id ? 'Task updated successfully' : 'Task created successfully',
    life: 3000,
  })
}
/**
 * Handles the rfi-saved event from TaskDialog.
 * Since realtime subscriptions are in place, we don't need to manually refresh rfis.value.
 * This can be used for additional UI feedback if needed.
 * @param {Object} RFI - The created or updated RFI data.
 */
const handleRFISaved = (rfi) => {
  showRFIDialog.value = false
  toast.add({
    severity: 'success',
    summary: 'Success',
    detail: rfi.id ? 'RFI updated successfully' : 'RFI created successfully',
    life: 3000,
  })
}

/**
 * Creates a new submittal.
 */
const newSubmittal = async () => {
  try {
    await SubmittalRepository.create({
      title: 'New Submittal',
      projectId: selectedProject.value?.id,
    })
    toast.add({ severity: 'success', summary: 'Success', detail: 'Submittal created', life: 3000 })
  } catch (error) {
    console.error('New submittal error:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to create submittal',
      life: 3000,
    })
    throw new Error(`Failed to create submittal: ${error.message}`)
  }
}

/**
 * Creates a change order.
 */
const changeOrder = async () => {
  try {
    await ChangeOrderRepository.create({
      description: 'New Change Order',
      projectId: selectedProject.value?.id,
    })
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Change order created',
      life: 3000,
    })
  } catch (error) {
    console.error('Change order error:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to create change order',
      life: 3000,
    })
    throw new Error(`Failed to create change order: ${error.message}`)
  }
}

/**
 * Generates a report.
 */
const generateReport = async () => {
  try {
    // Placeholder: Implement report generation logic (e.g., fetch data and export PDF/CSV)
    toast.add({ severity: 'success', summary: 'Success', detail: 'Report generated', life: 3000 })
  } catch (error) {
    console.error('Generate report error:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to generate report',
      life: 3000,
    })
    throw new Error(`Failed to generate report: ${error.message}`)
  }
}

/**
 * Navigates to settings.
 */
const settings = () => {
  // Placeholder: Navigate to settings route
  router.push('/settings')
}

const userMenuItems = ref([
  {
    label: 'Profile',
    command: () => {
      // TODO: Navigate to profile
    },
  },
  {
    label: 'Settings',
    command: settings,
  },
  {
    label: 'Logout',
    command: async () => {
      try {
        await authStore.logout()
        router.push('/login')
      } catch (error) {
        console.error('Logout error:', error)
        toast.add({ severity: 'error', summary: 'Error', detail: 'Logout failed', life: 3000 })
        throw new Error(`Logout failed: ${error.message}`)
      }
    },
  },
])

// Added: Context menu items based on former footer actions
const contextMenuItems = ref([
  {
    label: 'New Project',
    icon: 'pi pi-plus',
    command: () => {
      showProjectDialog.value = true
    },
  },
  {
    label: 'Upload Document',
    icon: 'pi pi-upload',
    command: uploadDocument,
  },
  {
    label: 'Create Task',
    icon: 'pi pi-check-square',
    command: () => {
      showTaskDialog.value = true
    },
  },
  {
    label: 'Submit RFI',
    icon: 'pi pi-question-circle',
    command: () => {
      showRFIDialog.value = true
    },
  },
  {
    label: 'New Submittal',
    icon: 'pi pi-file',
    command: newSubmittal,
  },
  {
    label: 'Change Order',
    icon: 'pi pi-money-bill',
    command: changeOrder,
  },
  {
    label: 'Generate Report',
    icon: 'pi pi-chart-bar',
    command: generateReport,
  },
  {
    label: 'Settings',
    icon: 'pi pi-cog',
    command: settings,
  },
])

const userInitials = computed(() => {
  if (!authStore.user?.name) return 'U'
  return authStore.user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
})

const authLoading = computed(() => authStore.loading) // Use store's loading for auth state
const isAuthenticated = computed(() => authStore.isAuthenticated) // Use store's getter for auth check
const user = computed(() => authStore.user) // Use store's user ref

onMounted(async () => {
  try {
    await authStore.initAuth() // Call store's initAuth to handle onAuthStateChanged and syncing
    if (authStore.isAuthenticated) {
      projectUnsubscribe = ProjectRepository.subscribeToAll((updatedProjects) => {
        projects.value = updatedProjects
      })
    }
  } catch (error) {
    console.error('App init error:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to initialize app',
      life: 3000,
    })
    throw new Error(`Failed to initialize app: ${error.message}`)
  }
})

onUnmounted(() => {
  if (projectUnsubscribe) {
    try {
      ProjectRepository.unsubscribe(projectUnsubscribe)
    } catch (error) {
      console.error('Unsubscribe error:', error)
      throw new Error(`Failed to unsubscribe from projects: ${error.message}`)
    }
  }
})

// New: Mapping from project phase to group name (based on HTML structure)
const phaseToGroup = {
  construction: 'Active Projects',
  'pre-construction': 'Pre-Construction',
  complete: 'Completed',
  // Add more mappings if needed, e.g., 'close-out': 'Close-Out'
}

// New: Ordered list for sorting groups
const groupOrder = ['Active Projects', 'Pre-Construction', 'Completed']

// New: Function to group and sort projects (with optional query for filtering)
const groupProjects = (projectsList, query = '') => {
  const lowerQuery = query.toLowerCase()
  const filtered = query
    ? projectsList.filter(
        (p) =>
          p.name.toLowerCase().includes(lowerQuery) ||
          (p.jobNumber || '').toLowerCase().includes(lowerQuery),
      )
    : projectsList

  const groupsMap = {}
  filtered.forEach((p) => {
    const groupName = phaseToGroup[p.phase] || 'Other'
    if (!groupsMap[groupName]) groupsMap[groupName] = []
    groupsMap[groupName].push(p)
  })

  const groups = Object.keys(groupsMap)
    .map((name) => ({
      name,
      items: groupsMap[name].sort((a, b) => a.name.localeCompare(b.name)), // Sort projects by name within group
    }))
    .filter((g) => g.items.length > 0) // Exclude empty groups

  // Sort groups by predefined order
  groups.sort((a, b) => groupOrder.indexOf(a.name) - groupOrder.indexOf(b.name))

  return groups
}

/**
 * Handles project search by filtering projects based on query.
 * Assigns to filteredProjects ref for dropdown suggestions.
 * @param {Object} event - AutoComplete complete event.
 */
const handleProjectSearch = (event) => {
  filteredProjects.value = groupProjects(projects.value, event.query)
}

const handleProjectSelect = (event) => {
  selectedProject.value = event.value
}

const toggleUserMenu = (event) => {
  userMenu.value.toggle(event)
}

const resetToDashboard = () => {
  selectedProject.value = null
  if (autoCompleteRef.value) {
    autoCompleteRef.value.hide()
  }
}

/**
 * Shows the context menu at the right-click position.
 * @param {Event} event - The contextmenu event.
 */
const showContextMenu = (event) => {
  contextMenu.value.show(event) // Display context menu on right-click
}
</script>

<style>
/* Add any additional styles or rely on Tailwind */
</style>
