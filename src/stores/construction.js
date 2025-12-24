// stores/construction.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { getRFIsByProject } from '@/services/api/rfisApi';
import { getSubmittalsByProject } from '@/services/api/submittalsApi';
import { getChangeOrdersByProject } from '@/services/api/changeOrdersApi';
import { getTasksByProject } from '@/services/api/tasksApi';
import { getDocumentsByProject } from '@/services/api/documentsApi';
import { supabase } from '@/configs/supabase';
import { handleError } from '@/utils/errorHandler';

export const useConstructionStore = defineStore('construction', () => {
  // State
  const rfis = ref([]);
  const submittals = ref([]);
  const changeOrders = ref([]);
  const tasks = ref([]);
  const documents = ref([]);
  const subscriptions = ref([]);
  const lastUpdated = ref(null);

  // Getters
  const pendingRFIs = computed(() => {
    return rfis.value.filter((rfi) => !['closed', 'responded'].includes(rfi.status));
  });

  const pendingSubmittals = computed(() => {
    return submittals.value.filter((submittal) =>
      ['submitted', 'under_review'].includes(submittal.status)
    );
  });

  const pendingChangeOrders = computed(() => {
    return changeOrders.value.filter((co) => ['proposed', 'submitted'].includes(co.status));
  });

  const overdueTasks = computed(() => {
    const today = new Date();
    return tasks.value.filter(
      (task) => task.dueDate && new Date(task.dueDate) < today && task.status !== 'complete'
    );
  });

  const recentDocuments = computed(() => {
    return documents.value
      .slice()
      .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))
      .slice(0, 5);
  });

  const constructionItemsCount = computed(() => {
    return (
      pendingRFIs.value.length + pendingSubmittals.value.length + pendingChangeOrders.value.length
    );
  });

  const quickStats = computed(() => ({
    rfis: rfis.value.length,
    submittals: submittals.value.length,
    changeOrders: changeOrders.value.length,
    tasks: tasks.value.length,
    documents: documents.value.length,
    pendingItems: constructionItemsCount.value,
  }));

  // Recent changes tracking
  const recentChanges = computed(() => {
    const changes = [];
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

    // Add logic to track recent status changes
    // This would require storing change history in your Firebase structure
    return changes;
  });

  const priorityItems = computed(() => {
    const items = [];

    // Add overdue tasks
    items.push(
      ...overdueTasks.value.map((task) => ({
        type: 'task',
        item: task,
        priority: 'high',
        reason: 'overdue',
      }))
    );

    // Add pending submittals (high priority for supervisors)
    items.push(
      ...pendingSubmittals.value.map((submittal) => ({
        type: 'submittal',
        item: submittal,
        priority: 'medium',
        reason: 'pending_review',
      }))
    );

    return items.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  });

  // Actions
  async function subscribeToConstructionData(projectId) {
    if (!projectId) {
      console.warn('Construction Store: No projectId provided');
      return;
    }

    console.log('🔥 Initializing construction data subscriptions for project:', projectId);

    try {
      // Clear existing subscriptions
      clearSubscriptions();

      // Initial load from API
      const [rfisData, submittalsData, changeOrdersData, tasksData, documentsData] =
        await Promise.all([
          getRFIsByProject(projectId),
          getSubmittalsByProject(projectId),
          getChangeOrdersByProject(projectId),
          getTasksByProject(projectId),
          getDocumentsByProject(projectId),
        ]);

      rfis.value = rfisData || [];
      submittals.value = submittalsData || [];
      changeOrders.value = changeOrdersData || [];
      tasks.value = tasksData || [];
      documents.value = documentsData || [];
      lastUpdated.value = new Date();

      console.log('📦 Initial construction data loaded:', {
        rfis: rfis.value.length,
        submittals: submittals.value.length,
        changeOrders: changeOrders.value.length,
        tasks: tasks.value.length,
        documents: documents.value.length,
      });

      // Subscribe to real-time changes via Supabase
      const rfiChannel = supabase
        .channel(`project-${projectId}-rfis`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'rfis',
            filter: `project_id=eq.${projectId}`,
          },
          (payload) => {
            console.log('📡 Supabase RFI event:', payload);
            if (payload.eventType === 'INSERT') {
              rfis.value.push(payload.new);
            } else if (payload.eventType === 'UPDATE') {
              const index = rfis.value.findIndex((r) => r.id === payload.new.id);
              if (index !== -1) rfis.value[index] = payload.new;
            } else if (payload.eventType === 'DELETE') {
              rfis.value = rfis.value.filter((r) => r.id !== payload.old.id);
            }
            lastUpdated.value = new Date();
          }
        )
        .subscribe();

      const submittalChannel = supabase
        .channel(`project-${projectId}-submittals`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'submittals',
            filter: `project_id=eq.${projectId}`,
          },
          (payload) => {
            console.log('📡 Supabase Submittal event:', payload);
            if (payload.eventType === 'INSERT') {
              submittals.value.push(payload.new);
            } else if (payload.eventType === 'UPDATE') {
              const index = submittals.value.findIndex((s) => s.id === payload.new.id);
              if (index !== -1) submittals.value[index] = payload.new;
            } else if (payload.eventType === 'DELETE') {
              submittals.value = submittals.value.filter((s) => s.id !== payload.old.id);
            }
            lastUpdated.value = new Date();
          }
        )
        .subscribe();

      const changeOrderChannel = supabase
        .channel(`project-${projectId}-change-orders`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'change_orders',
            filter: `project_id=eq.${projectId}`,
          },
          (payload) => {
            console.log('📡 Supabase Change Order event:', payload);
            if (payload.eventType === 'INSERT') {
              changeOrders.value.push(payload.new);
            } else if (payload.eventType === 'UPDATE') {
              const index = changeOrders.value.findIndex((co) => co.id === payload.new.id);
              if (index !== -1) changeOrders.value[index] = payload.new;
            } else if (payload.eventType === 'DELETE') {
              changeOrders.value = changeOrders.value.filter((co) => co.id !== payload.old.id);
            }
            lastUpdated.value = new Date();
          }
        )
        .subscribe();

      const taskChannel = supabase
        .channel(`project-${projectId}-tasks-construction`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tasks',
            filter: `project_id=eq.${projectId}`,
          },
          (payload) => {
            console.log('📡 Supabase Task event (construction store):', payload);
            if (payload.eventType === 'INSERT') {
              tasks.value.push(payload.new);
            } else if (payload.eventType === 'UPDATE') {
              const index = tasks.value.findIndex((t) => t.id === payload.new.id);
              if (index !== -1) tasks.value[index] = payload.new;
            } else if (payload.eventType === 'DELETE') {
              tasks.value = tasks.value.filter((t) => t.id !== payload.old.id);
            }
            lastUpdated.value = new Date();
          }
        )
        .subscribe();

      const documentChannel = supabase
        .channel(`project-${projectId}-documents`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'documents',
            filter: `project_id=eq.${projectId}`,
          },
          (payload) => {
            console.log('📡 Supabase Document event:', payload);
            if (payload.eventType === 'INSERT') {
              documents.value.push(payload.new);
            } else if (payload.eventType === 'UPDATE') {
              const index = documents.value.findIndex((d) => d.id === payload.new.id);
              if (index !== -1) documents.value[index] = payload.new;
            } else if (payload.eventType === 'DELETE') {
              documents.value = documents.value.filter((d) => d.id !== payload.old.id);
            }
            lastUpdated.value = new Date();
          }
        )
        .subscribe();

      // Store unsubscribe functions
      subscriptions.value = [
        () => supabase.removeChannel(rfiChannel),
        () => supabase.removeChannel(submittalChannel),
        () => supabase.removeChannel(changeOrderChannel),
        () => supabase.removeChannel(taskChannel),
        () => supabase.removeChannel(documentChannel),
      ];

      console.log('✅ Construction data subscriptions started');
    } catch (err) {
      console.error('Error subscribing to construction data:', err);
      handleError(err, 'Subscribe to construction data');
    }
  }

  function updateRFI(rfiId, updates) {
    const index = rfis.value.findIndex((rfi) => rfi.id === rfiId);
    if (index !== -1) {
      rfis.value[index] = { ...rfis.value[index], ...updates };
    }
  }

  function updateSubmittal(submittalId, updates) {
    const index = submittals.value.findIndex((submittal) => submittal.id === submittalId);
    if (index !== -1) {
      submittals.value[index] = { ...submittals.value[index], ...updates };
    }
  }

  function updateChangeOrder(changeOrderId, updates) {
    const index = changeOrders.value.findIndex((co) => co.id === changeOrderId);
    if (index !== -1) {
      changeOrders.value[index] = { ...changeOrders.value[index], ...updates };
    }
  }

  function updateTask(taskId, updates) {
    const index = tasks.value.findIndex((task) => task.id === taskId);
    if (index !== -1) {
      tasks.value[index] = { ...tasks.value[index], ...updates };
    }
  }

  function clearSubscriptions() {
    subscriptions.value.forEach((unsubscribe) => {
      if (typeof unsubscribe === 'function') {
        try {
          unsubscribe();
        } catch (err) {
          console.warn('Construction unsubscribe call failed:', err);
        }
      }
    });
    subscriptions.value = [];
  }

  function resetConstructionData() {
    rfis.value = [];
    submittals.value = [];
    changeOrders.value = [];
    tasks.value = [];
    documents.value = [];
    lastUpdated.value = null;
    clearSubscriptions();
  }

  return {
    // State
    rfis,
    submittals,
    changeOrders,
    tasks,
    documents,
    lastUpdated,

    // Getters
    pendingRFIs,
    pendingSubmittals,
    pendingChangeOrders,
    overdueTasks,
    recentDocuments,
    constructionItemsCount,
    quickStats,
    recentChanges,
    priorityItems,

    // Actions
    subscribeToConstructionData,
    updateRFI,
    updateSubmittal,
    updateChangeOrder,
    updateTask,
    clearSubscriptions,
    resetConstructionData,
  };
});
