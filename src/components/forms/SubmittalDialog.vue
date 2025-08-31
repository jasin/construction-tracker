<template>
  <Dialog
    :visible="visible"
    @update:visible="$emit('update:visible', $event)"
    :modal="true"
    :closable="true"
    :draggable="false"
    class="w-full max-w-2xl"
    :header="isEditing ? 'Edit Submittal' : 'Create New Submittal'"
  >
    <form @submit.prevent="handleSubmit" class="space-y-6">
      <!-- Submittal Number and Revision -->
      <div v-if="isEditing" class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Submittal Number</label>
          <InputText
            :model-value="form.number"
            disabled
            class="w-full bg-gray-50"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Revision</label>
          <InputText
            :model-value="form.revisionNumber?.toString()"
            disabled
            class="w-full bg-gray-50"
          />
        </div>
      </div>

      <!-- Title -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Title <span class="text-red-500">*</span>
        </label>
        <InputText
          v-model="form.title"
          placeholder="Brief description of the submittal"
          class="w-full"
          :class="{ 'border-red-500': errors.title }"
        />
        <small v-if="errors.title" class="text-red-500">{{ errors.title }}</small>
      </div>

      <!-- Description -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <Textarea
          v-model="form.description"
          placeholder="Detailed description of the submittal..."
          rows="3"
          class="w-full"
        />
      </div>

      <!-- Type and Spec Section Row -->
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
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Spec Section</label>
          <InputText
            v-model="form.specSection"
            placeholder="e.g., 03300, 05120"
            class="w-full"
          />
        </div>
      </div>

      <!-- Status (for editing) -->
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

      <!-- Assignment and Dates Row -->
      <div class="grid grid-cols-2 gap-4">
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
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Required Date <span class="text-red-500">*</span>
          </label>
          <DatePicker
            v-model="form.requiredDate"
            placeholder="Select required date"
            class="w-full"
            :class="{ 'border-red-500': errors.requiredDate }"
            show-icon
            :min-date="new Date()"
          />
          <small v-if="errors.requiredDate" class="text-red-500">{{ errors.requiredDate }}</small>
        </div>
      </div>

      <!-- Reviewer Assignment -->
      <div v-if="isEditing || canAssignReviewer">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Reviewer</label>
            <Select
              v-model="form.reviewedBy"
              :options="reviewerOptions"
              option-label="label"
              option-value="value"
              placeholder="Select reviewer"
              class="w-full"
              filter
            />
          </div>
          <div v-if="form.submittalDate">
            <label class="block text-sm font-medium text-gray-700 mb-1">Submittal Date</label>
            <InputText
              :model-value="formatDate(form.submittalDate)"
              disabled
              class="w-full bg-gray-50"
            />
          </div>
        </div>
      </div>

      <!-- Review Section (for editing existing submittals) -->
      <div v-if="isEditing && canShowReviewSection">
        <div class="bg-blue-50 p-4 rounded-lg">
          <h4 class="font-medium text-gray-900 mb-3">Review Information</h4>

          <!-- Review Status and Date -->
          <div class="grid grid-cols-2 gap-4 mb-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Review Status</label>
              <Select
                v-model="form.reviewStatus"
                :options="reviewStatusOptions"
                option-label="label"
                option-value="value"
                placeholder="Select review status"
                class="w-full"
              />
            </div>
            <div v-if="form.reviewDate">
              <label class="block text-sm font-medium text-gray-700 mb-1">Review Date</label>
              <InputText
                :model-value="formatDate(form.reviewDate)"
                disabled
                class="w-full bg-gray-50"
              />
            </div>
          </div>

          <!-- Review Comments -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Review Comments</label>
            <Textarea
              v-model="form.reviewComments"
              placeholder="Add review comments..."
              rows="3"
              class="w-full"
            />
          </div>
        </div>
      </div>

      <!-- Distribution List -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Distribution List</label>
        <MultiSelect
          v-model="form.distributionList"
          :options="userOptions"
          option-label="label"
          option-value="value"
          placeholder="Select recipients"
          class="w-full"
          display="chip"
          filter
        />
        <small class="text-gray-500">People who should receive notifications about this submittal</small>
      </div>

      <!-- Revision Actions (for existing submittals) -->
      <div v-if="isEditing && canCreateRevision" class="bg-yellow-50 p-4 rounded-lg">
        <div class="flex items-center justify-between">
          <div>
            <h4 class="font-medium text-gray-900">Create New Revision</h4>
            <p class="text-sm text-gray-600">Create a new revision of this submittal</p>
          </div>
          <Button
            @click="createRevision"
            label="Create Revision"
            severity="warning"
            size="small"
            :disabled="loading"
          />
        </div>
      </div>

      <!-- Error Message -->
      <Message v-if="generalError" severity="error" :closable="false">
        {{ generalError }}
      </Message>

      <!-- Form Actions -->
      <div class="flex justify-between items-center pt-4 border-t">
        <div v-if="isEditing && canShowReviewActions" class="flex gap-2">
          <Button
            @click="reviewSubmittal('approved')"
            label="Approve"
            severity="success"
            size="small"
            :disabled="loading"
          />
          <Button
            @click="reviewSubmittal('approved_with_comments')"
            label="Approve w/ Comments"
            severity="info"
            size="small"
            :disabled="loading"
          />
          <Button
            @click="reviewSubmittal('rejected')"
            label="Reject"
            severity="danger"
            size="small"
            :disabled="loading"
          />
          <Button
            @click="reviewSubmittal('resubmit')"
            label="Resubmit Required"
            severity="warning"
            size="small"
            :disabled="loading"
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
            :label="submitButtonLabel"
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
  MultiSelect,
  DatePicker,
  Button,
  Message
} from 'primevue'
import SubmittalRepository from '@/services/firebase/Repositories/SubmittalRepository'
import UserRepository from '@/services/firebase/Repositories/UserRepository'
import { formatDate } from '@/utils/index'

// Props
const props = defineProps({
  visible: Boolean,
  projectId: String,
  submittal: {
    type: Object,
    default: null
  }
})

// Emits
const emit = defineEmits(['update:visible', 'submittal-saved'])

// State
const loading = ref(false)
const users = ref([])
const generalError = ref('')
const errors = ref({})

// Form data
const form = ref({
  title: '',
  description: '',
  type: 'product_data',
  specSection: '',
  status: 'not_submitted',
  contractorId: null,
  requiredDate: null,
  reviewedBy: null,
  submittalDate: null,
  reviewDate: null,
  reviewStatus: null,
  reviewComments: '',
  distributionList: [],
  revisionNumber: 1
})

// Computed
const isEditing = computed(() => !!props.submittal)

const canAssignReviewer = computed(() => {
  return form.value.status === 'submitted' || form.value.status === 'under_review'
})

const canShowReviewSection = computed(() => {
  return isEditing.value && ['submitted', 'under_review', 'approved', 'approved_with_comments', 'rejected', 'resubmit'].includes(form.value.status)
})

const canShowReviewActions = computed(() => {
  return isEditing.value && ['submitted', 'under_review'].includes(form.value.status)
})

const canCreateRevision = computed(() => {
  return isEditing.value && ['resubmit', 'rejected'].includes(form.value.status)
})

const submitButtonLabel = computed(() => {
  if (isEditing.value) {
    return 'Update Submittal'
  }
  return form.value.status === 'submitted' ? 'Submit for Review' : 'Create Submittal'
})

const contractorOptions = computed(() =>
  users.value
    .filter(user => user.role === 'contractor' || user.role === 'superintendent')
    .map(user => ({
      label: user.name || user.email,
      value: user.id
    }))
)

const reviewerOptions = computed(() =>
  users.value
    .filter(user => ['admin', 'pm', 'superintendent'].includes(user.role))
    .map(user => ({
      label: user.name || user.email,
      value: user.id
    }))
)

const userOptions = computed(() =>
  users.value.map(user => ({
    label: user.name || user.email,
    value: user.id
  }))
)

const typeOptions = [
  { label: 'Product Data', value: 'product_data' },
  { label: 'Shop Drawings', value: 'shop_drawings' },
  { label: 'Samples', value: 'samples' },
  { label: 'Test Reports', value: 'test_reports' },
  { label: 'Certificates', value: 'certificates' }
]

const statusOptions = [
  { label: 'Not Submitted', value: 'not_submitted' },
  { label: 'Submitted', value: 'submitted' },
  { label: 'Under Review', value: 'under_review' },
  { label: 'Approved', value: 'approved' },
  { label: 'Approved with Comments', value: 'approved_with_comments' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Resubmit Required', value: 'resubmit' }
]

const reviewStatusOptions = [
  { label: 'Approved', value: 'approved' },
  { label: 'Approved with Comments', value: 'approved_with_comments' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Resubmit Required', value: 'resubmit' }
]

// Methods
const resetForm = () => {
  form.value = {
    title: '',
    description: '',
    type: 'product_data',
    specSection: '',
    status: 'not_submitted',
    contractorId: null,
    requiredDate: null,
    reviewedBy: null,
    submittalDate: null,
    reviewDate: null,
    reviewStatus: null,
    reviewComments: '',
    distributionList: [],
    revisionNumber: 1
  }
  errors.value = {}
  generalError.value = ''
}

const populateForm = () => {
  if (props.submittal) {
    form.value = {
      title: props.submittal.title || '',
      description: props.submittal.description || '',
      type: props.submittal.type || 'product_data',
      specSection: props.submittal.specSection || '',
      status: props.submittal.status || 'not_submitted',
      contractorId: props.submittal.contractorId || null,
      requiredDate: props.submittal.requiredDate ? new Date(props.submittal.requiredDate) : null,
      reviewedBy: props.submittal.reviewedBy || null,
      submittalDate: props.submittal.submittalDate || null,
      reviewDate: props.submittal.reviewDate || null,
      reviewStatus: null, // For new review
      reviewComments: props.submittal.reviewComments || '',
      distributionList: props.submittal.distributionList || [],
      revisionNumber: props.submittal.revisionNumber || 1,
      number: props.submittal.number || ''
    }
  }
}

const validateForm = () => {
  errors.value = {}

  if (!form.value.title.trim()) {
    errors.value.title = 'Title is required'
  }

  if (!form.value.requiredDate) {
    errors.value.requiredDate = 'Required date is required'
  }

  return Object.keys(errors.value).length === 0
}

const handleSubmit = async () => {
  if (!validateForm()) return

  try {
    loading.value = true
    generalError.value = ''

    const submittalData = {
      title: form.value.title.trim(),
      description: form.value.description.trim(),
      type: form.value.type,
      specSection: form.value.specSection.trim() || null,
      contractorId: form.value.contractorId,
      requiredDate: form.value.requiredDate.toISOString(),
      reviewedBy: form.value.reviewedBy,
      distributionList: form.value.distributionList
    }

    let savedSubmittal

    if (isEditing.value) {
      // Update existing submittal
      const updates = {
        ...submittalData,
        status: form.value.status
      }

      // If adding review comments
      if (form.value.reviewComments && form.value.reviewComments.trim()) {
        updates.reviewComments = form.value.reviewComments.trim()
      }

      await SubmittalRepository.updateSubmittal(props.submittal.id, updates)
      savedSubmittal = { ...props.submittal, ...updates }
    } else {
      // Create new submittal
      savedSubmittal = await SubmittalRepository.createSubmittal({
        ...submittalData,
        projectId: props.projectId
      })
    }

    emit('submittal-saved', savedSubmittal)
    emit('update:visible', false)
    resetForm()

  } catch (error) {
    console.error('Error saving submittal:', error)
    generalError.value = error.message || 'Failed to save submittal'
  } finally {
    loading.value = false
  }
}

const reviewSubmittal = async (reviewStatus) => {
  if (!isEditing.value) return

  try {
    loading.value = true
    const comments = form.value.reviewComments?.trim() || ''

    await SubmittalRepository.reviewSubmittal(
      props.submittal.id,
      reviewStatus,
      comments
    )

    form.value.status = reviewStatus
    emit('submittal-saved', { ...props.submittal, status: reviewStatus })

  } catch (error) {
    console.error('Error reviewing submittal:', error)
    generalError.value = error.message || 'Failed to review submittal'
  } finally {
    loading.value = false
  }
}

const createRevision = async () => {
  if (!isEditing.value) return

  try {
    loading.value = true
    const newRevision = await SubmittalRepository.createRevision(props.submittal.id)
    emit('submittal-saved', newRevision)
    emit('update:visible', false)
  } catch (error) {
    console.error('Error creating revision:', error)
    generalError.value = error.message || 'Failed to create revision'
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
    if (props.submittal) {
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
