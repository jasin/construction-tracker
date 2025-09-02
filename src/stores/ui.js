/ stores/ui.js
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUIStore = defineStore('ui', () => {
  // State
  const notifications = ref([])
  const activeTab = ref('overview')
  const sidebarOpen = ref(false)
  const modals = ref({
    projectSlideOver: false,
    taskSlideOver: false,
    activityFlyout: false,
    documentUploader: false
  })

  // Actions
  function addNotification(notification) {
    const id = Date.now().toString()
    notifications.value.unshift({
      id,
      timestamp: new Date(),
      ...notification
    })

    // Auto-remove after 5 seconds for non-persistent notifications
    if (!notification.persistent) {
      setTimeout(() => {
        removeNotification(id)
      }, 5000)
    }
  }

  function removeNotification(id) {
    const index = notifications.value.findIndex(n => n.id === id)
    if (index !== -1) {
      notifications.value.splice(index, 1)
    }
  }

  function clearNotifications() {
    notifications.value = []
  }

  function setActiveTab(tab) {
    activeTab.value = tab
  }

  function openModal(modalName) {
    if (modalName in modals.value) {
      modals.value[modalName] = true
    }
  }

  function closeModal(modalName) {
    if (modalName in modals.value) {
      modals.value[modalName] = false
    }
  }

  function toggleSidebar() {
    sidebarOpen.value = !sidebarOpen.value
  }

  return {
    // State
    notifications,
    activeTab,
    sidebarOpen,
    modals,

    // Actions
    addNotification,
    removeNotification,
    clearNotifications,
    setActiveTab,
    openModal,
    closeModal,
    toggleSidebar
  }
})
