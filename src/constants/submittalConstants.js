// Submittal Constants

export const SUBMITTAL_STATUSES = {
  NOT_SUBMITTED: 'not_submitted',
  SUBMITTED: 'submitted',
  UNDER_REVIEW: 'under_review',
  APPROVED: 'approved',
  APPROVED_WITH_COMMENTS: 'approved_with_comments',
  REJECTED: 'rejected',
  RESUBMIT: 'resubmit'
}

export const SUBMITTAL_TYPES = {
  PRODUCT_DATA: 'product_data',
  SHOP_DRAWINGS: 'shop_drawings',
  SAMPLES: 'samples',
  TEST_REPORTS: 'test_reports',
  CERTIFICATES: 'certificates'
}

export const SUBMITTAL_STATUS_OPTIONS = [
  { label: 'Not Submitted', value: 'not_submitted' },
  { label: 'Submitted', value: 'submitted' },
  { label: 'Under Review', value: 'under_review' },
  { label: 'Approved', value: 'approved' },
  { label: 'Approved with Comments', value: 'approved_with_comments' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Resubmit', value: 'resubmit' }
]

export const SUBMITTAL_TYPE_OPTIONS = [
  { label: 'Product Data', value: 'product_data' },
  { label: 'Shop Drawings', value: 'shop_drawings' },
  { label: 'Samples', value: 'samples' },
  { label: 'Test Reports', value: 'test_reports' },
  { label: 'Certificates', value: 'certificates' }
]

export const SUBMITTAL_STATUS_COLORS = {
  not_submitted: 'text-gray-500',
  submitted: 'text-blue-500',
  under_review: 'text-yellow-500',
  approved: 'text-green-500',
  approved_with_comments: 'text-green-600',
  rejected: 'text-red-500',
  resubmit: 'text-orange-500'
}
