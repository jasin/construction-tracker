<template>
  <div class="project-tree">
    <div v-if="loading" class="loading">Loading projects...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else-if="treeData.length === 0" class="no-data">No projects found.</div>
    <div v-else>
      <Tree :value="treeData" class="w-full md:w-[30rem]"></Tree>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { ref as dbRef, onValue } from 'firebase/database'
import { useRouter } from 'vue-router'
import { Tree } from 'primevue'
import { db } from '@/firebase'

// Reactive state
const treeData = ref([])
const loading = ref(true)
const error = ref(null)
const treeComponent = ref(null)
const isMounted = ref(false)
const router = useRouter()

function transformToTreeNodes(firebaseData) {
  // Helper function to recursively convert Firebase nodes to PrimeVue nodes
  function transformNode(key, data) {
    const node = {
      key: key,
      label: data.name || key, // Use 'name' if available, otherwise use key
      children: [],
    }

    // If the node has children, recursively process them
    if (data.children && typeof data.children === 'object') {
      node.children = Object.entries(data.children).map(([childKey, childData]) =>
        transformNode(`${key}-${childKey}`, childData),
      )
    }

    return node
  }

  // Define the base node and its fixed children
  const baseNode = {
    key: 'phase',
    label: 'Phase',
    children: [
      { key: 'phase-pre-construction', label: 'Pre-Construction', children: [] },
      { key: 'phase-construction', label: 'Construction', children: [] },
      { key: 'phase-close-outs', label: 'Close-Outs', children: [] },
      { key: 'phase-closed', label: 'Closed', children: [] },
    ],
  }

  // Distribute Firebase data into the appropriate phase based on a 'phase' property
  Object.entries(firebaseData).forEach(([key, value]) => {
    const phase = value.phase || 'pre-construction' // Default to pre-construction if no phase specified
    const targetPhaseNode = baseNode.children.find(
      (node) => node.key === `phase-${phase.toLowerCase()}`,
    )

    if (targetPhaseNode) {
      targetPhaseNode.children.push(transformNode(key, value))
    } else {
      // If phase doesn't match, default to pre-construction
      baseNode.children
        .find((node) => node.key === 'phase-pre-construction')
        .children.push(transformNode(key, value))
    }
  })

  // Return a single tree with the base node
  return [baseNode]
}

// Fetch projects
onMounted(() => {
  if (isMounted.value) {
    console.log('Already mounted, skipping duplicate mount')
    return
  }
  isMounted.value = true

  console.log('ProjectTree.vue mounted. Fetching data...')
  console.log('DB instance:', db)

  const projectsRef = dbRef(db, 'projects')
  const unsubscribe = onValue(
    projectsRef,
    (snapshot) => {
      try {
        const projectsData = snapshot.val()
        console.log('Raw Firebase JSON:', JSON.stringify(projectsData, null, 2))
        // Replace treeData array reactively
        treeData.value = transformToTreeNodes(projectsData)
        console.log('Updated treeData:', treeData.value)
        loading.value = false

        // Debug Tree rendering
        nextTick(() => {
          console.log('Tree component:', treeComponent.value)
          if (treeComponent.value) {
            const nodes = treeComponent.value.$el.querySelectorAll('.tree-node')
            console.log(
              'Tree nodes rendered:',
              nodes.length,
              Array.from(nodes).map((n) => n.textContent.trim()),
            )
          }
        })
      } catch (err) {
        console.error('Error fetching projects:', err)
        error.value = 'Failed to load projects.'
        loading.value = false
      }
    },
    {
      onError: (err) => {
        console.error('Firebase error:', err)
        error.value = 'Failed to connect to Firebase.'
        loading.value = false
      },
    },
  )

  // Clean up Firebase listener
  onBeforeUnmount(() => {
    console.log('Cleaning up ProjectTree listeners')
    unsubscribe()
  })
})
</script>
