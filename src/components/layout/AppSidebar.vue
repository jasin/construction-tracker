<template>
  <div
    class="w-80 min-w-80 bg-gray-50 border-r border-gray-200 flex flex-col h-screen overflow-hidden"
  >
    <!-- Sidebar Menu -->
    <div class="flex-1 overflow-y-auto">
      <nav class="">
        <!-- Projects Section -->
        <div class="mb-2">
          <button
            @click="toggleSection('projects')"
            @contextmenu.prevent = "showContextMenu"
            class="w-full flex items-center justify-between px-3 py-2 text-left text-gray-700 hover:bg-gray-100 rounded-md font-medium"
          >
            <div class="flex items-center">
              <i class="pi pi-folder w-5 h-5 mr3" />
              Projects
            </div>
            <svg
              class="w-4 h-4 transition-transform duration-200"
              :class="{ 'rotate-90': expandedSections.projects }"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 5l7 7-7 7"
              ></path>
            </svg>
          </button>

          <!-- Projects Submenu -->
          <div v-show="expandedSections.projects" class="ml-8 mt-2">
            <ProjectMenu />
          </div>
        </div>

        <!-- Tasks Section - Direct Link -->
        <div class="mb-2">
          <router-link
            to="/tasks"
            class="w-full flex items-center px-3 py-2 text-left text-gray-700 hover:bg-gray-100 rounded-md font-medium"
          >
            <i class="pi pi-list w-5 h-5 mr-3" />
            Tasks
          </router-link>
        </div>

        <!-- Clients Section -->
        <div class="mb-2">
          <router-Link
          to="/clients"
          class="w-full flex items-center px-3 py-2 text-left text-gray-700 hover:bg-gray-100 rounded-md font-medium"
          >
            <i class="pi pi-users w-5 h-5 mr-3" />
            Clients
          </router-Link>
        </div>

        <!-- Documents Section -->
        <div class="mb-2">
          <router-link
          to="/documents/search"
          class="w-full flex items-center px-3 py-2 text-left text-gray-700 hover:bg-gray-100 rounded-md font-medium"
          >
            <i class="pi pi-search mr-2 text-xs"></i>
            Document Search
          </router-link>
        </div>

        <!-- Reports Section -->
        <div class="mb-2">
          <button
            @click="toggleSection('reports')"
            class="w-full flex items-center justify-between px-3 py-2 text-left text-gray-700 hover:bg-gray-100 rounded-md font-medium"
          >
            <div class="flex items-center">
              <i class="pi pi-chart-bar w-5 h-5 mr-3" />
              Reports
            </div>
            <svg
              class="w-4 h-4 transition-transform duration-200"
              :class="{ 'rotate-90': expandedSections.reports }"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 5l7 7-7 7"
              ></path>
            </svg>
          </button>

          <!-- Reports Submenu -->
          <div v-show="expandedSections.reports" class="ml-8 mt-2 space-y-1">
            <router-link
              to="/reports/project-status"
              class="block px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
            >
              Project Status
            </router-link>
            <router-link
              to="/reports/financial"
              class="block px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
            >
              Financial
            </router-link>
            <router-link
              to="/reports/time-tracking"
              class="block px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
            >
              Time Tracking
            </router-link>
          </div>
        </div>

        <!-- Settings Section -->
        <div class="mb-2">
          <router-link
            to="/settings"
            class="w-full flex items-center px-3 py-2 text-left text-gray-700 hover:bg-gray-100 rounded-md font-medium"
          >
            <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              ></path>
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              ></path>
            </svg>
            Settings
          </router-link>
        </div>

        <!-- Not for Production-->
        <div class="mb-2">
          <router-link
            to="/users"
            class="w-full flex items-center px-3 py-2 text-left text-gray-700 hover:bg-gray-100 rounded-md font-medium"
          >
            <i class="pi pi-user-edit w-5 h-5 mr-3" />
            User Management
          </router-link>
        </div>
      </nav>
    </div>

    <!-- Context Menu -->
    <ContextMenu
      ref="contextMenu"
      :model="contextMenuItems"
      :pt="{
        root: {class: 'text-xs'}
      }"
    />

    <!-- New Project Slide Over -->
    <ProjectSlideOver
      :visible="showNewProjectSlideOver"
      @update:visible="(val) => { showNewProjectSlideOver = val }"
      @project-created="handleProjectCreated"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ContextMenu } from 'primevue'
import ProjectMenu from '@/components/widgets/ProjectMenu.vue'
import ProjectSlideOver from '@/components/forms/ProjectSlideOver.vue'

// Reactive state for expanded sections
const expandedSections = ref({
  projects: true, // Start with projects expanded
  documents: false,
  reports: false,
})

// Toggle section expansion
const toggleSection = (section) => {
  expandedSections.value[section] = !expandedSections.value[section]
}

// Context Menu
const contextMenu = ref()
const showNewProjectSlideOver = ref(false)

const contextMenuItems = ref([
  {
    label: 'New Project',
    icon: 'pi pi-file',
    command: () => {
      showNewProjectSlideOver.value = true
    }
  }
])

const handleProjectCreated = (newProject) => {
  console.log("New project created:", newProject)
}

const showContextMenu = (event) => {
  contextMenu.value.show(event)
}

</script>

<style scoped>
/* Custom scrollbar for sidebar */
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

/* Router link active states */
.router-link-active {
  background-color: #dcfce7;
  color: #15803d;
}
</style>
