// Schema definitions for Firebase entities
// These define the expected structure and types for each entity

export interface SchemaDefinition {
  [key: string]: string
}

export const PROJECT_SCHEMA: SchemaDefinition = {
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

export const TASK_SCHEMA: SchemaDefinition = {
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
  startedAt: 'date',
  completedAt: 'date',
}

export const CLIENT_SCHEMA: SchemaDefinition = {
  name: 'string',
  company: 'string',
  email: 'string',
  phone: 'string',
  address: 'string',
  notes: 'string',
}

export const USER_SCHEMA: SchemaDefinition = {
  name: 'string',
  email: 'string',
  role: 'string',
  phone: 'string',
  active: 'boolean',
}

export const RFI_SCHEMA: SchemaDefinition = {
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

export const SUBMITTAL_SCHEMA: SchemaDefinition = {
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

export const CHANGE_ORDER_SCHEMA: SchemaDefinition = {
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

export const DOCUMENT_SCHEMA: SchemaDefinition = {
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

export const ATTACHMENT_SCHEMA: SchemaDefinition = {
  name: 'string',
  originalName: 'string',
  description: 'string',
  entityType: 'string', // 'project', 'task', 'document', 'client', etc.
  entityId: 'string', // ID of the entity this attachment belongs to
  fileType: 'string', // 'pdf', 'image', 'document', etc.
  mimeType: 'string', // 'application/pdf', 'image/jpeg', etc.
  fileSize: 'number', // Size in bytes
  googleDriveFileId: 'string',
  googleDriveLink: 'string',
  thumbnail: 'string', // Thumbnail URL if available
  downloadUrl: 'string', // Direct download URL
  uploadedBy: 'string', // User ID who uploaded
  uploadedByName: 'string', // User name who uploaded
  uploadedAt: 'string', // ISO timestamp
  tags: 'array', // Array of tags for categorization
  isPublic: 'boolean', // Whether attachment is public or private
  permissions: 'object', // Who can view/download/edit
  version: 'number', // Version number for versioning
  previousVersions: 'array', // Array of previous version info
  virusScanStatus: 'string', // 'pending', 'clean', 'infected', 'error'
  extractedText: 'string', // OCR/extracted text for search
}
