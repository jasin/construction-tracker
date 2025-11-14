// stores/rfi.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import RFIRepository from '@/services/firebase/Repositories/RFIRepository'
import firebaseCore from '@/services/firebase/core/FirebaseCore'

export const useRFIStore = defineStore('rfi', () => {
  // State - User RFIs (for dashboard - assigned to user)
  const userRFIs = ref([])
  const userRFIsLoading = ref(true)
  const userRFIsInitialized = ref(false)

  // State - Project RFIs (for project detail views)
  const projectRFIs = ref([])
  const projectRFIsLoading = ref(false)
  const currentProjectId = ref(null)

  // State - Single RFI (for detail view/editing)
  const currentRFI = ref(null)
  const loading = ref(false)
  const error = ref(null)

  // Subscription management
  let userRFIsUnsubscribe = null
  let projectRFIsUnsubscribe = null

  // Getters - User RFIs
  const userRFICount = computed(() => userRFIs.value.length)

  const userActiveRFIs = computed(() =>
    userRFIs.value.filter((r) => !['responded', 'closed'].includes(r.status))
  )

  const userOverdueRFIs = computed(() => {
    const now = new Date()
    return userRFIs.value.filter((r) => {
      return (
        r.dueDate &&
        new Date(r.dueDate) < now &&
        !['responded', 'closed'].includes(r.status)
      )
    })
  })

  const userRFIsDueSoon = computed(() => {
    const now = new Date()
    const futureDate = new Date()
    futureDate.setDate(now.getDate() + 7) // 7 days ahead

    return userRFIs.value.filter((r) => {
      if (!r.dueDate || ['responded', 'closed'].includes(r.status)) {
        return false
      }
      const dueDate = new Date(r.dueDate)
      return dueDate >= now && dueDate <= futureDate
    })
  })

  const userRFIsByStatus = computed(() => {
    const grouped = {}
    userRFIs.value.forEach((rfi) => {
      const status = rfi.status || 'draft'
      if (!grouped[status]) grouped[status] = []
      grouped[status].push(rfi)
    })
    return grouped
  })

  // Getters - Project RFIs
  const projectRFICount = computed(() => projectRFIs.value.length)

  const projectActiveRFIsCount = computed(
    () => projectRFIs.value.filter((r) => !['responded', 'closed'].includes(r.status)).length
  )

  // Actions - User RFIs Subscription (for dashboard)
  /**
   * Initializes real-time subscription to current user's RFIs
   * Subscribes to all RFIs assigned to the current user
   */
  async function initializeUserRFIsSubscription() {
    if (userRFIsInitialized.value) {
      console.log('RFI Store: User RFIs subscription already initialized')
      return
    }

    const userId = firebaseCore.getCurrentUserId()
    if (!userId) {
      console.warn('RFI Store: Cannot initialize user RFIs subscription - no user ID')
      userRFIsLoading.value = false
      return
    }

    console.log('RFI Store: Initializing user RFIs subscription for user:', userId)
    userRFIsLoading.value = true

    try {
      // Subscribe to all RFIs and filter for user's assigned RFIs
      userRFIsUnsubscribe = RFIRepository.subscribeToAll((rfis) => {
        // Filter RFIs assigned to current user
        userRFIs.value = rfis.filter((rfi) => rfi.assignedTo === userId)
        userRFIsLoading.value = false
        userRFIsInitialized.value = true
        console.log('RFI Store: User RFIs updated, count:', userRFIs.value.length)
      })
    } catch (error) {
      console.error('RFI Store: Error initializing user RFIs subscription:', error)
      userRFIsLoading.value = false
    }
  }

  /**
   * Cleanup user RFIs subscription
   */
  function cleanupUserRFIsSubscription() {
    if (userRFIsUnsubscribe) {
      console.log('RFI Store: Cleaning up user RFIs subscription')
      userRFIsUnsubscribe()
      userRFIsUnsubscribe = null
    }
    userRFIs.value = []
    userRFIsInitialized.value = false
    userRFIsLoading.value = true
  }

  // Actions - Project RFIs Subscription (for project detail)
  /**
   * Initializes real-time subscription to RFIs for a specific project
   */
  async function initializeProjectRFIsSubscription(projectId) {
    if (!projectId) {
      console.warn('RFI Store: Cannot initialize project RFIs - no project ID')
      return
    }

    // If already subscribed to this project, do nothing
    if (currentProjectId.value === projectId && projectRFIsUnsubscribe) {
      console.log('RFI Store: Already subscribed to project RFIs:', projectId)
      return
    }

    // Cleanup existing subscription
    cleanupProjectRFIsSubscription()

    console.log('RFI Store: Initializing project RFIs subscription for:', projectId)
    currentProjectId.value = projectId
    projectRFIsLoading.value = true

    try {
      projectRFIsUnsubscribe = RFIRepository.subscribeToRFIsByProject(projectId, (rfis) => {
        projectRFIs.value = rfis
        projectRFIsLoading.value = false
        console.log('RFI Store: Project RFIs updated, count:', rfis.length)
      })
    } catch (error) {
      console.error('RFI Store: Error initializing project RFIs subscription:', error)
      projectRFIsLoading.value = false
    }
  }

  /**
   * Cleanup project RFIs subscription
   */
  function cleanupProjectRFIsSubscription() {
    if (projectRFIsUnsubscribe) {
      console.log('RFI Store: Cleaning up project RFIs subscription')
      projectRFIsUnsubscribe()
      projectRFIsUnsubscribe = null
    }
    projectRFIs.value = []
    currentProjectId.value = null
    projectRFIsLoading.value = false
  }

  // Actions - CRUD Operations
  /**
   * Create a new RFI
   */
  async function createRFI(rfiData) {
    loading.value = true
    error.value = null

    try {
      const newRFI = await RFIRepository.createRFI(rfiData)
      console.log('RFI Store: RFI created successfully:', newRFI.id)
      return newRFI
    } catch (err) {
      console.error('RFI Store: Error creating RFI:', err)
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Update an existing RFI
   */
  async function updateRFI(rfiId, updates) {
    loading.value = true
    error.value = null

    try {
      const updatedRFI = await RFIRepository.updateRFI(rfiId, updates)
      console.log('RFI Store: RFI updated successfully:', rfiId)
      return updatedRFI
    } catch (err) {
      console.error('RFI Store: Error updating RFI:', err)
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Delete an RFI
   */
  async function deleteRFI(rfiId) {
    loading.value = true
    error.value = null

    try {
      await RFIRepository.deleteRFI(rfiId)
      console.log('RFI Store: RFI deleted successfully:', rfiId)
    } catch (err) {
      console.error('RFI Store: Error deleting RFI:', err)
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get RFI by ID
   */
  async function getRFIById(rfiId) {
    loading.value = true
    error.value = null

    try {
      const rfi = await RFIRepository.getById(rfiId)
      currentRFI.value = rfi
      return rfi
    } catch (err) {
      console.error('RFI Store: Error getting RFI:', err)
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Add response to RFI
   */
  async function addRFIResponse(rfiId, response) {
    loading.value = true
    error.value = null

    try {
      const updatedRFI = await RFIRepository.addRFIResponse(rfiId, response)
      console.log('RFI Store: Response added to RFI:', rfiId)
      return updatedRFI
    } catch (err) {
      console.error('RFI Store: Error adding RFI response:', err)
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Close an RFI
   */
  async function closeRFI(rfiId, closeNotes = '') {
    loading.value = true
    error.value = null

    try {
      const updatedRFI = await RFIRepository.closeRFI(rfiId, closeNotes)
      console.log('RFI Store: RFI closed:', rfiId)
      return updatedRFI
    } catch (err) {
      console.error('RFI Store: Error closing RFI:', err)
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    // State - User RFIs
    userRFIs,
    userRFIsLoading,
    userRFIsInitialized,

    // State - Project RFIs
    projectRFIs,
    projectRFIsLoading,
    currentProjectId,

    // State - Single RFI
    currentRFI,
    loading,
    error,

    // Getters - User RFIs
    userRFICount,
    userActiveRFIs,
    userOverdueRFIs,
    userRFIsDueSoon,
    userRFIsByStatus,

    // Getters - Project RFIs
    projectRFICount,
    projectActiveRFIsCount,

    // Actions - Subscriptions
    initializeUserRFIsSubscription,
    cleanupUserRFIsSubscription,
    initializeProjectRFIsSubscription,
    cleanupProjectRFIsSubscription,

    // Actions - CRUD
    createRFI,
    updateRFI,
    deleteRFI,
    getRFIById,
    addRFIResponse,
    closeRFI,
  }
})
