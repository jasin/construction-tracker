<template>
  <div>
    <!-- Flyout Toggle Button -->
    <div class="fixed right-0 top-1/2 transform -translate-y-1/2 z-40">
      <Button
        @click="toggleFlyout"
        severity="secondary"
        :pt="{
          root: {
            class: 'rounded-l-lg rounded-r-none shadow-lg bg-white border-gray-200 hover:bg-gray-50 !h-20 !w-8 !min-w-0 flex flex-col items-center justify-center !p-0',
            style: 'height: 5rem; width: 2rem; min-width: 2rem; padding: 0;'
          }
        }"
      >
        <template #default>
          <div class="flex flex-col items-center justify-center gap-1">
            <!-- <i :class="isOpen ? 'pi pi-chevron-right' : 'pi pi-chevron-left'" class="text-xs text-gray-600"></i> -->
            <span class="text-xs font-medium text-gray-700 transform -rotate-90 whitespace-nowrap">Activity</span>
          </div>
        </template>
      </Button>
    </div>

    <!-- Flyout Panel -->
    <div
      class="fixed right-0 top-0 h-full w-80 bg-white border-l border-gray-200 shadow-xl transform transition-transform duration-300 ease-in-out z-30"
      :class="isOpen ? 'translate-x-0' : 'translate-x-full'"
    >
      <!-- Header -->
      <div class="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <h3 class="text-sm font-semibold text-gray-900">Recent Activity</h3>
        <Button
          @click="closeFlyout"
          icon="pi pi-times"
          severity="secondary"
          size="small"
          text
        />
      </div>

      <!-- Activity Content -->
      <div class="flex-1 overflow-y-auto p-4">
        <div v-if="!activities || activities.length === 0" class="text-center py-8">
          <i class="pi pi-clock text-3xl text-gray-400 mb-3"></i>
          <p class="text-sm text-gray-500">No recent activity</p>
        </div>
        <div v-else class="space-y-4">
          <div
            v-for="activity in activities"
            :key="activity.id"
            class="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div
              class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs"
              :class="getActivityIconClass(activity.action)"
            >
              <i :class="getActivityIcon(activity.action)"></i>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm text-gray-900 mb-1">{{ activity.description }}</p>
              <div class="flex items-center gap-2 text-xs text-gray-500">
                <span class="font-medium">{{ activity.userName || activity.userId }}</span>
                <span>•</span>
                <span>{{ formatTimeAgo(activity.timestamp) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="border-t border-gray-200 p-4">
        <Button
          label="View All Activity"
          severity="secondary"
          size="small"
          class="w-full"
          @click="viewAllActivity"
        />
      </div>
    </div>

    <!-- Light Overlay -->
    <div
      v-if="isOpen"
      class="fixed inset-0 z-20 transition-opacity duration-300"
      style="background-color: rgba(107, 114, 128, 0.1);"
      @click="closeFlyout"
    ></div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import Button from 'primevue/button'

// Props
const props = defineProps({
  activities: {
    type: Array,
    default: () => []
  }
})

// Emits
const emit = defineEmits(['view-all'])

// State
const isOpen = ref(false)

// Methods
const toggleFlyout = () => {
  isOpen.value = !isOpen.value
}

const closeFlyout = () => {
  isOpen.value = false
}

const viewAllActivity = () => {
  emit('view-all')
  closeFlyout()
}

const formatTimeAgo = (timestamp) => {
  if (!timestamp) return 'Unknown time'

  const now = new Date()
  const activityTime = new Date(timestamp)
  const diffInMs = now - activityTime
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
  const diffInHours = Math.floor(diffInMinutes / 60)
  const diffInDays = Math.floor(diffInHours / 24)

  if (diffInMinutes < 1) {
    return 'Just now'
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`
  } else if (diffInHours < 24) {
    return `${diffInHours}h ago`
  } else if (diffInDays < 7) {
    return `${diffInDays}d ago`
  } else {
    return activityTime.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: activityTime.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    })
  }
}

const getActivityIconClass = (action) => {
  const classMap = {
    created_project: 'bg-blue-100 text-blue-700',
    updated_project_phase: 'bg-purple-100 text-purple-700',
    created_rfi: 'bg-orange-100 text-orange-700',
    created_submittal: 'bg-green-100 text-green-700',
    created_change_order: 'bg-yellow-100 text-yellow-700',
    uploaded_document: 'bg-pink-100 text-pink-700',
  }
  return classMap[action] || 'bg-gray-100 text-gray-600'
}

const getActivityIcon = (action) => {
  const iconMap = {
    created_project: 'pi pi-folder',
    updated_project_phase: 'pi pi-refresh',
    created_rfi: 'pi pi-question-circle',
    created_submittal: 'pi pi-file-check',
    created_change_order: 'pi pi-file-edit',
    uploaded_document: 'pi pi-file',
  }
  return iconMap[action] || 'pi pi-circle'
}
</script>

<style scoped>
/* Ensure the flyout is above other content */
.z-30 {
  z-index: 30;
}

.z-40 {
  z-index: 40;
}

/* Custom scrollbar */
.overflow-y-auto::-webkit-scrollbar {
  width: 4px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 2px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>
