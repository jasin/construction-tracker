<template>
  <div class="h-full flex flex-col bg-gray-50">
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
              aria-label="Edit Project"
              @click="showProjectSlideOver = true"
            />
            <Button
              icon="pi pi-cog"
              size="small"
              severity="secondary"
              aria-label="Project Settings"
              @click="goToProjectSettings"
            />
            <Button
              icon="pi pi-clock"
              size="small"
              severity="secondary"
              aria-label="Recent Activity"
              @click="showActivityFlyout = true"
              :badge="activities.length > 0 ? activities.length.toString() : null"
              badge-severity="info"
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
          <Tag
            :value="formatPhase(project.phase)"
            :severity="getPhaseSeverity(project.phase)"
          />
          <span class="text-sm font-medium text-green-600">
            {{ formatCurrency(project.cost) }}
          </span>
          <Tag
            :value="project.contractSigned ? 'Contract Signed' : 'Contract Pending'"
            :severity="project.contractSigned ? 'success' : 'danger'"
          />
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

      <!-- Tab Navigation with PrimeVue v4 Tabs Component -->
      <div class="bg-white border-b border-gray-200">
        <Tabs v-model:value="activeTab">
          <TabList class="px-6 bg-transparent border-0">
            <Tab
              value="overview"
              class="px-6 py-4 border-0 bg-transparent border-b-2 border-transparent text-gray-600 font-medium hover:text-gray-700 data-[p-active=true]:border-b-blue-500 data-[p-active=true]:text-gray-900"
            >
              <span class="flex items-center gap-2">
                <i class="pi pi-home"></i>
                <span>Project Overview</span>
              </span>
            </Tab>
            <Tab
              value="construction"
              class="px-6 py-4 border-0 bg-transparent border-b-2 border-transparent text-gray-600 font-medium hover:text-gray-700 data-[p-active=true]:border-b-blue-500 data-[p-active=true]:text-gray-900"
            >
              <span class="flex items-center gap-2">
                <i class="pi pi-wrench"></i>
                <span>Construction Management</span>
                <Badge
                  v-if="constructionItemsCount > 0"
                  :value="constructionItemsCount.toString()"
                  severity="warning"
                />
              </span>
            </Tab>
            <Tab
              value="documents"
              class="px-6 py-4 border-0 bg-transparent border-b-2 border-transparent text-gray-600 font-medium hover:text-gray-700 data-[p-active=true]:border-b-blue-500 data-[p-active=true]:text-gray-900"
            >
              <span class="flex items-center gap-2">
                <i class="pi pi-file"></i>
                <span>Documents</span>
                <Badge
                  v-if="documentsCount > 0"
                  :value="documentsCount.toString()"
                  severity="secondary"
                />
              </span>
            </Tab>
          </TabList>
        </Tabs>
      </div>

      <!-- Tab Content -->
      <div class="flex-1 overflow-y-auto">
        <!-- TabPanels with padding removed since we add it per panel -->
        <TabPanels v-model:value="activeTab" class="p-0 bg-transparent border-0">
          <TabPanel value="overview" class="p-0">
            <div class="p-6">
              <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <!-- Main Content Area: Full width -->
                <div class="lg:col-span-3 space-y-6">
                  <!-- Upcoming Tasks Card -->
                  <div class="bg-white rounded-lg border border-gray-200 shadow-sm">
                    <div class="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                      <h3 class="text-sm font-medium text-gray-900">
                        Upcoming Tasks ({{ tasks.length }})
                      </h3>
                      <Button
                        icon="pi pi-plus"
                        size="small"
                        severity="secondary"
                        label="Add Task"
                        @click="
                          () => {
                            editingTask = null
                            showTaskSlideOver = true
                          }
                        "
                      />
                    </div>
                    <div class="p-4">
                      <div v-if="tasks.length === 0" class="text-center py-8 text-gray-500 text-sm">
                        No tasks yet.
                        <button
                          @click="
                            () => {
                              editingTask = null
                              showTaskSlideOver = true
                            }
                          "
                          class="text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Create your first task
                        </button>
                      </div>
                      <div v-else class="space-y-3">
                        <div
                          v-for="task in tasks.slice(0, 5)"
                          :key="task.id"
                          @click="editTask(task)"
                          class="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                          <div class="flex items-center gap-3 flex-1 min-w-0">
                            <div
                              class="w-3 h-3 rounded-full flex-shrink-0"
                              :class="getPriorityClasses(task.priority)"
                            ></div>
                            <div class="flex-1 min-w-0">
                              <p class="text-sm font-medium text-gray-900 truncate">{{ task.title }}</p>
                              <p class="text-xs text-gray-500">
                                {{ getUserName(task.assignedTo, usersMap) }} • Due
                                {{ formatDate(task.dueDate) }}
                              </p>
                            </div>
                          </div>
                          <Tag
                            :value="formatTaskStatus(task.status)"
                            :severity="getStatusSeverity(task.status)"
                            size="small"
                          />
                        </div>
                        <div v-if="tasks.length > 5" class="text-center pt-2">
                          <Button
                            @click="$router.push('/tasks')"
                            label="View all tasks"
                            link
                            size="small"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Project Overview Cards -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                            icon="pi pi-external-link"
                            size="small"
                            severity="secondary"
                            text
                            @click="activeTab = 'construction'"
                            class="w-5 h-5 p-0"
                          />
                        </div>
                      </div>
                      <div class="flex justify-between items-center">
                        <span class="text-xs text-gray-600">Submittals</span>
                        <div class="flex items-center gap-2">
                          <span class="text-sm font-medium">{{ submittals.length }}</span>
                          <Button
                            icon="pi pi-external-link"
                            size="small"
                            severity="secondary"
                            text
                            @click="activeTab = 'construction'"
                            class="w-5 h-5 p-0"
                          />
                        </div>
                      </div>
                      <div class="flex justify-between items-center">
                        <span class="text-xs text-gray-600">Change Orders</span>
                        <div class="flex items-center gap-2">
                          <span class="text-sm font-medium">{{ changeOrders.length }}</span>
                          <Button
                            icon="pi pi-external-link"
                            size="small"
                            severity="secondary"
                            text
                            @click="activeTab = 'construction'"
                            class="w-5 h-5 p-0"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Project Team Card -->
                  <div class="bg-white rounded-lg border border-gray-200 shadow-sm">
                    <div class="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                      <h3 class="text-sm font-medium text-gray-900">Project Team</h3>
                      <Button icon="pi pi-users" size="small" severity="secondary" text />
                    </div>
                    <div class="p-4">
                      <div class="space-y-3">
                        <div v-if="project.projectManager" class="flex items-center gap-3">
                          <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <i class="pi pi-user text-blue-600 text-sm"></i>
                          </div>
                          <div>
                            <p class="text-sm font-medium text-gray-900">{{ project.projectManager }}</p>
                            <p class="text-xs text-gray-500">Project Manager</p>
                          </div>
                        </div>
                        <div v-if="project.superintendent" class="flex items-center gap-3">
                          <div class="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                            <i class="pi pi-hard-hat text-yellow-600 text-sm"></i>
                          </div>
                          <div>
                            <p class="text-sm font-medium text-gray-900">{{ project.superintendent }}</p>
                            <p class="text-xs text-gray-500">Superintendent</p>
                          </div>
                        </div>
                        <div v-if="project.architect" class="flex items-center gap-3">
                          <div class="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                            <i class="pi pi-pencil text-purple-600 text-sm"></i>
                          </div>
                          <div>
                            <p class="text-sm font-medium text-gray-900">{{ project.architect }}</p>
                            <p class="text-xs text-gray-500">Architect</p>
                          </div>
                        </div>
                        <div v-if="!project.projectManager && !project.superintendent && !project.architect" class="text-center py-4 text-gray-500 text-sm">
                          No team members assigned
                        </div>
                      </div>
                    </div>
                  </div>
                  <!-- Project Team Card -->
                  <div class="bg-white rounded-lg border border-gray-200 shadow-sm">
                    <div class="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                      <h3 class="text-sm font-medium text-gray-900">Project Team</h3>
                      <Button icon="pi pi-users" size="small" severity="secondary" text />
                    </div>
                    <div class="p-4">
                      <div class="space-y-3">
                        <div v-if="project.projectManager" class="flex items-center gap-3">
                          <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <i class="pi pi-user text-blue-600 text-sm"></i>
                          </div>
                          <div>
                            <p class="text-sm font-medium text-gray-900">{{ project.projectManager }}</p>
                            <p class="text-xs text-gray-500">Project Manager</p>
                          </div>
                        </div>
                        <div v-if="project.superintendent" class="flex items-center gap-3">
                          <div class="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                            <i class="pi pi-hard-hat text-yellow-600 text-sm"></i>
                          </div>
                          <div>
                            <p class="text-sm font-medium text-gray-900">{{ project.superintendent }}</p>
                            <p class="text-xs text-gray-500">Superintendent</p>
                          </div>
                        </div>
                        <div v-if="project.architect" class="flex items-center gap-3">
                          <div class="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                            <i class="pi pi-pencil text-purple-600 text-sm"></i>
                          </div>
                          <div>
                            <p class="text-sm font-medium text-gray-900">{{ project.architect }}</p>
                            <p class="text-xs text-gray-500">Architect</p>
                          </div>
                        </div>
                        <div v-if="!project.projectManager && !project.superintendent && !project.architect" class="text-center py-4 text-gray-500 text-sm">
                          No team members assigned
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Documents Card -->
                  <div class="bg-white rounded-lg border border-gray-200 shadow-sm">
                    <div class="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                      <h3 class="text-sm font-medium text-gray-900">Recent Documents</h3>
                      <div class="flex gap-2">
                        <Button
                          icon="pi pi-upload"
                          size="small"
                          severity="secondary"
                          text
                          @click="showDocumentUploader = true"
                        />
                        <Button
                          icon="pi pi-external-link"
                          size="small"
                          severity="secondary"
                          text
                          @click="activeTab = 'documents'"
                        />
                      </div>
                    </div>
                    <div class="p-4">
                      <div
                        v-if="recentDocuments.length === 0"
                        class="text-center py-4 text-gray-500 text-sm"
                      >
                        No documents yet.
                        <button
                          @click="showDocumentUploader = true"
                          class="text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Upload your first document
                        </button>
                      </div>
                      <div v-else class="space-y-2">
                        <div
                          v-for="doc in recentDocuments.slice(0, 3)"
                          :key="doc.id"
                          class="flex items-center justify-between p-2 rounded hover:bg-gray-50"
                        >
                          <div class="flex items-center gap-2">
                            <i
                              :class="getDocumentIcon(doc.name, doc.category)"
                              class="text-gray-600"
                            ></i>
                            <div>
                              <p class="text-sm font-medium text-gray-900 truncate">{{ doc.name }}</p>
                              <p class="text-xs text-gray-500">
                                {{ doc.category }} • {{ formatTimeAgo(doc.uploadedAt) }}
                              </p>
                            </div>
                          </div>
                          <DocumentStatusBadge :status="doc.status" size="small" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabPanel>

          <!-- Construction Management Tab -->
          <TabPanel value="construction" class="p-0">
            <div class="p-6">
              <ConstructionManagementSection :project-id="projectId" />
            </div>
          </TabPanel>
          <!-- Construction Management Tab -->
          <TabPanel value="construction" class="p-0">
            <div class="p-6">
              <ConstructionManagementSection :project-id="projectId" />
            </div>
          </TabPanel>

          <!-- Documents Tab -->
          <TabPanel value="documents" class="p-0">
            <div class="p-6">
              <DocumentsView
                :project-id="projectId"
                :project-name="project.name"
                mode="project"
              />
            </div>
          </TabPanel>
        </TabPanels>
      </div>
    </div>

    <!-- Activity Flyout -->
    <ActivityFlyout
      :visible="showActivityFlyout"
      :activities="activities"
      @update:visible="showActivityFlyout = $event"
      @view-all="handleViewAllActivity"
    />

    <!-- Project Slide-Over -->
    <ProjectSlideOver
      v-model:visible="showProjectSlideOver"
      :project="project"
      @project-updated="handleProjectUpdated"
    />

    <!-- Task Slide-Over -->
    <TaskSlideOver
      v-model:visible="showTaskSlideOver"
      :project-id="projectId"
      :task="editingTask"
      :available-tasks="validTasks"
      @task-created="handleTaskCreated"
      @task-updated="handleTaskUpdated"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  Button,
  Tag,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Badge
} from 'primevue'
//import firebaseService from '@/services/firebase/firebaseService'
import ActivityFlyout from '@/components/widgets/ActivityFlyout.vue'
import ProjectSlideOver from '@/components/forms/ProjectSlideOver.vue'
import TaskSlideOver from '@/components/forms/TaskSlideOver.vue'
import DocumentStatusBadge from '@/components/features/documents/DocumentStatusBadge.vue'
import ConstructionManagementSection from '@/components/sections/ConstructionManagementSection.vue'
import DocumentsView from '@/views/documents/DocumentsView.vue'
import { getDocumentIcon } from '@/constants/documentCategories'
import {
  getUserName,
  createLookupMap,
  formatDate,
  formatTimeAgo,
  formatCurrency,
  formatPhase,
  formatTaskStatus,
  getPriorityClasses,
  //getStatusClasses,
} from '@/utils/index'
import ProjectRepository from '@/services/firebase/Repositories/ProjectRepository'
import DocumentRepository from '@/services/firebase/Repositories/DocumentRepository'
import UserRepository from '@/services/firebase/Repositories/UserRepository'
import ActivityService from '@/services/logging/ActivityService'

// Props
const props = defineProps({
  projectId: {
    type: String,
    required: true,
  },
})

const router = useRouter()

// Reactive state - Updated for string-based tab values
// Reactive state - Updated for string-based tab values
const project = ref({})
const rfis = ref([])
const submittals = ref([])
const changeOrders = ref([])
const activities = ref([])
const tasks = ref([])
const users = ref([])
const loading = ref(true)
const error = ref(null)
const subscriptions = ref([])
const activeTab = ref('overview') // Changed from 0 to 'overview'

// UI State
const showProjectSlideOver = ref(false)
const showTaskSlideOver = ref(false)
const showActivityFlyout = ref(false)
const editingTask = ref(null)
const recentDocuments = ref([])
const showDocumentUploader = ref(false)

// Computed properties
const validTasks = computed(() => (Array.isArray(tasks.value) ? tasks.value : []))
const usersMap = computed(() => createLookupMap(users.value))

const constructionItemsCount = computed(() => {
  const pendingRFIs = rfis.value.filter(r => !['closed', 'responded'].includes(r.status)).length
  const pendingCOs = changeOrders.value.filter(co => ['proposed', 'submitted'].includes(co.status)).length
  const pendingSubmittals = submittals.value.filter(s => ['submitted', 'under_review'].includes(s.status)).length

  return pendingRFIs + pendingCOs + pendingSubmittals
})

const documentsCount = computed(() => {
  return recentDocuments.value.length
})

// Helper functions for badges
const getPhaseSeverity = (phase) => {
  const severityMap = {
    'pre-construction': 'warning',
    construction: 'info',
    'close-out': 'success',
    complete: 'success',
  }
  return severityMap[phase] || 'secondary'
}

const getStatusSeverity = (status) => {
  const severityMap = {
    todo: 'secondary',
    'in-progress': 'info',
    complete: 'success',
    'on-hold': 'warning',
  }
  return severityMap[status] || 'secondary'
}

// Methods
const editTask = (task) => {
  console.log('Editing task:', task)
  editingTask.value = task
  showTaskSlideOver.value = true
}

const handleTaskCreated = (newTask) => {
  console.log('Task created:', newTask)
  editingTask.value = null
  showTaskSlideOver.value = false
}

const handleTaskUpdated = (updatedTask) => {
  console.log('Task updated:', updatedTask)
  const index = tasks.value.findIndex((t) => t.id === updatedTask.id)
  if (index !== -1) {
    tasks.value[index] = updatedTask
  }
  editingTask.value = null
  showTaskSlideOver.value = false
}

const goToProjectSettings = () => {
  router.push(`/project/${props.projectId}/settings`)
}

const handleProjectUpdated = (updatedProject) => {
  project.value = { ...project.value, ...updatedProject }
}

const handleViewAllActivity = () => {
  console.log('View all activity clicked')
  showActivityFlyout.value = false
}

const loadProjectData = async () => {
  const [projectData, activitiesData] = await Promise.all([
    ProjectRepository.getProject(props.projectId),
    ActivityService.getActivitiesByProject(props.projectId),
  ])

  if (!projectData) {
    throw new Error('Project not found')
  }

  project.value = projectData
  activities.value = activitiesData.slice(0, 10)
  loading.value = false
}

const loadRecentDocuments = async () => {
  try {
    const docs = await DocumentRepository.getDocumentsByProject(props.projectId, {
      limit: 5,
    })
    recentDocuments.value = docs
  } catch (error) {
    console.error('Error loading recent documents:', error)
  }
}

const setupRealtimeListeners = () => {
  const projectSub = ProjectRepository.subscribeToProject(props.projectId, (projectData) => {
    if (projectData) {
      project.value = projectData
    }
  })

  const rfiSub = ProjectRepository.subscribeToProjectRFIs(props.projectId, (rfiData) => {
    rfis.value = rfiData
  })

  const submittalSub = ProjectRepository.subscribeToProjectSubmittals(
    props.projectId,
    (submittalData) => {
      submittals.value = submittalData
    },
  )

  const changeOrderSub = ProjectRepository.subscribeToProjectChangeOrders(
    props.projectId,
    (changeOrderData) => {
      changeOrders.value = changeOrderData
    },
  )

  const taskSub = ProjectRepository.subscribeToProjectTasks(props.projectId, (taskData) => {
    console.log(
      'Task data received:',
      taskData,
      'Type:',
      typeof taskData,
      'IsArray:',
      Array.isArray(taskData),
    )
    tasks.value = Array.isArray(taskData) ? taskData : []
  })

  const documentSub = ProjectRepository.subscribeToProjectDocuments(props.projectId, (docs) => {
    recentDocuments.value = docs.slice(0, 5)
  })

  subscriptions.value = [projectSub, rfiSub, submittalSub, changeOrderSub, taskSub, documentSub]
}

// Lifecycle hooks
watch(
  () => props.projectId,
  async (newProjectId, oldProjectId) => {
    console.log('ProjectId changed from', oldProjectId, 'to', newProjectId)
    if (newProjectId && newProjectId !== oldProjectId) {
      subscriptions.value.forEach((unsubscribe) => {
        if (typeof unsubscribe === 'function') {
          unsubscribe()
        } else {
          ProjectRepository.unsubscribe(unsubscribe)
        }
      })

      loading.value = true
      error.value = null

      try {
        await loadProjectData()
        users.value = await UserRepository.getAllUsers()
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
  try {
    await loadProjectData()
    await loadRecentDocuments()
    users.value = await UserRepository.getAllUsers()
    setupRealtimeListeners()
  } catch (err) {
    console.error('Error loading project:', err)
    error.value = err.message
    loading.value = false
  }
})

onBeforeUnmount(() => {
  subscriptions.value.forEach((unsubscribe) => {
    if (typeof unsubscribe === 'function') {
      unsubscribe()
    } else {
      ProjectRepository.unsubscribe(unsubscribe)
    }
  })
})
</script>

<style scoped>
/* Custom scrollbar - can't be done with Tailwind */
/* Custom scrollbar - can't be done with Tailwind */
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
