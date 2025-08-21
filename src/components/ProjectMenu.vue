<template>
  <div class="project-menu">
    <div v-if="loading" class="text-center py-5 text-gray-500 text-sm">Loading projects...</div>
    <div
      v-else-if="error"
      class="text-center py-2 text-red-600 bg-red-50 border border-red-200 rounded p-2 text-sm"
    >
      {{ error }}
    </div>
    <div v-else-if="accordionItems.length === 0" class="text-center py-5 text-gray-500 text-sm">
      No projects found.
    </div>
    <div v-else>
      <Accordion
        v-model:value="accordionValue"
        multiple
        :pt="{
          root: { class: 'w-full' },
        }"
      >
        <AccordionPanel
          v-for="phase in accordionItems"
          :key="phase.key"
          :value="phase.key"
          :pt="{ root: { class: '!border-none' } }"
        >
          <AccordionHeader
            :pt="{
              root: { class: '!p-0 !bg-gray-50 !border-none' },
              toggleIcon: { class: '!hidden' },
            }"
          >
            <div
              class="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-md transition-colors w-full flex items-center"
            >
              <span class="text-sm font-bold text-gray-500 transition-colors">
                {{ accordionValue.includes(phase.key) ? '−' : '+' }}
              </span>
              <div class="flex items-center">
                <i :class="phase.icon" class="mr-2" :style="{ color: phase.color }"></i>
                <span>{{ phase.label }}</span>
              </div>
            </div>
          </AccordionHeader>
          <AccordionContent
            :pt="{
              root: { class: '' },
              content: { class: '!pb-0 !px-0 !bg-gray-50' },
            }"
          >
            <div class="ml-4 space-y-0">
              <button
                v-for="project in phase.projects"
                :key="project.id"
                @click="navigateToProject(project.id)"
                class="w-full flex items-center px-3 py-1.5 text-left text-gray-600 hover:bg-emerald-50 hover:text-emerald-700 rounded-md text-xs transition-all duration-150 group hover:transform hover:translate-x-0.5 !bg-gray-50"
              >
                <i
                  class="pi pi-folder mr-2 text-gray-400 group-hover:text-emerald-600 transition-colors"
                ></i>
                <span class="truncate">{{ project.jobNumber }} - {{ project.name }}{{ getClientName(project.clientId, clientsMap) }}</span>
              </button>
            </div>
          </AccordionContent>
        </AccordionPanel>
      </Accordion>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { Accordion, AccordionPanel, AccordionHeader, AccordionContent } from 'primevue'
import firebaseService from '@/firebaseService'
import { loadClients, getClientName, createLookupMap } from '@/utils'

// Reactive state
const projects = ref([])
const clients = ref([])
const loading = ref(true)
const error = ref(null)
const router = useRouter()
// Default to have pre-construction expanded
const accordionValue = ref(['pre-construction'])
let unsubscribe = null

// Phase configuration
const phaseConfig = {
  'pre-construction': {
    label: 'Pre-Construction',
    icon: 'pi pi-clock',
    color: '#f59e0b',
  },
  construction: {
    label: 'Construction',
    icon: 'pi pi-cog',
    color: '#3b82f6',
  },
  'close-out': {
    label: 'Close-Out',
    icon: 'pi pi-check-circle',
    color: '#10b981',
  },
  complete: {
    label: 'Complete',
    icon: 'pi pi-verified',
    color: '#059669',
  },
}

// Create clients map for better performance using utility
const clientsMap = computed(() => createLookupMap(clients.value))

// Transform projects data for accordion
const accordionItems = computed(() => {
  if (!projects.value || projects.value.length === 0) {
    return []
  }

  // Group projects by phase
  const grouped = {
    'pre-construction': [],
    construction: [],
    'close-out': [],
    complete: [],
  }

  // Distribute projects into appropriate phases
  projects.value.forEach((project) => {
    const phase = project.phase || 'pre-construction'
    if (grouped[phase]) {
      grouped[phase].push(project)
    } else {
      // Default to pre-construction if phase doesn't match
      grouped['pre-construction'].push(project)
    }
  })

  // Create the accordion structure
  return Object.entries(grouped).map(([phaseKey, phaseProjects]) => ({
    key: phaseKey,
    label: `${phaseConfig[phaseKey].label} (${phaseProjects.length})`,
    icon: phaseConfig[phaseKey].icon,
    color: phaseConfig[phaseKey].color,
    projects: phaseProjects,
  }))
})

// Navigate to project
const navigateToProject = (projectId) => {
  router.push(`/project/${projectId}`)
}

// Fetch projects using the service
onMounted(async () => {
  console.log('ProjectMenu.vue mounted. Fetching data...')

  try {
    // Load clients using utility function
    clients.value = await loadClients()

    // Set up real-time listener for projects
    unsubscribe = firebaseService.subscribeToProjects((projectsData) => {
      console.log('Projects updated:', projectsData)
      projects.value = projectsData
      loading.value = false
    })
  } catch (err) {
    console.error('Error fetching projects:', err)
    error.value = 'Failed to load projects.'
    loading.value = false
  }
})

// Clean up Firebase listener
onBeforeUnmount(() => {
  if (unsubscribe) {
    console.log('Cleaning up ProjectMenu listeners')
    if (typeof unsubscribe === 'function') {
      unsubscribe()
    } else {
      firebaseService.unsubscribe(unsubscribe)
    }
  }
})
</script>

<style scoped>
/* Minimal custom styles - most styling handled by passthrough */
.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
