<template>
  <div class="project-tree">
    <div v-if="loading" class="text-center py-5 text-gray-500">Loading projects...</div>
    <div
      v-else-if="error"
      class="text-center py-5 text-red-600 bg-red-50 border border-red-200 rounded p-4 mb-4"
    >
      {{ error }}
    </div>
    <div v-else-if="treeData.length === 0" class="text-center py-5 text-gray-500">
      No projects found.
    </div>
    <div v-else>
      <Tree
        :value="treeData"
        class="w-full"
        @nodeSelect="onNodeSelect"
        selectionMode="single"
      ></Tree>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { Tree } from 'primevue';
import ProjectRepository from '@/services/firebase/Repositories/ProjectRepository';

// Reactive state
const treeData = ref([]);
const loading = ref(true);
const error = ref(null);
const router = useRouter();
let unsubscribe = null;

function transformToTreeNodes(projects) {
  if (!projects || projects.length === 0) {
    return [];
  }

  // Helper function to create project nodes
  function createProjectNode(project) {
    return {
      key: `project-${project.id}`,
      label: `${project.jobNumber} - ${project.name}`,
      data: project,
      type: 'project',
      children: [],
    };
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
  };

  // Distribute projects into appropriate phases
  projects.forEach((project) => {
    const phase = project.phase || 'pre-construction';
    const targetPhaseNode = baseNode.children.find((node) => node.key === `phase-${phase}`);

    if (targetPhaseNode) {
      targetPhaseNode.children.push(createProjectNode(project));
    } else {
      // Default to pre-construction if phase doesn't match
      baseNode.children
        .find((node) => node.key === 'phase-pre-construction')
        .children.push(createProjectNode(project));
    }
  });

  return [baseNode];
}

function onNodeSelect(node) {
  // Only navigate if it's a project node
  if (node.type === 'project' && node.data) {
    router.push(`/project/${node.data.id}`);
  }
}

// Fetch projects using the service
onMounted(async () => {
  console.log('ProjectTree.vue mounted. Fetching data...');

  try {
    // Set up real-time listener for all projects
    unsubscribe = ProjectRepository.subscribeToProjects({}, (projects) => {
      console.log('Projects updated:', projects);
      treeData.value = transformToTreeNodes(projects);
      loading.value = false;
    });
  } catch (err) {
    console.error('Error fetching projects:', err);
    error.value = 'Failed to load projects.';
    loading.value = false;
  }
});

// Clean up Firebase listener
onBeforeUnmount(() => {
  if (unsubscribe && typeof unsubscribe === 'function') {
    console.log('Cleaning up ProjectTree listeners');
    unsubscribe();
  }
});
</script>

<style scoped>
/* Pure PrimeVue styling - no custom overrides */
</style>
