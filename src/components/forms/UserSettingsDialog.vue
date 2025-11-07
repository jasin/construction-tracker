<template>
  <div class="settings-view p-4 max-w-4xl mx-auto">
    <h1 class="text-3xl font-bold mb-6 text-surface-900">User Settings</h1>

    <!-- Task Display Settings -->
    <Fieldset legend="Task Display" class="mb-4" collapsible>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Checkboxes for display options -->
        <div class="flex flex-col gap-3">
          <div class="flex items-center">
            <Checkbox
              id="showProjectName"
              v-model="taskDisplay.showProjectName"
              @change="updateTaskDisplaySettings"
              binary
            />
            <label for="showProjectName" class="ml-2 text-sm font-medium">Show Project Name</label>
          </div>
          <div class="flex items-center">
            <Checkbox
              id="showEstimatedHours"
              v-model="taskDisplay.showEstimatedHours"
              @change="updateTaskDisplaySettings"
              binary
            />
            <label for="showEstimatedHours" class="ml-2 text-sm font-medium"
              >Show Estimated Hours</label
            >
          </div>
          <div class="flex items-center">
            <Checkbox
              id="showCategory"
              v-model="taskDisplay.showCategory"
              @change="updateTaskDisplaySettings"
              binary
            />
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
              @change="updateTaskDisplaySettings"
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
              @change="updateTaskDisplaySettings"
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
          <Checkbox
            id="filterEnabled"
            v-model="completedTasksFilter.enabled"
            @change="updateCompletedFilter"
            binary
          />
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
              @input="updateCompletedFilter"
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
              @input="updateCompletedFilter"
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
          <Checkbox
            id="showCompletedTasks"
            v-model="dashboard.showCompletedTasks"
            @change="updateDashboardSettings"
            binary
          />
          <label for="showCompletedTasks" class="ml-2 text-sm font-medium"
            >Show Completed Tasks on Dashboard</label
          >
        </div>
        <div class="flex flex-col gap-2">
          <label for="maxProjectCards" class="text-sm font-medium">Max Project Cards</label>
          <InputNumber
            id="maxProjectCards"
            v-model="dashboard.maxProjectCards"
            @input="updateDashboardSettings"
            :min="1"
            :max="20"
            class="w-full"
          />
        </div>
      </div>
    </Fieldset>

    <!-- Reset Button -->
    <div class="flex justify-end">
      <Button label="Reset to Defaults" severity="danger" @click="resetSettings" class="mt-4" />
    </div>

    <!-- Toast for feedback -->
    <Toast />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useUserSettingsStore } from '@/stores/userSettings';
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

// Store
const userSettingsStore = useUserSettingsStore();
const toast = useToast();

// Reactive refs for each section
const taskDisplay = ref({ ...userSettingsStore.settings.taskDisplay });
const completedTasksFilter = ref({ ...userSettingsStore.settings.completedTasksFilter });
const dashboard = ref({ ...userSettingsStore.settings.dashboard });

// Update methods
const updateTaskDisplaySettings = async () => {
  await userSettingsStore.updateTaskDisplay(taskDisplay.value);
  toast.add({
    severity: 'success',
    summary: 'Updated',
    detail: 'Task display settings saved',
    life: 3000,
  });
};

const updateCompletedFilter = async () => {
  await userSettingsStore.updateCompletedTasksFilter({
    enabled: completedTasksFilter.value.enabled,
    timePeriod: completedTasksFilter.value.timePeriod,
    limit: completedTasksFilter.value.limit,
  });
  toast.add({
    severity: 'success',
    summary: 'Updated',
    detail: 'Completed tasks filter saved',
    life: 3000,
  });
};

const updateDashboardSettings = async () => {
  await userSettingsStore.updateDashboard(dashboard.value);
  toast.add({
    severity: 'success',
    summary: 'Updated',
    detail: 'Dashboard settings saved',
    life: 3000,
  });
};

const resetSettings = async () => {
  await userSettingsStore.resetSettings();
  // Reload refs after reset
  taskDisplay.value = { ...userSettingsStore.settings.taskDisplay };
  completedTasksFilter.value = { ...userSettingsStore.settings.completedTasksFilter };
  dashboard.value = { ...userSettingsStore.settings.dashboard };
  toast.add({
    severity: 'info',
    summary: 'Reset',
    detail: 'Settings reset to defaults',
    life: 3000,
  });
};
</script>
