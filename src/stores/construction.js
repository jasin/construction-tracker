// stores/construction.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import ProjectRepository from '@/services/firebase/Repositories/ProjectRepository'

export const useConstructionStore = defineStore('construction', () => {
  // State
  const rfis = ref([])
  const submittals = ref([])
  const changeOrders = ref([])
  const tasks = ref([])
  const documents = ref([])
  const subscriptions = ref([])
  const lastUpdated = ref(null)

  // Getters
  const pendingRFIs = computed(() => {
    return rfis.value.filter(rfi => !['closed', 'responded'].includes(rfi.status))
  })

  const pendingSubmittals = computed(() => {
    return submittals.value.filter(submittal =>
      ['submitted', 'under_review'].includes(submittal.status)
    )
  })

  const pendingChangeOrders = computed(() => {
    return changeOrders.value.filter(co =>
      ['proposed', 'submitted'].includes(co.status)
    )
  })

  const overdueTasks = computed(() => {
    const today = new Date()
    return tasks.value.filter(task =>
      task.dueDate && new Date(task.dueDate) < today && task.status !== 'complete'
    )
  })

  const recentDocuments = computed(() => {
    return documents.value
      .slice()
      .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))
      .slice(0, 5)
  })

  const constructionItemsCount = computed(() => {
    return pendingRFIs.value.length + pendingSubmittals.value.length + pendingChangeOrders.value.length
  })

  const quickStats = computed(() => ({
    rfis: rfis.value.length,
    submittals: submittals.value.length,
    changeOrders: changeOrders.value.length,
    tasks: tasks.value.length,
    documents: documents.value.length,
    pendingItems: constructionItemsCount.value
  }))

  // Recent changes tracking
  const recentChanges = computed(() => {
    const changes = []
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago

    // Add logic to track recent status changes
    // This would require storing change history in your Firebase structure
    return changes
  })

  const priorityItems = computed(() => {
    const items = []

    // Add overdue tasks
    items.push(...overdueTasks.value.map(task => ({
      type: 'task',
      item: task,
      priority: 'high',
      reason: 'overdue'
    })))

    // Add pending submittals (high priority for supervisors)
    items.push(...pendingSubmittals.value.map(submittal => ({
      type: 'submittal',
      item: submittal,
      priority: 'medium',
      reason: 'pending_review'
    })))

    return items.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })
  })

  // Actions
  function subscribeToConstructionData(projectId) {
    const rfiSub = ProjectRepository.subscribeToProjectRFIs(projectId, (rfiData) => {
      rfis.value = rfiData
      lastUpdated.value = new Date()
    })

    const submittalSub = ProjectRepository.subscribeToProjectSubmittals(projectId, (submittalData) => {
      submittals.value = submittalData
      lastUpdated.value = new Date()
    })

    const changeOrderSub = ProjectRepository.subscribeToProjectChangeOrders(projectId, (changeOrderData) => {
      changeOrders.value = changeOrderData
      lastUpdated.value = new Date()
    })

    const taskSub = ProjectRepository.subscribeToProjectTasks(projectId, (taskData) => {
      tasks.value = Array.isArray(taskData) ? taskData : []
      lastUpdated.value = new Date()
    })

    const documentSub = ProjectRepository.subscribeToProjectDocuments(projectId, (docs) => {
      documents.value = docs
      lastUpdated.value = new Date()
    })

    subscriptions.value = [rfiSub, submittalSub, changeOrderSub, taskSub, documentSub]
  }

  function updateRFI(rfiId, updates) {
    const index = rfis.value.findIndex(rfi => rfi.id === rfiId)
    if (index !== -1) {
      rfis.value[index] = { ...rfis.value[index], ...updates }
    }
  }

  function updateSubmittal(submittalId, updates) {
    const index = submittals.value.findIndex(submittal => submittal.id === submittalId)
    if (index !== -1) {
      submittals.value[index] = { ...submittals.value[index], ...updates }
    }
  }

  function updateChangeOrder(changeOrderId, updates) {
    const index = changeOrders.value.findIndex(co => co.id === changeOrderId)
    if (index !== -1) {
      changeOrders.value[index] = { ...changeOrders.value[index], ...updates }
    }
  }

  function updateTask(taskId, updates) {
    const index = tasks.value.findIndex(task => task.id === taskId)
    if (index !== -1) {
      tasks.value[index] = { ...tasks.value[index], ...updates }
    }
  }

  function clearSubscriptions() {
    subscriptions.value.forEach((unsubscribe) => {
      if (typeof unsubscribe === 'function') {
        unsubscribe()
      } else {
        ProjectRepository.unsubscribe(unsubscribe)
      }
    })
    subscriptions.value = []
  }

  function resetConstructionData() {
    rfis.value = []
    submittals.value = []
    changeOrders.value = []
    tasks.value = []
    documents.value = []
    lastUpdated.value = null
    clearSubscriptions()
  }

  return {
    // State
    rfis,
    submittals,
    changeOrders,
    tasks,
    documents,
    lastUpdated,

    // Getters
    pendingRFIs,
    pendingSubmittals,
    pendingChangeOrders,
    overdueTasks,
    recentDocuments,
    constructionItemsCount,
    quickStats,
    recentChanges,
    priorityItems,

    // Actions
    subscribeToConstructionData,
    updateRFI,
    updateSubmittal,
    updateChangeOrder,
    updateTask,
    clearSubscriptions,
    resetConstructionData
  }
})
