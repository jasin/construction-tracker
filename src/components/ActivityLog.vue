<template>
  <div class="activity-log">
    <div v-if="!activities || activities.length === 0" class="no-data">
      No recent activity found for this project.
    </div>
    <ul v-else class="activity-items">
      <li v-for="activity in activities" :key="activity.id" class="activity-item">
        <div class="activity-icon" :class="getActivityType(activity.action)">
          <i :class="getActivityIcon(activity.action)"></i>
        </div>
        <div class="activity-content">
          <div class="activity-description">
            {{ activity.description }}
          </div>
          <div class="activity-meta">
            <span class="activity-user">{{ activity.userId }}</span>
            <span class="activity-time">{{ formatTimeAgo(activity.timestamp) }}</span>
          </div>
        </div>
      </li>
    </ul>
  </div>
</template>

<script>
export default {
  name: 'ActivityLog',
  props: {
    activities: {
      type: Array,
      default: () => [],
    },
  },
  methods: {
    formatTimeAgo(timestamp) {
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
        return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`
      } else if (diffInHours < 24) {
        return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`
      } else if (diffInDays < 7) {
        return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`
      } else {
        return activityTime.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: activityTime.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
        })
      }
    },

    getActivityType(action) {
      const typeMap = {
        created_project: 'project',
        updated_project_phase: 'project',
        created_rfi: 'rfi',
        created_submittal: 'submittal',
        created_change_order: 'change-order',
        uploaded_document: 'document',
      }
      return typeMap[action] || 'general'
    },

    getActivityIcon(action) {
      // Using simple text icons since we don't have an icon library
      // You can replace these with actual icon classes if you add an icon library
      const iconMap = {
        created_project: '📁',
        updated_project_phase: '🔄',
        created_rfi: '❓',
        created_submittal: '📋',
        created_change_order: '📝',
        uploaded_document: '📄',
      }
      return iconMap[action] || '•'
    },
  },
}
</script>

<style scoped>
.activity-log {
  max-width: 600px;
}

.no-data {
  text-align: center;
  padding: 20px;
  color: #6c757d;
  font-style: italic;
}

.activity-items {
  list-style: none;
  padding: 0;
  margin: 0;
}

.activity-item {
  display: flex;
  align-items: flex-start;
  padding: 12px 0;
  border-bottom: 1px solid #f1f3f4;
}

.activity-item:last-child {
  border-bottom: none;
}

.activity-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  flex-shrink: 0;
  font-size: 14px;
}

.activity-icon.project {
  background-color: #e3f2fd;
  color: #1976d2;
}

.activity-icon.rfi {
  background-color: #fff3e0;
  color: #f57c00;
}

.activity-icon.submittal {
  background-color: #f3e5f5;
  color: #7b1fa2;
}

.activity-icon.change-order {
  background-color: #e8f5e8;
  color: #388e3c;
}

.activity-icon.document {
  background-color: #fce4ec;
  color: #c2185b;
}

.activity-icon.general {
  background-color: #f5f5f5;
  color: #757575;
}

.activity-content {
  flex: 1;
  min-width: 0;
}

.activity-description {
  color: #343a40;
  font-size: 14px;
  line-height: 1.4;
  margin-bottom: 4px;
}

.activity-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: #6c757d;
}

.activity-user {
  font-weight: 500;
}

.activity-time {
  color: #868e96;
}

@media (max-width: 768px) {
  .activity-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
  }
}
</style>
