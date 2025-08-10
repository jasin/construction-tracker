<template>
  <div class="h-full flex flex-col bg-white">
    <div v-if="loading" class="flex items-center justify-center h-full text-lg text-gray-500">
      {{ error ? error : 'Loading project...' }}
    </div>
    <div v-else-if="error" class="flex items-center justify-center h-full">
      <div
        class="text-red-600 bg-red-50 border border-red-200 rounded-lg m-5 p-10 text-center text-lg"
      >
        {{ error }}
      </div>
    </div>
    <div v-else class="h-full flex flex-col">
      <!-- Project Header -->
      <div class="bg-white border-b-2 border-gray-200 px-7 py-6 flex-shrink-0 shadow-sm">
        <h2 class="m-0 mb-3 text-gray-700 text-3xl font-semibold">
          {{ project.jobNumber }} - {{ project.name || 'Loading...' }}
        </h2>
        <div class="flex gap-5 items-center flex-wrap">
          <span
            class="px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide"
            :class="{
              'bg-yellow-100 text-yellow-800 border border-yellow-200':
                project.phase === 'pre-construction',
              'bg-blue-100 text-blue-800 border border-blue-200': project.phase === 'construction',
              'bg-green-100 text-green-800 border border-green-200': project.phase === 'close-out',
              'bg-teal-100 text-teal-800 border border-teal-200': project.phase === 'complete',
            }"
          >
            {{ project.phase || 'N/A' }}
          </span>
          <span
            class="font-bold text-lg text-green-600 bg-green-50 px-3 py-1.5 rounded-md border border-green-200"
          >
            ${{ formatCurrency(project.cost) }}
          </span>
          <span
            class="px-3 py-1.5 rounded-md text-xs font-semibold uppercase"
            :class="{
              'bg-green-100 text-green-800 border border-green-200': project.contractSigned,
              'bg-red-100 text-red-800 border border-red-200': !project.contractSigned,
            }"
          >
            Contract: {{ project.contractSigned ? 'Signed' : 'Pending' }}
          </span>
          <Button icon="pi pi-file-edit" variant="text" rounded />
        </div>
      </div>

      <!-- Dashboard Sections -->
      <div class="flex-1 overflow-y-auto p-7 grid grid-cols-1 lg:grid-cols-2 gap-7 content-start">
        <div
          class="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col h-fit hover:shadow-md transition-shadow"
        >
          <div
            class="flex justify-between items-center px-6 py-5 border-b border-gray-200 bg-gray-50 rounded-t-xl"
          >
            <h3 class="m-0 text-gray-700 text-lg font-semibold">RFIs ({{ rfis.length }})</h3>
            <button
              @click="createNewRFI"
              class="bg-emerald-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-emerald-600 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:bg-emerald-700 transition-all whitespace-nowrap"
            >
              New RFI
            </button>
          </div>
          <div class="px-6 py-5 flex-1 overflow-y-auto max-h-96">
            <RFIList :rfis="rfiObject" :projectId="projectId" />
          </div>
        </div>

        <div
          class="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col h-fit hover:shadow-md transition-shadow"
        >
          <div
            class="flex justify-between items-center px-6 py-5 border-b border-gray-200 bg-gray-50 rounded-t-xl"
          >
            <h3 class="m-0 text-gray-700 text-lg font-semibold">
              Submittals ({{ submittals.length }})
            </h3>
            <button
              @click="createNewSubmittal"
              class="bg-emerald-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-emerald-600 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:bg-emerald-700 transition-all whitespace-nowrap"
            >
              New Submittal
            </button>
          </div>
          <div class="px-6 py-5 flex-1 overflow-y-auto max-h-96">
            <SubmittalList :submittals="submittalObject" :projectId="projectId" />
          </div>
        </div>

        <div
          class="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col h-fit hover:shadow-md transition-shadow"
        >
          <div
            class="flex justify-between items-center px-6 py-5 border-b border-gray-200 bg-gray-50 rounded-t-xl"
          >
            <h3 class="m-0 text-gray-700 text-lg font-semibold">
              Change Orders ({{ changeOrders.length }})
            </h3>
            <button
              @click="createNewChangeOrder"
              class="bg-emerald-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-emerald-600 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:bg-emerald-700 transition-all whitespace-nowrap"
            >
              New Change Order
            </button>
          </div>
          <div class="px-6 py-5 flex-1 overflow-y-auto max-h-96">
            <ChangeOrderList :changeOrders="changeOrderObject" :projectId="projectId" />
          </div>
        </div>

        <div
          class="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col h-fit hover:shadow-md transition-shadow"
        >
          <div
            class="flex justify-between items-center px-6 py-5 border-b border-gray-200 bg-gray-50 rounded-t-xl"
          >
            <h3 class="m-0 text-gray-700 text-lg font-semibold">Recent Activity</h3>
          </div>
          <div class="px-6 py-5 flex-1 overflow-y-auto max-h-96">
            <ActivityLog :activities="activities" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import firebaseService from '@/firebaseService'
import RFIList from './RFIList.vue'
import SubmittalList from './SubmittalList.vue'
import ChangeOrderList from './ChangeOrderList.vue'
import ActivityLog from './ActivityLog.vue'
import { Button } from 'primevue'

// Props
const props = defineProps({
  projectId: {
    type: String,
    required: true,
  },
})

// Reactive state
const project = ref({})
const rfis = ref([])
const submittals = ref([])
const changeOrders = ref([])
const activities = ref([])
const loading = ref(true)
const error = ref(null)
const subscriptions = ref([]) // Keep track of subscriptions for cleanup

// Computed properties
const rfiObject = computed(() => {
  return rfis.value.reduce((obj, rfi) => {
    obj[rfi.id] = rfi
    return obj
  }, {})
})

const submittalObject = computed(() => {
  return submittals.value.reduce((obj, submittal) => {
    obj[submittal.id] = submittal
    return obj
  }, {})
})

const changeOrderObject = computed(() => {
  return changeOrders.value.reduce((obj, co) => {
    obj[co.id] = co
    return obj
  }, {})
})

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

const formatCurrency = (amount) => {
  if (!amount) return '0'
  return new Intl.NumberFormat('en-US').format(amount)
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
