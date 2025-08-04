<template>
  <div class="project-tree">
    <div v-if="loading" class="loading">Loading projects...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else-if="treeData.length === 0" class="no-data">No projects found.</div>
    <div v-else>
      <Tree
        :value="treeData"
        class="w-full md:w-[30rem]"
        @nodeSelect="onNodeSelect"
        selectionMode="single"
      ></Tree>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { Tree } from 'primevue'
import firebaseService from '@/firebaseService'

// Reactive state
const treeData = ref([])
const loading = ref(true)
const error = ref(null)
const router = useRouter()
let unsubscribe = null

function transformToTreeNodes(projects) {
  if (!projects || projects.length === 0) {
    return []
  }

  // Helper function to create project nodes
  function createProjectNode(project) {
    return {
      key: `project-${project.id}`,
      label: `${project.jobNumber} - ${project.name}`,
      data: project,
      type: 'project',
      children: [],
    }
  }

  // Define the base node structure
  const baseNode = {
    key: 'phases',
    label: 'Projects by Phase',
    children: [
      { key: 'phase-pre-construction', label: 'Pre-Construction', children: [], type: 'phase' },
      { key: 'phase-construction', label: 'Construction', children: [], type: 'phase' },
      { key: 'phase-close-out', label: 'Close-Out', children: [], type: 'phase' },
      { key: 'phase-complete', label: 'Complete', children: [], type: 'phase' },
    ],
  }

  // Distribute projects into appropriate phases
  projects.forEach((project) => {
    const phase = project.phase || 'pre-construction'
    const targetPhaseNode = baseNode.children.find((node) => node.key === `phase-${phase}`)

    if (targetPhaseNode) {
      targetPhaseNode.children.push(createProjectNode(project))
    } else {
      // Default to pre-construction if phase doesn't match
      baseNode.children
        .find((node) => node.key === 'phase-pre-construction')
        .children.push(createProjectNode(project))
    }
  })

  return [baseNode]
}

function onNodeSelect(node) {
  // Only navigate if it's a project node
  if (node.type === 'project' && node.data) {
    router.push(`/project/${node.data.id}`)
  }
}

// Fetch projects using the service
onMounted(async () => {
  console.log('ProjectTree.vue mounted. Fetching data...')

  try {
    // Set up real-time listener for all projects
    unsubscribe = firebaseService.subscribeToProjects((projects) => {
      console.log('Projects updated:', projects)
      treeData.value = transformToTreeNodes(projects)
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
    console.log('Cleaning up ProjectTree listeners')
    if (typeof unsubscribe === 'function') {
      unsubscribe()
    } else {
      firebaseService.unsubscribe(unsubscribe)
    }
  }
})
</script>

<style scoped>
.project-tree {
  padding: 10px;
}

.loading,
.error,
.no-data {
  text-align: center;
  padding: 20px;
  color: #6c757d;
}

.error {
  color: #dc3545;
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
}

/* Style the tree nodes */
:deep(.p-tree-node-content) {
  padding: 8px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

:deep(.p-tree-node-content:hover) {
  background-color: var(--p-content-hover-background);
}

:deep(.p-tree-node-label) {
  font-weight: 500;
}

/* Different styles for different node types */
:deep([data-pc-section='content'][aria-label*='Pre-Construction']),
:deep([data-pc-section='content'][aria-label*='Construction']),
:deep([data-pc-section='content'][aria-label*='Close-Out']),
:deep([data-pc-section='content'][aria-label*='Complete']) {
  font-weight: 600;
  color: var(--p-primary-color);
}
</style>
