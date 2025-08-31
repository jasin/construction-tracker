// src/services/firebase/repositories/RFIRepository.js
import BaseRepository from '@/services/firebase/core/BaseRepository'
import ActivityService from '@/services/logging/ActivityService'
import firebaseCore from '@/services/firebase/core/FirebaseCore'
import { ref, query, orderByChild, equalTo, onValue } from 'firebase/database'
import { RFI_SCHEMA } from '../schemas'

/**
 * RFI Repository - handles all RFI-related Firebase operations
 * Includes RFI management, response workflows, and priority tracking
 */
class RFIRepository extends BaseRepository {
  constructor() {
    super('rfis', 'RFI', RFI_SCHEMA)
  }

  /**
   * Create a new RFI with validation and activity logging
   */
  async createRFI(rfiData) {
    try {
      const validation = this.validateData(rfiData, ['title', 'projectId'])
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${Object.values(validation.errors).join(', ')}`)
      }

      // Add RFI-specific defaults
      const rfiDataWithDefaults = {
        ...validation.cleanData,
        status: validation.cleanData.status || 'draft',
        priority: validation.cleanData.priority || 'medium',
        submittedBy: firebaseCore.getCurrentUserId(),
        submittedByName: firebaseCore.getCurrentUserName(),
        submittedAt: new Date().toISOString(),
        responseRequired: validation.cleanData.responseRequired !== false,
        attachments: validation.cleanData.attachments || [],
        attachmentCount: validation.cleanData.attachmentCount || 0,
      }

      const newRFI = await this.create(rfiDataWithDefaults, RFI_SCHEMA)

      // Log activity
      await ActivityService.logEntityCreated(
        newRFI.projectId,
        'rfi',
        newRFI.id,
        newRFI.title
      )

      return newRFI
    } catch (error) {
      console.error('Error creating RFI:', error)
      throw error
    }
  }

  /**
   * Get RFIs by project with optional filtering
   */
  async getRFIsByProject(projectId, filters = {}) {
    try {
      let rfis = await this.getByField('projectId', projectId)

      // Apply filters
      if (filters.status && filters.status.length > 0) {
        rfis = rfis.filter(rfi => filters.status.includes(rfi.status))
      }

      if (filters.priority && filters.priority.length > 0) {
        rfis = rfis.filter(rfi => filters.priority.includes(rfi.priority))
      }

      if (filters.assignedTo) {
        rfis = rfis.filter(rfi => rfi.assignedTo === filters.assignedTo)
      }

      if (filters.submittedBy) {
        rfis = rfis.filter(rfi => rfi.submittedBy === filters.submittedBy)
      }

      if (filters.dueDateFrom) {
        rfis = rfis.filter(rfi =>
          rfi.dueDate && new Date(rfi.dueDate) >= new Date(filters.dueDateFrom)
        )
      }

      if (filters.dueDateTo) {
        rfis = rfis.filter(rfi =>
          rfi.dueDate && new Date(rfi.dueDate) <= new Date(filters.dueDateTo)
        )
      }

      // Apply sorting
      rfis = this.sortRFIs(rfis, filters.sortBy || 'priority', filters.sortDirection || 'asc')

      return rfis
    } catch (error) {
      console.error('Error getting RFIs by project:', error)
      throw error
    }
  }

  /**
   * Get RFIs by status
   */
  async getRFIsByStatus(status, projectId = null) {
    try {
      let rfis = projectId ? await this.getRFIsByProject(projectId) : await this.getAll()
      return rfis.filter(rfi => rfi.status === status)
    } catch (error) {
      console.error('Error getting RFIs by status:', error)
      throw error
    }
  }

  /**
   * Get overdue RFIs
   */
  async getOverdueRFIs(projectId = null) {
    try {
      let rfis = projectId ? await this.getRFIsByProject(projectId) : await this.getAll()
      const now = new Date()

      return rfis
        .filter(rfi => {
          return (
            rfi.dueDate &&
            new Date(rfi.dueDate) < now &&
            !['responded', 'closed'].includes(rfi.status)
          )
        })
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    } catch (error) {
      console.error('Error getting overdue RFIs:', error)
      throw error
    }
  }

  /**
   * Get RFIs needing response
   */
  async getRFIsNeedingResponse(projectId = null) {
    try {
      let rfis = projectId ? await this.getRFIsByProject(projectId) : await this.getAll()
      return rfis.filter(rfi => rfi.status === 'submitted' && rfi.responseRequired)
    } catch (error) {
      console.error('Error getting RFIs needing response:', error)
      throw error
    }
  }

  /**
   * Search RFIs
   */
  async searchRFIs(searchTerm, projectId = null) {
    try {
      let rfis = projectId ? await this.getRFIsByProject(projectId) : await this.getAll()
      const term = searchTerm.toLowerCase().trim()

      return rfis.filter(rfi => {
        return (
          rfi.title?.toLowerCase().includes(term) ||
          rfi.description?.toLowerCase().includes(term) ||
          rfi.submittedByName?.toLowerCase().includes(term) ||
          rfi.assignedToName?.toLowerCase().includes(term) ||
          rfi.response?.toLowerCase().includes(term)
        )
      })
    } catch (error) {
      console.error('Error searching RFIs:', error)
      throw error
    }
  }

  /**
   * Update RFI with validation and activity logging
   */
  async updateRFI(rfiId, updates) {
    try {
      const originalRFI = await this.getById(rfiId)
      if (!originalRFI) {
        throw new Error('RFI not found')
      }

      const result = await this.update(rfiId, updates, RFI_SCHEMA)

      // Log significant updates
      if (updates.status && updates.status !== originalRFI.status) {
        await ActivityService.logStatusChange(
          originalRFI.projectId,
          'rfi',
          rfiId,
          originalRFI.title,
          originalRFI.status,
          updates.status
        )
      }

      if (updates.assignedTo && updates.assignedTo !== originalRFI.assignedTo) {
        await ActivityService.logActivity(
          originalRFI.projectId,
          'assigned_rfi',
          'rfi',
          rfiId,
          `Assigned RFI "${originalRFI.title}" to ${updates.assignedToName || 'user'}`,
          {
            previousAssignee: originalRFI.assignedTo,
            newAssignee: updates.assignedTo
          }
        )
      }

      if (updates.priority && updates.priority !== originalRFI.priority) {
        await ActivityService.logActivity(
          originalRFI.projectId,
          'updated_rfi_priority',
          'rfi',
          rfiId,
          `Changed RFI "${originalRFI.title}" priority from ${originalRFI.priority} to ${updates.priority}`,
          {
            oldPriority: originalRFI.priority,
            newPriority: updates.priority
          }
        )
      }

      return result
    } catch (error) {
      console.error('Error updating RFI:', error)
      throw error
    }
  }

  /**
   * Add response to RFI
   */
  async addRFIResponse(rfiId, response, respondedBy = null) {
    try {
      const updates = {
        response: response,
        respondedAt: new Date().toISOString(),
        respondedBy: respondedBy || firebaseCore.getCurrentUserId(),
        respondedByName: firebaseCore.getCurrentUserName(),
        status: 'responded'
      }

      const result = await this.update(rfiId, updates, RFI_SCHEMA)

      // Log response activity
      const rfi = await this.getById(rfiId)
      if (rfi && rfi.projectId) {
        await ActivityService.logActivity(
          rfi.projectId,
          'responded_to_rfi',
          'rfi',
          rfiId,
          `Responded to RFI: ${rfi.title}`,
          { respondedBy: updates.respondedByName }
        )
      }

      return result
    } catch (error) {
      console.error('Error adding RFI response:', error)
      throw error
    }
  }

  /**
   * Close RFI
   */
  async closeRFI(rfiId, closeNotes = '') {
    try {
      const updates = {
        status: 'closed',
        closedAt: new Date().toISOString(),
        closedBy: firebaseCore.getCurrentUserId(),
        closedByName: firebaseCore.getCurrentUserName(),
        closeNotes: closeNotes
      }

      const result = await this.update(rfiId, updates, RFI_SCHEMA)

      // Log closure activity
      const rfi = await this.getById(rfiId)
      if (rfi && rfi.projectId) {
        await ActivityService.logActivity(
          rfi.projectId,
          'closed_rfi',
          'rfi',
          rfiId,
          `Closed RFI: ${rfi.title}`,
          { closedBy: updates.closedByName, closeNotes }
        )
      }

      return result
    } catch (error) {
      console.error('Error closing RFI:', error)
      throw error
    }
  }

  /**
   * Delete RFI
   */
  async deleteRFI(rfiId) {
    try {
      const rfi = await this.getById(rfiId)
      if (!rfi) {
        throw new Error('RFI not found')
      }

      await this.delete(rfiId)

      // Log activity
      if (rfi.projectId) {
        await ActivityService.logEntityDeleted(
          rfi.projectId,
          'rfi',
          rfiId,
          rfi.title
        )
      }

      return { success: true, id: rfiId }
    } catch (error) {
      console.error('Error deleting RFI:', error)
      throw error
    }
  }

  // ==================== RFI STATISTICS ====================

  /**
   * Get RFI statistics
   */
  async getRFIStatistics(projectId = null) {
    try {
      let rfis = projectId ? await this.getRFIsByProject(projectId) : await this.getAll()

      const now = new Date()

      const stats = {
        total: rfis.length,
        byStatus: {
          draft: rfis.filter(r => r.status === 'draft').length,
          submitted: rfis.filter(r => r.status === 'submitted').length,
          'under_review': rfis.filter(r => r.status === 'under_review').length,
          responded: rfis.filter(r => r.status === 'responded').length,
          closed: rfis.filter(r => r.status === 'closed').length
        },
        byPriority: {
          low: rfis.filter(r => r.priority === 'low').length,
          medium: rfis.filter(r => r.priority === 'medium').length,
          high: rfis.filter(r => r.priority === 'high').length,
          urgent: rfis.filter(r => r.priority === 'urgent').length
        },
        overdue: rfis.filter(rfi =>
          rfi.dueDate &&
          new Date(rfi.dueDate) < now &&
          !['responded', 'closed'].includes(rfi.status)
        ).length,
        needingResponse: rfis.filter(r =>
          r.status === 'submitted' && r.responseRequired
        ).length,
        averageResponseTime: 0,
        bySubmitter: {},
        byAssignee: {},
        recentActivity: 0 // Last 7 days
      }

      // Calculate response times
      const respondedRFIs = rfis.filter(r => r.respondedAt && r.submittedAt)
      if (respondedRFIs.length > 0) {
        const totalResponseTime = respondedRFIs.reduce((sum, rfi) => {
          const submitted = new Date(rfi.submittedAt)
          const responded = new Date(rfi.respondedAt)
          return sum + (responded - submitted)
        }, 0)
        stats.averageResponseTime = totalResponseTime / respondedRFIs.length / (1000 * 60 * 60 * 24) // Days
      }

      // Count by submitter
      rfis.forEach(rfi => {
        const submitter = rfi.submittedByName || 'Unknown'
        stats.bySubmitter[submitter] = (stats.bySubmitter[submitter] || 0) + 1
      })

      // Count by assignee
      rfis.forEach(rfi => {
        if (rfi.assignedToName) {
          const assignee = rfi.assignedToName
          stats.byAssignee[assignee] = (stats.byAssignee[assignee] || 0) + 1
        }
      })

      // Recent activity (last 7 days)
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      stats.recentActivity = rfis.filter(rfi =>
        rfi.createdAt && new Date(rfi.createdAt) > sevenDaysAgo
      ).length

      return stats
    } catch (error) {
      console.error('Error getting RFI statistics:', error)
      throw error
    }
  }

  // ==================== BULK OPERATIONS ====================

  /**
   * Bulk update RFI status
   */
  async bulkUpdateRFIStatus(rfiIds, status) {
    try {
      const updates = {
        status,
        ...(status === 'closed' && {
          closedAt: new Date().toISOString(),
          closedBy: firebaseCore.getCurrentUserId(),
          closedByName: firebaseCore.getCurrentUserName()
        })
      }

      const results = await this.bulkUpdate(rfiIds, updates)

      // Log bulk activity
      await ActivityService.logBulkActivity(
        'bulk_updated_rfi_status',
        'rfi',
        rfiIds,
        `Bulk updated ${rfiIds.length} RFIs to ${status} status`,
        { newStatus: status }
      )

      return results
    } catch (error) {
      console.error('Error in bulk update RFI status:', error)
      throw error
    }
  }

  /**
   * Bulk assign RFIs
   */
  async bulkAssignRFIs(rfiIds, assignedTo, assignedToName) {
    try {
      const updates = {
        assignedTo,
        assignedToName,
        assignedAt: new Date().toISOString()
      }

      const results = await this.bulkUpdate(rfiIds, updates)

      // Log bulk assignment
      await ActivityService.logBulkActivity(
        'bulk_assigned_rfis',
        'rfi',
        rfiIds,
        `Bulk assigned ${rfiIds.length} RFIs to ${assignedToName}`,
        { assignedTo, assignedToName }
      )

      return results
    } catch (error) {
      console.error('Error in bulk assign RFIs:', error)
      throw error
    }
  }

  // ==================== REAL-TIME SUBSCRIPTIONS ====================

  /**
   * Subscribe to RFIs by project
   */
  subscribeToRFIsByProject(projectId, callback) {
    try {
      const rfisRef = ref(firebaseCore.database, this.collectionName)
      const projectRFIsQuery = query(rfisRef, orderByChild('projectId'), equalTo(projectId))

      onValue(projectRFIsQuery, (snapshot) => {
        const rfis = snapshot.exists()
          ? Object.entries(snapshot.val()).map(([id, data]) => ({ id, ...data }))
          : []

        // Sort by priority and due date
        const sortedRFIs = this.sortRFIs(rfis, 'priority', 'asc')
        callback(sortedRFIs)
      })

      return projectRFIsQuery
    } catch (error) {
      console.error('Error subscribing to RFIs by project:', error)
      throw error
    }
  }

  /**
   * Subscribe to all RFIs
   */
  subscribeToRFIs(callback) {
    const sortByPriorityAndDueDate = (a, b) => {
      // First sort by status (open RFIs first)
      const statusOrder = { draft: 0, submitted: 1, under_review: 2, responded: 3, closed: 4 }
      const aStatusOrder = statusOrder[a.status] ?? 2
      const bStatusOrder = statusOrder[b.status] ?? 2

      if (aStatusOrder !== bStatusOrder) {
        return aStatusOrder - bStatusOrder
      }

      // Then by priority
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
      const aPriority = priorityOrder[a.priority] ?? 2
      const bPriority = priorityOrder[b.priority] ?? 2

      if (aPriority !== bPriority) {
        return aPriority - bPriority
      }

      // Finally by due date
      if (a.dueDate && !b.dueDate) return -1
      if (!a.dueDate && b.dueDate) return 1
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate) - new Date(b.dueDate)
      }

      return 0
    }

    return this.subscribeToAll(callback, sortByPriorityAndDueDate)
  }

  /**
   * Subscribe to RFIs by status
   */
  subscribeToRFIsByStatus(status, callback) {
    const filterByStatus = (rfis) => {
      const filtered = rfis.filter(rfi => rfi.status === status)
      callback(filtered)
    }

    return this.subscribeToAll(filterByStatus)
  }

  // ==================== HELPER METHODS ====================

  /**
   * Sort RFIs by various criteria
   */
  sortRFIs(rfis, sortBy = 'priority', direction = 'asc') {
    return rfis.sort((a, b) => {
      let aVal, bVal

      switch (sortBy) {
        case 'title':
          aVal = (a.title || '').toLowerCase()
          bVal = (b.title || '').toLowerCase()
          break

        case 'priority': {
          const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
          aVal = priorityOrder[a.priority] ?? 2
          bVal = priorityOrder[b.priority] ?? 2
          break
        }

        case 'status': {
          const statusOrder = { draft: 0, submitted: 1, under_review: 2, responded: 3, closed: 4 }
          aVal = statusOrder[a.status] ?? 2
          bVal = statusOrder[b.status] ?? 2
          break
        }

        case 'dueDate':
          aVal = a.dueDate ? new Date(a.dueDate) : new Date('2099-12-31')
          bVal = b.dueDate ? new Date(b.dueDate) : new Date('2099-12-31')
          break

        case 'submittedAt':
        case 'respondedAt':
        case 'createdAt':
          aVal = a[sortBy] ? new Date(a[sortBy]) : new Date(0)
          bVal = b[sortBy] ? new Date(b[sortBy]) : new Date(0)
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
   * Validate RFI-specific data
   */
  validateRFIData(rfiData) {
    const validation = super.validateData(rfiData, ['title', 'projectId'])

    // Add RFI-specific validations
    if (rfiData.priority && !['low', 'medium', 'high', 'urgent'].includes(rfiData.priority)) {
      validation.errors.priority = 'Invalid priority. Must be: low, medium, high, or urgent'
      validation.isValid = false
    }

    if (rfiData.status && !['draft', 'submitted', 'under_review', 'responded', 'closed'].includes(rfiData.status)) {
      validation.errors.status = 'Invalid status. Must be: draft, submitted, under_review, responded, or closed'
      validation.isValid = false
    }

    if (rfiData.dueDate && new Date(rfiData.dueDate) < new Date()) {
      validation.errors.dueDate = 'Due date cannot be in the past'
      validation.isValid = false
    }

    return validation
  }

  /**
   * Check if RFI is overdue
   */
  isRFIOverdue(rfi) {
    if (!rfi.dueDate || ['responded', 'closed'].includes(rfi.status)) {
      return false
    }
    return new Date(rfi.dueDate) < new Date()
  }

  /**
   * Get days until due date
   */
  getDaysUntilDue(rfi) {
    if (!rfi.dueDate) return null

    const dueDate = new Date(rfi.dueDate)
    const today = new Date()
    const diffTime = dueDate - today
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  /**
   * Generate next RFI number for project
   */
  async generateRFINumber(projectId) {
    try {
      const projectRFIs = await this.getRFIsByProject(projectId)
      const nextNumber = projectRFIs.length + 1
      return `RFI-${projectId.slice(-4)}-${nextNumber.toString().padStart(3, '0')}`
    } catch (error) {
      console.error('Error generating RFI number:', error)
      return `RFI-${Date.now()}`
    }
  }
}

export default new RFIRepository()
