<template>
  <div class="h-full flex flex-col bg-gray-50">
    <!-- Header -->
    <div class="bg-white border-b border-gray-200 px-6 py-4 shrink-0">
      <div class="flex justify-between items-center">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Tasks</h1>
          <p class="text-sm text-gray-500 mt-1">Manage and track project tasks</p>
        </div>
        <Button
          @click="uiStore.openModal('taskDialog')"
          icon="pi pi-plus"
          label="New Task"
          size="small"
        />
      </div>
    </div>

    <!-- View Toggle & Filters -->
    <div class="bg-white border-b border-gray-200 px-6 py-4">
      <!-- View Toggle Buttons -->
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-2">
          <Button
            @click="currentView = 'my-tasks'"
            :severity="currentView === 'my-tasks' ? 'primary' : 'secondary'"
            size="small"
            label="My Tasks"
            :badge="myTasksCount > 0 ? myTasksCount.toString() : null"
          />
          <Button
            @click="currentView = 'all-tasks'"
            :severity="currentView === 'all-tasks' ? 'primary' : 'secondary'"
            size="small"
            label="All Tasks"
            :badge="allTasksCount > 0 ? allTasksCount.toString() : null"
          />
          <Button
            @click="currentView = 'overdue'"
            :severity="currentView === 'overdue' ? 'danger' : 'secondary'"
            size="small"
            label="Overdue"
            :badge="overdueTasksCount > 0 ? overdueTasksCount.toString() : null"
            badge-severity="danger"
          />
        </div>

        <!-- Advanced Filters Toggle -->
        <Button
          @click="showAdvancedFilters = !showAdvancedFilters"
          icon="pi pi-filter"
          :label="showAdvancedFilters ? 'Hide Filters' : 'Advanced Filters'"
          severity="secondary"
          size="small"
          text
        />
      </div>

      <!-- Advanced Filters Panel -->
      <div v-if="showAdvancedFilters" class="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- Search -->
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Search</label>
            <InputText
              v-model="filters.search"
              placeholder="Search tasks..."
              class="w-full text-sm"
              icon="pi pi-search"
            />
          </div>

          <!-- Project Filter -->
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Project</label>
            <Select
              v-model="filters.project_id"
              :options="projectOptions"
              option-label="label"
              option-value="value"
              placeholder="All Projects"
              class="w-full text-sm"
              show-clear
            />
          </div>

          <!-- Status Filter -->
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Status</label>
            <MultiSelect
              v-model="filters.status"
              :options="statusOptions"
              option-label="label"
              option-value="value"
              placeholder="All Statuses"
              class="w-full text-sm"
              display="chip"
            />
          </div>

          <!-- Priority Filter -->
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Priority</label>
            <MultiSelect
              v-model="filters.priority"
              :options="priorityOptions"
              option-label="label"
              option-value="value"
              placeholder="All Priorities"
              class="w-full text-sm"
              display="chip"
            />
          </div>

          <!-- Assigned To Filter -->
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Assigned To</label>
            <MultiSelect
              v-model="filters.assigned_to"
              :options="userOptions"
              option-label="label"
              option-value="value"
              placeholder="All Users"
              class="w-full text-sm"
              display="chip"
            />
          </div>

          <!-- Due Date Range -->
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Due Date</label>
            <DatePicker
              v-model="filters.due_dateRange"
              selection-mode="range"
              class="w-full text-sm"
              placeholder="Select date range"
              show-icon
            />
          </div>

          <!-- Category Filter -->
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Category</label>
            <MultiSelect
              v-model="filters.category"
              :options="categoryOptions"
              option-label="label"
              option-value="value"
              placeholder="All Categories"
              class="w-full text-sm"
              display="chip"
            />
          </div>

          <!-- Clear Filters -->
          <div class="flex items-end">
            <Button
              @click="clearFilters"
              label="Clear All"
              severity="secondary"
              size="small"
              text
              class="w-full"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Task List -->
    <div class="flex-1 overflow-y-auto p-6">
      <div v-if="loading" class="flex justify-center py-12">
        <ProgressSpinner />
      </div>

      <div v-else-if="filteredTasks.length === 0" class="text-center py-12">
        <i class="pi pi-inbox text-4xl text-gray-400 mb-4"></i>
        <h3 class="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
        <p class="text-gray-500 mb-6">
          {{ getEmptyStateMessage() }}
        </p>
        <Button
          @click="uiStore.openModal('taskDialog')"
          icon="pi pi-plus"
          label="Create New Task"
          size="small"
        />
      </div>

      <!-- Task Cards -->
      <div v-else class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        <div
          v-for="task in filteredTasks"
          :key="task.id"
          @click="editTask(task)"
          class="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 cursor-pointer transition-all p-4"
        >
          <!-- Task Header -->
          <div class="flex items-start justify-between mb-3">
            <div class="flex items-center gap-2">
              <div
                class="w-3 h-3 rounded-full shrink-0"
                :class="{
                  'bg-red-500': task.priority === 'critical',
                  'bg-orange-500': task.priority === 'high',
                  'bg-yellow-500': task.priority === 'medium',
                  'bg-green-500': task.priority === 'low',
                }"
              ></div>
              <span
                class="px-2 py-1 rounded-full text-xs font-medium"
                :class="{
                  'bg-gray-100 text-gray-800': task.status === 'todo',
                  'bg-blue-100 text-blue-800': task.status === 'in-progress',
                  'bg-yellow-100 text-yellow-800': task.status === 'review',
                  'bg-green-100 text-green-800': task.status === 'complete',
                  'bg-red-100 text-red-800': task.status === 'on-hold',
                }"
              >
                {{ formatTaskStatus(task.status) }}
              </span>
            </div>
            <i v-if="isOverdue(task)" class="pi pi-exclamation-triangle text-red-500"></i>
          </div>

          <!-- Task Content -->
          <h3 class="font-medium text-gray-900 mb-2 line-clamp-2">{{ task.title }}</h3>
          <p v-if="task.description" class="text-sm text-gray-600 mb-3 line-clamp-2">
            {{ task.description }}
          </p>

          <!-- Task Meta -->
          <div class="space-y-2 text-xs text-gray-500">
            <div class="flex items-center justify-between">
              <span>{{ getProjectName(task.project_id) }}</span>
              <span v-if="task.category" class="px-2 py-1 bg-gray-100 rounded text-xs">
                {{ formatCategory(task.category) }}
              </span>
            </div>

            <div class="flex items-center justify-between">
              <span>{{ getUserName(task.assigned_to) }}</span>
              <span :class="{ 'text-red-600 font-medium': isOverdue(task) }">
                {{ task.due_date ? formatDate(task.due_date) : 'No due date' }}
              </span>
            </div>

            <div v-if="task.estimatedHours" class="flex items-center justify-between">
              <span>Estimated: {{ task.estimatedHours }}h</span>
              <span v-if="task.progress !== undefined" class="font-medium">
                {{ task.progress }}% complete
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import MultiSelect from 'primevue/multiselect';
import DatePicker from 'primevue/datepicker';
import ProgressSpinner from 'primevue/progressspinner';
import { getAllTasks } from '@/services/api/tasksApi';
import { getActiveUsers } from '@/services/api/usersApi';
import { getAllProjects } from '@/services/api/projectsApi';
import { useAuthStore } from '@/stores/auth';
import { useUIStore } from '@/stores/ui';
import { useTaskStore } from '@/stores/task';
import { handleError } from '@/utils/errorHandler';

// Stores
const uiStore = useUIStore();
const taskStore = useTaskStore();

// Reactive state
const loading = ref(true);
const currentView = ref('my-tasks'); // 'my-tasks', 'all-tasks', 'overdue'
const showAdvancedFilters = ref(false);

const selectedProjectId = ref(null);

// Data
const allTasks = ref([]);
const projects = ref([]);
const users = ref([]);

// Filters
const filters = ref({
  search: '',
  project_id: null,
  status: [],
  priority: [],
  assigned_to: [],
  category: [],
  due_dateRange: null,
});

// Options for filters
const statusOptions = [
  { label: 'To Do', value: 'todo' },
  { label: 'In Progress', value: 'in-progress' },
  { label: 'Review', value: 'review' },
  { label: 'Complete', value: 'complete' },
  { label: 'On Hold', value: 'on-hold' },
];

const priorityOptions = [
  { label: 'Critical', value: 'critical' },
  { label: 'High', value: 'high' },
  { label: 'Medium', value: 'medium' },
  { label: 'Low', value: 'low' },
];

const categoryOptions = [
  { label: 'Planning', value: 'planning' },
  { label: 'Design', value: 'design' },
  { label: 'Construction', value: 'construction' },
  { label: 'Inspection', value: 'inspection' },
  { label: 'Documentation', value: 'documentation' },
  { label: 'Administrative', value: 'administrative' },
];

// Computed options
const projectOptions = computed(() =>
  projects.value.map((project) => ({
    label: `${project.job_number} - ${project.name}`,
    value: project.id,
  }))
);

const userOptions = computed(() =>
  users.value.map((user) => ({
    label: user.name || user.email,
    value: user.id,
  }))
);

// Task filtering
const filteredTasks = computed(() => {
  let tasks = [];

  // Apply view filter first
  if (currentView.value === 'my-tasks') {
    const authStore = useAuthStore();
    const currentUserId = authStore.user?.id;
    tasks = allTasks.value.filter((task) => task.assigned_to === currentUserId);
  } else if (currentView.value === 'overdue') {
    const now = new Date().toISOString();
    tasks = allTasks.value.filter(
      (task) => task.due_date && task.due_date < now && task.status !== 'complete'
    );
  } else {
    tasks = allTasks.value;
  }

  // Apply advanced filters
  if (filters.value.search) {
    const search = filters.value.search.toLowerCase();
    tasks = tasks.filter(
      (task) =>
        task.title.toLowerCase().includes(search) ||
        (task.description && task.description.toLowerCase().includes(search))
    );
  }

  if (filters.value.project_id) {
    tasks = tasks.filter((task) => task.project_id === filters.value.project_id);
  }

  if (filters.value.status.length > 0) {
    tasks = tasks.filter((task) => filters.value.status.includes(task.status));
  }

  if (filters.value.priority.length > 0) {
    tasks = tasks.filter((task) => filters.value.priority.includes(task.priority));
  }

  if (filters.value.assigned_to.length > 0) {
    tasks = tasks.filter((task) => filters.value.assigned_to.includes(task.assigned_to));
  }

  if (filters.value.category.length > 0) {
    tasks = tasks.filter((task) => filters.value.category.includes(task.category));
  }

  if (filters.value.due_dateRange && filters.value.due_dateRange.length === 2) {
    const [startDate, endDate] = filters.value.due_dateRange;
    tasks = tasks.filter((task) => {
      if (!task.due_date) return false;
      const taskDate = new Date(task.due_date);
      return taskDate >= startDate && taskDate <= endDate;
    });
  }

  // Sort by priority and due date
  return tasks.sort((a, b) => {
    // Sort by priority first
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const priorityDiff = (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
    if (priorityDiff !== 0) return priorityDiff;

    // Then by due date (nulls last)
    if (a.due_date && !b.due_date) return -1;
    if (!a.due_date && b.due_date) return 1;
    if (a.due_date && b.due_date) {
      return new Date(a.due_date) - new Date(b.due_date);
    }

    return 0;
  });
});

// Task counts for badges
const myTasksCount = computed(() => {
  const authStore = useAuthStore();
  const currentUserId = authStore.user?.id;
  return allTasks.value.filter(
    (task) => task.assigned_to === currentUserId && task.status !== 'complete'
  ).length;
});

const allTasksCount = computed(
  () => allTasks.value.filter((task) => task.status !== 'complete').length
);

const overdueTasksCount = computed(() => {
  const now = new Date().toISOString();
  return allTasks.value.filter(
    (task) => task.due_date && task.due_date < now && task.status !== 'complete'
  ).length;
});

// Helper functions
const getUserName = (userId) => {
  if (!userId) return 'Unassigned';
  const user = users.value.find((u) => u.id === userId);
  return user ? user.name || user.email : userId;
};

const getProjectName = (project_id) => {
  const project = projects.value.find((p) => p.id === project_id);
  return project ? `${project.job_number} - ${project.name}` : 'Unknown Project';
};

const formatTaskStatus = (status) => {
  const statusMap = {
    todo: 'To Do',
    'in-progress': 'In Progress',
    review: 'Review',
    complete: 'Complete',
    'on-hold': 'On Hold',
  };
  return statusMap[status] || status;
};

const formatCategory = (category) => {
  const categoryMap = {
    planning: 'Planning',
    design: 'Design',
    construction: 'Construction',
    inspection: 'Inspection',
    documentation: 'Documentation',
    administrative: 'Administrative',
  };
  return categoryMap[category] || category;
};

const formatDate = (dateString) => {
  if (!dateString) return 'No due date';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const isOverdue = (task) => {
  if (!task.due_date || task.status === 'complete') return false;
  return new Date(task.due_date) < new Date();
};

const getEmptyStateMessage = () => {
  if (currentView.value === 'my-tasks') {
    return 'No tasks assigned to you. Check back later or ask your project manager.';
  } else if (currentView.value === 'overdue') {
    return 'No overdue tasks! Great job staying on track.';
  } else {
    return 'No tasks found matching your filters.';
  }
};

const clearFilters = () => {
  filters.value = {
    search: '',
    project_id: null,
    status: [],
    priority: [],
    assigned_to: [],
    category: [],
    due_dateRange: null,
  };
};

const editTask = (task) => {
  selectedProjectId.value = task.project_id;
  uiStore.openModal('taskDialog', { task });
};

// Data loading
const loadData = async () => {
  try {
    loading.value = true;

    const [tasksData, projectsData, usersData] = await Promise.all([
      getAllTasks(),
      getAllProjects(),
      getActiveUsers(),
    ]);

    allTasks.value = tasksData;
    projects.value = projectsData;
    users.value = usersData;
  } catch (error) {
    console.error('Error loading tasks data:', error);
    handleError(error, 'Load tasks data');
  } finally {
    loading.value = false;
  }
};

// Lifecycle
onMounted(() => {
  loadData();
});

// Watch for view changes to update URL params (optional)
watch(currentView, (newView) => {
  // Could update URL params here for bookmarkable views
  console.log('View changed to:', newView);
});
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  line-clamp: 2;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
