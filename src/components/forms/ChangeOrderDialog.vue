<template>
  <Dialog
    :visible="visible"
    @update:visible="$emit('update:visible', $event)"
    :modal="true"
    :closable="true"
    :draggable="false"
    class="w-full max-w-3xl"
    :header="isEditing ? 'Edit Change Order' : 'Create New Change Order'"
  >
    <form @submit.prevent="handleSubmit" class="space-y-6">
      <!-- Change Order Number -->
      <div v-if="isEditing">
        <label class="block text-sm font-medium text-gray-700 mb-1">Change Order Number</label>
        <InputText
          :model-value="form.number"
          disabled
          class="w-full bg-gray-50"
        />
      </div>

      <!-- Title -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Title <span class="text-red-500">*</span>
        </label>
        <InputText
          v-model="form.title"
          placeholder="Brief description of the change order"
          class="w-full"
          :class="{ 'border-red-500': errors.title }"
        />
        <small v-if="errors.title" class="text-red-500">{{ errors.title }}</small>
      </div>

      <!-- Description -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Description <span class="text-red-500">*</span>
        </label>
        <Textarea
          v-model="form.description"
          placeholder="Detailed description of the change..."
          rows="4"
          class="w-full"
          :class="{ 'border-red-500': errors.description }"
        />
        <small v-if="errors.description" class="text-red-500">{{ errors.description }}</small>
      </div>

      <!-- Type and Status Row -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <Select
            v-model="form.type"
            :options="typeOptions"
            option-label="label"
            option-value="value"
            placeholder="Select type"
            class="w-full"
          />
        </div>
        <div v-if="isEditing">
          <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <Select
            v-model="form.status"
            :options="statusOptions"
            option-label="label"
            option-value="value"
            placeholder="Select status"
            class="w-full"
          />
        </div>
      </div>

      <!-- Financial Impact Section -->
      <div class="bg-gray-50 p-4 rounded-lg">
        <h4 class="font-medium text-gray-900 mb-3">Financial Impact</h4>
        <div class="grid grid-cols-3 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Cost Impact ($)</label>
            <InputNumber
              v-model="form.costImpact"
              mode="currency"
              currency="USD"
              locale="en-US"
              placeholder="0.00"
              class="w-full"
              :use-grouping="false"
            />
            <small class="text-gray-500">Positive = increase, Negative = decrease</small>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Time Impact (days)</label>
            <InputNumber
              v-model="form.timeImpact"
              placeholder="0"
              class="w-full"
              :use-grouping="false"
            />
            <small class="text-gray-500">Positive = delay, Negative = acceleration</small>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Billable</label>
            <div class="flex items-center gap-4 mt-2">
              <div class="flex items-center">
                <RadioButton v-model="form.billable" input-id="billable-yes" :value="true" />
                <label for="billable-yes" class="ml-2 text-sm">Yes</label>
              </div>
              <div class="flex items-center">
                <RadioButton v-model="form.billable" input-id="billable-no" :value="false" />
                <label for="billable-no" class="ml-2 text-sm">No</label>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Contract Information -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Original Contract Value ($)</label>
          <InputNumber
            v-model="form.originalContractValue"
            mode="currency"
            currency="USD"
            locale="en-US"
            placeholder="0.00"
            class="w-full"
            :use-grouping="false"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Revised Contract Value ($)</label>
          <InputNumber
            :model-value="revisedContractValue"
            mode="currency"
            currency="USD"
            locale="en-US"
            disabled
            class="w-full bg-gray-50"
            :use-grouping="false"
          />
        </div>
      </div>

      <!-- Justification and Reason -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Reason</label>
          <Select
            v-model="form.reason"
            :options="reasonOptions"
            option-label="label"
            option-value="value"
            placeholder="Select reason"
            class="w-full"
            editable
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Contractor</label>
          <Select
            v-model="form.contractorId"
            :options="contractorOptions"
            option-label="label"
            option-value="value"
            placeholder="Select contractor"
            class="w-full"
            filter
          />
        </div>
      </div>

      <!-- Justification -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Justification <span class="text-red-500">*</span>
        </label>
        <Textarea
          v-model="form.justification"
          placeholder="Provide detailed justification for this change order..."
          rows="3"
          class="w-full"
          :class="{ 'border-red-500': errors.justification }"
        />
        <small v-if="errors.justification" class="text-red-500">{{ errors.justification }}</small>
      </div>

      <!-- Approval Section (for editing existing change orders) -->
      <div v-if="isEditing && canShowApproval">
        <div class="bg-blue-50 p-4 rounded-lg">
          <h4 class="font-medium text-gray-900 mb-3">Approval Information</h4>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Approved By</label>
              <InputText
                :model-value="form.approvedByName"
                disabled
                class="w-full bg-gray-50"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Approved Date</label>
              <InputText
                :model-value="formatDate(form.approvedDate)"
                disabled
                class="w-full bg-gray-50"
              />
            </div>
          </div>
          <div v-if="form.approvalNotes" class="mt-3">
            <label class="block text-sm font-medium text-gray-700 mb-1">Approval Notes</label>
            <Textarea
              :model-value="form.approvalNotes"
              disabled
              rows="2"
              class="w-full bg-gray-50"
            />
          </div>
        </div>
      </div>

      <!-- Error Message -->
      <Message v-if="generalError" severity="error" :closable="false">
        {{ generalError }}
      </Message>

      <!-- Form Actions -->
      <div class="flex justify-between items-center pt-4 border-t">
        <div v-if="isEditing && canShowApprovalActions" class="flex gap-2">
          <Button
            @click="approveChangeOrder"
            label="Approve"
            severity="success"
            size="small"
            :disabled="loading || form.status === 'approved'"
          />
          <Button
            @click="rejectChangeOrder"
            label="Reject"
            severity="danger"
            size="small"
            :disabled="loading || form.status === 'rejected'"
          />
        </div>
        <div class="flex gap-3">
          <Button
            @click="$emit('update:visible', false)"
            label="Cancel"
            severity="secondary"
            :disabled="loading"
          />
          <Button
            type="submit"
            :label="isEditing ? 'Update Change Order' : 'Create Change Order'"
            :loading="loading"
          />
        </div>
      </div>
    </form>
  </Dialog>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import {
  Dialog,
  InputText,
  Textarea,
  Select,
  InputNumber,
  RadioButton,
  Button,
  Message
} from 'primevue'
import ChangeOrderRepository from '@/services/firebase/Repositories/ChangeOrderRepository'
import UserRepository from '@/services/firebase/Repositories/UserRepository'
import { formatDate } from '@/utils/index'

// Props
const props = defineProps({
  visible: Boolean,
  projectId: String,
  changeOrder: {
    type: Object,
    default: null
  }
})

// Emits
const emit = defineEmits(['update:visible', 'change-order-saved'])

// State
const loading = ref(false)
const users = ref([])
const generalError = ref('')
const errors = ref({})

// Form data
const form = ref({
  title: '',
  description: '',
  type: 'addition',
  status: 'proposed',
  costImpact: 0,
  timeImpact: 0,
  billable: true,
  originalContractValue: 0,
  reason: '',
  contractorId: null,
  justification: '',
  approvedByName: '',
  approvedDate: null,
  approvalNotes: ''
})

// Computed
const isEditing = computed(() => !!props.changeOrder)

const canShowApproval = computed(() => {
  return isEditing.value && ['approved', 'rejected'].includes(form.value.status)
})

const canShowApprovalActions = computed(() => {
  return isEditing.value && ['proposed', 'submitted'].includes(form.value.status)
})

const revisedContractValue = computed(() => {
  return (form.value.originalContractValue || 0) + (form.value.costImpact || 0)
})

const contractorOptions = computed(() =>
  users.value
    .filter(user => user.role === 'contractor' || user.role === 'superintendent')
    .map(user => ({
      label: user.name || user.email,
      value: user.id
    }))
)

const typeOptions = [
  { label: 'Addition', value: 'addition' },
  { label: 'Deletion', value: 'deletion' },
  { label: 'Modification', value: 'modification' },
  { label: 'Credit', value: 'credit' }
]

const statusOptions = [
  { label: 'Proposed', value: 'proposed' },
  { label: 'Submitted', value: 'submitted' },
  { label: 'Under Review', value: 'under_review' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Executed', value: 'executed' }
]

const reasonOptions = [
  { label: 'Design Change', value: 'design_change' },
  { label: 'Scope Addition', value: 'scope_addition' },
  { label: 'Code Requirement', value: 'code_requirement' },
  { label: 'Site Conditions', value: 'site_conditions' },
  { label: 'Owner Request', value: 'owner_request' },
  { label: 'Unforeseen Conditions', value: 'unforeseen_conditions' },
  { label: 'Material Substitution', value: 'material_substitution' },
  { label: 'Other', value: 'other' }
]

// Methods
const resetForm = () => {
  form.value = {
    title: '',
    description: '',
    type: 'addition',
    status: 'proposed',
    costImpact: 0,
    timeImpact: 0,
    billable: true,
    originalContractValue: 0,
    reason: '',
    contractorId: null,
    justification: '',
    approvedByName: '',
    approvedDate: null,
    approvalNotes: ''
  }
  errors.value = {}
  generalError.value = ''
}

const populateForm = () => {
  if (props.changeOrder) {
    form.value = {
      title: props.changeOrder.title || '',
      description: props.changeOrder.description || '',
      type: props.changeOrder.type || 'addition',
      status: props.changeOrder.status || 'proposed',
      costImpact: props.changeOrder.costImpact || 0,
      timeImpact: props.changeOrder.timeImpact || 0,
      billable: props.changeOrder.billable !== false,
      originalContractValue: props.changeOrder.originalContractValue || 0,
      reason: props.changeOrder.reason || '',
      contractorId: props.changeOrder.contractorId || null,
      justification: props.changeOrder.justification || '',
      approvedByName: props.changeOrder.approvedByName || '',
      approvedDate: props.changeOrder.approvedDate || null,
      approvalNotes: props.changeOrder.approvalNotes || '',
      number: props.changeOrder.number || ''
    }
  }
}

const validateForm = () => {
  errors.value = {}

  if (!form.value.title.trim()) {
    errors.value.title = 'Title is required'
  }

  if (!form.value.description.trim()) {
    errors.value.description = 'Description is required'
  }

  if (!form.value.justification.trim()) {
    errors.value.justification = 'Justification is required'
  }

  return Object.keys(errors.value).length === 0
}

const handleSubmit = async () => {
  if (!validateForm()) return

  try {
    loading.value = true
    generalError.value = ''

    const changeOrderData = {
      title: form.value.title.trim(),
      description: form.value.description.trim(),
      type: form.value.type,
      costImpact: form.value.costImpact || 0,
      timeImpact: form.value.timeImpact || 0,
      billable: form.value.billable,
      originalContractValue: form.value.originalContractValue || 0,
      revisedContractValue: revisedContractValue.value,
      reason: form.value.reason,
      contractorId: form.value.contractorId,
      justification: form.value.justification.trim()
    }

    let savedChangeOrder

    if (isEditing.value) {
      // Update existing change order
      const updates = {
        ...changeOrderData,
        status: form.value.status
      }

      await ChangeOrderRepository.updateChangeOrder(props.changeOrder.id, updates)
      savedChangeOrder = { ...props.changeOrder, ...updates }
    } else {
      // Create new change order
      savedChangeOrder = await ChangeOrderRepository.createChangeOrder({
        ...changeOrderData,
        projectId: props.projectId
      })
    }

    emit('change-order-saved', savedChangeOrder)
    emit('update:visible', false)
    resetForm()

  } catch (error) {
    console.error('Error saving change order:', error)
    generalError.value = error.message || 'Failed to save change order'
  } finally {
    loading.value = false
  }
}

const approveChangeOrder = async () => {
  if (!isEditing.value) return

  try {
    loading.value = true
    await ChangeOrderRepository.approveChangeOrder(props.changeOrder.id)
    form.value.status = 'approved'
    emit('change-order-saved', { ...props.changeOrder, status: 'approved' })
  } catch (error) {
    console.error('Error approving change order:', error)
    generalError.value = error.message || 'Failed to approve change order'
  } finally {
    loading.value = false
  }
}

const rejectChangeOrder = async () => {
  if (!isEditing.value) return

  const reason = prompt('Please provide a reason for rejection:')
  if (!reason) return

  try {
    loading.value = true
    await ChangeOrderRepository.rejectChangeOrder(props.changeOrder.id, null, reason)
    form.value.status = 'rejected'
    emit('change-order-saved', { ...props.changeOrder, status: 'rejected' })
  } catch (error) {
    console.error('Error rejecting change order:', error)
    generalError.value = error.message || 'Failed to reject change order'
  } finally {
    loading.value = false
  }
}

const loadUsers = async () => {
  try {
    users.value = await UserRepository.getActiveUsers()
  } catch (error) {
    console.error('Error loading users:', error)
  }
}

// Watchers
watch(() => props.visible, (newVisible) => {
  if (newVisible) {
    if (props.changeOrder) {
      populateForm()
    } else {
      resetForm()
    }
  }
})

// Lifecycle
onMounted(() => {
  loadUsers()
})
</script>
