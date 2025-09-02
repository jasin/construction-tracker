<template>
  <div class="bg-white rounded-lg border border-gray-200 shadow-sm">
    <!-- Section Header -->
    <div class="px-6 py-4 border-b border-gray-200">
      <div class="flex justify-between items-center">
        <div>
          <h2 class="text-lg font-semibold text-gray-900">Construction Management</h2>
          <p class="text-sm text-gray-500">RFIs, Change Orders, and Submittals</p>
        </div>
        <div class="flex gap-2">
          <Button
            @click="refreshData"
            :loading="loading"
            icon="pi pi-refresh"
            severity="secondary"
            size="small"
            label="Refresh"
          />
          <Button
            @click="showBulkActions = !showBulkActions"
            icon="pi pi-list"
            severity="secondary"
            size="small"
            label="Bulk Actions"
            v-show="selectedItems.length > 0"
          />
        </div>
      </div>
    </div>

    <!-- Summary Cards -->
    <div class="p-6 border-b border-gray-200 bg-gray-50">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- RFI Summary Card -->
        <div class="bg-white rounded-lg border border-gray-200 p-4">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <i class="pi pi-question-circle text-orange-500 text-lg"></i>
              <h3 class="font-medium text-gray-900">RFIs</h3>
            </div>
            <Button
              @click="createNewItem('rfi')"
              icon="pi pi-plus"
              severity="secondary"
              size="small"
              class="w-8 h-8 p-0"
              aria-label="Create RFI"
            />
          </div>
          <div class="space-y-2">
            <div class="flex justify-between text-sm">
              <span class="text-gray-600">Total</span>
              <span class="font-medium">{{ rfiStats.total }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-600">Open</span>
              <span class="font-medium text-orange-600">{{ rfiStats.open }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-600">Overdue</span>
              <span class="font-medium text-red-600">{{ rfiStats.overdue }}</span>
            </div>
          </div>
        </div>

        <!-- Change Order Summary Card -->
        <div class="bg-white rounded-lg border border-gray-200 p-4">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <i class="pi pi-dollar text-green-500 text-lg"></i>
              <h3 class="font-medium text-gray-900">Change Orders</h3>
            </div>
            <Button
              @click="createNewItem('changeOrder')"
              icon="pi pi-plus"
              severity="secondary"
              size="small"
              class="w-8 h-8 p-0"
              aria-label="Create Change Order"
            />
          </div>
          <div class="space-y-2">
            <div class="flex justify-between text-sm">
              <span class="text-gray-600">Total</span>
              <span class="font-medium">{{ changeOrderStats.total }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-600">Pending</span>
              <span class="font-medium text-yellow-600">{{ changeOrderStats.pending }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-600">Cost Impact</span>
              <span
                class="font-medium"
                :class="changeOrderStats.totalCostImpact >= 0 ? 'text-red-600' : 'text-green-600'"
              >
                {{ formatCurrency(changeOrderStats.totalCostImpact) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Submittal Summary Card -->
        <div class="bg-white rounded-lg border border-gray-200 p-4">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <i class="pi pi-send text-blue-500 text-lg"></i>
              <h3 class="font-medium text-gray-900">Submittals</h3>
            </div>
            <Button
              @click="createNewItem('submittal')"
              icon="pi pi-plus"
              severity="secondary"
              size="small"
              class="w-8 h-8 p-0"
              aria-label="Create Submittal"
            />
          </div>
          <div class="space-y-2">
            <div class="flex justify-between text-sm">
              <span class="text-gray-600">Total</span>
              <span class="font-medium">{{ submittalStats.total }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-600">Pending Review</span>
              <span class="font-medium text-blue-600">{{ submittalStats.pendingReview }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-600">Approved</span>
              <span class="font-medium text-green-600">{{ submittalStats.approved }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters Bar -->
    <div class="p-4 border-b border-gray-200 bg-gray-50">
      <div class="flex gap-4 items-center flex-wrap">
        <!-- Search -->
        <div class="flex-1 min-w-64">
          <InputText
            v-model="searchQuery"
            placeholder="Search RFIs, Change Orders, Submittals..."
            class="w-full"
            icon="pi pi-search"
          />
        </div>

        <!-- Type Filter -->
        <MultiSelect
          v-model="selectedTypes"
          :options="typeOptions"
          option-label="label"
          option-value="value"
          placeholder="All Types"
          class="min-w-40"
          display="chip"
        />

        <!-- Status Filter -->
        <MultiSelect
          v-model="selectedStatuses"
          :options="statusOptions"
          option-label="label"
          option-value="value"
          placeholder="All Statuses"
          class="min-w-40"
          display="chip"
        />

        <!-- Priority Filter -->
        <MultiSelect
          v-model="selectedPriorities"
          :options="priorityOptions"
          option-label="label"
          option-value="value"
          placeholder="All Priorities"
          class="min-w-40"
          display="chip"
        />

        <!-- Clear Filters -->
        <Button
          @click="clearFilters"
          icon="pi pi-filter-slash"
          severity="secondary"
          size="small"
          text
          v-show="hasActiveFilters"
        />
      </div>
    </div>

    <!-- Data Table -->
    <DataTable
      :value="filteredItems"
      :loading="loading"
      selection-mode="multiple"
      v-model:selection="selectedItems"
      data-key="id"
      :paginator="filteredItems.length > 25"
      :rows="25"
      paginator-template="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
      :rows-per-page-options="[10, 25, 50]"
      current-page-report-template="Showing {first} to {last} of {totalRecords} entries"
      :sort-field="sortField"
      :sort-order="sortOrder"
      @sort="onSort"
      class="construction-table"
    >
      <!-- Empty State -->
      <template #empty>
        <div class="text-center py-12">
          <i class="pi pi-inbox text-4xl text-gray-400 mb-4"></i>
          <h3 class="text-lg font-medium text-gray-900 mb-2">No items found</h3>
          <p class="text-gray-500 mb-4">
            {{ hasActiveFilters ? 'Try adjusting your filters' : 'Get started by creating your first item' }}
          </p>
          <div class="flex gap-2 justify-center" v-if="!hasActiveFilters">
            <Button @click="createNewItem('rfi')" label="Create RFI" size="small" />
            <Button @click="createNewItem('changeOrder')" label="Create Change Order" size="small" />
            <Button @click="createNewItem('submittal')" label="Create Submittal" size="small" />
          </div>
        </div>
      </template>

      <!-- Selection Column -->
      <Column selection-mode="multiple" header-style="width: 3rem"></Column>

      <!-- Type Column -->
      <Column field="type" header="Type" sortable class="w-24">
        <template #body="{ data }">
          <Tag
            :value="getTypeLabel(data.type)"
            :icon="getTypeIcon(data.type)"
            :severity="getTypeSeverity(data.type)"
            class="text-xs"
          />
        </template>
      </Column>

      <!-- Number/Title Column -->
      <Column field="title" header="Item" sortable>
        <template #body="{ data }">
          <div
            @click="editItem(data)"
            class="cursor-pointer hover:text-blue-600"
          >
            <div class="font-medium text-sm">
              {{ data.number || data.title }}
            </div>
            <div class="text-xs text-gray-500 truncate max-w-sm">
              {{ data.title !== data.number ? data.title : data.description }}
            </div>
          </div>
        </template>
      </Column>

      <!-- Status Column -->
      <Column field="status" header="Status" sortable class="w-32">
        <template #body="{ data }">
          <Tag
            :value="getStatusLabel(data.status)"
            :severity="getStatusSeverity(data.status, data.type)"
            class="text-xs"
          />
        </template>
      </Column>

      <!-- Priority Column (RFIs only) -->
      <Column field="priority" header="Priority" sortable class="w-28">
        <template #body="{ data }">
          <Tag
            v-if="data.type === 'rfi' && data.priority"
            :value="getPriorityLabel(data.priority)"
            :severity="getPrioritySeverity(data.priority)"
            class="text-xs"
          />
          <span v-else class="text-gray-400 text-xs">—</span>
        </template>
      </Column>

      <!-- Assigned To Column -->
      <Column field="assignedTo" header="Assigned To" sortable class="w-36">
        <template #body="{ data }">
          <div class="text-sm">
            {{ getAssignedToName(data) }}
          </div>
        </template>
      </Column>

      <!-- Due Date Column -->
      <Column field="dueDate" header="Due Date" sortable class="w-32">
        <template #body="{ data }">
          <div
            v-if="getDueDate(data)"
            class="text-sm"
            :class="{ 'text-red-600 font-medium': isOverdue(data) }"
          >
            {{ formatDate(getDueDate(data)) }}
          </div>
          <span v-else class="text-gray-400 text-xs">—</span>
        </template>
      </Column>

      <!-- Impact Column (Change Orders only) -->
      <Column field="costImpact" header="Cost Impact" sortable class="w-32">
        <template #body="{ data }">
          <div
            v-if="data.type === 'changeOrder' && data.costImpact !== undefined"
            class="text-sm font-medium"
            :class="data.costImpact >= 0 ? 'text-red-600' : 'text-green-600'"
          >
            {{ formatCurrency(data.costImpact) }}
          </div>
          <span v-else class="text-gray-400 text-xs">—</span>
        </template>
      </Column>

      <!-- Actions Column -->
      <Column header="Actions" class="w-24">
        <template #body="{ data }">
          <div class="flex gap-1">
            <Button
              @click="editItem(data)"
              icon="pi pi-pencil"
              severity="secondary"
              text
              size="small"
              class="w-8 h-8 p-0"
              aria-label="Edit"
            />
            <Button
              @click="deleteItem(data)"
              icon="pi pi-trash"
              severity="danger"
              text
              size="small"
              class="w-8 h-8 p-0"
              aria-label="Delete"
            />
          </div>
        </template>
      </Column>
    </DataTable>

    <!-- Create/Edit Modals -->
    <RFIDialog
      :visible="showRFIDialog"
      :project-id="projectId"
      :rfi="editingItem"
      @update:visible="showRFIDialog = $event"
      @rfi-saved="handleItemSaved"
    />

    <ChangeOrderDialog
      :visible="showChangeOrderDialog"
      :project-id="projectId"
      :change-order="editingItem"
      @update:visible="showChangeOrderDialog = $event"
      @change-order-saved="handleItemSaved"
    />

    <SubmittalDialog
      :visible="showSubmittalDialog"
      :project-id="projectId"
      :submittal="editingItem"
      @update:visible="showSubmittalDialog = $event"
      @submittal-saved="handleItemSaved"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import {
  Button,
  InputText,
  MultiSelect,
  DataTable,
  Column,
  Tag
} from 'primevue'
import RFIRepository from '@/services/firebase/Repositories/RFIRepository'
import ChangeOrderRepository from '@/services/firebase/Repositories/ChangeOrderRepository'
import SubmittalRepository from '@/services/firebase/Repositories/SubmittalRepository'
import UserRepository from '@/services/firebase/Repositories/UserRepository'
import RFIDialog from '@/components/forms/RFIDialog.vue'
import ChangeOrderDialog from '@/components/forms/ChangeOrderDialog.vue'
import SubmittalDialog from '@/components/forms/SubmittalDialog.vue'
import { formatCurrency, formatDate } from '@/utils/index'

// Props
const props = defineProps({
  projectId: {
    type: String,
    required: true
  }
})

// State
const loading = ref(false)
const rfis = ref([])
const changeOrders = ref([])
const submittals = ref([])
const users = ref([])
const subscriptions = ref([])

// UI State
const searchQuery = ref('')
const selectedTypes = ref([])
const selectedStatuses = ref([])
const selectedPriorities = ref([])
const selectedItems = ref([])
const showBulkActions = ref(false)
const sortField = ref('createdAt')
const sortOrder = ref(-1)

// Modal State
const showRFIDialog = ref(false)
const showChangeOrderDialog = ref(false)
const showSubmittalDialog = ref(false)
const editingItem = ref(null)

// Filter Options
const typeOptions = [
  { label: 'RFIs', value: 'rfi' },
  { label: 'Change Orders', value: 'changeOrder' },
  { label: 'Submittals', value: 'submittal' }
]

const statusOptions = [
  // RFI Statuses
  { label: 'Draft', value: 'draft' },
  { label: 'Submitted', value: 'submitted' },
  { label: 'Under Review', value: 'under_review' },
  { label: 'Responded', value: 'responded' },
  { label: 'Closed', value: 'closed' },
  // Change Order Statuses
  { label: 'Proposed', value: 'proposed' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Executed', value: 'executed' },
  // Submittal Statuses
  { label: 'Not Submitted', value: 'not_submitted' },
  { label: 'Approved', value: 'approved' },
  { label: 'Approved with Comments', value: 'approved_with_comments' },
  { label: 'Resubmit', value: 'resubmit' }
]

const priorityOptions = [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
  { label: 'Urgent', value: 'urgent' }
]

// Computed Properties
const allItems = computed(() => {
  const items = []

  // Add RFIs with type
  rfis.value.forEach(rfi => {
    items.push({ ...rfi, type: 'rfi' })
  })

  // Add Change Orders with type
  changeOrders.value.forEach(co => {
    items.push({ ...co, type: 'changeOrder' })
  })

  // Add Submittals with type
  submittals.value.forEach(submittal => {
    items.push({ ...submittal, type: 'submittal' })
  })

  return items
})

const filteredItems = computed(() => {
  let items = allItems.value

  // Search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    items = items.filter(item =>
      item.title?.toLowerCase().includes(query) ||
      item.number?.toLowerCase().includes(query) ||
      item.description?.toLowerCase().includes(query)
    )
  }

  // Type filter
  if (selectedTypes.value.length > 0) {
    items = items.filter(item => selectedTypes.value.includes(item.type))
  }

  // Status filter
  if (selectedStatuses.value.length > 0) {
    items = items.filter(item => selectedStatuses.value.includes(item.status))
  }

  // Priority filter (RFIs only)
  if (selectedPriorities.value.length > 0) {
    items = items.filter(item =>
      item.type !== 'rfi' || selectedPriorities.value.includes(item.priority)
    )
  }

  return items
})

const hasActiveFilters = computed(() => {
  return searchQuery.value ||
         selectedTypes.value.length > 0 ||
         selectedStatuses.value.length > 0 ||
         selectedPriorities.value.length > 0
})

// Statistics
const rfiStats = computed(() => ({
  total: rfis.value.length,
  open: rfis.value.filter(r => !['closed', 'responded'].includes(r.status)).length,
  overdue: rfis.value.filter(r => isOverdue(r)).length
}))

const changeOrderStats = computed(() => ({
  total: changeOrders.value.length,
  pending: changeOrders.value.filter(co => ['proposed', 'submitted'].includes(co.status)).length,
  totalCostImpact: changeOrders.value
    .filter(co => ['approved', 'executed'].includes(co.status))
    .reduce((sum, co) => sum + (co.costImpact || 0), 0)
}))

const submittalStats = computed(() => ({
  total: submittals.value.length,
  pendingReview: submittals.value.filter(s => ['submitted', 'under_review'].includes(s.status)).length,
  approved: submittals.value.filter(s => ['approved', 'approved_with_comments'].includes(s.status)).length
}))

// Helper Functions
const getTypeLabel = (type) => {
  const labels = {
    rfi: 'RFI',
    changeOrder: 'Change Order',
    submittal: 'Submittal'
  }
  return labels[type] || type
}

const getTypeIcon = (type) => {
  const icons = {
    rfi: 'pi pi-question-circle',
    changeOrder: 'pi pi-dollar',
    submittal: 'pi pi-send'
  }
  return icons[type] || 'pi pi-file'
}

const getTypeSeverity = (type) => {
  const severities = {
    rfi: 'warning',
    changeOrder: 'success',
    submittal: 'info'
  }
  return severities[type] || 'secondary'
}

const getStatusLabel = (status) => {
  const labels = {
    // RFI
    draft: 'Draft',
    submitted: 'Submitted',
    under_review: 'Under Review',
    responded: 'Responded',
    closed: 'Closed',
    // Change Order
    proposed: 'Proposed',
    approved: 'Approved',
    rejected: 'Rejected',
    executed: 'Executed',
    // Submittal
    not_submitted: 'Not Submitted',
    no_exceptions: 'Approved',
    approved_with_comments: 'Approved w/ Comments',
    resubmit: 'Resubmit'
  }
  return labels[status] || status
}

const getStatusSeverity = (status, type) => {
  const severities = {
    // General
    draft: 'secondary',
    submitted: 'info',
    under_review: 'warning',
    approved: 'success',
    rejected: 'danger',
    closed: 'success',
    executed: 'success',
    // Specific
    responded: 'success',
    proposed: 'warning',
    not_submitted: 'secondary',
    approved_with_comments: 'success',
    resubmit: 'warning'
  }
  return severities[status] || 'secondary'
}

const getPriorityLabel = (priority) => {
  const labels = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    urgent: 'Urgent'
  }
  return labels[priority] || priority
}

const getPrioritySeverity = (priority) => {
  const severities = {
    low: 'success',
    medium: 'info',
    high: 'warning',
    urgent: 'danger'
  }
  return severities[priority] || 'secondary'
}

const getAssignedToName = (item) => {
  let assignedTo = null

  if (item.type === 'rfi') {
    assignedTo = item.assignedTo || item.submittedTo
  } else if (item.type === 'changeOrder') {
    assignedTo = item.requestedBy
  } else if (item.type === 'submittal') {
    assignedTo = item.reviewedBy || item.submittedBy
  }

  if (!assignedTo) return '—'

  const user = users.value.find(u => u.id === assignedTo)
  return user ? user.name || user.email : assignedTo
}

const getDueDate = (item) => {
  if (item.type === 'rfi') return item.dueDate
  if (item.type === 'submittal') return item.requiredDate
  return null
}

const isOverdue = (item) => {
  const dueDate = getDueDate(item)
  if (!dueDate) return false

  const completedStatuses = {
    rfi: ['responded', 'closed'],
    changeOrder: ['approved', 'executed'],
    submittal: ['approved', 'approved_with_comments']
  }

  if (completedStatuses[item.type]?.includes(item.status)) return false

  return new Date(dueDate) < new Date()
}

// Methods
const loadData = async () => {
  try {
    loading.value = true

    const [rfiData, changeOrderData, submittalData, userData] = await Promise.all([
      RFIRepository.getRFIsByProject(props.projectId),
      ChangeOrderRepository.getChangeOrdersByProject(props.projectId),
      SubmittalRepository.getSubmittalsByProject(props.projectId),
      UserRepository.getAllUsers()
    ])

    rfis.value = rfiData
    changeOrders.value = changeOrderData
    submittals.value = submittalData
    users.value = userData
  } catch (error) {
    console.error('Error loading construction data:', error)
  } finally {
    loading.value = false
  }
}

const refreshData = () => {
  loadData()
}

const clearFilters = () => {
  searchQuery.value = ''
  selectedTypes.value = []
  selectedStatuses.value = []
  selectedPriorities.value = []
}

const createNewItem = (type) => {
  editingItem.value = null

  if (type === 'rfi') {
    showRFIDialog.value = true
  } else if (type === 'changeOrder') {
    showChangeOrderDialog.value = true
  } else if (type === 'submittal') {
    showSubmittalDialog.value = true
  }
}

const editItem = (item) => {
  editingItem.value = item

  if (item.type === 'rfi') {
    showRFIDialog.value = true
  } else if (item.type === 'changeOrder') {
    showChangeOrderDialog.value = true
  } else if (item.type === 'submittal') {
    showSubmittalDialog.value = true
  }
}

const deleteItem = async (item) => {
  if (!confirm(`Are you sure you want to delete this ${getTypeLabel(item.type).toLowerCase()}?`)) {
    return
  }

  try {
    if (item.type === 'rfi') {
      await RFIRepository.deleteRFI(item.id)
    } else if (item.type === 'changeOrder') {
      await ChangeOrderRepository.deleteChangeOrder(item.id)
    } else if (item.type === 'submittal') {
      await SubmittalRepository.deleteSubmittal(item.id)
    }
  } catch (error) {
    console.error('Error deleting item:', error)
    alert('Failed to delete item')
  }
}

const handleItemSaved = (savedItem) => {
  editingItem.value = null
  showRFIDialog.value = false
  showChangeOrderDialog.value = false
  showSubmittalDialog.value = false
}

const onSort = (event) => {
  sortField.value = event.sortField
  sortOrder.value = event.sortOrder
}

const setupRealtimeListeners = () => {
  const rfiSub = RFIRepository.subscribeToRFIsByProject(props.projectId, (data) => {
    rfis.value = data
  })

  const coSub = ChangeOrderRepository.subscribeToChangeOrdersByProject(props.projectId, (data) => {
    changeOrders.value = data
  })

  const submittalSub = SubmittalRepository.subscribeToSubmittalsByProject(props.projectId, (data) => {
    submittals.value = data
  })

  subscriptions.value = [rfiSub, coSub, submittalSub]
}

// Lifecycle
onMounted(async () => {
  await loadData()
  setupRealtimeListeners()
})

onBeforeUnmount(() => {
  subscriptions.value.forEach(unsubscribe => {
    if (typeof unsubscribe === 'function') {
      unsubscribe()
    }
  })
})

watch(() => props.projectId, (newProjectId) => {
  if (newProjectId) {
    // Clean up old subscriptions
    subscriptions.value.forEach(unsubscribe => {
      if (typeof unsubscribe === 'function') {
        unsubscribe()
      }
    })

    // Load new data and setup new subscriptions
    loadData()
    setupRealtimeListeners()
  }
})
</script>

<style scoped>
.construction-table :deep(.p-datatable-tbody > tr > td) {
  padding: 0.75rem 0.5rem;
}

.construction-table :deep(.p-datatable-thead > tr > th) {
  padding: 0.75rem 0.5rem;
  font-weight: 600;
  font-size: 0.875rem;
}
</style>
