<template>
  <div class="h-full flex flex-col bg-gray-50">
    <div v-if="loading" class="flex items-center justify-center h-full text-lg text-gray-500">
      {{ error ? error : 'Loading project...' }}
    </div>
    <div v-else-if="error" class="flex items-center justify-center h-full">
      <div class="text-red-600 bg-red-50 border border-red-200 rounded-lg m-5 p-10 text-center text-lg">
        {{ error }}
      </div>
    </div>
    <div v-else class="h-full flex flex-col">
      <!-- Refined Project Header -->
      <div class="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <!-- Main Title Row -->
        <div class="flex justify-between items-start mb-3">
          <div>
            <h1 class="text-xl font-semibold text-gray-900">
              {{ project.jobNumber }} - {{ project.name || 'Loading...' }}
            </h1>
          </div>
          <div class="flex gap-2">
            <Button
              icon="pi pi-pencil"
              size="small"
              severity="secondary"
              aria-label="Quick Edit"
              @click="showQuickEdit = true"
            />
            <Button
              icon="pi pi-cog"
              size="small"
              severity="secondary"
              aria-label="Project Settings"
              @click="goToProjectSettings"
            />
          </div>
        </div>

        <!-- Project Details Row -->
        <div class="mb-3 flex gap-6 text-sm text-gray-600 flex-wrap">
          <div v-if="project.client" class="flex items-center gap-1">
            <i class="pi pi-building text-xs"></i>
            <span class="font-medium">Client:</span>
            <span>{{ project.client }}</span>
          </div>
          <div v-if="project.architect" class="flex items-center gap-1">
            <i class="pi pi-pencil text-xs"></i>
            <span class="font-medium">Architect:</span>
            <span>{{ project.architect }}</span>
          </div>
          <div v-if="project.projectManager" class="flex items-center gap-1">
            <i class="pi pi-user text-xs"></i>
            <span class="font-medium">PM:</span>
            <span>{{ project.projectManager }}</span>
          </div>
          <div v-if="project.superintendent" class="flex items-center gap-1">
            <i class="pi pi-hard-hat text-xs"></i>
            <span class="font-medium">Super:</span>
            <span>{{ project.superintendent }}</span>
          </div>
        </div>

        <!-- Status & Metrics Row -->
        <div class="flex gap-4 items-center flex-wrap">
          <span
            class="px-2.5 py-1 rounded-full text-xs font-medium"
            :class="{
              'bg-yellow-100 text-yellow-800': project.phase === 'pre-construction',
              'bg-blue-100 text-blue-800': project.phase === 'construction',
              'bg-green-100 text-green-800': project.phase === 'close-out',
              'bg-teal-100 text-teal-800': project.phase === 'complete',
            }"
          >
            {{ formatPhase(project.phase) }}
          </span>
          <span class="text-sm font-medium text-green-600">
            ${{ formatCurrency(project.cost) }}
          </span>
          <span
            class="px-2.5 py-1 rounded text-xs font-medium"
            :class="{
              'bg-green-100 text-green-800': project.contractSigned,
              'bg-red-100 text-red-800': !project.contractSigned,
            }"
          >
            {{ project.contractSigned ? 'Contract Signed' : 'Contract Pending' }}
          </span>
          <div v-if="project.startDate" class="text-sm text-gray-600">
            <span class="font-medium">Start:</span>
            <span>{{ formatDate(project.startDate) }}</span>
          </div>
          <div v-if="project.endDate" class="text-sm text-gray-600">
            <span class="font-medium">End:</span>
            <span>{{ formatDate(project.endDate) }}</span>
          </div>
        </div>
      </div>

      <!-- Dashboard Content -->
      <div class="flex-1 overflow-y-auto p-6">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Main Content Area: 2/3 width -->
          <div class="lg:col-span-2 space-y-6">
            <!-- Recent Activity Card -->
            <div class="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div class="px-4 py-3 border-b border-gray-200">
                <h3 class="text-sm font-medium text-gray-900">Recent Activity</h3>
              </div>
              <div class="p-4 max-h-80 overflow-y-auto">
                <ActivityLog :activities="activities" />
              </div>
            </div>

            <!-- Upcoming Tasks Card -->
            <div class="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div class="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                <h3 class="text-sm font-medium text-gray-900">Upcoming Tasks</h3>
                <Button icon="pi pi-plus" size="small" severity="secondary" label="Add Task" />
              </div>
              <div class="p-4">
                <div class="text-center py-8 text-gray-500 text-sm">
                  No upcoming tasks
                </div>
              </div>
            </div>
          </div>

          <!-- Sidebar: 1/3 width -->
          <div class="space-y-6">
            <!-- Quick Stats Card -->
            <div class="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div class="px-4 py-3 border-b border-gray-200">
                <h3 class="text-sm font-medium text-gray-900">Quick Stats</h3>
              </div>
              <div class="p-4 space-y-3">
                <div class="flex justify-between items-center">
                  <span class="text-xs text-gray-600">RFIs</span>
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-medium">{{ rfis.length }}</span>
                    <Button
                      icon="pi pi-plus"
                      size="small"
                      severity="secondary"
                      @click="createNewRFI"
                      class="w-5 h-5"
                    />
                  </div>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-xs text-gray-600">Submittals</span>
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-medium">{{ submittals.length }}</span>
                    <Button
                      icon="pi pi-plus"
                      size="small"
                      severity="secondary"
                      @click="createNewSubmittal"
                      class="w-5 h-5"
                    />
                  </div>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-xs text-gray-600">Change Orders</span>
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-medium">{{ changeOrders.length }}</span>
                    <Button
                      icon="pi pi-plus"
                      size="small"
                      severity="secondary"
                      @click="createNewChangeOrder"
                      class="w-5 h-5"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- Project Team Card -->
            <div class="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div class="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                <h3 class="text-sm font-medium text-gray-900">Project Team</h3>
                <Button icon="pi pi-users" size="small" severity="secondary" />
              </div>
              <div class="p-4">
                <div class="text-center py-4 text-gray-500 text-sm">
                  Team members coming soon
                </div>
              </div>
            </div>

            <!-- Recent Documents Card -->
            <div class="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div class="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                <h3 class="text-sm font-medium text-gray-900">Recent Documents</h3>
                <Button icon="pi pi-file" size="small" severity="secondary" />
              </div>
              <div class="p-4">
                <div class="text-center py-4 text-gray-500 text-sm">
                  No recent documents
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Edit Modal -->
    <ProjectModal
      v-model:visible="showQuickEdit"
      :project="project"
      @project-updated="handleProjectUpdated"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import firebaseService from '@/firebaseService'
import ActivityLog from './ActivityLog.vue'
import ProjectModal from './modals/ProjectModal.vue'

// Props and existing setup (keep your existing code)
const props = defineProps({
  projectId: {
    type: String,
    required: true,
  },
})

const router = useRouter()

// Reactive state (keep your existing state)
const project = ref({})
const rfis = ref([])
const submittals = ref([])
const changeOrders = ref([])
const activities = ref([])
const loading = ref(true)
const error = ref(null)
const subscriptions = ref([])

// New state for quick edit
const showQuickEdit = ref(false)

// Helper methods
const formatCurrency = (amount) => {
  if (!amount) return '0'
  return new Intl.NumberFormat('en-US').format(amount)
}

const formatPhase = (phase) => {
  const phaseMap = {
    'pre-construction': 'Pre-Construction',
    'construction': 'Construction',
    'close-out': 'Close-Out',
    'complete': 'Complete'
  }
  return phaseMap[phase] || phase
}

const goToProjectSettings = () => {
  // Navigate to project settings page (to be implemented)
  router.push(`/project/${props.projectId}/settings`)
}

const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

const handleProjectUpdated = (updatedProject) => {
  // Update local project data
  project.value = { ...project.value, ...updatedProject }
}

// Methods
const loadProjectData = async () => {
  // Load initial project data
  const [projectData, activitiesData] = await Promise.all([
    firebaseService.getProject(props.projectId),
    firebaseService.getActivityByProject(props.projectId),
  ])

  if (!projectData) {
    throw new Error('Project not found')
  }

  project.value = projectData
  activities.value = activitiesData.slice(0, 10) // Show last 10 activities
  loading.value = false
}

const setupRealtimeListeners = () => {
  // Subscribe to real-time updates
  const projectSub = firebaseService.subscribeToProject(props.projectId, (projectData) => {
    if (projectData) {
      project.value = projectData
    }
  })

  const rfiSub = firebaseService.subscribeToProjectRFIs(props.projectId, (rfiData) => {
    rfis.value = rfiData
  })

  const submittalSub = firebaseService.subscribeToProjectSubmittals(
    props.projectId,
    (submittalData) => {
      submittals.value = submittalData
    },
  )

  const changeOrderSub = firebaseService.subscribeToProjectChangeOrders(
    props.projectId,
    (changeOrderData) => {
      changeOrders.value = changeOrderData
    },
  )

  // Store subscriptions for cleanup
  subscriptions.value = [projectSub, rfiSub, submittalSub, changeOrderSub]
}

const createNewRFI = async () => {
  try {
    const rfiData = {
      projectId: props.projectId,
      title: 'New RFI',
      description: '',
      priority: 'medium',
      submittedBy: firebaseService.getCurrentUserId(),
      assignedTo: '', // You might want to show a modal to select this
    }

    await firebaseService.createRFI(rfiData)
    // Real-time listener will update the UI automatically
  } catch (error) {
    console.error('Error creating RFI:', error)
    alert('Failed to create RFI')
  }
}

const createNewSubmittal = async () => {
  try {
    const submittalData = {
      projectId: props.projectId,
      title: 'New Submittal',
      description: '',
      submittedBy: firebaseService.getCurrentUserId(),
      reviewedBy: '',
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 2 weeks from now
    }

    await firebaseService.createSubmittal(submittalData)
  } catch (error) {
    console.error('Error creating submittal:', error)
    alert('Failed to create submittal')
  }
}

const createNewChangeOrder = async () => {
  try {
    const changeOrderData = {
      projectId: props.projectId,
      title: 'New Change Order',
      description: '',
      requestedBy: firebaseService.getCurrentUserId(),
      costImpact: 0,
      timeImpact: 0,
      reason: 'client-request',
    }

    await firebaseService.createChangeOrder(changeOrderData)
  } catch (error) {
    console.error('Error creating change order:', error)
    alert('Failed to create change order')
  }
}

// Lifecycle hooks
watch(
  () => props.projectId,
  async (newProjectId, oldProjectId) => {
    console.log('ProjectId changed from', oldProjectId, 'to', newProjectId)
    if (newProjectId && newProjectId !== oldProjectId) {
      // Clean up existing subscriptions
      subscriptions.value.forEach((unsubscribe) => {
        if (typeof unsubscribe === 'function') {
          unsubscribe()
        } else {
          firebaseService.unsubscribe(unsubscribe)
        }
      })

      // Reset state and load new project
      loading.value = true
      error.value = null

      try {
        await loadProjectData()
        setupRealtimeListeners()
      } catch (err) {
        console.error('Error loading project:', err)
        error.value = err.message
        loading.value = false
      }
    }
  },
)

// Lifecycle hooks
onMounted(async () => {
  try {
    await loadProjectData()
    setupRealtimeListeners()
  } catch (err) {
    console.error('Error loading project:', err)
    error.value = err.message
    loading.value = false
  }
})

onBeforeUnmount(() => {
  // Clean up all subscriptions
  subscriptions.value.forEach((unsubscribe) => {
    if (typeof unsubscribe === 'function') {
      unsubscribe()
    } else {
      firebaseService.unsubscribe(unsubscribe)
    }
  })
})
</script>

<style scoped>
/* Only custom scrollbar styling that Tailwind can't handle */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: var(--p-surface-100);
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: var(--p-surface-300);
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: var(--p-surface-400);
}
</style>
