<template>
  <div class="settings-view p-4 max-w-4xl mx-auto">
    <h1 class="text-3xl font-bold mb-6 text-surface-900">User Settings</h1>

    <!-- Task Display Settings -->
    <Fieldset legend="Task Display" class="mb-4" collapsible>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Checkboxes for display options -->
        <div class="flex flex-col gap-3">
          <div class="flex items-center">
            <Checkbox id="showProjectName" v-model="taskDisplay.showProjectName" binary />
            <label for="showProjectName" class="ml-2 text-sm font-medium">Show Project Name</label>
          </div>
          <div class="flex items-center">
            <Checkbox id="showEstimatedHours" v-model="taskDisplay.showEstimatedHours" binary />
            <label for="showEstimatedHours" class="ml-2 text-sm font-medium"
              >Show Estimated Hours</label
            >
          </div>
          <div class="flex items-center">
            <Checkbox id="showCategory" v-model="taskDisplay.showCategory" binary />
            <label for="showCategory" class="ml-2 text-sm font-medium">Show Category</label>
          </div>
        </div>

        <!-- Selects for sorting and description mode -->
        <div class="flex flex-col gap-3">
          <div class="flex flex-col gap-2">
            <label for="sortBy" class="text-sm font-medium">Sort Tasks By</label>
            <Select
              id="sortBy"
              v-model="taskDisplay.sortBy"
              :options="sortByOptions"
              option-label="label"
              option-value="value"
              placeholder="Select sort option"
              class="w-full"
            />
          </div>
          <div class="flex flex-col gap-2">
            <label for="taskDescriptionMode" class="text-sm font-medium"
              >Task Description Expansion</label
            >
            <Select
              id="taskDescriptionMode"
              v-model="taskDisplay.taskDescriptionMode"
              :options="descriptionModeOptions"
              option-label="label"
              option-value="value"
              placeholder="Select mode"
              class="w-full"
            />
          </div>
        </div>
      </div>
    </Fieldset>

    <!-- Completed Tasks Filter -->
    <Fieldset legend="Completed Tasks Filter" class="mb-4" collapsible>
      <div class="flex flex-col gap-4">
        <div class="flex items-center">
          <Checkbox id="filterEnabled" v-model="completedTasksFilter.enabled" binary />
          <label for="filterEnabled" class="ml-2 text-sm font-medium">Enable Filter</label>
        </div>
        <div v-if="completedTasksFilter.enabled" class="flex gap-4 items-center">
          <div class="flex flex-col gap-2">
            <label for="timePeriod" class="text-sm font-medium"
              >Show completed tasks from last (days)</label
            >
            <InputNumber
              id="timePeriod"
              v-model="completedTasksFilter.timePeriod"
              :min="1"
              :max="365"
              class="w-full"
            />
          </div>
          <div class="flex flex-col gap-2">
            <label for="limit" class="text-sm font-medium">Limit (leave blank for no limit)</label>
            <InputNumber
              id="limit"
              v-model="completedTasksFilter.limit"
              :min="1"
              :allow-null="true"
              placeholder="No limit"
              class="w-full"
            />
          </div>
        </div>
      </div>
    </Fieldset>

    <!-- Dashboard Settings -->
    <Fieldset legend="Dashboard" class="mb-4" collapsible>
      <div class="flex flex-col gap-4">
        <div class="flex items-center">
          <Checkbox id="showCompletedTasks" v-model="dashboard.showCompletedTasks" binary />
          <label for="showCompletedTasks" class="ml-2 text-sm font-medium"
            >Show Completed Tasks on Dashboard</label
          >
        </div>
        <div class="flex flex-col gap-2">
          <label for="maxProjectCards" class="text-sm font-medium">Max Project Cards</label>
          <InputNumber
            id="maxProjectCards"
            v-model="dashboard.maxProjectCards"
            :min="1"
            :max="20"
            class="w-full"
          />
        </div>
        <div class="flex flex-col gap-2">
          <label for="taskListColumns" class="text-sm font-medium"
            >Desktop: My Tasks - Number of Columns</label
          >
          <div class="flex items-center gap-2">
            <Select
              id="taskListColumns"
              v-model="taskListColumns"
              :options="columnOptions"
              option-label="label"
              option-value="value"
              placeholder="Select columns"
              class="w-32"
            />
            <span class="text-xs text-surface-500">(Desktop view only)</span>
          </div>
        </div>
        <div class="flex flex-col gap-2">
          <label for="dashboardColumns" class="text-sm font-medium"
            >Desktop: Recent Project Activity - Number of Columns</label
          >
          <div class="flex items-center gap-2">
            <Select
              id="dashboardColumns"
              v-model="dashboardColumns"
              :options="columnOptions"
              option-label="label"
              option-value="value"
              placeholder="Select columns"
              class="w-32"
            />
            <span class="text-xs text-surface-500">(Desktop view only)</span>
          </div>
        </div>
      </div>
    </Fieldset>

    <!-- Action Buttons -->
    <div class="flex justify-between items-center mt-6">
      <Button label="Reset to Defaults" severity="danger" outlined @click="resetSettings" />
      <div class="flex gap-2">
        <Button label="Cancel" severity="secondary" outlined @click="cancelAllSettings" />
        <Button label="Save All Settings" @click="saveAllSettings" />
      </div>
    </div>

    <!-- Toast for feedback -->
    <Toast />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useUserSettingsStore } from '@/stores/userSettings';
import { useUIStore } from '@/stores/ui';
import Fieldset from 'primevue/fieldset';
import Checkbox from 'primevue/checkbox';
import Select from 'primevue/select';
import InputNumber from 'primevue/inputnumber';
import Button from 'primevue/button';
import Toast from 'primevue/toast';
import { useToast } from 'primevue/usetoast';

// Options for dropdowns
const sortByOptions = [
  { label: 'Priority', value: 'priority' },
  { label: 'Due Date', value: 'dueDate' },
  { label: 'Status', value: 'status' },
  { label: 'Title', value: 'title' },
];

const descriptionModeOptions = [
  { label: 'Click to Expand', value: 'click' },
  { label: 'Hover to Expand', value: 'hover' },
];

const columnOptions = [
  { label: '1', value: 1 },
  { label: '2', value: 2 },
  { label: '3', value: 3 },
  { label: '4', value: 4 },
];

// Stores
const userSettingsStore = useUserSettingsStore();
const uiStore = useUIStore();
const toast = useToast();

// Reactive refs for each section
const taskDisplay = ref({ ...userSettingsStore.settings.taskDisplay });
const completedTasksFilter = ref({ ...userSettingsStore.settings.completedTasksFilter });
const dashboard = ref({ ...userSettingsStore.settings.dashboard });
const dashboardColumns = ref(uiStore.dashboardColumns);
const taskListColumns = ref(uiStore.taskListColumns);

// Save all settings at once
const saveAllSettings = async () => {
  await userSettingsStore.updateTaskDisplay(taskDisplay.value);
  await userSettingsStore.updateCompletedTasksFilter({
    enabled: completedTasksFilter.value.enabled,
    timePeriod: completedTasksFilter.value.timePeriod,
    limit: completedTasksFilter.value.limit,
  });
  await userSettingsStore.updateDashboard(dashboard.value);
  uiStore.setDashboardColumns(dashboardColumns.value);
  uiStore.setTaskListColumns(taskListColumns.value);

  toast.add({
    severity: 'success',
    summary: 'Settings Saved',
    detail: 'All settings have been saved successfully',
    life: 3000,
  });
};

// Cancel all changes and reload from stores
const cancelAllSettings = () => {
  taskDisplay.value = { ...userSettingsStore.settings.taskDisplay };
  completedTasksFilter.value = { ...userSettingsStore.settings.completedTasksFilter };
  dashboard.value = { ...userSettingsStore.settings.dashboard };
  dashboardColumns.value = uiStore.dashboardColumns;
  taskListColumns.value = uiStore.taskListColumns;

  toast.add({
    severity: 'info',
    summary: 'Changes Cancelled',
    detail: 'All changes have been discarded',
    life: 3000,
  });
};

const resetSettings = async () => {
  await userSettingsStore.resetSettings();
  // Reload refs after reset
  taskDisplay.value = { ...userSettingsStore.settings.taskDisplay };
  completedTasksFilter.value = { ...userSettingsStore.settings.completedTasksFilter };
  dashboard.value = { ...userSettingsStore.settings.dashboard };
  dashboardColumns.value = 4; // Reset to default 4 columns
  taskListColumns.value = 1; // Reset to default 1 column
  uiStore.setDashboardColumns(4);
  uiStore.setTaskListColumns(1);
  toast.add({
    severity: 'info',
    summary: 'Reset',
    detail: 'Settings reset to defaults',
    life: 3000,
  });
};
</script>
