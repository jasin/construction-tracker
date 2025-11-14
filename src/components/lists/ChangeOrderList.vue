<template>
  <div class="change-order-list">
    <div v-if="!changeOrders || Object.keys(changeOrders).length === 0" class="no-data">
      No change orders found for this project.
    </div>
</template>

<old_text line=95>
  props: {
    changeOrders: {
      type: Object,
      default: () => ({}),
    },
    projectId: {
      type: String,
      required: true,
    },
    emptyMessage: {
      type: String,
      default: 'No change orders yet',
    },
  },
    <ul v-else class="change-order-items">
      <li
        v-for="(changeOrder, coKey) in changeOrders"
        :key="changeOrder.id || coKey"
        class="change-order-item"
      >
        <div class="change-order-header">
          <strong>{{ changeOrder.number || coKey }}</strong>
          <span class="status-badge" :class="changeOrder.status">
            {{ formatStatus(changeOrder.status) }}
          </span>
        </div>
        <div class="change-order-content">
          <h4>{{ changeOrder.title }}</h4>
          <p class="description">{{ changeOrder.description }}</p>
          <div class="change-order-meta">
            <div class="meta-item">
              <strong>Cost Impact:</strong>
              <span
                :class="{
                  positive: changeOrder.costImpact > 0,
                  negative: changeOrder.costImpact < 0,
                }"
              >
                ${{ formatCurrency(Math.abs(changeOrder.costImpact || 0)) }}
                {{ changeOrder.costImpact > 0 ? '↑' : changeOrder.costImpact < 0 ? '↓' : '' }}
              </span>
            </div>
            <div class="meta-item">
              <strong>Time Impact:</strong> {{ changeOrder.timeImpact || 0 }} days
            </div>
            <div class="meta-item">
              <strong>Reason:</strong> {{ formatReason(changeOrder.reason) }}
            </div>
            <div class="meta-item">
              <strong>Requested By:</strong> {{ changeOrder.requestedBy }}
            </div>
            <div class="meta-item" v-if="changeOrder.createdAt">
              <strong>Created:</strong> {{ formatDate(changeOrder.createdAt) }}
            </div>
            <div class="meta-item" v-if="changeOrder.approvedAt">
              <strong>Approved:</strong> {{ formatDate(changeOrder.approvedAt) }}
            </div>
            <div class="meta-item" v-if="changeOrder.workCompletedAt">
              <strong>Work Completed:</strong> {{ formatDate(changeOrder.workCompletedAt) }}
            </div>
            <div class="meta-item" v-if="changeOrder.status === 'work-completed'">
              <strong>Billable:</strong>
              <span :class="{ billable: changeOrder.billable }">
                {{ changeOrder.billable ? 'Yes' : 'No' }}
              </span>
            </div>
          </div>
        </div>
        <div class="change-order-actions" v-if="canTakeAction(changeOrder)">
          <button
            v-if="changeOrder.status === 'proposed'"
            @click="approveChangeOrder(changeOrder.id || coKey)"
            class="btn-approve"
          >
            Approve
          </button>
          <button
            v-if="changeOrder.status === 'proposed'"
            @click="rejectChangeOrder(changeOrder.id || coKey)"
            class="btn-reject"
          >
            Reject
          </button>
          <button
            v-if="changeOrder.status === 'approved'"
            @click="markWorkCompleted(changeOrder.id || coKey)"
            class="btn-complete"
          >
            Mark Work Complete
          </button>
        </div>
      </li>
    </ul>
  </div>
</template>

<script>
import firebaseService from '@/services/firebaseService';

export default {
  name: 'ChangeOrderList',
  props: {
    changeOrders: {
      type: Object,
      default: () => ({}),
    },
    projectId: {
      type: String,
      required: true,
    },
  },
  methods: {
    formatDate(isoString) {
      if (!isoString) return 'N/A';
      return new Date(isoString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    },

    formatCurrency(amount) {
      return new Intl.NumberFormat('en-US').format(amount || 0);
    },

    formatStatus(status) {
      const statusMap = {
        proposed: 'Proposed',
        approved: 'Approved',
        rejected: 'Rejected',
        'work-completed': 'Work Completed',
      };
      return statusMap[status] || status;
    },

    formatReason(reason) {
      const reasonMap = {
        'client-request': 'Client Request',
        'design-change': 'Design Change',
        'unforeseen-conditions': 'Unforeseen Conditions',
        'code-requirement': 'Code Requirement',
      };
      return reasonMap[reason] || reason;
    },

    canTakeAction(changeOrder) {
      // Add logic here based on user permissions
      return ['proposed', 'approved'].includes(changeOrder.status);
    },

    async approveChangeOrder(changeOrderId) {
      try {
        await firebaseService.approveChangeOrder(changeOrderId);
      } catch (error) {
        console.error('Error approving change order:', error);
        alert('Failed to approve change order');
      }
    },

    async rejectChangeOrder(changeOrderId) {
      try {
        await firebaseService.rejectChangeOrder(changeOrderId);
      } catch (error) {
        console.error('Error rejecting change order:', error);
        alert('Failed to reject change order');
      }
    },

    async markWorkCompleted(changeOrderId) {
      try {
        await firebaseService.completeChangeOrderWork(changeOrderId);
      } catch (error) {
        console.error('Error marking work completed:', error);
        alert('Failed to mark work completed');
      }
    },
  },
};
</script>

<style scoped>
@import '@/styles/list-styles.css';

/* ChangeOrderList uses a different design pattern (card-based) */
.change-order-list {
  max-width: 800px;
  margin: 0 auto;
}

.no-data {
  font-style: italic;
}

.change-order-items {
  list-style: none;
  padding: 0;
}

.change-order-item {
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 15px;
  background-color: #fff;
}

.change-order-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
  text-transform: uppercase;
}

.status-badge.proposed {
  background-color: #fff3cd;
  color: #856404;
}

.status-badge.approved {
  background-color: #cce5ff;
  color: #004085;
}

.status-badge.rejected {
  background-color: #f8d7da;
  color: #721c24;
}

.status-badge.work-completed {
  background-color: #d4edda;
  color: #155724;
}

.change-order-content h4 {
  margin: 0 0 8px 0;
  color: #343a40;
}

.description {
  color: #6c757d;
  margin-bottom: 15px;
  line-height: 1.4;
}

.change-order-meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 10px;
  margin-bottom: 15px;
}

.meta-item {
  font-size: 14px;
}

.meta-item strong {
  color: #495057;
}

.positive {
  color: #28a745;
  font-weight: bold;
}

.negative {
  color: #dc3545;
  font-weight: bold;
}

.billable {
  color: #28a745;
  font-weight: bold;
}

.change-order-actions {
  display: flex;
  gap: 10px;
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid #e9ecef;
}

.btn-approve,
.btn-reject,
.btn-complete {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

.btn-approve,
.btn-complete {
  background-color: #28a745;
  color: white;
}

.btn-approve:hover,
.btn-complete:hover {
  background-color: #218838;
}

.btn-reject {
  background-color: #dc3545;
  color: white;
}

.btn-reject:hover {
  background-color: #c82333;
}

@media (max-width: 768px) {
  .change-order-meta {
    grid-template-columns: 1fr;
  }

  .change-order-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .change-order-actions {
    flex-direction: column;
  }
}
</style>
