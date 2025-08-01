<template>
  <div id="app" class="columns-2">
    <div class="columns-xs">
      <h2>Projects</h2>
      <ProjectTree />
    </div>
    <div class="columns-sm">
      <router-view></router-view>
    </div>
  </div>
</template>

<script>
import ProjectTree from '@/components/ProjectTree.vue'

export default {
  name: 'App',
  components: {
    ProjectTree,
  },
}
</script>
