<template>
  <div class="project-dashboard">
    <div v-if="loading" class="loading">Loading project data...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else>
      <div class="project-header">
        <h2>{{ project.jobNumber }} - {{ project.name || 'Loading...' }}</h2>
        <div class="project-meta">
          <span class="phase-badge" :class="project.phase">{{ project.phase || 'N/A' }}</span>
          <span class="cost">${{ formatCurrency(project.cost) }}</span>
          <span class="contract-status" :class="{ signed: project.contractSigned }">
            Contract: {{ project.contractSigned ? 'Signed' : 'Pending' }}
          </span>
        </div>
      </div>

      <div class="dashboard-sections">
        <div class="section">
          <div class="section-header">
            <h3>RFIs ({{ rfis.length }})</h3>
            <button @click="createNewRFI" class="btn-primary">New RFI</button>
          </div>
          <RFIList :rfis="rfiObject" :projectId="projectId" />
        </div>

        <div class="section">
          <div class="section-header">
            <h3>Submittals ({{ submittals.length }})</h3>
            <button @click="createNewSubmittal" class="btn-primary">New Submittal</button>
          </div>
          <SubmittalList :submittals="submittalObject" :projectId="projectId" />
        </div>

        <div class="section">
          <div class="section-header">
            <h3>Change Orders ({{ changeOrders.length }})</h3>
            <button @click="createNewChangeOrder" class="btn-primary">New Change Order</button>
          </div>
          <ChangeOrderList :changeOrders="changeOrderObject" :projectId="projectId" />
        </div>

        <div class="section">
          <div class="section-header">
            <h3>Recent Activity</h3>
          </div>
          <ActivityLog :activities="activities" />
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
  console.log('Loading project with ID:', props.projectId) //debug

  // Load initial project data
  const [projectData, activitiesData] = await Promise.all([
    firebaseService.getProject(props.projectId),
    firebaseService.getActivityByProject(props.projectId),
  ])

  console.log('Project data received:', projectData) //debug

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

onMounted(async () => {
  // Load initial project data
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
.project-dashboard {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.loading,
.error {
  text-align: center;
  padding: 40px;
  font-size: 18px;
}

.error {
  color: #dc3545;
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 8px;
}

.loading {
  color: #6c757d;
}

.project-header {
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 2px solid #e9ecef;
}

.project-header h2 {
  margin: 0 0 10px 0;
  color: #343a40;
}

.project-meta {
  display: flex;
  gap: 15px;
  align-items: center;
}

.phase-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: bold;
  text-transform: uppercase;
}

.phase-badge.pre-construction {
  background-color: #fff3cd;
  color: #856404;
}

.phase-badge.construction {
  background-color: #cce5ff;
  color: #004085;
}

.phase-badge.close-out {
  background-color: #d4edda;
  color: #155724;
}

.phase-badge.complete {
  background-color: #d1ecf1;
  color: #0c5460;
}

.cost {
  font-weight: bold;
  color: #28a745;
}

.contract-status {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.contract-status.signed {
  background-color: #d4edda;
  color: #155724;
}

.contract-status:not(.signed) {
  background-color: #f8d7da;
  color: #721c24;
}

.dashboard-sections {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;
}

.section {
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 20px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #e9ecef;
}

.section-header h3 {
  margin: 0;
  color: #495057;
}

.btn-primary {
  background-color: #007bff;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.btn-primary:hover {
  background-color: #0056b3;
}

@media (max-width: 768px) {
  .dashboard-sections {
    grid-template-columns: 1fr;
  }

  .project-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}
</style>
