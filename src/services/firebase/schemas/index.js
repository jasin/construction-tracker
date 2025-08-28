// Example usage schemas
export const PROJECT_SCHEMA = {
  name: 'string',
  jobNumber: 'string',
  clientId: 'string',
  architect: 'string',
  projectManager: 'string',
  superintendent: 'string',
  phase: 'string',
  cost: 'number',
  contractSigned: 'boolean',
  startDate: 'date',
  endDate: 'date',
  address: 'string',
  description: 'string',
}

export const TASK_SCHEMA = {
  title: 'string',
  description: 'string',
  priority: 'string',
  status: 'string',
  assignedTo: 'string',
  projectId: 'string',
  dueDate: 'date',
  estimatedHours: 'number',
  actualHours: 'number',
  progress: 'number',
  category: 'string',
  dependencies: 'array',
}

export const CLIENT_SCHEMA = {
  name: 'string',
  company: 'string',
  email: 'string',
  phone: 'string',
  address: 'string',
  notes: 'string',
}

export const USER_SCHEMA = {
  name: 'string',
  email: 'string',
  role: 'string',
  phone: 'string',
  active: 'boolean',
}

export const RFI_SCHEMA = {
  title: 'string',
  description: 'string',
  priority: 'string',
  status: 'string',
  projectId: 'string',
  submittedBy: 'string',
  assignedTo: 'string',
  dueDate: 'date',
  response: 'string',
  attachment: 'array',
  attachmentCount: 'number',
}

export const SUBMITTAL_SCHEMA = {
  title: 'string',
  description: 'string',
  status: 'string',
  projectId: 'string',
  submittedBy: 'string',
  reviewedBy: 'string',
  dueDate: 'date',
  comments: 'string',
  attachment: 'array',
  attachmentCount: 'number',
}

export const CHANGE_ORDER_SCHEMA = {
  title: 'string',
  description: 'string',
  number: 'string',
  status: 'string',
  projectId: 'string',
  reason: 'string',
  requestedBy: 'string',
  costImpact: 'number',
  timeImpact: 'number',
  billable: 'boolean',
  attachment: 'array',
  attachmentCount: 'number',
}

export const DOCUMENT_SCHEMA = {
  name: 'string',
  description: 'string',
  category: 'string',
  projectId: 'string',
  googleDriveFileId: 'string',
  googleDriveLink: 'string',
  mimeType: 'string',
  fileSize: 'number',
  status: 'string',
  version: 'number',
  tags: 'array',
  uploadedBy: 'string',
  uploadedByName: 'string',
  linkedEntityType: 'string',
  linkedEntityId: 'string',
  isAttachment: 'boolean',
}
