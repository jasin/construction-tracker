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
            class="w-full flex items-center justify-between px-3 py-2 text-left text-gray-700 hover:bg-gray-100 rounded-md font-medium"
          >
            <div class="flex items-center">
              <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 11H5m14-7l2 2-2 2m0-4H5m14 12l2 2-2 2m0-4H5"
                ></path>
              </svg>
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

        <!-- Tasks Section -->
        <div class="mb-2">
          <button
            @click="toggleSection('tasks')"
            class="w-full flex items-center justify-between px-3 py-2 text-left text-gray-700 hover:bg-gray-100 rounded-md font-medium"
          >
            <div class="flex items-center">
              <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                ></path>
              </svg>
              Tasks
            </div>
            <svg
              class="w-4 h-4 transition-transform duration-200"
              :class="{ 'rotate-90': expandedSections.tasks }"
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

          <!-- Tasks Submenu -->
          <div v-show="expandedSections.tasks" class="ml-8 mt-2 space-y-1">
            <router-link
              to="/tasks/all"
              class="block px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
            >
              All Tasks
            </router-link>
            <router-link
              to="/tasks/assigned"
              class="block px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
            >
              Assigned to Me
            </router-link>
            <router-link
              to="/tasks/overdue"
              class="block px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
            >
              Overdue
            </router-link>
          </div>
        </div>

        <!-- Documents Section -->
        <div class="mb-2">
          <button
            @click="toggleSection('documents')"
            class="w-full flex items-center justify-between px-3 py-2 text-left text-gray-700 hover:bg-gray-100 rounded-md font-medium"
          >
            <div class="flex items-center">
              <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                ></path>
              </svg>
              Documents
            </div>
            <svg
              class="w-4 h-4 transition-transform duration-200"
              :class="{ 'rotate-90': expandedSections.documents }"
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

          <!-- Documents Submenu -->
          <div v-show="expandedSections.documents" class="ml-8 mt-2 space-y-1">
            <router-link
              to="/documents/all"
              class="block px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
            >
              All Documents
            </router-link>
            <router-link
              to="/documents/contracts"
              class="block px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
            >
              Contracts
            </router-link>
            <router-link
              to="/documents/insurance"
              class="block px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
            >
              Insurance
            </router-link>
            <router-link
              to="/documents/permits"
              class="block px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
            >
              Permits
            </router-link>
          </div>
        </div>

        <!-- Reports Section -->
        <div class="mb-2">
          <button
            @click="toggleSection('reports')"
            class="w-full flex items-center justify-between px-3 py-2 text-left text-gray-700 hover:bg-gray-100 rounded-md font-medium"
          >
            <div class="flex items-center">
              <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                ></path>
              </svg>
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
            class="block px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
          >
            User Management
          </router-link>
        </div>
      </nav>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import ProjectMenu from './ProjectMenu.vue'

// Reactive state for expanded sections
const expandedSections = ref({
  projects: true, // Start with projects expanded
  tasks: false,
  documents: false,
  reports: false,
})

// Toggle section expansion
const toggleSection = (section) => {
  expandedSections.value[section] = !expandedSections.value[section]
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
