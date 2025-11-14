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
    submittalDialog: false,
    activityFlyout: false,
    documentUploader: false,
  });

  // Track project dialog mode: 'create' or 'edit'
  const projectDialogMode = ref('create');

  // Dashboard preferences
  const dashboardColumns = ref(parseInt(localStorage.getItem('dashboardColumns')) || 4); // Desktop: 1, 2, 3, or 4 columns
  const taskListColumns = ref(parseInt(localStorage.getItem('taskListColumns')) || 1); // Desktop: 1, 2, 3, or 4 columns for TaskList
  const mobileActiveSection = ref(null); // Mobile: null = home, or section name

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

  function setDashboardColumns(columns) {
    if (columns >= 1 && columns <= 4) {
      dashboardColumns.value = columns;
      localStorage.setItem('dashboardColumns', columns.toString());
    }
  }

  function setTaskListColumns(columns) {
    if (columns >= 1 && columns <= 4) {
      taskListColumns.value = columns;
      localStorage.setItem('taskListColumns', columns.toString());
    }
  }

  function setMobileActiveSection(sectionName) {
    mobileActiveSection.value = sectionName;
  }

  function resetMobileSection() {
    mobileActiveSection.value = null;
  }

  const getProjectTransitioning = computed(() => isProjectTransitioning.value);

  return {
    // State
    notifications,
    activeTab,
    sidebarOpen,
    modals,
    projectDialogMode,
    dashboardColumns,
    taskListColumns,
    mobileActiveSection,

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
    setDashboardColumns,
    setTaskListColumns,
    setMobileActiveSection,
    resetMobileSection,
  };
});
