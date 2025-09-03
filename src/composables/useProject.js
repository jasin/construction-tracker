// composables/useProject.js
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useProjectStore } from '@/stores/project'
import { useConstructionStore } from '@/stores/construction'
import { useActivityStore } from '@/stores/activity'
import { useAuthStore } from '@/stores/auth'
import { useUIStore } from '@/stores/ui'

export function useProject(projectId) {
  const projectStore = useProjectStore()
  const constructionStore = useConstructionStore()
  const activityStore = useActivityStore()
  const authStore = useAuthStore()
  const uiStore = useUIStore()

  // Reactive state from stores
  const { currentProject, loading, error, projectTeam } = storeToRefs(projectStore)
  const {
    rfis,
    submittals,
    changeOrders,
    tasks,
    documents,
    quickStats,
    priorityItems,
    pendingRFIs,
    pendingSubmittals,
    pendingChangeOrders,
    overdueTasks,
    recentDocuments
  } = storeToRefs(constructionStore)
  const { recentActivities, todaysActivities } = storeToRefs(activityStore)
  const permissions = computed(() => authStore.getPermissions)
  const { setActiveTab, openModal, closeModal } = uiStore

  // Initialize project data
  async function initializeProject() {
    if (!projectId) return

    try {
      // Load initial project data
      await projectStore.loadProject(projectId)
      await activityStore.loadActivities(projectId)

      // Set up real-time subscriptions
      projectStore.subscribeToProject(projectId)
      constructionStore.subscribeToConstructionData(projectId)

      uiStore.addNotification({
        type: 'success',
        title: 'Project Loaded',
        message: `Connected to ${currentProject.value.name}`
      })
    } catch (error) {
      uiStore.addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load project data'
      })
      throw new Error(`Failed to load project data: ${error.message}`)
    }
  }

  // Cleanup when leaving project
  function cleanupProject() {
    projectStore.clearSubscriptions()
    constructionStore.clearSubscriptions()
    projectStore.resetProject()
    constructionStore.resetConstructionData()
    activityStore.clearActivities()
  }

  return {
    // State
    currentProject,
    loading,
    error,
    rfis,
    submittals,
    changeOrders,
    tasks,
    documents,
    recentActivities,
    todaysActivities,
    permissions,
    quickStats,
    priorityItems,
    pendingRFIs,
    pendingSubmittals,
    pendingChangeOrders,
    overdueTasks,
    recentDocuments,
    projectTeam,

    // Actions
    initializeProject,
    cleanupProject,
    setActiveTab,
    openModal,
    closeModal
  }
}
