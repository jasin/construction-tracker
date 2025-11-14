// RFI Constants

export const RFI_STATUSES = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  UNDER_REVIEW: 'under_review',
  RESPONDED: 'responded',
  CLOSED: 'closed'
}

export const RFI_STATUS_OPTIONS = [
  { label: 'Draft', value: 'draft' },
  { label: 'Submitted', value: 'submitted' },
  { label: 'Under Review', value: 'under_review' },
  { label: 'Responded', value: 'responded' },
  { label: 'Closed', value: 'closed' }
]

export const RFI_STATUS_COLORS = {
  draft: 'text-gray-500',
  submitted: 'text-blue-500',
  under_review: 'text-yellow-500',
  responded: 'text-green-500',
  closed: 'text-gray-600'
}
