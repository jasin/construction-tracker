/ stores/iu.js;
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useUIStore = defineStore('ui', () => {
  // State
  const isProjectTransitioning = ref(false);
  const notifications = ref([]);
  const activeTab = ref('overview');
  const sidebarOpen = ref(false);
  const modals = ref({
    projectDialog: false,
    taskDialog: false,
    rfiDialog: false,
    activityFlyout: false,
    documentUploader: false,
  });

  // Track project dialog mode: 'create' or 'edit'
  const projectDialogMode = ref('create');

  const setProjectTransitioning = (busy) => {
    isProjectTransitioning.value = busy;
    console.log('UIStore: Project transitioning:', busy);
  };

  // Actions
  function addNotification(notification) {
    const id = Date.now().toString();
    notifications.value.unshift({
      id,
      timestamp: new Date(),
      ...notification,
    });

    // Auto-remove after 5 seconds for non-persistent notifications
    if (!notification.persistent) {
      setTimeout(() => {
        removeNotification(id);
      }, 5000);
    }
  }

  function removeNotification(id) {
    const index = notifications.value.findIndex((n) => n.id === id);
    if (index !== -1) {
      notifications.value.splice(index, 1);
    }
  }

  function clearNotifications() {
    notifications.value = [];
  }

  function setActiveTab(tab) {
    activeTab.value = tab;
  }

  function openModal(modalName, options = {}) {
    console.log('uiStore: Opening modal', modalName, 'with options:', options);
    if (modalName in modals.value) {
      modals.value[modalName] = true;

      // Handle project dialog mode
      if (modalName === 'projectDialog') {
        projectDialogMode.value = options.mode || 'create';
      }
    } else {
      console.warn('uiStore: Unknown modal type:', modalName);
    }
  }

  function closeModal(modalName) {
    if (modalName in modals.value) {
      modals.value[modalName] = false;

      // Reset project dialog mode when closing
      if (modalName === 'projectDialog') {
        projectDialogMode.value = 'create';
      }
    }
  }

  function toggleSidebar() {
    sidebarOpen.value = !sidebarOpen.value;
  }

  const getProjectTransitioning = computed(() => isProjectTransitioning.value);

  return {
    // State
    notifications,
    activeTab,
    sidebarOpen,
    modals,
    projectDialogMode,

    // Actions
    addNotification,
    removeNotification,
    clearNotifications,
    setActiveTab,
    openModal,
    closeModal,
    toggleSidebar,
    isProjectTransitioning,
    setProjectTransitioning,
    getProjectTransitioning,
  };
});
