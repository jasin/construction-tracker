// Change Order Constants

export const CHANGE_ORDER_STATUSES = {
  PROPOSED: 'proposed',
  SUBMITTED: 'submitted',
  UNDER_REVIEW: 'under_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  EXECUTED: 'executed'
}

export const CHANGE_ORDER_TYPES = {
  ADDITION: 'addition',
  DELETION: 'deletion',
  MODIFICATION: 'modification',
  CREDIT: 'credit'
}

export const CHANGE_ORDER_STATUS_OPTIONS = [
  { label: 'Proposed', value: 'proposed' },
  { label: 'Submitted', value: 'submitted' },
  { label: 'Under Review', value: 'under_review' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Executed', value: 'executed' }
]

export const CHANGE_ORDER_TYPE_OPTIONS = [
  { label: 'Addition', value: 'addition' },
  { label: 'Deletion', value: 'deletion' },
  { label: 'Modification', value: 'modification' },
  { label: 'Credit', value: 'credit' }
]

export const CHANGE_ORDER_STATUS_COLORS = {
  proposed: 'text-blue-500',
  submitted: 'text-yellow-500',
  under_review: 'text-orange-500',
  approved: 'text-green-500',
  rejected: 'text-red-500',
  executed: 'text-purple-500'
}
