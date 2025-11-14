// stores/submittal.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import SubmittalRepository from '@/services/firebase/Repositories/SubmittalRepository'
import firebaseCore from '@/services/firebase/core/FirebaseCore'

export const useSubmittalStore = defineStore('submittal', () => {
  // State - User Submittals (for dashboard - assigned to user or submitted by user)
  const userSubmittals = ref([])
  const userSubmittalsLoading = ref(true)
  const userSubmittalsInitialized = ref(false)

  // State - Project Submittals (for project detail views)
  const projectSubmittals = ref([])
  const projectSubmittalsLoading = ref(false)
  const currentProjectId = ref(null)

  // State - Single Submittal (for detail view/editing)
  const currentSubmittal = ref(null)
  const loading = ref(false)
  const error = ref(null)

  // Subscription management
  let userSubmittalsUnsubscribe = null
  let projectSubmittalsUnsubscribe = null

  // Getters - User Submittals
  const userSubmittalCount = computed(() => userSubmittals.value.length)

  const userActiveSubmittals = computed(() =>
    userSubmittals.value.filter((s) => !['approved', 'approved_with_comments', 'rejected'].includes(s.status))
  )

  const userOverdueSubmittals = computed(() => {
    const now = new Date()
    return userSubmittals.value.filter((s) => {
      return (
        s.requiredDate &&
        new Date(s.requiredDate) < now &&
        !['approved', 'approved_with_comments'].includes(s.status)
      )
    })
  })

  const userSubmittalsDueSoon = computed(() => {
    const now = new Date()
    const futureDate = new Date()
    futureDate.setDate(now.getDate() + 7) // 7 days ahead

    return userSubmittals.value.filter((s) => {
      if (!s.requiredDate || ['approved', 'approved_with_comments', 'rejected'].includes(s.status)) {
        return false
      }
      const requiredDate = new Date(s.requiredDate)
      return requiredDate >= now && requiredDate <= futureDate
    })
  })

  const userSubmittalsByStatus = computed(() => {
    const grouped = {}
    userSubmittals.value.forEach((submittal) => {
      const status = submittal.status || 'not_submitted'
      if (!grouped[status]) grouped[status] = []
      grouped[status].push(submittal)
    })
    return grouped
  })

  const userSubmittalsNeedingReview = computed(() =>
    userSubmittals.value.filter((s) => ['submitted', 'under_review'].includes(s.status))
  )

  // Getters - Project Submittals
  const projectSubmittalCount = computed(() => projectSubmittals.value.length)

  const projectActiveSubmittalsCount = computed(
    () => projectSubmittals.value.filter((s) => !['approved', 'approved_with_comments', 'rejected'].includes(s.status)).length
  )

  // Actions - User Submittals Subscription (for dashboard)
  /**
   * Initializes real-time subscription to current user's submittals
   * Subscribes to all submittals submitted by or assigned to the current user
   */
  async function initializeUserSubmittalsSubscription() {
    if (userSubmittalsInitialized.value) {
      console.log('Submittal Store: User submittals subscription already initialized')
      return
    }

    const userId = firebaseCore.getCurrentUserId()
    if (!userId) {
      console.warn('Submittal Store: Cannot initialize user submittals subscription - no user ID')
      userSubmittalsLoading.value = false
      return
    }

    console.log('Submittal Store: Initializing user submittals subscription for user:', userId)
    userSubmittalsLoading.value = true

    try {
      // Subscribe to all submittals and filter for user's submittals
      userSubmittalsUnsubscribe = SubmittalRepository.subscribeToSubmittals((submittals) => {
        // Filter submittals submitted by or reviewed by current user
        userSubmittals.value = submittals.filter((submittal) =>
          submittal.submittedBy === userId || submittal.reviewedBy === userId
        )
        userSubmittalsLoading.value = false
        userSubmittalsInitialized.value = true
        console.log('Submittal Store: User submittals updated, count:', userSubmittals.value.length)
      })
    } catch (error) {
      console.error('Submittal Store: Error initializing user submittals subscription:', error)
      userSubmittalsLoading.value = false
    }
  }

  /**
   * Cleanup user submittals subscription
   */
  function cleanupUserSubmittalsSubscription() {
    if (userSubmittalsUnsubscribe) {
      console.log('Submittal Store: Cleaning up user submittals subscription')
      userSubmittalsUnsubscribe()
      userSubmittalsUnsubscribe = null
    }
    userSubmittals.value = []
    userSubmittalsInitialized.value = false
    userSubmittalsLoading.value = true
  }

  // Actions - Project Submittals Subscription (for project detail)
  /**
   * Initializes real-time subscription to submittals for a specific project
   */
  async function initializeProjectSubmittalsSubscription(projectId) {
    if (!projectId) {
      console.warn('Submittal Store: Cannot initialize project submittals - no project ID')
      return
    }

    // If already subscribed to this project, do nothing
    if (currentProjectId.value === projectId && projectSubmittalsUnsubscribe) {
      console.log('Submittal Store: Already subscribed to project submittals:', projectId)
      return
    }

    // Cleanup existing subscription
    cleanupProjectSubmittalsSubscription()

    console.log('Submittal Store: Initializing project submittals subscription for:', projectId)
    currentProjectId.value = projectId
    projectSubmittalsLoading.value = true

    try {
      projectSubmittalsUnsubscribe = SubmittalRepository.subscribeToSubmittalsByProject(projectId, (submittals) => {
        projectSubmittals.value = submittals
        projectSubmittalsLoading.value = false
        console.log('Submittal Store: Project submittals updated, count:', submittals.length)
      })
    } catch (error) {
      console.error('Submittal Store: Error initializing project submittals subscription:', error)
      projectSubmittalsLoading.value = false
    }
  }

  /**
   * Cleanup project submittals subscription
   */
  function cleanupProjectSubmittalsSubscription() {
    if (projectSubmittalsUnsubscribe) {
      console.log('Submittal Store: Cleaning up project submittals subscription')
      projectSubmittalsUnsubscribe()
      projectSubmittalsUnsubscribe = null
    }
    projectSubmittals.value = []
    currentProjectId.value = null
    projectSubmittalsLoading.value = false
  }

  // Actions - CRUD Operations
  /**
   * Create a new submittal
   */
  async function createSubmittal(submittalData) {
    loading.value = true
    error.value = null

    try {
      const newSubmittal = await SubmittalRepository.createSubmittal(submittalData)
      console.log('Submittal Store: Submittal created successfully:', newSubmittal.id)
      return newSubmittal
    } catch (err) {
      console.error('Submittal Store: Error creating submittal:', err)
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Update an existing submittal
   */
  async function updateSubmittal(submittalId, updates) {
    loading.value = true
    error.value = null

    try {
      const updatedSubmittal = await SubmittalRepository.updateSubmittal(submittalId, updates)
      console.log('Submittal Store: Submittal updated successfully:', submittalId)
      return updatedSubmittal
    } catch (err) {
      console.error('Submittal Store: Error updating submittal:', err)
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Delete a submittal
   */
  async function deleteSubmittal(submittalId) {
    loading.value = true
    error.value = null

    try {
      await SubmittalRepository.deleteSubmittal(submittalId)
      console.log('Submittal Store: Submittal deleted successfully:', submittalId)
    } catch (err) {
      console.error('Submittal Store: Error deleting submittal:', err)
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get submittal by ID
   */
  async function getSubmittalById(submittalId) {
    loading.value = true
    error.value = null

    try {
      const submittal = await SubmittalRepository.getById(submittalId)
      currentSubmittal.value = submittal
      return submittal
    } catch (err) {
      console.error('Submittal Store: Error getting submittal:', err)
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Submit submittal for review
   */
  async function submitForReview(submittalId) {
    loading.value = true
    error.value = null

    try {
      const updatedSubmittal = await SubmittalRepository.submitForReview(submittalId)
      console.log('Submittal Store: Submittal submitted for review:', submittalId)
      return updatedSubmittal
    } catch (err) {
      console.error('Submittal Store: Error submitting submittal for review:', err)
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Review submittal
   */
  async function reviewSubmittal(submittalId, status, comments = '') {
    loading.value = true
    error.value = null

    try {
      const updatedSubmittal = await SubmittalRepository.reviewSubmittal(submittalId, status, comments)
      console.log('Submittal Store: Submittal reviewed:', submittalId)
      return updatedSubmittal
    } catch (err) {
      console.error('Submittal Store: Error reviewing submittal:', err)
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    // State - User Submittals
    userSubmittals,
    userSubmittalsLoading,
    userSubmittalsInitialized,

    // State - Project Submittals
    projectSubmittals,
    projectSubmittalsLoading,
    currentProjectId,

    // State - Single Submittal
    currentSubmittal,
    loading,
    error,

    // Getters - User Submittals
    userSubmittalCount,
    userActiveSubmittals,
    userOverdueSubmittals,
    userSubmittalsDueSoon,
    userSubmittalsByStatus,
    userSubmittalsNeedingReview,

    // Getters - Project Submittals
    projectSubmittalCount,
    projectActiveSubmittalsCount,

    // Actions - Subscriptions
    initializeUserSubmittalsSubscription,
    cleanupUserSubmittalsSubscription,
    initializeProjectSubmittalsSubscription,
    cleanupProjectSubmittalsSubscription,

    // Actions - CRUD
    createSubmittal,
    updateSubmittal,
    deleteSubmittal,
    getSubmittalById,
    submitForReview,
    reviewSubmittal,
  }
})
