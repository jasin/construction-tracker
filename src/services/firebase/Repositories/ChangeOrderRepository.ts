// src/services/firebase/repositories/ChangeOrderRepository.ts
import BaseRepository from '@/services/firebase/core/BaseRepository';
import { CrudMixin } from '../mixins/CrudMixin';
import { RealtimeMixin } from '../mixins/RealtimeMixin';
import ActivityService from '@/services/logging/ActivityService';
import firebaseCore from '@/services/firebase/core/FirebaseCore';
import { ref, query, orderByChild, equalTo, onValue } from 'firebase/database';
import { CHANGE_ORDER_SCHEMA } from '../schemas';
import type { ChangeOrder, ValidationResult } from '@/types/models';

interface ChangeOrderFilters {
  status?: string[];
  type?: string[];
  requestedBy?: string;
  billable?: boolean;
  minCostImpact?: number;
  maxCostImpact?: number;
  requestedAfter?: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  limit?: number;
}

interface ProjectImpact {
  totalCostImpact: number;
  totalTimeImpact: number;
  additionsCost: number;
  deletionsCost: number;
  modificationsCost: number;
  creditsCost: number;
  billableAmount: number;
  nonBillableAmount: number;
  changeOrderCount: number;
}

interface ChangeOrderStatistics {
  total: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  totalCostImpact: number;
  totalTimeImpact: number;
  averageCostImpact: number;
  averageTimeImpact: number;
  billableAmount: number;
  nonBillableAmount: number;
  averageApprovalTime: number;
  byRequester: Record<string, number>;
  pendingApproval: number;
  recentActivity: number;
}

interface ImpactSummary {
  costImpact: number;
  timeImpact: number;
  type: string;
  billable: boolean;
  hasFinancialImpact: boolean;
  hasScheduleImpact: boolean;
}

/**
 * Change Order Repository - handles all change order-related Firebase operations
 * Includes change order management, approval workflows, and cost/time impact tracking
 */
class ChangeOrderRepository extends CrudMixin(RealtimeMixin(BaseRepository)) {
  constructor() {
    super('changeOrders');
  }

  /**
   * Create a new change order with validation and activity logging
   */
  async createChangeOrder(changeOrderData: Partial<ChangeOrder>): Promise<ChangeOrder> {
    try {
      const validation = this.validateData(changeOrderData, ['title', 'projectId']);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${Object.values(validation.errors).join(', ')}`);
      }

      // Add change order-specific defaults
      const coDataWithDefaults = {
        ...validation.cleanData,
        status: validation.cleanData.status || 'proposed',
        type: validation.cleanData.type || 'addition',
        costImpact: validation.cleanData.costImpact || 0,
        timeImpact: validation.cleanData.timeImpact || 0,
        billable: validation.cleanData.billable !== false,
        requestedBy: firebaseCore.getCurrentUserId(),
        requestedByName: firebaseCore.getCurrentUserName(),
        requestedAt: new Date().toISOString(),
        attachments: validation.cleanData.attachments || [],
        attachmentCount: validation.cleanData.attachmentCount || 0,
      };

      const newCO = (await this.create(coDataWithDefaults, CHANGE_ORDER_SCHEMA)) as ChangeOrder;

      // Log activity
      await ActivityService.logEntityCreated(newCO.projectId, 'changeOrder', newCO.id, newCO.title);

      return newCO;
    } catch (error) {
      console.error('Error creating change order:', error);
      throw error;
    }
  }

  /**
   * Get change orders by project with optional filtering
   */
  async getChangeOrdersByProject(
    projectId: string,
    filters: ChangeOrderFilters = {}
  ): Promise<ChangeOrder[]> {
    try {
      let changeOrders = (await this.getByField('projectId', projectId)) as ChangeOrder[];

      // Apply filters
      if (filters.status && filters.status.length > 0) {
        changeOrders = changeOrders.filter((co) => filters.status!.includes(co.status));
      }

      if (filters.type && filters.type.length > 0) {
        changeOrders = changeOrders.filter((co) => filters.type!.includes((co as any).type));
      }

      if (filters.requestedBy) {
        changeOrders = changeOrders.filter((co) => co.requestedBy === filters.requestedBy);
      }

      if (filters.billable !== undefined) {
        changeOrders = changeOrders.filter((co) => (co as any).billable === filters.billable);
      }

      if (filters.minCostImpact !== undefined) {
        changeOrders = changeOrders.filter(
          (co) => ((co as any).costImpact || 0) >= filters.minCostImpact!
        );
      }

      if (filters.maxCostImpact !== undefined) {
        changeOrders = changeOrders.filter(
          (co) => ((co as any).costImpact || 0) <= filters.maxCostImpact!
        );
      }

      if (filters.requestedAfter) {
        changeOrders = changeOrders.filter(
          (co) =>
            (co as any).requestedAt &&
            new Date((co as any).requestedAt) >= new Date(filters.requestedAfter!)
        );
      }

      // Apply sorting
      changeOrders = this.sortChangeOrders(
        changeOrders,
        filters.sortBy || 'requestedAt',
        filters.sortDirection || 'desc'
      );

      // Apply limit if specified
      if (filters.limit && filters.limit > 0) {
        changeOrders = changeOrders.slice(0, filters.limit);
      }

      return changeOrders;
    } catch (error) {
      console.error('Error getting change orders by project:', error);
      throw error;
    }
  }

  /**
   * Get change orders by status
   */
  async getChangeOrdersByStatus(
    status: string,
    projectId: string | null = null
  ): Promise<ChangeOrder[]> {
    try {
      let changeOrders = projectId
        ? await this.getChangeOrdersByProject(projectId)
        : ((await this.getAll()) as ChangeOrder[]);
      return changeOrders.filter((co) => co.status === status);
    } catch (error) {
      console.error('Error getting change orders by status:', error);
      throw error;
    }
  }

  /**
   * Get pending change orders
   */
  async getPendingChangeOrders(projectId: string | null = null): Promise<ChangeOrder[]> {
    try {
      return await this.getChangeOrdersByStatus('submitted', projectId);
    } catch (error) {
      console.error('Error getting pending change orders:', error);
      throw error;
    }
  }

  /**
   * Get approved change orders
   */
  async getApprovedChangeOrders(projectId: string | null = null): Promise<ChangeOrder[]> {
    try {
      return await this.getChangeOrdersByStatus('approved', projectId);
    } catch (error) {
      console.error('Error getting approved change orders:', error);
      throw error;
    }
  }

  /**
   * Search change orders
   */
  async searchChangeOrders(
    searchTerm: string,
    projectId: string | null = null
  ): Promise<ChangeOrder[]> {
    try {
      let changeOrders = projectId
        ? await this.getChangeOrdersByProject(projectId)
        : ((await this.getAll()) as ChangeOrder[]);
      const term = searchTerm.toLowerCase().trim();

      return changeOrders.filter((co) => {
        return (
          co.title?.toLowerCase().includes(term) ||
          co.description?.toLowerCase().includes(term) ||
          (co as any).number?.toLowerCase().includes(term) ||
          (co as any).reason?.toLowerCase().includes(term) ||
          co.requestedByName?.toLowerCase().includes(term)
        );
      });
    } catch (error) {
      console.error('Error searching change orders:', error);
      throw error;
    }
  }

  /**
   * Update change order with validation and activity logging
   */
  async updateChangeOrder(changeOrderId: string, updates: Partial<ChangeOrder>): Promise<any> {
    try {
      const originalCO = (await this.getById(changeOrderId)) as ChangeOrder;
      if (!originalCO) {
        throw new Error('Change order not found');
      }

      const result = await this.update(changeOrderId, updates, CHANGE_ORDER_SCHEMA);

      // Log significant updates
      if (updates.status && updates.status !== originalCO.status) {
        await ActivityService.logStatusChange(
          originalCO.projectId,
          'changeOrder',
          changeOrderId,
          originalCO.title,
          originalCO.status,
          updates.status
        );
      }

      if (
        (updates as any).costImpact !== undefined &&
        (updates as any).costImpact !== (originalCO as any).costImpact
      ) {
        await ActivityService.logActivity(
          originalCO.projectId,
          'updated_change_order_cost',
          'changeOrder',
          changeOrderId,
          `Updated change order "${originalCO.title}" cost impact from ${(originalCO as any).costImpact || 0} to ${(updates as any).costImpact}`,
          {
            oldCostImpact: (originalCO as any).costImpact || 0,
            newCostImpact: (updates as any).costImpact,
          }
        );
      }

      if (
        (updates as any).timeImpact !== undefined &&
        (updates as any).timeImpact !== (originalCO as any).timeImpact
      ) {
        await ActivityService.logActivity(
          originalCO.projectId,
          'updated_change_order_time',
          'changeOrder',
          changeOrderId,
          `Updated change order "${originalCO.title}" time impact from ${(originalCO as any).timeImpact || 0} days to ${(updates as any).timeImpact} days`,
          {
            oldTimeImpact: (originalCO as any).timeImpact || 0,
            newTimeImpact: (updates as any).timeImpact,
          }
        );
      }

      return result;
    } catch (error) {
      console.error('Error updating change order:', error);
      throw error;
    }
  }

  /**
   * Approve change order
   */
  async approveChangeOrder(
    changeOrderId: string,
    approvedBy: string | null = null,
    approvalNotes: string = ''
  ): Promise<any> {
    try {
      const updates = {
        status: 'approved',
        approvedAt: new Date().toISOString(),
        approvedBy: approvedBy || firebaseCore.getCurrentUserId(),
        approvedByName: firebaseCore.getCurrentUserName(),
        approvalNotes: approvalNotes,
      };

      const result = await this.update(changeOrderId, updates, CHANGE_ORDER_SCHEMA);

      // Log approval activity
      const co = (await this.getById(changeOrderId)) as ChangeOrder;
      if (co && co.projectId) {
        await ActivityService.logActivity(
          co.projectId,
          'approved_change_order',
          'changeOrder',
          changeOrderId,
          `Approved change order: ${co.title}`,
          {
            approvedBy: updates.approvedByName,
            costImpact: (co as any).costImpact,
            timeImpact: (co as any).timeImpact,
            approvalNotes,
          }
        );
      }

      return result;
    } catch (error) {
      console.error('Error approving change order:', error);
      throw error;
    }
  }

  /**
   * Reject change order
   */
  async rejectChangeOrder(
    changeOrderId: string,
    rejectedBy: string | null = null,
    rejectionReason: string = ''
  ): Promise<any> {
    try {
      const updates = {
        status: 'rejected',
        rejectedAt: new Date().toISOString(),
        rejectedBy: rejectedBy || firebaseCore.getCurrentUserId(),
        rejectedByName: firebaseCore.getCurrentUserName(),
        rejectionReason: rejectionReason,
      };

      const result = await this.update(changeOrderId, updates, CHANGE_ORDER_SCHEMA);

      // Log rejection activity
      const co = (await this.getById(changeOrderId)) as ChangeOrder;
      if (co && co.projectId) {
        await ActivityService.logActivity(
          co.projectId,
          'rejected_change_order',
          'changeOrder',
          changeOrderId,
          `Rejected change order: ${co.title}`,
          {
            rejectedBy: updates.rejectedByName,
            rejectionReason,
          }
        );
      }

      return result;
    } catch (error) {
      console.error('Error rejecting change order:', error);
      throw error;
    }
  }

  /**
   * Execute change order
   */
  async executeChangeOrder(
    changeOrderId: string,
    executedBy: string | null = null,
    executionNotes: string = ''
  ): Promise<any> {
    try {
      const updates = {
        status: 'executed',
        executedAt: new Date().toISOString(),
        executedBy: executedBy || firebaseCore.getCurrentUserId(),
        executedByName: firebaseCore.getCurrentUserName(),
        executionNotes: executionNotes,
      };

      const result = await this.update(changeOrderId, updates, CHANGE_ORDER_SCHEMA);

      // Log execution activity
      const co = (await this.getById(changeOrderId)) as ChangeOrder;
      if (co && co.projectId) {
        await ActivityService.logActivity(
          co.projectId,
          'executed_change_order',
          'changeOrder',
          changeOrderId,
          `Executed change order: ${co.title}`,
          {
            executedBy: updates.executedByName,
            executionNotes,
          }
        );
      }

      return result;
    } catch (error) {
      console.error('Error executing change order:', error);
      throw error;
    }
  }

  /**
   * Delete change order
   */
  async deleteChangeOrder(changeOrderId: string): Promise<{ success: boolean; id: string }> {
    try {
      const co = (await this.getById(changeOrderId)) as ChangeOrder;
      if (!co) {
        throw new Error('Change order not found');
      }

      await this.delete(changeOrderId);

      // Log activity
      if (co.projectId) {
        await ActivityService.logEntityDeleted(
          co.projectId,
          'changeOrder',
          changeOrderId,
          co.title
        );
      }

      return { success: true, id: changeOrderId };
    } catch (error) {
      console.error('Error deleting change order:', error);
      throw error;
    }
  }

  // ==================== PROJECT IMPACT CALCULATIONS ====================

  /**
   * Calculate total project impact from approved change orders
   */
  async calculateProjectImpact(projectId: string): Promise<ProjectImpact> {
    try {
      const approvedCOs = await this.getChangeOrdersByStatus('approved', projectId);
      const executedCOs = await this.getChangeOrdersByStatus('executed', projectId);

      const allEffectiveCOs = [...approvedCOs, ...executedCOs];

      const impact: ProjectImpact = {
        totalCostImpact: 0,
        totalTimeImpact: 0,
        additionsCost: 0,
        deletionsCost: 0,
        modificationsCost: 0,
        creditsCost: 0,
        billableAmount: 0,
        nonBillableAmount: 0,
        changeOrderCount: allEffectiveCOs.length,
      };

      allEffectiveCOs.forEach((co) => {
        const costImpact = (co as any).costImpact || 0;
        const timeImpact = (co as any).timeImpact || 0;

        impact.totalCostImpact += costImpact;
        impact.totalTimeImpact += timeImpact;

        // Track by type
        switch ((co as any).type) {
          case 'addition':
            impact.additionsCost += costImpact;
            break;
          case 'deletion':
            impact.deletionsCost += costImpact;
            break;
          case 'modification':
            impact.modificationsCost += costImpact;
            break;
          case 'credit':
            impact.creditsCost += costImpact;
            break;
        }

        // Track billable vs non-billable
        if ((co as any).billable) {
          impact.billableAmount += costImpact;
        } else {
          impact.nonBillableAmount += costImpact;
        }
      });

      return impact;
    } catch (error) {
      console.error('Error calculating project impact:', error);
      throw error;
    }
  }

  // ==================== CHANGE ORDER STATISTICS ====================

  /**
   * Get change order statistics
   */
  async getChangeOrderStatistics(projectId: string | null = null): Promise<ChangeOrderStatistics> {
    try {
      let changeOrders = projectId
        ? await this.getChangeOrdersByProject(projectId)
        : ((await this.getAll()) as ChangeOrder[]);

      const stats: ChangeOrderStatistics = {
        total: changeOrders.length,
        byStatus: {
          proposed: changeOrders.filter((co) => co.status === 'proposed').length,
          submitted: changeOrders.filter((co) => co.status === 'submitted').length,
          under_review: changeOrders.filter((co) => co.status === 'under_review').length,
          approved: changeOrders.filter((co) => co.status === 'approved').length,
          rejected: changeOrders.filter((co) => co.status === 'rejected').length,
          executed: changeOrders.filter((co) => co.status === 'executed').length,
        },
        byType: {
          addition: changeOrders.filter((co) => (co as any).type === 'addition').length,
          deletion: changeOrders.filter((co) => (co as any).type === 'deletion').length,
          modification: changeOrders.filter((co) => (co as any).type === 'modification').length,
          credit: changeOrders.filter((co) => (co as any).type === 'credit').length,
        },
        totalCostImpact: changeOrders.reduce((sum, co) => sum + ((co as any).costImpact || 0), 0),
        totalTimeImpact: changeOrders.reduce((sum, co) => sum + ((co as any).timeImpact || 0), 0),
        averageCostImpact: 0,
        averageTimeImpact: 0,
        billableAmount: 0,
        nonBillableAmount: 0,
        averageApprovalTime: 0,
        byRequester: {},
        pendingApproval: changeOrders.filter((co) => co.status === 'submitted').length,
        recentActivity: 0,
      };

      // Calculate averages
      if (changeOrders.length > 0) {
        stats.averageCostImpact = stats.totalCostImpact / changeOrders.length;
        stats.averageTimeImpact = stats.totalTimeImpact / changeOrders.length;
      }

      // Calculate billable amounts
      changeOrders.forEach((co) => {
        if ((co as any).billable) {
          stats.billableAmount += (co as any).costImpact || 0;
        } else {
          stats.nonBillableAmount += (co as any).costImpact || 0;
        }
      });

      // Calculate approval times
      const approvedCOs = changeOrders.filter(
        (co) => (co as any).approvedAt && (co as any).submittedAt
      );
      if (approvedCOs.length > 0) {
        const totalApprovalTime = approvedCOs.reduce((sum, co) => {
          const submitted = new Date((co as any).submittedAt);
          const approved = new Date((co as any).approvedAt);
          return sum + (approved.getTime() - submitted.getTime());
        }, 0);
        stats.averageApprovalTime = totalApprovalTime / approvedCOs.length / (1000 * 60 * 60 * 24); // Days
      }

      // Count by requester
      changeOrders.forEach((co) => {
        const requester = co.requestedByName || 'Unknown';
        stats.byRequester[requester] = (stats.byRequester[requester] || 0) + 1;
      });

      // Recent activity (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      stats.recentActivity = changeOrders.filter(
        (co) => co.createdAt && new Date(co.createdAt) > sevenDaysAgo
      ).length;

      return stats;
    } catch (error) {
      console.error('Error getting change order statistics:', error);
      throw error;
    }
  }

  // ==================== BULK OPERATIONS ====================

  /**
   * Bulk update change order status
   */
  async bulkUpdateChangeOrderStatus(changeOrderIds: string[], status: string): Promise<any[]> {
    try {
      const updates: Record<string, unknown> = {
        status,
        ...(status === 'approved' && {
          approvedAt: new Date().toISOString(),
          approvedBy: firebaseCore.getCurrentUserId(),
          approvedByName: firebaseCore.getCurrentUserName(),
        }),
        ...(status === 'rejected' && {
          rejectedAt: new Date().toISOString(),
          rejectedBy: firebaseCore.getCurrentUserId(),
          rejectedByName: firebaseCore.getCurrentUserName(),
        }),
      };

      const results = await this.bulkUpdate(changeOrderIds, updates);

      // Log bulk activity
      await ActivityService.logBulkActivity(
        'bulk_updated_change_order_status',
        'changeOrder',
        changeOrderIds,
        `Bulk updated ${changeOrderIds.length} change orders to ${status} status`,
        { newStatus: status }
      );

      return results;
    } catch (error) {
      console.error('Error in bulk update change order status:', error);
      throw error;
    }
  }

  /**
   * Bulk approve change orders
   */
  async bulkApproveChangeOrders(
    changeOrderIds: string[],
    approvalNotes: string = ''
  ): Promise<any[]> {
    try {
      return await this.bulkUpdateChangeOrderStatus(changeOrderIds, 'approved');
    } catch (error) {
      console.error('Error in bulk approve change orders:', error);
      throw error;
    }
  }

  // ==================== REAL-TIME SUBSCRIPTIONS ====================

  /**
   * Subscribe to change orders by project
   */
  subscribeToChangeOrdersByProject(
    projectId: string,
    callback: (changeOrders: ChangeOrder[]) => void
  ): () => void {
    try {
      const changeOrdersRef = ref(firebaseCore.database, this.collectionName);
      const projectCOsQuery = query(changeOrdersRef, orderByChild('projectId'), equalTo(projectId));

      onValue(projectCOsQuery, (snapshot) => {
        const changeOrders: ChangeOrder[] = snapshot.exists()
          ? Object.entries(snapshot.val()).map(([id, data]: [string, any]) => ({ id, ...data }))
          : [];

        // Sort by requested date (newest first)
        const sortedCOs = this.sortChangeOrders(changeOrders, 'requestedAt', 'desc');
        callback(sortedCOs);
      });

      return projectCOsQuery;
    } catch (error) {
      console.error('Error subscribing to change orders by project:', error);
      throw error;
    }
  }

  /**
   * Subscribe to all change orders
   */
  subscribeToChangeOrders(callback: (changeOrders: ChangeOrder[]) => void): () => void {
    const sortByStatusAndDate = (a: ChangeOrder, b: ChangeOrder) => {
      // First sort by status priority (pending items first)
      const statusOrder: Record<string, number> = {
        proposed: 0,
        submitted: 1,
        under_review: 2,
        approved: 3,
        executed: 4,
        rejected: 5,
      };
      const aStatusOrder = statusOrder[a.status] ?? 3;
      const bStatusOrder = statusOrder[b.status] ?? 3;

      if (aStatusOrder !== bStatusOrder) {
        return aStatusOrder - bStatusOrder;
      }

      // Then by requested date (newest first)
      const aDate = new Date((a as any).requestedAt || a.createdAt || 0);
      const bDate = new Date((b as any).requestedAt || b.createdAt || 0);
      return bDate.getTime() - aDate.getTime();
    };

    return this.subscribeToAll(callback, sortByStatusAndDate);
  }

  /**
   * Subscribe to change orders by status
   */
  subscribeToChangeOrdersByStatus(
    status: string,
    callback: (changeOrders: ChangeOrder[]) => void
  ): () => void {
    const filterByStatus = (changeOrders: unknown[]) => {
      const filtered = (changeOrders as ChangeOrder[]).filter((co) => co.status === status);
      callback(filtered);
    };

    return this.subscribeToAll(filterByStatus);
  }

  // ==================== HELPER METHODS ====================

  /**
   * Sort change orders by various criteria
   */
  sortChangeOrders(
    changeOrders: ChangeOrder[],
    sortBy: string = 'requestedAt',
    direction: 'asc' | 'desc' = 'desc'
  ): ChangeOrder[] {
    return changeOrders.sort((a, b) => {
      let aVal: any, bVal: any;

      switch (sortBy) {
        case 'title':
        case 'number':
          aVal = ((a as any)[sortBy] || '').toLowerCase();
          bVal = ((b as any)[sortBy] || '').toLowerCase();
          break;

        case 'status': {
          const statusOrder: Record<string, number> = {
            proposed: 0,
            submitted: 1,
            under_review: 2,
            approved: 3,
            executed: 4,
            rejected: 5,
          };
          aVal = statusOrder[a.status] ?? 3;
          bVal = statusOrder[b.status] ?? 3;
          break;
        }

        case 'type': {
          const typeOrder: Record<string, number> = {
            addition: 0,
            modification: 1,
            deletion: 2,
            credit: 3,
          };
          aVal = typeOrder[(a as any).type] ?? 1;
          bVal = typeOrder[(b as any).type] ?? 1;
          break;
        }

        case 'costImpact':
        case 'timeImpact':
          aVal = (a as any)[sortBy] || 0;
          bVal = (b as any)[sortBy] || 0;
          break;

        case 'requestedAt':
        case 'approvedAt':
        case 'rejectedAt':
        case 'executedAt':
        case 'createdAt':
          aVal = (a as any)[sortBy] ? new Date((a as any)[sortBy]) : new Date(0);
          bVal = (b as any)[sortBy] ? new Date((b as any)[sortBy]) : new Date(0);
          break;

        default:
          aVal = (a as any)[sortBy] || '';
          bVal = (b as any)[sortBy] || '';
      }

      if (direction === 'desc') {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
      return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
    });
  }

  /**
   * Validate change order-specific data
   */
  validateChangeOrderData(changeOrderData: Record<string, unknown>): ValidationResult {
    const validation = super.validateData(changeOrderData, ['title', 'projectId']);

    // Add change order-specific validations
    if (
      changeOrderData.type &&
      !['addition', 'deletion', 'modification', 'credit'].includes(changeOrderData.type)
    ) {
      validation.errors.type = 'Invalid type. Must be: addition, deletion, modification, or credit';
      validation.isValid = false;
    }

    if (
      changeOrderData.status &&
      !['proposed', 'submitted', 'under_review', 'approved', 'rejected', 'executed'].includes(
        changeOrderData.status
      )
    ) {
      validation.errors.status =
        'Invalid status. Must be: proposed, submitted, under_review, approved, rejected, or executed';
      validation.isValid = false;
    }

    if (
      changeOrderData.costImpact !== undefined &&
      typeof changeOrderData.costImpact !== 'number'
    ) {
      validation.errors.costImpact = 'Cost impact must be a number';
      validation.isValid = false;
    }

    if (
      changeOrderData.timeImpact !== undefined &&
      typeof changeOrderData.timeImpact !== 'number'
    ) {
      validation.errors.timeImpact = 'Time impact must be a number (days)';
      validation.isValid = false;
    }

    return validation;
  }

  /**
   * Generate next change order number for project
   */
  async generateChangeOrderNumber(projectId: string): Promise<string> {
    try {
      const projectCOs = await this.getChangeOrdersByProject(projectId);
      const nextNumber = projectCOs.length + 1;
      return `CO-${projectId.slice(-4)}-${nextNumber.toString().padStart(3, '0')}`;
    } catch (error) {
      console.error('Error generating change order number:', error);
      return `CO-${Date.now()}`;
    }
  }

  /**
   * Check if change order needs approval
   */
  needsApproval(changeOrder: ChangeOrder, approvalThreshold: number = 1000): boolean {
    return (
      changeOrder.status === 'submitted' &&
      Math.abs((changeOrder as any).costImpact || 0) >= approvalThreshold
    );
  }

  /**
   * Get change order impact summary
   */
  getImpactSummary(changeOrder: ChangeOrder): ImpactSummary {
    return {
      costImpact: (changeOrder as any).costImpact || 0,
      timeImpact: (changeOrder as any).timeImpact || 0,
      type: (changeOrder as any).type || 'modification',
      billable: (changeOrder as any).billable !== false,
      hasFinancialImpact: Math.abs((changeOrder as any).costImpact || 0) > 0,
      hasScheduleImpact: Math.abs((changeOrder as any).timeImpact || 0) > 0,
    };
  }
}

export default new ChangeOrderRepository();
