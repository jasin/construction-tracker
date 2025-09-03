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
            v-model="selectedProject"
            :suggestions="filteredProjects"
            @complete="handleProjectSearch"
            optionLabel="name"
            placeholder="Select a project"
            class="ml-4 w-64"
            @item-select="handleProjectSelect"
            dropdown
          />
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
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores' // Centralized store import via index.js
import ProjectRepository from '@/services/firebase/Repositories/ProjectRepository' // Singleton repository import
import DocumentRepository from '@/services/firebase/Repositories/DocumentRepository' // Singleton for document uploads
import TaskRepository from '@/services/firebase/Repositories/TaskRepository' // Singleton for tasks
import RFIRepository from '@/services/firebase/Repositories/RFIRepository' // Singleton for RFIs
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

let projectUnsubscribe = null

const router = useRouter()
const authStore = useAuthStore() // Use centralized auth store
const toast = useToast() // PrimeVue toast for success/error messages

const projects = ref([])
const selectedProject = ref(null)
const filteredProjects = ref([])
const searchQuery = ref('')
const userMenu = ref()
const contextMenu = ref() // Ref for ContextMenu component

// Define functions before refs for proper initialization order

/**
 * Creates a new project and refreshes the projects list.
 */
const createNewProject = async () => {
  try {
    await ProjectRepository.create({ name: 'New Project', phase: 'pre-construction' })
    projects.value = await ProjectRepository.getAll()
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'New project created',
      life: 3000,
    })
  } catch (error) {
    console.error('Create project error:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to create project',
      life: 3000,
    })
    throw new Error(`Failed to create project: ${error.message}`)
  }
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
 * Creates a new task.
 */
const createTask = async () => {
  try {
    await TaskRepository.create({ title: 'New Task', projectId: selectedProject.value?.id })
    toast.add({ severity: 'success', summary: 'Success', detail: 'Task created', life: 3000 })
  } catch (error) {
    console.error('Create task error:', error)
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to create task', life: 3000 })
    throw new Error(`Failed to create task: ${error.message}`)
  }
}

/**
 * Submits an RFI.
 */
const submitRFI = async () => {
  try {
    await RFIRepository.create({ title: 'New RFI', projectId: selectedProject.value?.id })
    toast.add({ severity: 'success', summary: 'Success', detail: 'RFI submitted', life: 3000 })
  } catch (error) {
    console.error('Submit RFI error:', error)
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to submit RFI', life: 3000 })
    throw new Error(`Failed to submit RFI: ${error.message}`)
  }
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
    command: createNewProject,
  },
  {
    label: 'Upload Document',
    icon: 'pi pi-upload',
    command: uploadDocument,
  },
  {
    label: 'Create Task',
    icon: 'pi pi-check-square',
    command: createTask,
  },
  {
    label: 'Submit RFI',
    icon: 'pi pi-question-circle',
    command: submitRFI,
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
/*
const filteredProjects = computed(() => {
  const query = searchQuery.value.toLowerCase()
  return projects.value.filter(
    (p) =>
      p.name.toLowerCase().includes(query) || (p.jobNumber || p.id).toLowerCase().includes(query),
  )
})*/

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

/**
 * Handles project search by filtering projects based on query.
 * Assigns to filteredProjects ref for dropdown suggestions.
 * @param {Object} event - AutoComplete complete event.
 */
const handleProjectSearch = (event) => {
  searchQuery.value = event.query
  const query = searchQuery.value.toLowerCase()
  filteredProjects.value = projects.value.filter(
    (p) =>
      p.name.toLowerCase().includes(query) || (p.jobNumber || p.id).toLowerCase().includes(query),
  )
}

const handleProjectSelect = (event) => {
  selectedProject.value = event.value
}

const toggleUserMenu = (event) => {
  userMenu.value.toggle(event)
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
