// src/services/firebase/repositories/AttachmentRepository.ts
import type {
  Attachment,
  AttachmentFilters,
  AttachmentStatistics,
  AttachmentSummary,
  AttachmentFileType,
  EntityType,
  ValidationResult,
} from '@/types/models';
import BaseRepository from '../core/BaseRepository';
import { CrudMixin } from '../mixins/CrudMixin';
import { RealtimeMixin } from '../mixins/RealtimeMixin';
import ActivityService from '@/services/logging/ActivityService';
import firebaseCore from '../core/FirebaseCore';
import { ATTACHMENT_SCHEMA } from '../schemas';

/**
 * Attachment Repository - handles all attachment-related Firebase operations
 * Manages file attachments across all entity types (projects, tasks, documents, clients, etc.)
 */
class AttachmentRepository extends CrudMixin(RealtimeMixin(BaseRepository)) {
  constructor() {
    super('attachments');
  }

  /**
   * Get attachments for a specific entity
   */
  async getEntityAttachments(entityType: EntityType, entityId: string): Promise<Attachment[]> {
    try {
      const allAttachments = await this.getAll();

      const entityAttachments = allAttachments.filter(
        (attachment: Attachment) =>
          attachment.entityType === entityType && attachment.entityId === entityId
      );

      // Sort by upload date (newest first)
      return entityAttachments.sort(
        (a, b) =>
          new Date(b.uploadedAt || b.createdAt).getTime() -
          new Date(a.uploadedAt || a.createdAt).getTime()
      );
    } catch (error) {
      console.error('Error getting entity attachments:', error);
      throw error;
    }
  }

  /**
   * Add attachment to entity
   */
  async addEntityAttachment(
    entityType: EntityType,
    entityId: string,
    attachmentData: Partial<Attachment>,
    projectId: string | null = null
  ): Promise<Attachment> {
    try {
      const validation = this.validateData(attachmentData, ['name', 'fileSize']);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${Object.values(validation.errors).join(', ')}`);
      }

      // Add attachment-specific data
      const attachmentWithDefaults = {
        ...validation.cleanData,
        entityType,
        entityId,
        uploadedBy: firebaseCore.getCurrentUserId(),
        uploadedByName: firebaseCore.getCurrentUserName(),
        uploadedAt: new Date().toISOString(),
        version: validation.cleanData.version || 1,
        isPublic:
          validation.cleanData.isPublic !== undefined ? validation.cleanData.isPublic : false,
        virusScanStatus: 'pending' as const,
        tags: validation.cleanData.tags || [],
        permissions: validation.cleanData.permissions || {
          view: ['team', 'pm', 'admin'],
          download: ['team', 'pm', 'admin'],
          delete: ['pm', 'admin', 'uploader'],
        },
      };

      const newAttachment = await this.create(attachmentWithDefaults, ATTACHMENT_SCHEMA);

      // Log activity (use projectId if provided, otherwise null)
      await ActivityService.logActivity(
        projectId,
        'added_attachment',
        entityType,
        entityId,
        `Added attachment "${newAttachment.name}" to ${entityType}`,
        {
          attachmentId: newAttachment.id,
          fileName: newAttachment.name,
          fileSize: newAttachment.fileSize,
        }
      );

      return newAttachment;
    } catch (error) {
      console.error('Error adding entity attachment:', error);
      throw error;
    }
  }

  /**
   * Remove attachment from entity
   */
  async removeEntityAttachment(
    attachmentId: string,
    projectId: string | null = null
  ): Promise<{ success: boolean; id: string }> {
    try {
      const attachment = await this.getById(attachmentId);
      if (!attachment) {
        throw new Error('Attachment not found');
      }

      await this.delete(attachmentId);

      // Log activity
      await ActivityService.logActivity(
        projectId,
        'removed_attachment',
        attachment.entityType,
        attachment.entityId,
        `Removed attachment "${attachment.name}" from ${attachment.entityType}`,
        {
          attachmentId,
          fileName: attachment.name,
        }
      );

      return { success: true, id: attachmentId };
    } catch (error) {
      console.error('Error removing entity attachment:', error);
      throw error;
    }
  }

  /**
   * Get attachments by entity type (all entities of that type)
   */
  async getAttachmentsByEntityType(entityType: EntityType): Promise<Attachment[]> {
    try {
      const allAttachments = await this.getAll();

      return allAttachments
        .filter((attachment: Attachment) => attachment.entityType === entityType)
        .sort(
          (a, b) =>
            new Date(b.uploadedAt || b.createdAt).getTime() -
            new Date(a.uploadedAt || a.createdAt).getTime()
        );
    } catch (error) {
      console.error('Error getting attachments by entity type:', error);
      throw error;
    }
  }

  /**
   * Get attachments by file type
   */
  async getAttachmentsByFileType(
    fileType: string,
    entityType: EntityType | null = null,
    entityId: string | null = null
  ): Promise<Attachment[]> {
    try {
      let attachments = await this.getAll();

      // Filter by file type
      attachments = attachments.filter(
        (attachment: Attachment) =>
          attachment.fileType === fileType || attachment.mimeType?.includes(fileType)
      );

      // Additional filters if provided
      if (entityType) {
        attachments = attachments.filter(
          (attachment: Attachment) => attachment.entityType === entityType
        );
      }

      if (entityId) {
        attachments = attachments.filter(
          (attachment: Attachment) => attachment.entityId === entityId
        );
      }

      return attachments.sort(
        (a, b) =>
          new Date(b.uploadedAt || b.createdAt).getTime() -
          new Date(a.uploadedAt || a.createdAt).getTime()
      );
    } catch (error) {
      console.error('Error getting attachments by file type:', error);
      throw error;
    }
  }

  /**
   * Search attachments across all entities
   */
  async searchAttachments(
    searchTerm: string,
    filters: AttachmentFilters = {}
  ): Promise<Attachment[]> {
    try {
      let attachments = await this.getAll();
      const term = searchTerm.toLowerCase().trim();

      // Text search
      attachments = attachments.filter((attachment: Attachment) => {
        return (
          attachment.name?.toLowerCase().includes(term) ||
          attachment.originalName?.toLowerCase().includes(term) ||
          attachment.description?.toLowerCase().includes(term) ||
          attachment.tags?.some((tag) => tag.toLowerCase().includes(term)) ||
          attachment.extractedText?.toLowerCase().includes(term)
        );
      });

      // Apply filters
      if (filters.entityType) {
        attachments = attachments.filter((a: Attachment) => a.entityType === filters.entityType);
      }

      if (filters.entityId) {
        attachments = attachments.filter((a: Attachment) => a.entityId === filters.entityId);
      }

      if (filters.fileType) {
        attachments = attachments.filter(
          (a: Attachment) =>
            a.fileType === filters.fileType || a.mimeType?.includes(filters.fileType)
        );
      }

      if (filters.uploadedBy) {
        attachments = attachments.filter((a: Attachment) => a.uploadedBy === filters.uploadedBy);
      }

      if (filters.uploadedAfter) {
        attachments = attachments.filter(
          (a: Attachment) =>
            a.uploadedAt && new Date(a.uploadedAt) >= new Date(filters.uploadedAfter!)
        );
      }

      if (filters.isPublic !== undefined) {
        attachments = attachments.filter((a: Attachment) => a.isPublic === filters.isPublic);
      }

      return attachments.sort(
        (a, b) =>
          new Date(b.uploadedAt || b.createdAt).getTime() -
          new Date(a.uploadedAt || a.createdAt).getTime()
      );
    } catch (error) {
      console.error('Error searching attachments:', error);
      throw error;
    }
  }

  /**
   * Update attachment metadata
   */
  async updateAttachment(
    attachmentId: string,
    updates: Partial<Attachment>,
    projectId: string | null = null
  ): Promise<Attachment> {
    try {
      const originalAttachment = await this.getById(attachmentId);
      if (!originalAttachment) {
        throw new Error('Attachment not found');
      }

      const result = await this.update(attachmentId, updates, ATTACHMENT_SCHEMA);

      // Log significant updates
      const significantFields = ['name', 'description', 'isPublic', 'permissions'];
      const significantChanges = Object.keys(updates).filter(
        (key) =>
          significantFields.includes(key) &&
          updates[key as keyof Attachment] !== originalAttachment[key as keyof Attachment]
      );

      if (significantChanges.length > 0) {
        await ActivityService.logActivity(
          projectId,
          'updated_attachment',
          originalAttachment.entityType,
          originalAttachment.entityId,
          `Updated attachment "${originalAttachment.name}"`,
          {
            attachmentId,
            changes: Object.fromEntries(
              significantChanges.map((key) => [key, updates[key as keyof Attachment]])
            ),
          }
        );
      }

      return result;
    } catch (error) {
      console.error('Error updating attachment:', error);
      throw error;
    }
  }

  // ==================== BULK OPERATIONS ====================

  /**
   * Bulk delete attachments for an entity
   */
  async bulkDeleteEntityAttachments(
    entityType: EntityType,
    entityId: string,
    projectId: string | null = null
  ): Promise<{ deleted: number; attachments: Attachment[] }> {
    try {
      const entityAttachments = await this.getEntityAttachments(entityType, entityId);
      const attachmentIds = entityAttachments.map((a) => a.id);

      if (attachmentIds.length === 0) {
        return { deleted: 0, attachments: [] };
      }

      await this.bulkDelete(attachmentIds);

      // Log bulk activity
      await ActivityService.logActivity(
        projectId,
        'bulk_deleted_attachments',
        entityType,
        entityId,
        `Bulk deleted ${attachmentIds.length} attachments from ${entityType}`,
        { deletedCount: attachmentIds.length }
      );

      return { deleted: attachmentIds.length, attachments: entityAttachments };
    } catch (error) {
      console.error('Error bulk deleting entity attachments:', error);
      throw error;
    }
  }

  /**
   * Bulk update attachment permissions
   */
  async bulkUpdateAttachmentPermissions(
    attachmentIds: string[],
    permissions: Attachment['permissions'],
    _projectId: string | null = null
  ): Promise<any> {
    try {
      const updates = { permissions };
      const results = await this.bulkUpdate(attachmentIds, updates);

      await ActivityService.logBulkActivity(
        'bulk_updated_attachment_permissions',
        'attachment',
        attachmentIds,
        `Bulk updated permissions for ${attachmentIds.length} attachments`,
        { permissions }
      );

      return results;
    } catch (error) {
      console.error('Error bulk updating attachment permissions:', error);
      throw error;
    }
  }

  // ==================== ATTACHMENT STATISTICS ====================

  /**
   * Get attachment statistics
   */
  async getAttachmentStatistics(
    entityType: EntityType | null = null,
    entityId: string | null = null
  ): Promise<AttachmentStatistics> {
    try {
      const attachments: Attachment[] =
        entityType && entityId
          ? await this.getEntityAttachments(entityType, entityId)
          : await this.getAll();

      const stats: AttachmentStatistics = {
        total: attachments.length,
        totalSize: attachments.reduce((sum, a) => sum + (a.fileSize || 0), 0),
        averageSize: 0,
        byFileType: {},
        byEntityType: {},
        byUploader: {},
        byVirusScanStatus: {},
        publicCount: attachments.filter((a) => a.isPublic).length,
        privateCount: attachments.filter((a) => !a.isPublic).length,
        recentUploads: 0, // Last 7 days
        oldAttachments: 0, // Older than 1 year
        largeFiles: 0, // > 10MB
        withThumbnails: attachments.filter((a) => a.thumbnail).length,
      };

      // Calculate averages
      if (attachments.length > 0) {
        stats.averageSize = stats.totalSize / attachments.length;
      }

      // File type distribution
      attachments.forEach((attachment) => {
        const fileType = attachment.fileType || 'unknown';
        stats.byFileType[fileType] = (stats.byFileType[fileType] || 0) + 1;
      });

      // Entity type distribution (if not filtering by specific entity)
      if (!entityType) {
        attachments.forEach((attachment) => {
          const entType = attachment.entityType || 'unknown';
          stats.byEntityType[entType] = (stats.byEntityType[entType] || 0) + 1;
        });
      }

      // Uploader distribution
      attachments.forEach((attachment) => {
        const uploader = attachment.uploadedByName || 'Unknown';
        stats.byUploader[uploader] = (stats.byUploader[uploader] || 0) + 1;
      });

      // Virus scan status
      attachments.forEach((attachment) => {
        const status = attachment.virusScanStatus || 'unknown';
        stats.byVirusScanStatus[status] = (stats.byVirusScanStatus[status] || 0) + 1;
      });

      // Time-based stats
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      const tenMB = 10 * 1024 * 1024;

      attachments.forEach((attachment) => {
        const uploadDate = new Date(attachment.uploadedAt || attachment.createdAt);

        if (uploadDate > sevenDaysAgo) stats.recentUploads++;
        if (uploadDate < oneYearAgo) stats.oldAttachments++;
        if ((attachment.fileSize || 0) > tenMB) stats.largeFiles++;
      });

      return stats;
    } catch (error) {
      console.error('Error getting attachment statistics:', error);
      throw error;
    }
  }

  // ==================== REAL-TIME SUBSCRIPTIONS ====================

  /**
   * Subscribe to attachments for a specific entity
   */
  subscribeToEntityAttachments(
    entityType: EntityType,
    entityId: string,
    callback: (attachments: Attachment[]) => void
  ): () => void {
    try {
      const filterEntityAttachments = (attachments: Attachment[]) => {
        const entityAttachments = attachments
          .filter(
            (attachment) => attachment.entityType === entityType && attachment.entityId === entityId
          )
          .sort(
            (a, b) =>
              new Date(b.uploadedAt || b.createdAt).getTime() -
              new Date(a.uploadedAt || a.createdAt).getTime()
          );

        callback(entityAttachments);
      };

      return this.subscribeToAll(filterEntityAttachments);
    } catch (error) {
      console.error('Error subscribing to entity attachments:', error);
      throw error;
    }
  }

  /**
   * Subscribe to attachments by entity type
   */
  subscribeToAttachmentsByEntityType(
    entityType: EntityType,
    callback: (attachments: Attachment[]) => void
  ): () => void {
    try {
      const filterByEntityType = (attachments: Attachment[]) => {
        const typeAttachments = attachments
          .filter((attachment) => attachment.entityType === entityType)
          .sort(
            (a, b) =>
              new Date(b.uploadedAt || b.createdAt).getTime() -
              new Date(a.uploadedAt || a.createdAt).getTime()
          );

        callback(typeAttachments);
      };

      return this.subscribeToAll(filterByEntityType);
    } catch (error) {
      console.error('Error subscribing to attachments by entity type:', error);
      throw error;
    }
  }

  // ==================== HELPER METHODS ====================

  /**
   * Get file type from file name or mime type
   */
  getFileType(attachment: Attachment): AttachmentFileType {
    if (attachment.fileType) return attachment.fileType;

    if (attachment.mimeType) {
      if (attachment.mimeType.includes('image')) return 'image';
      if (attachment.mimeType.includes('pdf')) return 'pdf';
      if (attachment.mimeType.includes('video')) return 'video';
      if (attachment.mimeType.includes('audio')) return 'audio';
      if (attachment.mimeType.includes('text')) return 'document';
    }

    // Fallback to file extension
    const fileName = attachment.name || attachment.originalName || '';
    const extension = fileName.split('.').pop()?.toLowerCase();

    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
    const docExts = ['pdf', 'doc', 'docx', 'txt', 'rtf'];
    const videoExts = ['mp4', 'avi', 'mov', 'wmv', 'flv'];
    const audioExts = ['mp3', 'wav', 'flac', 'aac'];

    if (extension && imageExts.includes(extension)) return 'image';
    if (extension && docExts.includes(extension)) return 'document';
    if (extension && videoExts.includes(extension)) return 'video';
    if (extension && audioExts.includes(extension)) return 'audio';

    return 'file';
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (!bytes) return '0 B';

    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));

    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Check if user can perform action on attachment
   */
  canUserPerformAction(
    attachment: Attachment,
    userId: string,
    userRole: string,
    action: 'view' | 'download' | 'delete' = 'view'
  ): boolean {
    if (!attachment.permissions) return true; // Legacy attachments

    const permissions = attachment.permissions[action] || [];

    // Check role-based permissions
    if (permissions.includes(userRole)) return true;
    if (permissions.includes('all')) return true;

    // Check if user is uploader
    if (permissions.includes('uploader') && attachment.uploadedBy === userId) return true;

    return false;
  }

  /**
   * Generate attachment summary for entity
   */
  async getEntityAttachmentSummary(
    entityType: EntityType,
    entityId: string
  ): Promise<AttachmentSummary> {
    try {
      const attachments = await this.getEntityAttachments(entityType, entityId);

      return {
        count: attachments.length,
        totalSize: attachments.reduce((sum, a) => sum + (a.fileSize || 0), 0),
        types: [...new Set(attachments.map((a) => this.getFileType(a)))],
        hasPublic: attachments.some((a) => a.isPublic),
        hasPrivate: attachments.some((a) => !a.isPublic),
        latestUpload:
          attachments.length > 0
            ? attachments.sort(
                (a, b) =>
                  new Date(b.uploadedAt || b.createdAt).getTime() -
                  new Date(a.uploadedAt || a.createdAt).getTime()
              )[0].uploadedAt
            : null,
        needsVirusScan: attachments.filter((a) => a.virusScanStatus === 'pending').length,
      };
    } catch (error) {
      console.error('Error getting entity attachment summary:', error);
      throw error;
    }
  }

  /**
   * Validate attachment-specific data
   */
  validateAttachmentData(attachmentData: Partial<Attachment>): ValidationResult {
    const validation = super.validateData(attachmentData, ['name', 'fileSize']);

    // File size validation
    if (attachmentData.fileSize && attachmentData.fileSize < 0) {
      validation.errors.fileSize = 'File size cannot be negative';
      validation.isValid = false;
    }

    // Max file size (100MB default)
    const maxSize = 100 * 1024 * 1024;
    if (attachmentData.fileSize && attachmentData.fileSize > maxSize) {
      validation.errors.fileSize = `File size cannot exceed ${this.formatFileSize(maxSize)}`;
      validation.isValid = false;
    }

    // Entity type validation
    const validEntityTypes: EntityType[] = [
      'project',
      'task',
      'document',
      'client',
      'user',
      'rfi',
      'submittal',
      'change-order',
    ];
    if (attachmentData.entityType && !validEntityTypes.includes(attachmentData.entityType)) {
      validation.errors.entityType = `Invalid entity type. Must be one of: ${validEntityTypes.join(', ')}`;
      validation.isValid = false;
    }

    return validation;
  }
}

export default new AttachmentRepository();
