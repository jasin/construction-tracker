// src/services/firebase/repositories/SubmittalRepository.js
import BaseRepository from '@/services/firebase/core/BaseRepository'
import { CrudMixin } from '../mixins/CrudMixin'
import { RealtimeMixin } from '../mixins/RealtimeMixin'
import ActivityService from '@/services/logging/ActivityService'
import firebaseCore from '@/services/firebase/core/FirebaseCore'
import { ref, query, orderByChild, equalTo, onValue } from 'firebase/database'
import { SUBMITTAL_SCHEMA } from '../schemas'

/**
 * Submittal Repository - handles all submittal-related Firebase operations
 * Includes submittal management, review workflows, and approval tracking
 */
class SubmittalRepository extends CrudMixin(RealtimeMixin(BaseRepository)) {
  constructor() {
    super('submittals')
  }

  /**
   * Create a new submittal with validation and activity logging
   */
  async createSubmittal(submittalData) {
    try {
      const validation = this.validateData(submittalData, ['title', 'projectId'])
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${Object.values(validation.errors).join(', ')}`)
      }

      // Add submittal-specific defaults
      const submittalDataWithDefaults = {
        ...validation.cleanData,
        status: validation.cleanData.status || 'not_submitted',
        type: validation.cleanData.type || 'product_data',
        revisionNumber: validation.cleanData.revisionNumber || 1,
        submittedBy: firebaseCore.getCurrentUserId(),
        submittedByName: firebaseCore.getCurrentUserName(),
        submittedAt: new Date().toISOString(),
        attachments: validation.cleanData.attachments || [],
        attachmentCount: validation.cleanData.attachmentCount || 0,
        distributionList: validation.cleanData.distributionList || [],
      }

      const newSubmittal = await this.create(submittalDataWithDefaults, SUBMITTAL_SCHEMA)

      // Log activity
      await ActivityService.logEntityCreated(
        newSubmittal.projectId,
        'submittal',
        newSubmittal.id,
        newSubmittal.title,
      )

      return newSubmittal
    } catch (error) {
      console.error('Error creating submittal:', error)
      throw error
    }
  }

  /**
   * Get submittals by project with optional filtering
   */
  async getSubmittalsByProject(projectId, filters = {}) {
    try {
      let submittals = await this.getByField('projectId', projectId)

      // Apply filters
      if (filters.status && filters.status.length > 0) {
        submittals = submittals.filter((submittal) => filters.status.includes(submittal.status))
      }

      if (filters.type && filters.type.length > 0) {
        submittals = submittals.filter((submittal) => filters.type.includes(submittal.type))
      }

      if (filters.submittedBy) {
        submittals = submittals.filter((submittal) => submittal.submittedBy === filters.submittedBy)
      }

      if (filters.reviewedBy) {
        submittals = submittals.filter((submittal) => submittal.reviewedBy === filters.reviewedBy)
      }

      if (filters.specSection) {
        submittals = submittals.filter((submittal) =>
          submittal.specSection?.toLowerCase().includes(filters.specSection.toLowerCase()),
        )
      }

      if (filters.dueDateFrom) {
        submittals = submittals.filter(
          (submittal) =>
            submittal.requiredDate &&
            new Date(submittal.requiredDate) >= new Date(filters.dueDateFrom),
        )
      }

      if (filters.dueDateTo) {
        submittals = submittals.filter(
          (submittal) =>
            submittal.requiredDate &&
            new Date(submittal.requiredDate) <= new Date(filters.dueDateTo),
        )
      }

      if (filters.needsReview !== undefined) {
        submittals = submittals.filter((submittal) => {
          const needsReview = ['submitted', 'under_review'].includes(submittal.status)
          return filters.needsReview ? needsReview : !needsReview
        })
      }

      // Apply sorting
      submittals = this.sortSubmittals(
        submittals,
        filters.sortBy || 'requiredDate',
        filters.sortDirection || 'asc',
      )

      return submittals
    } catch (error) {
      console.error('Error getting submittals by project:', error)
      throw error
    }
  }

  /**
   * Get submittals by status
   */
  async getSubmittalsByStatus(status, projectId = null) {
    try {
      const submittals = projectId
        ? await this.getSubmittalsByProject(projectId)
        : await this.getAll()
      return submittals.filter((submittal) => submittal.status === status)
    } catch (error) {
      console.error('Error getting submittals by status:', error)
      throw error
    }
  }

  /**
   * Get submittals needing review
   */
  async getSubmittalsNeedingReview(projectId = null) {
    try {
      const submittals = projectId
        ? await this.getSubmittalsByProject(projectId)
        : await this.getAll()
      return submittals.filter((submittal) =>
        ['submitted', 'under_review'].includes(submittal.status),
      )
    } catch (error) {
      console.error('Error getting submittals needing review:', error)
      throw error
    }
  }

  /**
   * Get overdue submittals
   */
  async getOverdueSubmittals(projectId = null) {
    try {
      const submittals = projectId
        ? await this.getSubmittalsByProject(projectId)
        : await this.getAll()
      const now = new Date()

      return submittals
        .filter((submittal) => {
          return (
            submittal.requiredDate &&
            new Date(submittal.requiredDate) < now &&
            !['approved', 'approved_with_comments'].includes(submittal.status)
          )
        })
        .sort((a, b) => new Date(a.requiredDate) - new Date(b.requiredDate))
    } catch (error) {
      console.error('Error getting overdue submittals:', error)
      throw error
    }
  }

  /**
   * Get submittals by specification section
   */
  async getSubmittalsBySpecSection(specSection, projectId = null) {
    try {
      const submittals = projectId
        ? await this.getSubmittalsByProject(projectId)
        : await this.getAll()
      return submittals.filter(
        (submittal) => submittal.specSection?.toLowerCase() === specSection.toLowerCase(),
      )
    } catch (error) {
      console.error('Error getting submittals by spec section:', error)
      throw error
    }
  }

  /**
   * Search submittals
   */
  async searchSubmittals(searchTerm, projectId = null) {
    try {
      const submittals = projectId
        ? await this.getSubmittalsByProject(projectId)
        : await this.getAll()
      const term = searchTerm.toLowerCase().trim()

      return submittals.filter((submittal) => {
        return (
          submittal.title?.toLowerCase().includes(term) ||
          submittal.description?.toLowerCase().includes(term) ||
          submittal.specSection?.toLowerCase().includes(term) ||
          submittal.submittedByName?.toLowerCase().includes(term) ||
          submittal.reviewedByName?.toLowerCase().includes(term) ||
          submittal.reviewComments?.toLowerCase().includes(term)
        )
      })
    } catch (error) {
      console.error('Error searching submittals:', error)
      throw error
    }
  }

  /**
   * Update submittal with validation and activity logging
   */
  async updateSubmittal(submittalId, updates) {
    try {
      const originalSubmittal = await this.getById(submittalId)
      if (!originalSubmittal) {
        throw new Error('Submittal not found')
      }

      const result = await this.update(submittalId, updates, SUBMITTAL_SCHEMA)

      // Log significant updates
      if (updates.status && updates.status !== originalSubmittal.status) {
        await ActivityService.logStatusChange(
          originalSubmittal.projectId,
          'submittal',
          submittalId,
          originalSubmittal.title,
          originalSubmittal.status,
          updates.status,
        )
      }

      if (updates.reviewedBy && updates.reviewedBy !== originalSubmittal.reviewedBy) {
        await ActivityService.logActivity(
          originalSubmittal.projectId,
          'assigned_submittal_reviewer',
          'submittal',
          submittalId,
          `Assigned submittal "${originalSubmittal.title}" to ${updates.reviewedByName || 'reviewer'}`,
          {
            previousReviewer: originalSubmittal.reviewedBy,
            newReviewer: updates.reviewedBy,
          },
        )
      }

      return result
    } catch (error) {
      console.error('Error updating submittal:', error)
      throw error
    }
  }

  /**
   * Submit submittal for review
   */
  async submitForReview(submittalId, submittedBy = null) {
    try {
      const updates = {
        status: 'submitted',
        submittedAt: new Date().toISOString(),
        submittedBy: submittedBy || firebaseCore.getCurrentUserId(),
        submittedByName: firebaseCore.getCurrentUserName(),
      }

      const result = await this.update(submittalId, updates, SUBMITTAL_SCHEMA)

      // Log submission activity
      const submittal = await this.getById(submittalId)
      if (submittal && submittal.projectId) {
        await ActivityService.logActivity(
          submittal.projectId,
          'submitted_submittal',
          'submittal',
          submittalId,
          `Submitted submittal for review: ${submittal.title}`,
          { submittedBy: updates.submittedByName },
        )
      }

      return result
    } catch (error) {
      console.error('Error submitting submittal for review:', error)
      throw error
    }
  }

  /**
   * Review submittal
   */
  async reviewSubmittal(submittalId, status, comments = '', reviewedBy = null) {
    try {
      if (!['approved', 'approved_with_comments', 'rejected', 'resubmit'].includes(status)) {
        throw new Error('Invalid review status')
      }

      const updates = {
        status: status,
        reviewedAt: new Date().toISOString(),
        reviewedBy: reviewedBy || firebaseCore.getCurrentUserId(),
        reviewedByName: firebaseCore.getCurrentUserName(),
        reviewComments: comments,
      }

      const result = await this.update(submittalId, updates, SUBMITTAL_SCHEMA)

      // Log review activity
      const submittal = await this.getById(submittalId)
      if (submittal && submittal.projectId) {
        const statusAction = status.replace('_', ' ')
        await ActivityService.logActivity(
          submittal.projectId,
          `${status}_submittal`,
          'submittal',
          submittalId,
          `${statusAction.charAt(0).toUpperCase() + statusAction.slice(1)} submittal: ${submittal.title}`,
          {
            reviewedBy: updates.reviewedByName,
            comments,
            reviewStatus: status,
          },
        )
      }

      return result
    } catch (error) {
      console.error('Error reviewing submittal:', error)
      throw error
    }
  }

  /**
   * Create revision of existing submittal
   */
  async createRevision(originalSubmittalId, revisionData = {}) {
    try {
      const originalSubmittal = await this.getById(originalSubmittalId)
      if (!originalSubmittal) {
        throw new Error('Original submittal not found')
      }

      // Create new submittal based on original with incremented revision
      const newRevisionData = {
        ...originalSubmittal,
        ...revisionData,
        revisionNumber: (originalSubmittal.revisionNumber || 1) + 1,
        status: 'not_submitted',
        submittedAt: null,
        reviewedAt: null,
        reviewedBy: null,
        reviewedByName: null,
        reviewComments: null,
        originalSubmittalId: originalSubmittalId,
        parentRevision: originalSubmittal.revisionNumber || 1,
      }

      // Remove ID and timestamps to create new entry
      delete newRevisionData.id
      delete newRevisionData.createdAt
      delete newRevisionData.updatedAt

      const newRevision = await this.create(newRevisionData, SUBMITTAL_SCHEMA)

      // Log revision creation
      await ActivityService.logActivity(
        newRevision.projectId,
        'created_submittal_revision',
        'submittal',
        newRevision.id,
        `Created revision ${newRevision.revisionNumber} of submittal: ${originalSubmittal.title}`,
        {
          originalSubmittalId,
          originalRevision: originalSubmittal.revisionNumber,
          newRevision: newRevision.revisionNumber,
        },
      )

      return newRevision
    } catch (error) {
      console.error('Error creating submittal revision:', error)
      throw error
    }
  }

  /**
   * Get submittal revision history
   */
  async getSubmittalRevisions(originalSubmittalId) {
    try {
      const allSubmittals = await this.getAll()

      // Find all revisions of this submittal
      const revisions = allSubmittals.filter(
        (submittal) =>
          submittal.originalSubmittalId === originalSubmittalId ||
          submittal.id === originalSubmittalId,
      )

      return revisions.sort((a, b) => (b.revisionNumber || 1) - (a.revisionNumber || 1))
    } catch (error) {
      console.error('Error getting submittal revisions:', error)
      throw error
    }
  }

  /**
   * Delete submittal
   */
  async deleteSubmittal(submittalId) {
    try {
      const submittal = await this.getById(submittalId)
      if (!submittal) {
        throw new Error('Submittal not found')
      }

      await this.delete(submittalId)

      // Log activity
      if (submittal.projectId) {
        await ActivityService.logEntityDeleted(
          submittal.projectId,
          'submittal',
          submittalId,
          submittal.title,
        )
      }

      return { success: true, id: submittalId }
    } catch (error) {
      console.error('Error deleting submittal:', error)
      throw error
    }
  }

  // ==================== SUBMITTAL STATISTICS ====================

  /**
   * Get submittal statistics
   */
  async getSubmittalStatistics(projectId = null) {
    try {
      const submittals = projectId
        ? await this.getSubmittalsByProject(projectId)
        : await this.getAll()

      const now = new Date()

      const stats = {
        total: submittals.length,
        byStatus: {
          not_submitted: submittals.filter((s) => s.status === 'not_submitted').length,
          submitted: submittals.filter((s) => s.status === 'submitted').length,
          under_review: submittals.filter((s) => s.status === 'under_review').length,
          approved: submittals.filter((s) => s.status === 'approved').length,
          approved_with_comments: submittals.filter((s) => s.status === 'approved_with_comments')
            .length,
          rejected: submittals.filter((s) => s.status === 'rejected').length,
          resubmit: submittals.filter((s) => s.status === 'resubmit').length,
        },
        byType: {
          product_data: submittals.filter((s) => s.type === 'product_data').length,
          shop_drawings: submittals.filter((s) => s.type === 'shop_drawings').length,
          samples: submittals.filter((s) => s.type === 'samples').length,
          test_reports: submittals.filter((s) => s.type === 'test_reports').length,
          certificates: submittals.filter((s) => s.type === 'certificates').length,
        },
        overdue: submittals.filter(
          (submittal) =>
            submittal.requiredDate &&
            new Date(submittal.requiredDate) < now &&
            !['approved', 'approved_with_comments'].includes(submittal.status),
        ).length,
        needingReview: submittals.filter((s) => ['submitted', 'under_review'].includes(s.status))
          .length,
        averageReviewTime: 0,
        bySubmitter: {},
        byReviewer: {},
        bySpecSection: {},
        recentActivity: 0, // Last 7 days
        revisionCount: submittals.filter((s) => (s.revisionNumber || 1) > 1).length,
      }

      // Calculate review times
      const reviewedSubmittals = submittals.filter((s) => s.reviewedAt && s.submittedAt)
      if (reviewedSubmittals.length > 0) {
        const totalReviewTime = reviewedSubmittals.reduce((sum, submittal) => {
          const submitted = new Date(submittal.submittedAt)
          const reviewed = new Date(submittal.reviewedAt)
          return sum + (reviewed - submitted)
        }, 0)
        stats.averageReviewTime =
          totalReviewTime / reviewedSubmittals.length / (1000 * 60 * 60 * 24) // Days
      }

      // Count by submitter
      submittals.forEach((submittal) => {
        const submitter = submittal.submittedByName || 'Unknown'
        stats.bySubmitter[submitter] = (stats.bySubmitter[submitter] || 0) + 1
      })

      // Count by reviewer
      submittals.forEach((submittal) => {
        if (submittal.reviewedByName) {
          const reviewer = submittal.reviewedByName
          stats.byReviewer[reviewer] = (stats.byReviewer[reviewer] || 0) + 1
        }
      })

      // Count by spec section
      submittals.forEach((submittal) => {
        if (submittal.specSection) {
          const section = submittal.specSection
          stats.bySpecSection[section] = (stats.bySpecSection[section] || 0) + 1
        }
      })

      // Recent activity (last 7 days)
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      stats.recentActivity = submittals.filter(
        (submittal) => submittal.createdAt && new Date(submittal.createdAt) > sevenDaysAgo,
      ).length

      return stats
    } catch (error) {
      console.error('Error getting submittal statistics:', error)
      throw error
    }
  }

  // ==================== BULK OPERATIONS ====================

  /**
   * Bulk update submittal status
   */
  async bulkUpdateSubmittalStatus(submittalIds, status, comments = '') {
    try {
      const updates = {
        status,
        reviewedAt: new Date().toISOString(),
        reviewedBy: firebaseCore.getCurrentUserId(),
        reviewedByName: firebaseCore.getCurrentUserName(),
        reviewComments: comments,
      }

      const results = await this.bulkUpdate(submittalIds, updates)

      // Log bulk activity
      await ActivityService.logBulkActivity(
        'bulk_updated_submittal_status',
        'submittal',
        submittalIds,
        `Bulk updated ${submittalIds.length} submittals to ${status} status`,
        { newStatus: status, comments },
      )

      return results
    } catch (error) {
      console.error('Error in bulk update submittal status:', error)
      throw error
    }
  }

  /**
   * Bulk assign reviewer
   */
  async bulkAssignReviewer(submittalIds, reviewedBy, reviewedByName) {
    try {
      const updates = {
        reviewedBy,
        reviewedByName,
        assignedAt: new Date().toISOString(),
      }

      const results = await this.bulkUpdate(submittalIds, updates)

      // Log bulk assignment
      await ActivityService.logBulkActivity(
        'bulk_assigned_submittal_reviewer',
        'submittal',
        submittalIds,
        `Bulk assigned ${submittalIds.length} submittals to ${reviewedByName}`,
        { reviewedBy, reviewedByName },
      )

      return results
    } catch (error) {
      console.error('Error in bulk assign submittal reviewer:', error)
      throw error
    }
  }

  /**
   * Bulk approve submittals
   */
  async bulkApproveSubmittals(submittalIds, comments = '') {
    try {
      return await this.bulkUpdateSubmittalStatus(submittalIds, 'approved', comments)
    } catch (error) {
      console.error('Error in bulk approve submittals:', error)
      throw error
    }
  }

  // ==================== REAL-TIME SUBSCRIPTIONS ====================

  /**
   * Subscribe to submittals by project
   */
  subscribeToSubmittalsByProject(projectId, callback) {
    try {
      const submittalsRef = ref(firebaseCore.database, this.collectionName)
      const projectSubmittalsQuery = query(
        submittalsRef,
        orderByChild('projectId'),
        equalTo(projectId),
      )

      onValue(projectSubmittalsQuery, (snapshot) => {
        const submittals = snapshot.exists()
          ? Object.entries(snapshot.val()).map(([id, data]) => ({ id, ...data }))
          : []

        // Sort by required date and status
        const sortedSubmittals = this.sortSubmittals(submittals, 'requiredDate', 'asc')
        callback(sortedSubmittals)
      })

      return projectSubmittalsQuery
    } catch (error) {
      console.error('Error subscribing to submittals by project:', error)
      throw error
    }
  }

  /**
   * Subscribe to all submittals
   */
  subscribeToSubmittals(callback) {
    const sortByStatusAndDate = (a, b) => {
      // First sort by status priority (items needing attention first)
      const statusOrder = {
        submitted: 0,
        under_review: 1,
        resubmit: 2,
        not_submitted: 3,
        approved_with_comments: 4,
        approved: 5,
        rejected: 6,
      }
      const aStatusOrder = statusOrder[a.status] ?? 3
      const bStatusOrder = statusOrder[b.status] ?? 3

      if (aStatusOrder !== bStatusOrder) {
        return aStatusOrder - bStatusOrder
      }

      // Then by required date (soonest first)
      if (a.requiredDate && !b.requiredDate) return -1
      if (!a.requiredDate && b.requiredDate) return 1
      if (a.requiredDate && b.requiredDate) {
        return new Date(a.requiredDate) - new Date(b.requiredDate)
      }

      return 0
    }

    return this.subscribeToAll(callback, sortByStatusAndDate)
  }

  /**
   * Subscribe to submittals by status
   */
  subscribeToSubmittalsByStatus(status, callback) {
    const filterByStatus = (submittals) => {
      const filtered = submittals.filter((submittal) => submittal.status === status)
      callback(filtered)
    }

    return this.subscribeToAll(filterByStatus)
  }

  // ==================== HELPER METHODS ====================

  /**
   * Sort submittals by various criteria
   */
  sortSubmittals(submittals, sortBy = 'requiredDate', direction = 'asc') {
    return submittals.sort((a, b) => {
      let aVal, bVal

      switch (sortBy) {
        case 'title':
        case 'specSection':
          aVal = (a[sortBy] || '').toLowerCase()
          bVal = (b[sortBy] || '').toLowerCase()
          break

        case 'status': {
          const statusOrder = {
            not_submitted: 0,
            submitted: 1,
            under_review: 2,
            approved: 3,
            approved_with_comments: 4,
            rejected: 5,
            resubmit: 6,
          }
          aVal = statusOrder[a.status] ?? 3
          bVal = statusOrder[b.status] ?? 3
          break
        }

        case 'type': {
          const typeOrder = {
            product_data: 0,
            shop_drawings: 1,
            samples: 2,
            test_reports: 3,
            certificates: 4,
          }
          aVal = typeOrder[a.type] ?? 0
          bVal = typeOrder[b.type] ?? 0
          break
        }

        case 'revisionNumber':
          aVal = a.revisionNumber || 1
          bVal = b.revisionNumber || 1
          break

        case 'requiredDate':
        case 'submittedAt':
        case 'reviewedAt':
        case 'createdAt':
          aVal = a[sortBy]
            ? new Date(a[sortBy])
            : new Date(direction === 'asc' ? '2099-12-31' : '1900-01-01')
          bVal = b[sortBy]
            ? new Date(b[sortBy])
            : new Date(direction === 'asc' ? '2099-12-31' : '1900-01-01')
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
   * Validate submittal-specific data
   */
  validateSubmittalData(submittalData) {
    const validation = super.validateData(submittalData, ['title', 'projectId'])

    // Add submittal-specific validations
    if (
      submittalData.type &&
      !['product_data', 'shop_drawings', 'samples', 'test_reports', 'certificates'].includes(
        submittalData.type,
      )
    ) {
      validation.errors.type =
        'Invalid type. Must be: product_data, shop_drawings, samples, test_reports, or certificates'
      validation.isValid = false
    }

    if (
      submittalData.status &&
      ![
        'not_submitted',
        'submitted',
        'under_review',
        'approved',
        'approved_with_comments',
        'rejected',
        'resubmit',
      ].includes(submittalData.status)
    ) {
      validation.errors.status =
        'Invalid status. Must be: not_submitted, submitted, under_review, approved, approved_with_comments, rejected, or resubmit'
      validation.isValid = false
    }

    if (
      submittalData.revisionNumber &&
      (submittalData.revisionNumber < 1 || !Number.isInteger(submittalData.revisionNumber))
    ) {
      validation.errors.revisionNumber = 'Revision number must be a positive integer'
      validation.isValid = false
    }

    if (submittalData.requiredDate && new Date(submittalData.requiredDate) < new Date()) {
      validation.errors.requiredDate = 'Required date cannot be in the past'
      validation.isValid = false
    }

    return validation
  }

  /**
   * Check if submittal is overdue
   */
  isSubmittalOverdue(submittal) {
    if (
      !submittal.requiredDate ||
      ['approved', 'approved_with_comments'].includes(submittal.status)
    ) {
      return false
    }
    return new Date(submittal.requiredDate) < new Date()
  }

  /**
   * Get days until required date
   */
  getDaysUntilRequired(submittal) {
    if (!submittal.requiredDate) return null

    const requiredDate = new Date(submittal.requiredDate)
    const today = new Date()
    const diffTime = requiredDate - today
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  /**
   * Generate next submittal number for project
   */
  async generateSubmittalNumber(projectId) {
    try {
      const projectSubmittals = await this.getSubmittalsByProject(projectId)
      const nextNumber = projectSubmittals.length + 1
      return `SUB-${projectId.slice(-4)}-${nextNumber.toString().padStart(3, '0')}`
    } catch (error) {
      console.error('Error generating submittal number:', error)
      return `SUB-${Date.now()}`
    }
  }

  /**
   * Get submittal workflow status
   */
  getWorkflowStatus(submittal) {
    const status = {
      isSubmitted: [
        'submitted',
        'under_review',
        'approved',
        'approved_with_comments',
        'rejected',
      ].includes(submittal.status),
      isUnderReview: submittal.status === 'under_review',
      isApproved: ['approved', 'approved_with_comments'].includes(submittal.status),
      isRejected: submittal.status === 'rejected',
      needsResubmission: submittal.status === 'resubmit',
      isOverdue: this.isSubmittalOverdue(submittal),
      hasComments: submittal.reviewComments && submittal.reviewComments.trim().length > 0,
      currentRevision: submittal.revisionNumber || 1,
      canSubmit: submittal.status === 'not_submitted' || submittal.status === 'resubmit',
    }

    return status
  }

  /**
   * Get submittal summary for project dashboard
   */
  async getSubmittalSummary(projectId) {
    try {
      const submittals = await this.getSubmittalsByProject(projectId)

      const summary = {
        total: submittals.length,
        submitted: submittals.filter((s) => s.status === 'submitted').length,
        underReview: submittals.filter((s) => s.status === 'under_review').length,
        approved: submittals.filter((s) =>
          ['approved', 'approved_with_comments'].includes(s.status),
        ).length,
        rejected: submittals.filter((s) => s.status === 'rejected').length,
        overdue: submittals.filter((s) => this.isSubmittalOverdue(s)).length,
        needingAction: submittals.filter((s) =>
          ['submitted', 'under_review', 'resubmit'].includes(s.status),
        ).length,
        completionRate: 0,
      }

      if (summary.total > 0) {
        summary.completionRate = Math.round((summary.approved / summary.total) * 100)
      }

      return summary
    } catch (error) {
      console.error('Error getting submittal summary:', error)
      throw error
    }
  }
}

export default new SubmittalRepository()
