<template>
  <div class="h-full bg-surface-ground">
    <!-- Header -->
    <div class="bg-surface-card border-b border-surface px-6 py-4">
      <div class="flex justify-between items-center">
        <div>
          <h1 class="text-2xl font-bold text-surface-900">Dashboard</h1>
          <p class="text-surface-600 mt-1">
            Welcome back, {{ currentUser?.displayName || currentUser?.email }}
          </p>
        </div>
        <div class="flex gap-2">
          <Button
            @click="refreshData"
            :loading="loading"
            icon="pi pi-refresh"
            severity="secondary"
            size="small"
            label="Refresh"
          />
        </div>
      </div>
    </div>

    <!-- Dashboard Content -->
    <div class="p-6">
      <div v-if="loading" class="flex justify-center py-12">
        <ProgressSpinner />
      </div>

      <div v-else class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <!-- Quick Stats -->
        <Card class="col-span-full">
          <template #header>
            <div class="p-4 pb-0">
              <h2 class="text-lg font-semibold text-surface-900">Quick Stats</h2>
            </div>
          </template>
          <template #content>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div class="text-center p-4 border border-surface rounded-lg">
                <div class="text-2xl font-bold text-primary mb-1">{{ stats.totalProjects }}</div>
                <div class="text-sm text-surface-600">Total Projects</div>
              </div>
              <div class="text-center p-4 border border-surface rounded-lg">
                <div class="text-2xl font-bold text-orange-500 mb-1">{{ stats.activeRFIs }}</div>
                <div class="text-sm text-surface-600">Active RFIs</div>
              </div>
              <div class="text-center p-4 border border-surface rounded-lg">
                <div class="text-2xl font-bold text-green-500 mb-1">
                  {{ stats.pendingSubmittals }}
                </div>
                <div class="text-sm text-surface-600">Pending Submittals</div>
              </div>
              <div class="text-center p-4 border border-surface rounded-lg">
                <div class="text-2xl font-bold text-purple-500 mb-1">{{ stats.changeOrders }}</div>
                <div class="text-sm text-surface-600">Change Orders</div>
              </div>
            </div>
          </template>
        </Card>

        <!-- My Projects -->
        <Card class="col-span-full lg:col-span-1">
          <template #header>
            <div class="flex justify-between items-center p-4 pb-0">
              <h2 class="text-lg font-semibold text-surface-900">My Projects</h2>
              <Button
                @click="$router.push('/')"
                text
                size="small"
                icon="pi pi-external-link"
                label="View All"
              />
            </div>
          </template>
          <template #content>
            <div v-if="projects.length === 0" class="text-center py-8">
              <i class="pi pi-folder-open text-4xl text-surface-400 mb-3"></i>
              <p class="text-surface-600">No projects assigned</p>
            </div>
            <div v-else class="space-y-3 max-h-80 overflow-y-auto">
              <div
                v-for="project in projects.slice(0, 5)"
                :key="project.id"
                @click="$router.push(`/project/${project.id}`)"
                class="p-3 border border-surface rounded-lg hover:bg-surface-hover cursor-pointer transition-colors"
              >
                <div class="flex justify-between items-start mb-2">
                  <h3 class="font-medium text-surface-900 truncate">{{ project.name }}</h3>
                  <Tag :value="project.phase" :severity="getPhaseSeverity(project.phase)" />
                </div>
                <p class="text-sm text-surface-600 mb-2">{{ project.jobNumber }}</p>
                <div class="text-xs text-surface-500">
                  Updated {{ formatTimeAgo(project.updatedAt) }}
                </div>
              </div>
            </div>
          </template>
        </Card>

        <!-- Recent RFIs -->
        <Card class="col-span-full lg:col-span-1">
          <template #header>
            <div class="flex justify-between items-center p-4 pb-0">
              <h2 class="text-lg font-semibold text-surface-900">Recent RFIs</h2>
              <Button text size="small" icon="pi pi-external-link" label="View All" />
            </div>
          </template>
          <template #content>
            <div v-if="recentRFIs.length === 0" class="text-center py-8">
              <i class="pi pi-question-circle text-4xl text-surface-400 mb-3"></i>
              <p class="text-surface-600">No recent RFIs</p>
            </div>
            <div v-else class="space-y-3 max-h-80 overflow-y-auto">
              <div
                v-for="rfi in recentRFIs.slice(0, 5)"
                :key="rfi.id"
                class="p-3 border border-surface rounded-lg hover:bg-surface-hover transition-colors"
              >
                <div class="flex justify-between items-start mb-2">
                  <h3 class="font-medium text-surface-900 text-sm">{{ rfi.title }}</h3>
                  <Tag :value="rfi.status" :severity="getRFIStatusSeverity(rfi.status)" />
                </div>
                <p class="text-xs text-surface-600 mb-1">{{ rfi.priority }} Priority</p>
                <div class="text-xs text-surface-500">
                  {{ formatTimeAgo(rfi.createdAt) }}
                </div>
              </div>
            </div>
          </template>
        </Card>

        <!-- Recent Activity -->
        <Card class="col-span-full lg:col-span-1">
          <template #header>
            <div class="p-4 pb-0">
              <h2 class="text-lg font-semibold text-surface-900">Recent Activity</h2>
            </div>
          </template>
          <template #content>
            <div v-if="recentActivity.length === 0" class="text-center py-8">
              <i class="pi pi-clock text-4xl text-surface-400 mb-3"></i>
              <p class="text-surface-600">No recent activity</p>
            </div>
            <div v-else class="space-y-3 max-h-80 overflow-y-auto">
              <div
                v-for="activity in recentActivity.slice(0, 8)"
                :key="activity.id"
                class="flex items-start gap-3"
              >
                <div
                  class="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs"
                  :class="getActivityIconClass(activity.action)"
                >
                  <i :class="getActivityIcon(activity.action)"></i>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm text-surface-900 mb-1">{{ activity.description }}</p>
                  <div class="text-xs text-surface-500">
                    {{ formatTimeAgo(activity.timestamp) }}
                  </div>
                </div>
              </div>
            </div>
          </template>
        </Card>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { ProgressSpinner, Card, Button, Tag } from 'primevue'
import authService from '@/authService'
import firebaseService from '@/services/firebaseService'

// Reactive state
const loading = ref(true)
const projects = ref([])
const recentRFIs = ref([])
const recentSubmittals = ref([])
const recentChangeOrders = ref([])
const recentActivity = ref([])

// Computed
const currentUser = computed(() => authService.currentUser)

const stats = computed(() => ({
  totalProjects: projects.value.length,
  activeRFIs: recentRFIs.value.filter((rfi) => ['open', 'submitted'].includes(rfi.status)).length,
  pendingSubmittals: recentSubmittals.value.filter((sub) => sub.status === 'pending').length,
  changeOrders: recentChangeOrders.value.filter((co) => co.status === 'proposed').length,
}))

// Methods
const loadDashboardData = async () => {
  try {
    loading.value = true

    // Load all data in parallel
    const [allProjects, allRFIs, allSubmittals, allChangeOrders, allActivity] = await Promise.all([
      firebaseService.getAllProjects(),
      firebaseService.getAllRFIs(),
      firebaseService.getAllSubmittals(),
      firebaseService.getAllChangeOrders(),
      // Get activity from all projects - you might want to limit this
      Promise.resolve([]), // Placeholder for activity
    ])

    // Filter data based on user permissions
    // For now, showing all data - you should filter based on user's assigned projects
    projects.value = allProjects.slice(0, 10) // Limit for dashboard
    recentRFIs.value = allRFIs.slice(0, 10)
    recentSubmittals.value = allSubmittals.slice(0, 10)
    recentChangeOrders.value = allChangeOrders.slice(0, 10)
    recentActivity.value = allActivity.slice(0, 20)
  } catch (error) {
    console.error('Error loading dashboard data:', error)
  } finally {
    loading.value = false
  }
}

const refreshData = () => {
  loadDashboardData()
}

const formatTimeAgo = (timestamp) => {
  if (!timestamp) return 'Unknown'

  const now = new Date()
  const time = new Date(timestamp)
  const diffInMs = now - time
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
  const diffInHours = Math.floor(diffInMinutes / 60)
  const diffInDays = Math.floor(diffInHours / 24)

  if (diffInMinutes < 1) return 'Just now'
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`
  if (diffInHours < 24) return `${diffInHours}h ago`
  if (diffInDays < 7) return `${diffInDays}d ago`
  return time.toLocaleDateString()
}

const getPhaseSeverity = (phase) => {
  const severityMap = {
    'pre-construction': 'warning',
    construction: 'info',
    'close-out': 'success',
    complete: 'success',
  }
  return severityMap[phase] || 'secondary'
}

const getRFIStatusSeverity = (status) => {
  const severityMap = {
    draft: 'secondary',
    open: 'info',
    submitted: 'warning',
    answered: 'success',
    closed: 'success',
  }
  return severityMap[status] || 'secondary'
}

const getActivityIconClass = (action) => {
  const classMap = {
    created_project: 'bg-blue-100 text-blue-700',
    updated_project_phase: 'bg-purple-100 text-purple-700',
    created_rfi: 'bg-orange-100 text-orange-700',
    created_submittal: 'bg-green-100 text-green-700',
    created_change_order: 'bg-yellow-100 text-yellow-700',
    uploaded_document: 'bg-pink-100 text-pink-700',
  }
  return classMap[action] || 'bg-surface-100 text-surface-600'
}

const getActivityIcon = (action) => {
  const iconMap = {
    created_project: 'pi pi-folder',
    updated_project_phase: 'pi pi-refresh',
    created_rfi: 'pi pi-question-circle',
    created_submittal: 'pi pi-file-check',
    created_change_order: 'pi pi-file-edit',
    uploaded_document: 'pi pi-file',
  }
  return iconMap[action] || 'pi pi-circle'
}

// Lifecycle
onMounted(() => {
  loadDashboardData()
})
</script>
