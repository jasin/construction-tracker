// stores/changeOrder.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import {
  getAllChangeOrders,
  getChangeOrderById as getChangeOrderByIdApi,
  getChangeOrdersByProject,
  createChangeOrder as createChangeOrderApi,
  updateChangeOrder as updateChangeOrderApi,
  deleteChangeOrder as deleteChangeOrderApi,
} from '@/services/api/changeOrdersApi';
import { supabase } from '@/configs/supabase';
import { useAuthStore } from './auth';

export const useChangeOrderStore = defineStore('changeOrder', () => {
  // State - User Change Orders (for dashboard - requested by or approved by user)
  const userChangeOrders = ref([]);
  const userChangeOrdersLoading = ref(true);
  const userChangeOrdersInitialized = ref(false);

  // State - Project Change Orders (for project detail views)
  const projectChangeOrders = ref([]);
  const projectChangeOrdersLoading = ref(false);
  const currentProjectId = ref(null);

  // State - Single Change Order (for detail view/editing)
  const currentChangeOrder = ref(null);
  const loading = ref(false);
  const error = ref(null);

  // Subscription management
  let userChangeOrdersUnsubscribe = null;
  let projectChangeOrdersUnsubscribe = null;

  // Getters - User Change Orders
  const userChangeOrderCount = computed(() => userChangeOrders.value.length);

  const userActiveChangeOrders = computed(() =>
    userChangeOrders.value.filter((co) => !['approved', 'rejected', 'executed'].includes(co.status))
  );

  const userPendingChangeOrders = computed(() =>
    userChangeOrders.value.filter((co) =>
      ['proposed', 'submitted', 'under_review'].includes(co.status)
    )
  );

  const userChangeOrdersByStatus = computed(() => {
    const grouped = {};
    userChangeOrders.value.forEach((changeOrder) => {
      const status = changeOrder.status || 'proposed';
      if (!grouped[status]) grouped[status] = [];
      grouped[status].push(changeOrder);
    });
    return grouped;
  });

  const userChangeOrdersNeedingApproval = computed(() =>
    userChangeOrders.value.filter((co) => co.status === 'submitted')
  );

  const userTotalCostImpact = computed(() =>
    userChangeOrders.value
      .filter((co) => ['approved', 'executed'].includes(co.status))
      .reduce((sum, co) => sum + (co.costImpact || 0), 0)
  );

  const userTotalTimeImpact = computed(() =>
    userChangeOrders.value
      .filter((co) => ['approved', 'executed'].includes(co.status))
      .reduce((sum, co) => sum + (co.timeImpact || 0), 0)
  );

  // Getters - Project Change Orders
  const projectChangeOrderCount = computed(() => projectChangeOrders.value.length);

  const projectActiveChangeOrdersCount = computed(
    () =>
      projectChangeOrders.value.filter(
        (co) => !['approved', 'rejected', 'executed'].includes(co.status)
      ).length
  );

  const projectTotalCostImpact = computed(() =>
    projectChangeOrders.value
      .filter((co) => ['approved', 'executed'].includes(co.status))
      .reduce((sum, co) => sum + (co.costImpact || 0), 0)
  );

  // Actions - User Change Orders Subscription (for dashboard)
  /**
   * Initializes real-time subscription to current user's change orders
   * Subscribes to all change orders requested by or approved by the current user
   */
  async function initializeUserChangeOrdersSubscription() {
    if (userChangeOrdersInitialized.value) {
      console.log('ChangeOrder Store: User change orders subscription already initialized');
      return;
    }

    const authStore = useAuthStore();
    const userId = authStore.user?.id;
    if (!userId) {
      console.warn(
        'ChangeOrder Store: Cannot initialize user change orders subscription - no user ID'
      );
      userChangeOrdersLoading.value = false;
      return;
    }

    console.log(
      'ChangeOrder Store: Initializing user change orders subscription for user:',
      userId
    );
    userChangeOrdersLoading.value = true;

    try {
      // Cleanup existing subscription before creating a new one
      cleanupUserChangeOrdersSubscription();

      // Load initial data from API
      const allChangeOrders = await getAllChangeOrders();
      userChangeOrders.value = allChangeOrders.filter(
        (co) => co.requestedBy === userId || co.approvedBy === userId || co.reviewedBy === userId
      );

      console.log(
        'ChangeOrder Store: User change orders loaded, count:',
        userChangeOrders.value.length
      );

      // Subscribe to real-time updates with Supabase
      const channel = supabase
        .channel('user-change-orders')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'change_orders',
          },
          (payload) => {
            handleUserChangeOrderUpdate(payload);
          }
        )
        .subscribe();

      userChangeOrdersUnsubscribe = () => supabase.removeChannel(channel);
      userChangeOrdersInitialized.value = true;
      userChangeOrdersLoading.value = false;
    } catch (error) {
      console.error(
        'ChangeOrder Store: Error initializing user change orders subscription:',
        error
      );
      userChangeOrdersLoading.value = false;
    }
  }

  /**
   * Handle real-time updates for user change orders
   */
  function handleUserChangeOrderUpdate(payload) {
    const authStore = useAuthStore();
    const userId = authStore.user?.id;
    if (!userId) return;

    const changeOrder = payload.new || payload.old;

    // Only process if this change order is relevant to the user
    const isRelevant =
      changeOrder.requestedBy === userId ||
      changeOrder.approvedBy === userId ||
      changeOrder.reviewedBy === userId;

    if (!isRelevant) return;

    if (payload.eventType === 'INSERT') {
      userChangeOrders.value.push(payload.new);
    } else if (payload.eventType === 'UPDATE') {
      const index = userChangeOrders.value.findIndex((co) => co.id === payload.new.id);
      if (index !== -1) {
        userChangeOrders.value[index] = payload.new;
      } else if (isRelevant) {
        // Change order became relevant to user (e.g., assigned as reviewer)
        userChangeOrders.value.push(payload.new);
      }
    } else if (payload.eventType === 'DELETE') {
      userChangeOrders.value = userChangeOrders.value.filter((co) => co.id !== payload.old.id);
    }
  }

  /**
   * Cleanup user change orders subscription
   */
  function cleanupUserChangeOrdersSubscription() {
    if (userChangeOrdersUnsubscribe) {
      console.log('ChangeOrder Store: Cleaning up user change orders subscription');
      userChangeOrdersUnsubscribe();
      userChangeOrdersUnsubscribe = null;
    }
    userChangeOrders.value = [];
    userChangeOrdersInitialized.value = false;
    userChangeOrdersLoading.value = true;
  }

  // Actions - Project Change Orders Subscription (for project detail)
  /**
   * Initializes real-time subscription to change orders for a specific project
   */
  async function initializeProjectChangeOrdersSubscription(projectId) {
    if (!projectId) {
      console.warn('ChangeOrder Store: Cannot initialize project change orders - no project ID');
      return;
    }

    // If already subscribed to this project, do nothing
    if (currentProjectId.value === projectId && projectChangeOrdersUnsubscribe) {
      console.log('ChangeOrder Store: Already subscribed to project change orders:', projectId);
      return;
    }

    // Cleanup existing subscription
    cleanupProjectChangeOrdersSubscription();

    console.log(
      'ChangeOrder Store: Initializing project change orders subscription for:',
      projectId
    );
    currentProjectId.value = projectId;
    projectChangeOrdersLoading.value = true;

    try {
      // Load initial data from API
      projectChangeOrders.value = await getChangeOrdersByProject(projectId);

      console.log(
        'ChangeOrder Store: Project change orders loaded, count:',
        projectChangeOrders.value.length
      );

      // Subscribe to real-time updates with Supabase
      const channel = supabase
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
            handleProjectChangeOrderUpdate(payload);
          }
        )
        .subscribe();

      projectChangeOrdersUnsubscribe = () => supabase.removeChannel(channel);
      projectChangeOrdersLoading.value = false;
    } catch (error) {
      console.error(
        'ChangeOrder Store: Error initializing project change orders subscription:',
        error
      );
      projectChangeOrdersLoading.value = false;
    }
  }

  /**
   * Handle real-time updates for project change orders
   */
  function handleProjectChangeOrderUpdate(payload) {
    if (payload.eventType === 'INSERT') {
      projectChangeOrders.value.push(payload.new);
    } else if (payload.eventType === 'UPDATE') {
      const index = projectChangeOrders.value.findIndex((co) => co.id === payload.new.id);
      if (index !== -1) projectChangeOrders.value[index] = payload.new;
    } else if (payload.eventType === 'DELETE') {
      projectChangeOrders.value = projectChangeOrders.value.filter(
        (co) => co.id !== payload.old.id
      );
    }
  }

  /**
   * Cleanup project change orders subscription
   */
  function cleanupProjectChangeOrdersSubscription() {
    if (projectChangeOrdersUnsubscribe) {
      console.log('ChangeOrder Store: Cleaning up project change orders subscription');
      projectChangeOrdersUnsubscribe();
      projectChangeOrdersUnsubscribe = null;
    }
    projectChangeOrders.value = [];
    currentProjectId.value = null;
    projectChangeOrdersLoading.value = false;
  }

  // Actions - CRUD Operations
  /**
   * Create a new change order
   */
  async function createChangeOrder(changeOrderData) {
    loading.value = true;
    error.value = null;

    try {
      const newChangeOrder = await createChangeOrderApi(changeOrderData);
      console.log('ChangeOrder Store: Change order created successfully:', newChangeOrder.id);
      return newChangeOrder;
    } catch (err) {
      console.error('ChangeOrder Store: Error creating change order:', err);
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Update an existing change order
   */
  async function updateChangeOrder(changeOrderId, updates) {
    loading.value = true;
    error.value = null;

    try {
      const updatedChangeOrder = await updateChangeOrderApi(changeOrderId, updates);
      console.log('ChangeOrder Store: Change order updated successfully:', changeOrderId);
      return updatedChangeOrder;
    } catch (err) {
      console.error('ChangeOrder Store: Error updating change order:', err);
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Delete a change order
   */
  async function deleteChangeOrder(changeOrderId) {
    loading.value = true;
    error.value = null;

    try {
      await deleteChangeOrderApi(changeOrderId);
      console.log('ChangeOrder Store: Change order deleted successfully:', changeOrderId);
    } catch (err) {
      console.error('ChangeOrder Store: Error deleting change order:', err);
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Get change order by ID
   */
  async function getChangeOrderById(changeOrderId) {
    loading.value = true;
    error.value = null;

    try {
      const changeOrder = await getChangeOrderByIdApi(changeOrderId);
      currentChangeOrder.value = changeOrder;
      return changeOrder;
    } catch (err) {
      console.error('ChangeOrder Store: Error getting change order:', err);
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Approve change order
   */
  async function approveChangeOrder(changeOrderId, approvalNotes = '') {
    loading.value = true;
    error.value = null;

    try {
      const updatedChangeOrder = await updateChangeOrderApi(changeOrderId, {
        status: 'approved',
        ...(approvalNotes && { approvalNotes }),
      });
      console.log('ChangeOrder Store: Change order approved:', changeOrderId);
      return updatedChangeOrder;
    } catch (err) {
      console.error('ChangeOrder Store: Error approving change order:', err);
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Reject change order
   */
  async function rejectChangeOrder(changeOrderId, rejectionReason = '') {
    loading.value = true;
    error.value = null;

    try {
      const updatedChangeOrder = await updateChangeOrderApi(changeOrderId, {
        status: 'rejected',
        ...(rejectionReason && { rejectionReason }),
      });
      console.log('ChangeOrder Store: Change order rejected:', changeOrderId);
      return updatedChangeOrder;
    } catch (err) {
      console.error('ChangeOrder Store: Error rejecting change order:', err);
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  return {
    // State - User Change Orders
    userChangeOrders,
    userChangeOrdersLoading,
    userChangeOrdersInitialized,

    // State - Project Change Orders
    projectChangeOrders,
    projectChangeOrdersLoading,
    currentProjectId,

    // State - Single Change Order
    currentChangeOrder,
    loading,
    error,

    // Getters - User Change Orders
    userChangeOrderCount,
    userActiveChangeOrders,
    userPendingChangeOrders,
    userChangeOrdersByStatus,
    userChangeOrdersNeedingApproval,
    userTotalCostImpact,
    userTotalTimeImpact,

    // Getters - Project Change Orders
    projectChangeOrderCount,
    projectActiveChangeOrdersCount,
    projectTotalCostImpact,

    // Actions - Subscriptions
    initializeUserChangeOrdersSubscription,
    cleanupUserChangeOrdersSubscription,
    initializeProjectChangeOrdersSubscription,
    cleanupProjectChangeOrdersSubscription,

    // Actions - CRUD
    createChangeOrder,
    updateChangeOrder,
    deleteChangeOrder,
    getChangeOrderById,
    approveChangeOrder,
    rejectChangeOrder,
  };
});
