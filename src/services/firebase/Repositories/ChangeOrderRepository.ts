// src/services/firebase/repositories/ChangeOrderRepository.ts
import BaseRepository from '@/services/firebase/core/BaseRepository';
import { CrudMixin } from '../mixins/CrudMixin';
import { RealtimeMixin } from '../mixins/RealtimeMixin';
import ActivityService from '@/services/logging/ActivityService';
import firebaseCore from '@/services/firebase/core/FirebaseCore';
import { ref, query, orderByChild, equalTo, onValue } from 'firebase/database';
import { CHANGE_ORDER_SCHEMA } from '../schemas';
import type {
  ChangeOrder,
  ChangeOrderStatus,
  ChangeOrderType,
  ValidationResult,
} from '@/types/models';
import type { RepositoryInterface } from '../types/repository';

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
const MixedBase = CrudMixin(RealtimeMixin(BaseRepository)) as unknown as new (
  collectionName: string
) => RepositoryInterface<ChangeOrder>;

class ChangeOrderRepository extends MixedBase {
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

      // Add change order-specific defaults with proper typing
      const cleanData = validation.cleanData as Partial<ChangeOrder>;
      const coDataWithDefaults: Partial<ChangeOrder> = {
        ...cleanData,
        status: (cleanData.status as ChangeOrderStatus) || 'proposed',
        type: (cleanData.type as ChangeOrderType) || 'addition',
        costImpact: cleanData.costImpact || 0,
        timeImpact: cleanData.timeImpact || 0,
        billable: cleanData.billable !== false,
        requestedBy: firebaseCore.getCurrentUserId(),
        requestedByName: firebaseCore.getCurrentUserName(),
        requestedAt: new Date().toISOString(),
        attachments: cleanData.attachments || [],
        attachmentCount: cleanData.attachmentCount || 0,
      };

      const newCO = (await this.create(
        coDataWithDefaults as Record<string, unknown>,
        CHANGE_ORDER_SCHEMA as Record<string, string>
      )) as ChangeOrder & { id: string };

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
      const changeOrders = (await this.getByField('projectId', projectId)) as Array<
        ChangeOrder & { id: string }
      >;

      // Apply filters
      let filtered = changeOrders;

      if (filters.status && filters.status.length > 0) {
        filtered = filtered.filter((co) => filters.status!.includes(co.status));
      }

      if (filters.type && filters.type.length > 0) {
        filtered = filtered.filter((co) => filters.type!.includes(co.type));
      }

      if (filters.requestedBy) {
        filtered = filtered.filter((co) => co.requestedBy === filters.requestedBy);
      }

      if (filters.billable !== undefined) {
        filtered = filtered.filter((co) => co.billable === filters.billable);
      }

      if (filters.minCostImpact !== undefined) {
        filtered = filtered.filter((co) => (co.costImpact || 0) >= filters.minCostImpact!);
      }

      if (filters.maxCostImpact !== undefined) {
        filtered = filtered.filter((co) => (co.costImpact || 0) <= filters.maxCostImpact!);
      }

      if (filters.requestedAfter) {
        filtered = filtered.filter(
          (co) => co.requestedAt && new Date(co.requestedAt) >= new Date(filters.requestedAfter!)
        );
      }

      // Apply sorting
      let sorted = this.sortChangeOrders(
        filtered,
        filters.sortBy || 'requestedAt',
        filters.sortDirection || 'desc'
      );

      // Apply limit if specified
      if (filters.limit && filters.limit > 0) {
        sorted = sorted.slice(0, filters.limit);
      }

      return sorted;
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
      const changeOrders = projectId
        ? await this.getChangeOrdersByProject(projectId)
        : ((await this.getAll()) as unknown as ChangeOrder[]);
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
      const changeOrders = projectId
        ? await this.getChangeOrdersByProject(projectId)
        : ((await this.getAll()) as unknown as ChangeOrder[]);
      const term = searchTerm.toLowerCase().trim();

      return changeOrders.filter((co: ChangeOrder) => {
        return (
          co.title?.toLowerCase().includes(term) ||
          co.description?.toLowerCase().includes(term) ||
          co.number?.toLowerCase().includes(term) ||
          co.reason?.toLowerCase().includes(term) ||
          co.requestedByName?.toLowerCase().includes(term)
        );
      });
    } catch (error) {
      console.error('Error searching change orders:', error);
      throw error;
    }
  }

  /**
   * Get change order by ID
   */
  async getChangeOrderById(changeOrderId: string): Promise<ChangeOrder | null> {
    try {
      const changeOrder = (await this.getById(changeOrderId)) as unknown as ChangeOrder | null;
      return changeOrder;
    } catch (error) {
      console.error('Error getting change order by ID:', error);
      throw error;
    }
  }

  /**
   * Update change order with validation and activity logging
   */
  async updateChangeOrder(
    changeOrderId: string,
    updates: Partial<ChangeOrder>
  ): Promise<ChangeOrder & { id: string }> {
    try {
      const originalCO = (await this.getById(changeOrderId)) as
        | (ChangeOrder & { id: string })
        | null;
      if (!originalCO) {
        throw new Error('Change order not found');
      }

      const result = (await this.update(
        changeOrderId,
        updates,
        CHANGE_ORDER_SCHEMA
      )) as ChangeOrder & { id: string };

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

      if (updates.costImpact !== undefined && updates.costImpact !== originalCO.costImpact) {
        await ActivityService.logActivity(
          originalCO.projectId,
          'updated_change_order_cost',
          'changeOrder',
          changeOrderId,
          `Updated change order "${originalCO.title}" cost impact from ${originalCO.costImpact || 0} to ${updates.costImpact}`,
          {
            oldCostImpact: originalCO.costImpact || 0,
            newCostImpact: updates.costImpact,
          }
        );
      }

      if (updates.timeImpact !== undefined && updates.timeImpact !== originalCO.timeImpact) {
        await ActivityService.logActivity(
          originalCO.projectId,
          'updated_change_order_time',
          'changeOrder',
          changeOrderId,
          `Updated change order "${originalCO.title}" time impact from ${originalCO.timeImpact || 0} days to ${updates.timeImpact} days`,
          {
            oldTimeImpact: originalCO.timeImpact || 0,
            newTimeImpact: updates.timeImpact,
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
  ): Promise<ChangeOrder & { id: string }> {
    try {
      const updates: Partial<ChangeOrder> = {
        status: 'approved',
        approvedAt: new Date().toISOString(),
        approvedBy: approvedBy || firebaseCore.getCurrentUserId(),
        approvedByName: firebaseCore.getCurrentUserName(),
        approvalNotes: approvalNotes,
      };

      const result = (await this.update(
        changeOrderId,
        updates,
        CHANGE_ORDER_SCHEMA
      )) as ChangeOrder & { id: string };

      // Log approval activity
      const co = (await this.getById(changeOrderId)) as (ChangeOrder & { id: string }) | null;
      if (co && co.projectId) {
        await ActivityService.logActivity(
          co.projectId,
          'approved_change_order',
          'changeOrder',
          changeOrderId,
          `Approved change order: ${co.title}`,
          {
            approvedBy: updates.approvedByName,
            costImpact: co.costImpact,
            timeImpact: co.timeImpact,
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
  ): Promise<ChangeOrder & { id: string }> {
    try {
      const updates: Partial<ChangeOrder> = {
        status: 'rejected',
        rejectedAt: new Date().toISOString(),
        rejectedBy: rejectedBy || firebaseCore.getCurrentUserId(),
        rejectedByName: firebaseCore.getCurrentUserName(),
        rejectionReason: rejectionReason,
      };

      const result = (await this.update(
        changeOrderId,
        updates,
        CHANGE_ORDER_SCHEMA
      )) as ChangeOrder & { id: string };

      // Log rejection activity
      const co = (await this.getById(changeOrderId)) as (ChangeOrder & { id: string }) | null;
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
  ): Promise<ChangeOrder & { id: string }> {
    try {
      const updates: Partial<ChangeOrder> = {
        status: 'executed',
        executedAt: new Date().toISOString(),
        executedBy: executedBy || firebaseCore.getCurrentUserId(),
        executedByName: firebaseCore.getCurrentUserName(),
        executionNotes: executionNotes,
      };

      const result = (await this.update(
        changeOrderId,
        updates,
        CHANGE_ORDER_SCHEMA
      )) as ChangeOrder & { id: string };

      // Log execution activity
      const co = (await this.getById(changeOrderId)) as (ChangeOrder & { id: string }) | null;
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
      const co = (await this.getById(changeOrderId)) as unknown as ChangeOrder;
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

      allEffectiveCOs.forEach((co: ChangeOrder) => {
        const costImpact = co.costImpact || 0;
        const timeImpact = co.timeImpact || 0;

        impact.totalCostImpact += costImpact;
        impact.totalTimeImpact += timeImpact;

        // Track by type
        switch (co.type) {
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
        if (co.billable) {
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
      const changeOrders = projectId
        ? await this.getChangeOrdersByProject(projectId)
        : ((await this.getAll()) as unknown as ChangeOrder[]);

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
          addition: changeOrders.filter((co: ChangeOrder) => co.type === 'addition').length,
          deletion: changeOrders.filter((co: ChangeOrder) => co.type === 'deletion').length,
          modification: changeOrders.filter((co: ChangeOrder) => co.type === 'modification').length,
          credit: changeOrders.filter((co: ChangeOrder) => co.type === 'credit').length,
        },
        totalCostImpact: changeOrders.reduce(
          (sum, co: ChangeOrder) => sum + (co.costImpact || 0),
          0
        ),
        totalTimeImpact: changeOrders.reduce(
          (sum, co: ChangeOrder) => sum + (co.timeImpact || 0),
          0
        ),
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
      changeOrders.forEach((co: ChangeOrder) => {
        if (co.billable) {
          stats.billableAmount += co.costImpact || 0;
        } else {
          stats.nonBillableAmount += co.costImpact || 0;
        }
      });

      // Calculate approval times
      const approvedCOs = changeOrders.filter((co: ChangeOrder) => co.approvedAt && co.submittedAt);
      if (approvedCOs.length > 0) {
        const totalApprovalTime = approvedCOs.reduce((sum, co: ChangeOrder) => {
          const submitted = new Date(co.submittedAt!);
          const approved = new Date(co.approvedAt!);
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
  async bulkUpdateChangeOrderStatus(
    changeOrderIds: string[],
    status: string
  ): Promise<Array<ChangeOrder & { id: string }>> {
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

      const results = (await this.bulkUpdate(changeOrderIds, updates)) as Array<
        ChangeOrder & { id: string }
      >;

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
    _approvalNotes: string = ''
  ): Promise<Array<ChangeOrder & { id: string }>> {
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

      const unsubscribe = onValue(projectCOsQuery, (snapshot) => {
        const changeOrders: ChangeOrder[] = snapshot.exists()
          ? Object.entries(snapshot.val()).map(
              ([id, data]: [string, Record<string, unknown>]) =>
                ({ id, ...data }) as ChangeOrder & { id: string }
            )
          : [];

        // Sort by requested date (newest first)
        const sortedCOs = this.sortChangeOrders(changeOrders, 'requestedAt', 'desc');
        callback(sortedCOs);
      });

      return unsubscribe;
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
      // Sort by status order (submitted first, then approved, executed, rejected)
      const statusOrder: Record<string, number> = {
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
      const aDate = new Date(a.requestedAt || a.createdAt || 0);
      const bDate = new Date(b.requestedAt || b.createdAt || 0);
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
      let aVal: string | number | Date;
      let bVal: string | number | Date;

      switch (sortBy) {
        case 'title':
          aVal = (a.title || '').toLowerCase();
          bVal = (b.title || '').toLowerCase();
          break;

        case 'number':
          aVal = (a.number || '').toLowerCase();
          bVal = (b.number || '').toLowerCase();
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
          aVal = typeOrder[a.type] ?? 1;
          bVal = typeOrder[b.type] ?? 1;
          break;
        }

        case 'costImpact':
          aVal = a.costImpact || 0;
          bVal = b.costImpact || 0;
          break;

        case 'timeImpact':
          aVal = a.timeImpact || 0;
          bVal = b.timeImpact || 0;
          break;

        case 'requestedAt':
          aVal = a.requestedAt ? new Date(a.requestedAt) : new Date(0);
          bVal = b.requestedAt ? new Date(b.requestedAt) : new Date(0);
          break;

        case 'approvedAt':
          aVal = a.approvedAt ? new Date(a.approvedAt) : new Date(0);
          bVal = b.approvedAt ? new Date(b.approvedAt) : new Date(0);
          break;

        case 'rejectedAt':
          aVal = a.rejectedAt ? new Date(a.rejectedAt) : new Date(0);
          bVal = b.rejectedAt ? new Date(b.rejectedAt) : new Date(0);
          break;

        case 'executedAt':
          aVal = a.executedAt ? new Date(a.executedAt) : new Date(0);
          bVal = b.executedAt ? new Date(b.executedAt) : new Date(0);
          break;

        case 'createdAt':
          aVal = a.createdAt ? new Date(a.createdAt) : new Date(0);
          bVal = b.createdAt ? new Date(b.createdAt) : new Date(0);
          break;

        default:
          aVal = a.createdAt ? new Date(a.createdAt) : new Date(0);
          bVal = b.createdAt ? new Date(b.createdAt) : new Date(0);
      }

      // Type-safe comparison
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        if (direction === 'desc') {
          return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
        }
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else if (typeof aVal === 'number' && typeof bVal === 'number') {
        if (direction === 'desc') {
          return bVal - aVal;
        }
        return aVal - bVal;
      } else if (aVal instanceof Date && bVal instanceof Date) {
        if (direction === 'desc') {
          return bVal.getTime() - aVal.getTime();
        }
        return aVal.getTime() - bVal.getTime();
      }
      return 0;
    });
  }

  /**
   * Validate change order-specific data
   */
  validateChangeOrderData(changeOrderData: Record<string, unknown>): ValidationResult {
    const validation = this.validateData(changeOrderData, ['title', 'projectId']);

    // Add change order-specific validations
    if (
      changeOrderData.type &&
      !['addition', 'deletion', 'modification', 'credit'].includes(changeOrderData.type as string)
    ) {
      validation.errors.type = `Invalid type. Must be: addition, deletion, modification, or credit`;
      validation.isValid = false;
    }

    if (
      changeOrderData.status &&
      !['proposed', 'submitted', 'under_review', 'approved', 'rejected', 'executed'].includes(
        changeOrderData.status as string
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
      Math.abs(changeOrder.costImpact || 0) >= approvalThreshold
    );
  }

  /**
   * Get change order impact summary
   */
  getImpactSummary(changeOrder: ChangeOrder): ImpactSummary {
    return {
      costImpact: changeOrder.costImpact || 0,
      timeImpact: changeOrder.timeImpact || 0,
      type: changeOrder.type || 'modification',
      billable: changeOrder.billable !== false,
      hasFinancialImpact: Math.abs(changeOrder.costImpact || 0) > 0,
      hasScheduleImpact: Math.abs(changeOrder.timeImpact || 0) > 0,
    };
  }
}

export default new ChangeOrderRepository();
