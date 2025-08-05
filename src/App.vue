<template>
  <div id="app" class="flex h-screen w-screen overflow-hidden">
    <!-- Left Sidebar - Static and Full Height -->
    <div
      class="w-80 min-w-80 bg-gray-50 border-r border-gray-200 flex flex-col h-screen overflow-hidden"
    >
      <!--<div class="p-5 border-b border-gray-200 bg-white flex-shrink-0">
        <h2 class="m-0 text-gray-700 text-2xl font-semibold">Construction Tracker</h2>
      </div>-->
      <div class="flex-1 overflow-y-auto p-4">
        <NavigationSidebar />
      </div>
    </div>

    <!-- Right Content Area - Dynamic -->
    <div class="flex-1 overflow-y-auto bg-white flex flex-col">
      <router-view></router-view>
    </div>
  </div>
</template>

<script setup>
import NavigationSidebar from '@/components/NavigationSidebar.vue'
</script>

<style scoped>
/* Only custom scrollbar styling that Tailwind can't handle */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: var(--p-surface-100);
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: var(--p-surface-300);
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: var(--p-surface-400);
}
</style>
