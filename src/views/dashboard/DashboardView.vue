<template>
  <div class="min-h-screen bg-surface-ground p-6">
    <div v-if="loading" class="flex justify-center py-12">
      <ProgressSpinner />
    </div>
    <div v-else>
      <h1 class="text-2xl font-bold text-surface-900 mb-2">Construction Overview</h1>
      <p class="text-surface-600 mb-6">
        Monitor active projects, track progress, and manage construction operations
      </p>
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <Card
          v-for="project in activeProjects"
          :key="project.id"
          class="cursor-pointer hover:shadow-md transition-shadow"
          @click="$router.push(`/project/${project.id}`)"
        >
          <template #header>
            <div class="p-4 pb-0">
              <div class="flex justify-between items-start">
                <h3 class="font-medium text-surface-900">
                  {{ project.jobNumber }} {{ project.name }}
                </h3>
                <i class="pi pi-chevron-down text-surface-600"></i>
              </div>
              <p class="text-sm text-surface-600 mt-1">
                {{ project.changes }} change{{ project.changes !== 1 ? 's' : '' }} since yesterday
              </p>
            </div>
          </template>
          <template #content>
            <div class="p-4 pt-0">
              <h4 class="text-sm font-semibold text-surface-900 mb-2">Construction Updates</h4>
              <ul class="space-y-2 mb-4">
                <li
                  v-for="update in project.updates"
                  :key="update.id"
                  class="flex items-start gap-2 text-sm text-surface-600"
                >
                  <span
                    class="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs"
                    :class="getActivityIconClass(update.action)"
                  >
                    <i :class="getActivityIcon(update.action)"></i>
                  </span>
                  <span
                    >{{ update.description }}
                    <span class="text-surface-500">{{
                      formatTimeAgo(update.timestamp)
                    }}</span></span
                  >
                </li>
                <li v-if="!project.updates.length" class="text-sm text-surface-500">
                  No recent updates
                </li>
              </ul>
              <h4 class="text-sm font-semibold text-surface-900 mb-2">Documents</h4>
              <ul class="space-y-2">
                <li
                  v-for="doc in project.documents"
                  :key="doc.id"
                  class="flex items-start gap-2 text-sm text-surface-600"
                >
                  <span
                    class="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs"
                    :class="getActivityIconClass(doc.action)"
                  >
                    <i :class="getActivityIcon(doc.action)"></i>
                  </span>
                  <span
                    >{{ doc.description }}
                    <span class="text-surface-500">{{ formatTimeAgo(doc.timestamp) }}</span></span
                  >
                </li>
                <li v-if="!project.documents.length" class="text-sm text-surface-500">
                  No recent documents
                </li>
              </ul>
            </div>
          </template>
        </Card>
      </div>
      <div v-if="!activeProjects.length" class="text-center py-8 text-surface-600">
        No active projects with recent activity
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import Card from 'primevue/card';
import ProgressSpinner from 'primevue/progressspinner';
import ProjectRepository from '@/services/firebase/Repositories/ProjectRepository';
import ActivityService from '@/services/logging/ActivityService';
import { handleError } from '../../utils/errorHandler';

const toast = useToast();

const loading = ref(true);
const projects = ref([]);
const activities = ref([]);
let activityUnsubscribe = null;
let projectUnsubscribe = null;

/**
 * Computes grouped activities by projectId.
 * @returns {Object} Map of projectId to array of activities.
 */
const groupedActivities = computed(() => {
  return activities.value.reduce((acc, activity) => {
    const pid = activity.projectId;
    if (!acc[pid]) acc[pid] = [];
    acc[pid].push(activity);
    return acc;
  }, {});
});

/**
 * Computes the top 4 projects with recent activity, sorted by recency and volume.
 * Derives per-project data like changes, updates, and documents.
 * @returns {Array} Array of enhanced project objects.
 */
const activeProjects = computed(() => {
  const now = Date.now();
  const yesterday = now - 24 * 60 * 60 * 1000;

  return projects.value
    .map((project) => {
      const projActivities = groupedActivities.value[project.id] || [];
      if (!projActivities.length) return null;

      const lastTimestamp = Math.max(...projActivities.map((a) => new Date(a.timestamp).getTime()));
      const activityCount = projActivities.length;
      const changes = projActivities.filter(
        (a) => new Date(a.timestamp).getTime() > yesterday
      ).length;

      const updates = projActivities
        .filter((a) =>
          ['created_rfi', 'created_submittal', 'created_change_order'].includes(a.action)
        )
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 3); // Limit to top 3 updates

      const documents = projActivities
        .filter((a) => a.action === 'uploaded_document')
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 2); // Limit to top 2 documents

      return { ...project, lastTimestamp, activityCount, changes, updates, documents };
    })
    .filter(Boolean)
    .sort((a, b) => b.lastTimestamp - a.lastTimestamp || b.activityCount - a.activityCount)
    .slice(0, 4);
});

/**
 * Loads projects and recent activities.
 * @async
 */
const loadData = async () => {
  try {
    loading.value = true;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [projData, actData] = await Promise.all([
      ProjectRepository.getAllProjects(),
      ActivityService.getRecentActivities({ since: sevenDaysAgo }),
    ]);
    projects.value = projData;
    activities.value = actData;
  } catch (error) {
    handleError(error, 'DashboardView.loadData');
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load data. Please try again.',
      life: 5000,
    });
  } finally {
    loading.value = false;
  }
};

/**
 * Sets up realtime subscription to recent activities.
 */
const setupSubscription = () => {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  activityUnsubscribe = ActivityService.subscribeToRecentActivities(
    { since: sevenDaysAgo },
    (updatedActivities) => {
      activities.value = updatedActivities;
    }
  );
};

/**
 * Sets up realtime subscription to projects.
 */
const setupProjectSubscription = () => {
  projectUnsubscribe = ProjectRepository.subscribeToAll((updatedProjects) => {
    projects.value = updatedProjects;
  });
};

/**
 * Formats a timestamp as relative time ago.
 * @param {string|Date} timestamp - The timestamp to format.
 * @returns {string} Formatted relative time.
 */
const formatTimeAgo = (timestamp) => {
  if (!timestamp) return 'Unknown';
  const now = new Date();
  const time = new Date(timestamp);
  const diffInMs = now - time;
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  if (diffInHours < 24) return `${diffInHours}h ago`;
  if (diffInDays < 7) return `${diffInDays}d ago`;
  return time.toLocaleDateString();
};

/**
 * Gets the CSS class for an activity icon based on action.
 * @param {string} action - The activity action.
 * @returns {string} CSS classes.
 */
const getActivityIconClass = (action) => {
  const classMap = {
    created_rfi: 'bg-orange-100 text-orange-700',
    created_submittal: 'bg-green-100 text-green-700',
    created_change_order: 'bg-yellow-100 text-yellow-700',
    uploaded_document: 'bg-pink-100 text-pink-700',
  };
  return classMap[action] || 'bg-surface-100 text-surface-600';
};

/**
 * Gets the PrimeIcon class for an activity.
 * @param {string} action - The activity action.
 * @returns {string} Icon class.
 */
const getActivityIcon = (action) => {
  const iconMap = {
    created_rfi: 'pi pi-question-circle',
    created_submittal: 'pi pi-file-check',
    created_change_order: 'pi pi-file-edit',
    uploaded_document: 'pi pi-file',
  };
  return iconMap[action] || 'pi pi-circle';
};

onMounted(async () => {
  await loadData();
  setupSubscription();
  setupProjectSubscription();
});

onUnmounted(() => {
  if (activityUnsubscribe) {
    activityUnsubscribe();
  }

  if (projectUnsubscribe) {
    projectUnsubscribe();
  }
});
</script>
