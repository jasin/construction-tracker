// Core data model types for Firebase entities
import type { UserRole, ProjectPhase, TaskStatus, TaskPriority } from '@/constants';

// ==================== BASE TYPES ====================

/**
 * Base metadata fields included in all Firebase entities
 */
export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

// ==================== USER ====================

export interface User extends BaseEntity {
  email: string;
  name: string;
  photo?: string;
  role: UserRole;
  active: boolean;
}

// ==================== CLIENT ====================

export interface Client extends BaseEntity {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  contactPerson?: string;
  notes?: string;
}

// ==================== PROJECT ====================

export interface Project extends BaseEntity {
  name: string;
  jobNumber: string;
  clientId: string;
  phase: ProjectPhase;
  status: string;
  cost?: number;
  startDate?: string;
  endDate?: string;
  projectManager?: string;
  superintendent?: string;
  architect?: string;
  description?: string;
  address?: string;
  notes?: string;
}

// ==================== TASK ====================

export interface Task extends BaseEntity {
  title: string;
  description?: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate?: string;
  startDate?: string;
  projectId?: string; // Tasks can be independent of projects
  assignedTo?: string;
  assignedToName?: string;
  assignedAt?: string;
  category?: string;
  estimatedHours?: number;
  actualHours?: number;
  progress?: number;
  dependencies?: string[];
  tags?: string[];
  completedAt?: string | null;
  startedAt?: string;
}

export interface TaskComment {
  id: string;
  taskId: string;
  text: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
}

export interface TaskFilters {
  status?: TaskStatus[];
  assignedTo?: string;
  priority?: TaskPriority[];
  dueDateFrom?: string;
  dueDateTo?: string;
  tags?: string[];
  projectId?: string;
  sortBy?:
    | 'title'
    | 'priority'
    | 'status'
    | 'dueDate'
    | 'progress'
    | 'estimatedHours'
    | 'createdAt';
  sortDirection?: 'asc' | 'desc';
}

export interface TaskStatistics {
  total: number;
  completed: number;
  inProgress: number;
  todo: number;
  cancelled: number;
  overdue: number;
  byPriority: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  byAssignee: Record<string, number>;
  totalEstimatedHours: number;
  totalActualHours: number;
  averageProgress: number;
  completionRate: number;
}

// ==================== RFI (Request for Information) ====================

export type RFIStatus = 'open' | 'pending' | 'answered' | 'closed';
export type RFIPriority = 'low' | 'medium' | 'high' | 'critical';

export interface RFI extends BaseEntity {
  title: string;
  description: string;
  priority: RFIPriority;
  status: RFIStatus;
  projectId: string;
  submittedBy: string;
  submittedByName?: string;
  submittedDate: string;
  assignedTo?: string;
  assignedToName?: string;
  dueDate?: string;
  response?: string;
  responseDate?: string;
  respondedBy?: string;
  respondedByName?: string;
  category?: string;
  attachments?: string[];
}

// ==================== SUBMITTAL ====================

export type SubmittalStatus = 'pending' | 'under-review' | 'approved' | 'rejected' | 'resubmit';

export interface Submittal extends BaseEntity {
  title: string;
  description: string;
  status: SubmittalStatus;
  projectId: string;
  submittedBy: string;
  submittedByName?: string;
  submittedDate: string;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedDate?: string;
  dueDate?: string;
  category?: string;
  specSection?: string;
  attachments?: string[];
  notes?: string;
}

// ==================== CHANGE ORDER ====================

export type ChangeOrderStatus =
  | 'proposed'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'executed';
export type ChangeOrderType = 'addition' | 'deletion' | 'modification' | 'credit';

export interface ChangeOrder extends BaseEntity {
  title: string;
  number?: string;
  description: string;
  status: ChangeOrderStatus;
  type: ChangeOrderType;
  projectId: string;
  costImpact?: number;
  timeImpact?: number;
  billable: boolean;
  requestedBy: string;
  requestedByName?: string;
  requestedAt: string;
  submittedAt?: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  approvalNotes?: string;
  rejectedBy?: string;
  rejectedByName?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  executedBy?: string;
  executedByName?: string;
  executedAt?: string;
  executionNotes?: string;
  reason?: string;
  impactDescription?: string;
  attachments?: string[];
  attachmentCount?: number;
  notes?: string;
}

export interface ChangeOrderFilters {
  status?: ChangeOrderStatus[];
  type?: ChangeOrderType[];
  requestedBy?: string;
  billable?: boolean;
  minCostImpact?: number;
  maxCostImpact?: number;
  requestedAfter?: string;
  sortBy?:
    | 'title'
    | 'number'
    | 'status'
    | 'type'
    | 'costImpact'
    | 'timeImpact'
    | 'requestedAt'
    | 'approvedAt'
    | 'rejectedAt'
    | 'executedAt'
    | 'createdAt';
  sortDirection?: 'asc' | 'desc';
}

export interface ChangeOrderStatistics {
  total: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  totalCostImpact: number;
  totalTimeImpact: number;
  averageCostImpact: number;
  averageTimeImpact: number;
  billableAmount: number;
  nonBillableAmount: number;
  averageApprovalTime: number;
  byRequester: Record<string, number>;
  pendingApproval: number;
  recentActivity: number;
}

export interface ProjectImpact {
  totalCostImpact: number;
  totalTimeImpact: number;
  additionsCost: number;
  deletionsCost: number;
  modificationsCost: number;
  creditsCost: number;
  billableAmount: number;
  nonBillableAmount: number;
  changeOrderCount: number;
}

// ==================== DOCUMENT ====================

export type DocumentCategory =
  | 'plans'
  | 'specifications'
  | 'contracts'
  | 'photos'
  | 'reports'
  | 'correspondence'
  | 'submittals'
  | 'rfis'
  | 'change-orders'
  | 'permits'
  | 'safety'
  | 'other';

export interface Document extends BaseEntity {
  name: string;
  type: string; // file extension or MIME type
  category: DocumentCategory;
  url: string;
  projectId: string;
  linkedEntityId?: string; // ID of linked entity (task, rfi, submittal, etc.)
  linkedEntityType?: 'task' | 'rfi' | 'submittal' | 'change-order';
  uploadedBy: string;
  uploadedByName?: string;
  uploadedDate: string;
  size?: number;
  description?: string;
  tags?: string[];
}

// ==================== ACTIVITY LOG ====================

export type ActivityAction =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'task_created'
  | 'task_updated'
  | 'task_deleted'
  | 'assigned_task'
  | 'updated_task_priority'
  | 'status_changed'
  | 'commented_on_task'
  | 'bulk_updated_tasks'
  | 'bulk_assigned_tasks'
  | 'bulk_updated_task_status'
  | 'project_created'
  | 'project_updated'
  | 'rfi_created'
  | 'rfi_updated'
  | 'submittal_created'
  | 'submittal_updated'
  | 'change_order_created'
  | 'change_order_updated'
  | 'document_uploaded'
  | 'document_deleted';

export type EntityType =
  | 'project'
  | 'task'
  | 'rfi'
  | 'submittal'
  | 'change-order'
  | 'document'
  | 'user'
  | 'client';

export interface ActivityLog {
  id: string;
  projectId: string;
  userId: string;
  userName: string;
  action: ActivityAction;
  entityType: EntityType;
  entityId: string;
  description: string;
  timestamp: string;
  additionalData?: Record<string, any>;
}

// ==================== ATTACHMENT ====================

export type AttachmentFileType = 'image' | 'document' | 'video' | 'audio' | 'pdf' | 'file';
export type VirusScanStatus = 'pending' | 'clean' | 'infected' | 'error';

export interface AttachmentPermissions {
  view: string[];
  download: string[];
  delete: string[];
}

export interface Attachment extends BaseEntity {
  name: string;
  originalName?: string;
  fileType: AttachmentFileType;
  mimeType?: string;
  fileSize: number;
  entityType: EntityType;
  entityId: string;
  uploadedBy: string;
  uploadedByName: string;
  uploadedAt: string;
  version?: number;
  isPublic: boolean;
  virusScanStatus: VirusScanStatus;
  tags?: string[];
  permissions: AttachmentPermissions;
  description?: string;
  url?: string;
  thumbnail?: string;
  extractedText?: string;
  metadata?: Record<string, any>;
}

export interface AttachmentFilters {
  entityType?: EntityType;
  entityId?: string;
  fileType?: AttachmentFileType;
  uploadedBy?: string;
  uploadedAfter?: string;
  isPublic?: boolean;
}

export interface AttachmentStatistics {
  total: number;
  totalSize: number;
  averageSize: number;
  byFileType: Record<string, number>;
  byEntityType: Record<string, number>;
  byUploader: Record<string, number>;
  byVirusScanStatus: Record<string, number>;
  publicCount: number;
  privateCount: number;
  recentUploads: number;
  oldAttachments: number;
  largeFiles: number;
  withThumbnails: number;
}

export interface AttachmentSummary {
  count: number;
  totalSize: number;
  types: AttachmentFileType[];
  hasPublic: boolean;
  hasPrivate: boolean;
  latestUpload: string | null;
  needsVirusScan: number;
}

// ==================== VALIDATION RESULT ====================

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  cleanData?: any;
}

// ==================== DEPENDENCY VALIDATION ====================

export interface DependencyValidation {
  allowed: boolean;
  reason?: string;
  blockedBy?: string[];
}

// ==================== BULK OPERATION RESULT ====================

export interface BulkOperationResult {
  success: boolean;
  successCount: number;
  failureCount: number;
  results: Array<{
    id: string;
    success: boolean;
    error?: string;
  }>;
}
