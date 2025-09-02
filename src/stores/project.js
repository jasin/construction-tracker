// stores/project.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import ProjectRepository from '@/services/firebase/Repositories/ProjectRepository'

export const useProjectStore = defineStore('project', () => {
  // State
  const currentProject = ref({})
  const projects = ref([])
  const loading = ref(false)
  const error = ref(null)
  const subscriptions = ref([])

  // Getters
  const projectTeam = computed(() => {
    return [
      currentProject.value.projectManager && {
        name: currentProject.value.projectManager,
        role: 'Project Manager',
        icon: 'pi-user',
        color: 'blue'
      },
      currentProject.value.superintendent && {
        name: currentProject.value.superintendent,
        role: 'Superintendent',
        icon: 'pi-hard-hat',
        color: 'yellow'
      },
      currentProject.value.architect && {
        name: currentProject.value.architect,
        role: 'Architect',
        icon: 'pi-pencil',
        color: 'purple'
      }
    ].filter(Boolean)
  })

  const projectStatus = computed(() => {
    return {
      phase: currentProject.value.phase,
      contractSigned: currentProject.value.contractSigned,
      cost: currentProject.value.cost,
      startDate: currentProject.value.startDate,
      endDate: currentProject.value.endDate,
    }
  })

  // Actions
  async function loadProject(projectId) {
    loading.value = true
    error.value = null

    try {
      const projectData = await ProjectRepository.getProject(projectId)
      if (!projectData) {
        throw new Error('Project not found')
      }
      currentProject.value = projectData
    } catch (err) {
      error.value = err.message
      console.error('Error loading project:', err)
    } finally {
      loading.value = false
    }
  }

  function subscribeToProject(projectId) {
    const unsubscribe = ProjectRepository.subscribeToProject(projectId, (projectData) => {
      if (projectData) {
        currentProject.value = projectData
      }
    })
    subscriptions.value.push(unsubscribe)
    return unsubscribe
  }

  function updateProject(updates) {
    currentProject.value = { ...currentProject.value, ...updates }
  }

  function clearSubscriptions() {
    subscriptions.value.forEach((unsubscribe) => {
      if (typeof unsubscribe === 'function') {
        unsubscribe()
      }
    })
    subscriptions.value = []
  }

  function resetProject() {
    currentProject.value = {}
    clearSubscriptions()
  }

  return {
    // State
    currentProject,
    projects,
    loading,
    error,

    // Getters
    projectTeam,
    projectStatus,

    // Actions
    loadProject,
    subscribeToProject,
    updateProject,
    clearSubscriptions,
    resetProject
  }
})
