// src/services/firebase/repositories/DocumentRepository.js
import BaseRepository from '@/services/firebase/core/BaseRepository'
import { CrudMixin } from '../mixins/CrudMixin'
import { RealtimeMixin } from '../mixins/RealtimeMixin'
import ActivityService from '@/services/logging/ActivityService'
import firebaseCore from '@/services/firebase/core/FirebaseCore'
import { ref, query, orderByChild, equalTo, onValue } from 'firebase/database'
import { DOCUMENT_SCHEMA } from '../schemas'

/**
 * Document Repository - handles all document-related Firebase operations
 * Includes document management, versioning, approval workflows, and statistics
 */
class DocumentRepository extends CrudMixin(RealtimeMixin(BaseRepository)) {
  constructor() {
    super('documents')
  }

  /**
   * Create a new document with validation and activity logging
   */
  async createDocument(documentData) {
    try {
      const validation = this.validateData(documentData, ['name'])
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${Object.values(validation.errors).join(', ')}`)
      }

      // Add document-specific defaults
      const docDataWithDefaults = {
        ...validation.cleanData,
        version: validation.cleanData.version || 1,
        status: validation.cleanData.status || 'pending',
        previousVersions: [],
        permissions: validation.cleanData.permissions || {
          view: ['team', 'client'],
          edit: ['pm', 'admin'],
          download: ['team'],
        },
        uploadedBy: firebaseCore.getCurrentUserId(),
        uploadedByName: firebaseCore.getCurrentUserName(),
        uploadedAt: new Date().toISOString(),
      }

      const newDoc = await this.create(docDataWithDefaults, DOCUMENT_SCHEMA)

      // Log activity (only if document has projectId)
      if (newDoc.projectId) {
        await ActivityService.logEntityCreated(newDoc.projectId, 'document', newDoc.id, newDoc.name)
      }

      return newDoc
    } catch (error) {
      console.error('Error creating document:', error)
      throw error
    }
  }

  /**
   * Get documents by project with optional filtering
   */
  async getDocumentsByProject(projectId, options = {}) {
    try {
      let documents = await this.getByField('projectId', projectId)

      // Apply filters
      if (options.category) {
        documents = documents.filter((doc) => doc.category === options.category)
      }

      if (options.status) {
        documents = documents.filter((doc) => doc.status === options.status)
      }

      if (options.uploadedBy) {
        documents = documents.filter((doc) => doc.uploadedBy === options.uploadedBy)
      }

      if (options.fileType) {
        documents = documents.filter((doc) => {
          const fileName = doc.name || doc.fileName || ''
          const extension = fileName.split('.').pop()?.toLowerCase() || 'unknown'
          return extension === options.fileType.toLowerCase()
        })
      }

      // Apply date filters
      if (options.uploadedAfter) {
        documents = documents.filter(
          (doc) => doc.uploadedAt && new Date(doc.uploadedAt) >= new Date(options.uploadedAfter),
        )
      }

      if (options.uploadedBefore) {
        documents = documents.filter(
          (doc) => doc.uploadedAt && new Date(doc.uploadedAt) <= new Date(options.uploadedBefore),
        )
      }

      // Sort by upload date (newest first) unless specified
      const sortBy = options.sortBy || 'uploadedAt'
      const sortDirection = options.sortDirection || 'desc'
      documents = this.sortDocuments(documents, sortBy, sortDirection)

      // Apply limit if specified
      if (options.limit && options.limit > 0) {
        documents = documents.slice(0, options.limit)
      }

      return documents
    } catch (error) {
      console.error('Error getting documents by project:', error)
      throw error
    }
  }

  /**
   * Get documents by category
   */
  async getDocumentsByCategory(category, projectId = null) {
    try {
      const documents = projectId ? await this.getDocumentsByProject(projectId) : await this.getAll()

      return documents.filter((doc) => doc.category === category)
    } catch (error) {
      console.error('Error getting documents by category:', error)
      throw error
    }
  }

  /**
   * Get documents by status
   */
  async getDocumentsByStatus(status, projectId = null) {
    try {
      const documents = projectId ? await this.getDocumentsByProject(projectId) : await this.getAll()

      return documents.filter((doc) => doc.status === status)
    } catch (error) {
      console.error('Error getting documents by status:', error)
      throw error
    }
  }

  /**
   * Get pending approval documents
   */
  async getPendingApprovalDocuments(projectId = null) {
    try {
      return await this.getDocumentsByStatus('pending', projectId)
    } catch (error) {
      console.error('Error getting pending approval documents:', error)
      throw error
    }
  }

  /**
   * Search documents
   */
  async searchDocuments(searchTerm, projectId = null) {
    try {
      const documents = projectId ? await this.getDocumentsByProject(projectId) : await this.getAll()

      const term = searchTerm.toLowerCase().trim()

      return documents.filter((doc) => {
        return (
          doc.name?.toLowerCase().includes(term) ||
          doc.description?.toLowerCase().includes(term) ||
          doc.category?.toLowerCase().includes(term) ||
          doc.uploadedByName?.toLowerCase().includes(term) ||
          doc.tags?.some((tag) => tag.toLowerCase().includes(term))
        )
      })
    } catch (error) {
      console.error('Error searching documents:', error)
      throw error
    }
  }

  /**
   * Update document with enhanced validation and activity logging
   */
  async updateDocument(documentId, updates) {
    try {
      const originalDoc = await this.getById(documentId)
      if (!originalDoc) {
        throw new Error('Document not found')
      }

      // Add approval timestamp if status is being approved
      if (updates.status === 'approved' && !updates.approvedAt) {
        updates.approvedAt = new Date().toISOString()
        updates.approvedBy = firebaseCore.getCurrentUserId()
        updates.approvedByName = firebaseCore.getCurrentUserName()
      }

      const result = await this.update(documentId, updates, DOCUMENT_SCHEMA)

      // Log significant updates (only if document has projectId)
      if (originalDoc.projectId) {
        if (updates.status && updates.status !== originalDoc.status) {
          await ActivityService.logStatusChange(
            originalDoc.projectId,
            'document',
            documentId,
            originalDoc.name,
            originalDoc.status,
            updates.status,
          )
        }

        // Log other significant changes
        const significantFields = ['name', 'category', 'description']
        const significantChanges = Object.keys(updates).filter(
          (key) => significantFields.includes(key) && updates[key] !== originalDoc[key],
        )

        if (significantChanges.length > 0) {
          await ActivityService.logEntityUpdated(
            originalDoc.projectId,
            'document',
            documentId,
            originalDoc.name,
            Object.fromEntries(significantChanges.map((key) => [key, updates[key]])),
          )
        }
      }

      return result
    } catch (error) {
      console.error('Error updating document:', error)
      throw error
    }
  }

  /**
   * Update document status with comments and reviewer info
   */
  async updateDocumentStatus(documentId, status, comments = '', reviewedBy = null) {
    try {
      const updates = {
        status: status,
        reviewedAt: new Date().toISOString(),
        reviewedBy: reviewedBy || firebaseCore.getCurrentUserId(),
        reviewedByName: firebaseCore.getCurrentUserName(),
        reviewComments: comments,
      }

      if (status === 'approved') {
        updates.approvedAt = new Date().toISOString()
        updates.approvedBy = updates.reviewedBy
        updates.approvedByName = updates.reviewedByName
      }

      const result = await this.update(documentId, updates, DOCUMENT_SCHEMA)

      // Log status change activity
      const doc = await this.getById(documentId)
      if (doc && doc.projectId) {
        const statusAction =
          status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'reviewed'
        await ActivityService.logActivity(
          doc.projectId,
          `document_${statusAction}`,
          'document',
          documentId,
          `${statusAction.charAt(0).toUpperCase() + statusAction.slice(1)} document: ${doc.name}`,
          { comments, reviewedBy: updates.reviewedByName },
        )
      }

      return result
    } catch (error) {
      console.error('Error updating document status:', error)
      throw error
    }
  }

  /**
   * Delete document
   */
  async deleteDocument(documentId) {
    try {
      const doc = await this.getById(documentId)
      if (!doc) {
        throw new Error('Document not found')
      }

      await this.delete(documentId)

      // Log activity (only if document has projectId)
      if (doc.projectId) {
        await ActivityService.logEntityDeleted(doc.projectId, 'document', documentId, doc.name)
      }

      return { success: true, id: documentId }
    } catch (error) {
      console.error('Error deleting document:', error)
      throw error
    }
  }

  // ==================== DOCUMENT VERSIONING ====================

  /**
   * Get document version history
   */
  async getDocumentVersionHistory(documentId) {
    try {
      const doc = await this.getById(documentId)
      if (!doc) return []

      const versions = [
        {
          version: doc.version,
          googleDriveFileId: doc.googleDriveFileId,
          uploadedAt: doc.uploadedAt || doc.updatedAt,
          uploadedBy: doc.uploadedBy || doc.updatedBy,
          uploadedByName: doc.uploadedByName || doc.updatedByName,
          isCurrent: true,
        },
        ...(doc.previousVersions || []),
      ]

      return versions.sort((a, b) => b.version - a.version)
    } catch (error) {
      console.error('Error getting document version history:', error)
      throw error
    }
  }

  /**
   * Update document to new version
   */
  async updateDocumentVersion(documentId, newFileData, updateData = {}) {
    try {
      const currentDoc = await this.getById(documentId)
      if (!currentDoc) {
        throw new Error('Document not found')
      }

      // Create new version data
      const newVersionData = {
        ...updateData,
        version: (currentDoc.version || 1) + 1,
        previousVersions: [
          ...(currentDoc.previousVersions || []),
          {
            version: currentDoc.version || 1,
            googleDriveFileId: currentDoc.googleDriveFileId,
            uploadedAt: currentDoc.uploadedAt,
            uploadedBy: currentDoc.uploadedBy,
            uploadedByName: currentDoc.uploadedByName,
          },
        ],
        // New file data
        googleDriveFileId: newFileData.googleDriveFileId,
        googleDriveLink: newFileData.googleDriveLink,
        fileSize: newFileData.fileSize,
        mimeType: newFileData.mimeType,
        uploadedAt: new Date().toISOString(),
        uploadedBy: firebaseCore.getCurrentUserId(),
        uploadedByName: firebaseCore.getCurrentUserName(),
      }

      const result = await this.update(documentId, newVersionData, DOCUMENT_SCHEMA)

      // Log activity (only if document has projectId)
      if (currentDoc.projectId) {
        await ActivityService.logActivity(
          currentDoc.projectId,
          'updated_document_version',
          'document',
          documentId,
          `Updated ${currentDoc.name} to version ${newVersionData.version}`,
          { oldVersion: currentDoc.version, newVersion: newVersionData.version },
        )
      }

      return { id: documentId, ...currentDoc, ...result }
    } catch (error) {
      console.error('Error updating document version:', error)
      throw error
    }
  }

  // ==================== DOCUMENT STATISTICS ====================

  /**
   * Get document statistics for a project
   */
  async getDocumentStatistics(projectId) {
    try {
      const documents = projectId
        ? await this.getDocumentsByProject(projectId)
        : await this.getAll()

      const stats = {
        total: documents.length,
        totalSize: documents.reduce((sum, doc) => sum + (doc.fileSize || 0), 0),
        byCategory: {},
        byStatus: {},
        byUploader: {},
        byFileType: {},
        bySizeCategory: {
          small: 0, // < 1MB
          medium: 0, // 1MB - 10MB
          large: 0, // 10MB - 100MB
          extraLarge: 0, // > 100MB
        },
        averageFileSize: 0,
        recentUploads: 0, // Last 7 days
        versionCounts: {
          latestVersions: 0,
          totalVersions: 0,
        },
      }

      // Calculate category distribution
      documents.forEach((doc) => {
        const category = doc.category || 'uncategorized'
        stats.byCategory[category] = (stats.byCategory[category] || 0) + 1
      })

      // Calculate status distribution
      documents.forEach((doc) => {
        const status = doc.status || 'unknown'
        stats.byStatus[status] = (stats.byStatus[status] || 0) + 1
      })

      // Calculate uploader distribution
      documents.forEach((doc) => {
        const uploader = doc.uploadedByName || 'Unknown'
        stats.byUploader[uploader] = (stats.byUploader[uploader] || 0) + 1
      })

      // Calculate file type distribution
      documents.forEach((doc) => {
        const fileName = doc.name || doc.fileName || ''
        const extension = fileName.split('.').pop()?.toLowerCase() || 'unknown'
        stats.byFileType[extension] = (stats.byFileType[extension] || 0) + 1
      })

      // Calculate size categories
      documents.forEach((doc) => {
        const sizeInMB = (doc.fileSize || 0) / (1024 * 1024)
        if (sizeInMB < 1) {
          stats.bySizeCategory.small++
        } else if (sizeInMB <= 10) {
          stats.bySizeCategory.medium++
        } else if (sizeInMB <= 100) {
          stats.bySizeCategory.large++
        } else {
          stats.bySizeCategory.extraLarge++
        }
      })

      // Calculate average file size
      if (documents.length > 0) {
        stats.averageFileSize = stats.totalSize / documents.length
      }

      // Calculate recent uploads (last 7 days)
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      stats.recentUploads = documents.filter((doc) => {
        return doc.uploadedAt && new Date(doc.uploadedAt) > sevenDaysAgo
      }).length

      // Calculate version statistics
      stats.versionCounts.latestVersions = documents.length
      stats.versionCounts.totalVersions = documents.reduce((sum, doc) => {
        return sum + (doc.version || 1) + (doc.previousVersions?.length || 0)
      }, 0)

      return stats
    } catch (error) {
      console.error('Error getting document statistics:', error)
      return {
        total: 0,
        totalSize: 0,
        byCategory: {},
        byStatus: {},
        byUploader: {},
        byFileType: {},
        bySizeCategory: { small: 0, medium: 0, large: 0, extraLarge: 0 },
        averageFileSize: 0,
        recentUploads: 0,
        versionCounts: { latestVersions: 0, totalVersions: 0 },
      }
    }
  }

  // ==================== BULK OPERATIONS ====================

  /**
   * Bulk update document status
   */
  async bulkUpdateDocumentStatus(documentIds, status, comments = '') {
    try {
      const updates = {
        status,
        reviewedAt: new Date().toISOString(),
        reviewedBy: firebaseCore.getCurrentUserId(),
        reviewedByName: firebaseCore.getCurrentUserName(),
        reviewComments: comments,
      }

      if (status === 'approved') {
        updates.approvedAt = updates.reviewedAt
        updates.approvedBy = updates.reviewedBy
        updates.approvedByName = updates.reviewedByName
      }

      const results = await this.bulkUpdate(documentIds, updates)

      // Log bulk activity
      await ActivityService.logBulkActivity(
        'bulk_updated_document_status',
        'document',
        documentIds,
        `Bulk updated ${documentIds.length} documents to ${status} status`,
        { newStatus: status, comments },
      )

      return results
    } catch (error) {
      console.error('Error in bulk update document status:', error)
      throw error
    }
  }

  /**
   * Bulk categorize documents
   */
  async bulkCategorizeDocuments(documentIds, category) {
    try {
      const updates = { category }
      const results = await this.bulkUpdate(documentIds, updates)

      await ActivityService.logBulkActivity(
        'bulk_categorized_documents',
        'document',
        documentIds,
        `Bulk categorized ${documentIds.length} documents as ${category}`,
        { category },
      )

      return results
    } catch (error) {
      console.error('Error in bulk categorize documents:', error)
      throw error
    }
  }

  // ==================== REAL-TIME SUBSCRIPTIONS ====================

  /**
   * Subscribe to documents by project
   */
  subscribeToDocumentsByProject(projectId, callback) {
    try {
      const documentsRef = ref(firebaseCore.database, this.collectionName)
      const projectDocsQuery = query(documentsRef, orderByChild('projectId'), equalTo(projectId))

      onValue(projectDocsQuery, (snapshot) => {
        const documents = snapshot.exists()
          ? Object.entries(snapshot.val()).map(([id, data]) => ({ id, ...data }))
          : []

        // Sort by upload date (newest first)
        documents.sort(
          (a, b) => new Date(b.uploadedAt || b.createdAt) - new Date(a.uploadedAt || a.createdAt),
        )

        callback(documents)
      })

      return projectDocsQuery
    } catch (error) {
      console.error('Error subscribing to documents by project:', error)
      throw error
    }
  }

  /**
   * Subscribe to all documents
   */
  subscribeToDocuments(callback) {
    const sortByUploadDate = (a, b) => {
      return new Date(b.uploadedAt || b.createdAt) - new Date(a.uploadedAt || a.createdAt)
    }

    return this.subscribeToAll(callback, sortByUploadDate)
  }

  /**
   * Subscribe to pending documents
   */
  subscribeToDocumentsByStatus(status, callback) {
    const filterByStatus = (documents) => {
      const filtered = documents.filter((doc) => doc.status === status)
      callback(filtered)
    }

    return this.subscribeToAll(filterByStatus)
  }

  // ==================== HELPER METHODS ====================

  /**
   * Sort documents by various criteria
   */
  sortDocuments(documents, sortBy = 'uploadedAt', direction = 'desc') {
    return documents.sort((a, b) => {
      let aVal, bVal

      switch (sortBy) {
        case 'name':
          aVal = (a.name || '').toLowerCase()
          bVal = (b.name || '').toLowerCase()
          break

        case 'uploadedAt':
        case 'createdAt':
        case 'reviewedAt':
        case 'approvedAt':
          aVal = a[sortBy] ? new Date(a[sortBy]) : new Date(0)
          bVal = b[sortBy] ? new Date(b[sortBy]) : new Date(0)
          break

        case 'fileSize':
          aVal = a.fileSize || 0
          bVal = b.fileSize || 0
          break

        case 'version':
          aVal = a.version || 1
          bVal = b.version || 1
          break

        default:
          aVal = a[sortBy] || ''
          bVal = b[sortBy] || ''
      }

      if (direction === 'desc') {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0
      }
      return aVal > bVal ? 1 : aVal < bVal ? -1 : 0
    })
  }

  /**
   * Validate document-specific data
   */
  validateDocumentData(documentData) {
    const validation = super.validateData(documentData, ['name'])

    // Add document-specific validations
    if (documentData.fileSize && documentData.fileSize < 0) {
      validation.errors.fileSize = 'File size cannot be negative'
      validation.isValid = false
    }

    if (documentData.version && documentData.version < 1) {
      validation.errors.version = 'Version must be at least 1'
      validation.isValid = false
    }

    if (
      documentData.status &&
      !['pending', 'approved', 'rejected', 'archived'].includes(documentData.status)
    ) {
      validation.errors.status = 'Invalid status. Must be: pending, approved, rejected, or archived'
      validation.isValid = false
    }

    return validation
  }

  /**
   * Get file type from document name or mime type
   */
  getFileType(document) {
    if (document.mimeType) {
      return document.mimeType.split('/')[1] || 'unknown'
    }

    const fileName = document.name || document.fileName || ''
    return fileName.split('.').pop()?.toLowerCase() || 'unknown'
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes) {
    if (!bytes) return '0 B'

    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))

    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i]
  }

  /**
   * Check if document needs review
   */
  needsReview(document) {
    return document.status === 'pending'
  }

  /**
   * Check if document is approved
   */
  isApproved(document) {
    return document.status === 'approved'
  }
}

export default new DocumentRepository()
