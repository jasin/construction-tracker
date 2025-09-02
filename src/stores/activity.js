// stores/activity.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import ActivityService from '@/services/logging/ActivityService'

export const useActivityStore = defineStore('activity', () => {
  // State
  const activities = ref([])
  const loading = ref(false)
  const error = ref(null)

  // Getters
  const recentActivities = computed(() => {
    return activities.value.slice(0, 10)
  })

  const todaysActivities = computed(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return activities.value.filter(activity => {
      const activityDate = new Date(activity.timestamp)
      activityDate.setHours(0, 0, 0, 0)
      return activityDate.getTime() === today.getTime()
    })
  })

  const activityCount = computed(() => activities.value.length)

  // Actions
  async function loadActivities(projectId) {
    loading.value = true
    error.value = null

    try {
      const activitiesData = await ActivityService.getActivitiesByProject(projectId)
      activities.value = activitiesData
    } catch (err) {
      error.value = err.message
      console.error('Error loading activities:', err)
    } finally {
      loading.value = false
    }
  }

  function addActivity(activity) {
    activities.value.unshift(activity)
  }

  function clearActivities() {
    activities.value = []
  }

  return {
    // State
    activities,
    loading,
    error,

    // Getters
    recentActivities,
    todaysActivities,
    activityCount,

    // Actions
    loadActivities,
    addActivity,
    clearActivities
  }
})
