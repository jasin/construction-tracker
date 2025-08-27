// src/services/firebase/repositories/ProjectRepository.js
import BaseRepository from '../core/BaseRepository'
import ActivityService from '@/services/logging/ActivityService'
import firebaseCore from '../core/FirebaseCore'
import { ref, query, orderByChild, equalTo, onValue } from 'firebase/database'
import { PROJECT_SCHEMA } from '@/utils/index' // Assuming this exists in your utils

/**
 * Project Repository - handles all project-related Firebase operations
 * More complex than UserRepository due to relationships and business logic
 */
class ProjectRepository extends BaseRepository {
  constructor() {
    super('projects', 'Project', PROJECT_SCHEMA)
  }

  /**
   * Create a new project with validation and activity logging
   */
  async createProject(projectData) {
    try {
      const result = await this.createWithValidation(projectData, ['name', 'jobNumber'])

      // Use centralized logging service
      await ActivityService.logEntityCreated(result.id, 'project', result.id, result.name)

      return result
    } catch (error) {
      console.error('Error creating project:', error)
      throw error
    }
  }

  /**
   * Get all projects
   */
  async getAllProjects() {
    try {
      return await this.getAll()
    } catch (error) {
      console.error('Error getting all projects:', error)
      throw error
    }
  }

  /**
   * Get project by project ID
   */
  async getProject(projectId) {
    try {
      return await this.getById(projectId)
    } catch (error) {
      console.error('Error get project by projectId:', error)
      throw error
    }
  }

  /**
   * Get projects by client ID
   */
  async getProjectsByClient(clientId) {
    try {
      return await this.getByField('clientId', clientId)
    } catch (error) {
      console.error('Error getting projects by client:', error)
      throw error
    }
  }

  /**
   * Get projects by status
   */
  async getProjectsByStatus(status) {
    try {
      return await this.getByField('status', status)
    } catch (error) {
      console.error('Error getting projects by status:', error)
      throw error
    }
  }

  /**
   * Get active projects (not completed or cancelled)
   */
  async getActiveProjects() {
    try {
      const allProjects = await this.getAll()
      return allProjects.filter(
        (project) => !['completed', 'cancelled', 'on-hold'].includes(project.status),
      )
    } catch (error) {
      console.error('Error getting active projects:', error)
      throw error
    }
  }

  /**
   * Update project with enhanced validation and activity logging
   */
  async updateProject(projectId, updates) {
    try {
      const result = await this.updateWithValidation(projectId, updates)

      // Log significant updates using centralized service
      if (updates.phase) {
        await ActivityService.logActivity(
          projectId,
          'updated_project_phase',
          'project',
          projectId,
          `Updated project phase to: ${updates.phase}`,
          { oldPhase: result.previousPhase, newPhase: updates.phase },
        )
      }

      if (updates.status) {
        const project = await this.getById(projectId)
        await ActivityService.logStatusChange(
          projectId,
          'project',
          projectId,
          project?.name || 'Unknown Project',
          project?.status || 'unknown',
          updates.status,
        )
      }

      // Log general updates for other fields
      const significantFields = ['name', 'cost', 'endDate', 'clientId']
      const significantChanges = Object.keys(updates).filter(
        (key) => significantFields.includes(key) && !['phase', 'status'].includes(key),
      )

      if (significantChanges.length > 0) {
        const project = await this.getById(projectId)
        await ActivityService.logEntityUpdated(
          projectId,
          'project',
          projectId,
          project?.name || 'Unknown Project',
          Object.fromEntries(significantChanges.map((key) => [key, updates[key]])),
        )
      }

      return result
    } catch (error) {
      console.error('Error updating project:', error)
      throw error
    }
  }

  /**
   * Get project with all related entities (comprehensive project view)
   */
  async getProjectWithDetails(projectId) {
    try {
      const project = await this.getById(projectId)
      if (!project) return null

      // We'll need to import other repositories or use dependency injection
      // For now, we'll return the project and let the caller fetch related data
      return {
        ...project,
        _hasRelatedData: true, // Flag indicating this could be enhanced
      }
    } catch (error) {
      console.error('Error getting project with details:', error)
      throw error
    }
  }

  /**
   * Get project analytics/statistics
   */
  async getProjectStatistics() {
    try {
      const allProjects = await this.getAll()

      const stats = {
        total: allProjects.length,
        active: allProjects.filter((p) => !['completed', 'cancelled'].includes(p.status)).length,
        completed: allProjects.filter((p) => p.status === 'completed').length,
        overdue: allProjects.filter((p) => this.isProjectOverdue(p)).length,
        byStatus: {},
        byPhase: {},
        byClient: {},
        totalValue: 0,
        averageValue: 0,
        upcomingDeadlines: [],
      }

      // Calculate distributions and totals
      allProjects.forEach((project) => {
        // Status distribution
        const status = project.status || 'unknown'
        stats.byStatus[status] = (stats.byStatus[status] || 0) + 1

        // Phase distribution
        const phase = project.phase || 'unknown'
        stats.byPhase[phase] = (stats.byPhase[phase] || 0) + 1

        // Client distribution
        const clientName = project.clientName || project.clientId || 'unknown'
        stats.byClient[clientName] = (stats.byClient[clientName] || 0) + 1

        // Financial totals
        const value = parseFloat(project.cost || project.value || 0)
        stats.totalValue += value

        // Upcoming deadlines (next 30 days)
        if (project.endDate && this.isUpcomingDeadline(project.endDate)) {
          stats.upcomingDeadlines.push({
            id: project.id,
            name: project.name,
            endDate: project.endDate,
            daysUntilDue: this.getDaysUntilDate(project.endDate),
          })
        }
      })

      // Calculate averages
      stats.averageValue = stats.total > 0 ? stats.totalValue / stats.total : 0

      // Sort upcoming deadlines by due date
      stats.upcomingDeadlines.sort((a, b) => a.daysUntilDue - b.daysUntilDue)

      return stats
    } catch (error) {
      console.error('Error getting project statistics:', error)
      throw error
    }
  }

  /**
   * Search projects by name, job number, or client
   */
  async searchProjects(searchTerm) {
    try {
      const allProjects = await this.getAll()
      const term = searchTerm.toLowerCase().trim()

      return allProjects.filter((project) => {
        return (
          project.name?.toLowerCase().includes(term) ||
          project.jobNumber?.toLowerCase().includes(term) ||
          project.clientName?.toLowerCase().includes(term) ||
          project.description?.toLowerCase().includes(term)
        )
      })
    } catch (error) {
      console.error('Error searching projects:', error)
      throw error
    }
  }

  /**
   * Get projects with upcoming deadlines
   */
  async getProjectsWithUpcomingDeadlines(days = 30) {
    try {
      const allProjects = await this.getAll()
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() + days)

      return allProjects
        .filter((project) => {
          if (!project.endDate) return false

          const endDate = new Date(project.endDate)
          const today = new Date()

          return endDate >= today && endDate <= cutoffDate
        })
        .sort((a, b) => new Date(a.endDate) - new Date(b.endDate))
    } catch (error) {
      console.error('Error getting projects with upcoming deadlines:', error)
      throw error
    }
  }

  /**
   * Real-time subscriptions with business logic
   */
  subscribeToProjects(callback) {
    const sortByPriority = (a, b) => {
      // Sort by status priority, then by end date, then by name
      const statusPriority = {
        active: 0,
        planning: 1,
        'in-progress': 0,
        review: 2,
        completed: 5,
        'on-hold': 4,
        cancelled: 6,
      }

      const aPriority = statusPriority[a.status] ?? 3
      const bPriority = statusPriority[b.status] ?? 3

      if (aPriority !== bPriority) {
        return aPriority - bPriority
      }

      // If same status, sort by end date (soonest first)
      if (a.endDate && b.endDate) {
        return new Date(a.endDate) - new Date(b.endDate)
      }

      // Finally sort by name
      return (a.name || '').localeCompare(b.name || '')
    }

    return this.subscribeToAll(callback, sortByPriority)
  }

  /**
   * Subscribe to projects by client
   */
  subscribeToProjectsByClient(clientId, callback) {
    return this.subscribeToByField('clientId', clientId, callback)
  }

  /**
   * Subscribe to active projects only
   */
  subscribeToActiveProjects(callback) {
    const filterActive = (projects) => {
      const activeProjects = projects.filter(
        (project) => !['completed', 'cancelled', 'on-hold'].includes(project.status),
      )
      callback(activeProjects)
    }

    return this.subscribeToAll(filterActive)
  }

  /**
   * Subscribe to a single project (for project detail views)
   */
  subscribeToProject(projectId, callback) {
    return this.subscribeToOne(projectId, callback)
  }

  /**
   * Subscribe to project-related entities
   * These methods coordinate with other collections but are project-centric
   */
  subscribeToProjectTasks(projectId, callback) {
    try {
      const tasksRef = ref(firebaseCore.database, 'tasks')
      const projectTasksQuery = query(tasksRef, orderByChild('projectId'), equalTo(projectId))

      onValue(projectTasksQuery, (snapshot) => {
        const tasks = snapshot.exists()
          ? Object.entries(snapshot.val()).map(([id, data]) => ({ id, ...data }))
          : []

        // Sort by due date and priority (same logic as original)
        tasks.sort((a, b) => {
          if (a.dueDate && !b.dueDate) return -1
          if (!a.dueDate && b.dueDate) return 1
          if (a.dueDate && b.dueDate) {
            const dateComparison = new Date(a.dueDate) - new Date(b.dueDate)
            if (dateComparison !== 0) return dateComparison
          }

          const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
          return (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2)
        })

        callback(tasks)
      })

      return projectTasksQuery
    } catch (error) {
      console.error('Error subscribing to project tasks:', error)
      throw error
    }
  }

  subscribeToProjectDocuments(projectId, callback) {
    try {
      const documentsRef = ref(firebaseCore.database, 'documents')
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
      console.error('Error subscribing to project documents:', error)
      throw error
    }
  }

  subscribeToProjectRFIs(projectId, callback) {
    try {
      const rfisRef = ref(firebaseCore.database, 'rfis')
      const projectRFIsQuery = query(rfisRef, orderByChild('projectId'), equalTo(projectId))

      onValue(projectRFIsQuery, (snapshot) => {
        const rfis = snapshot.exists()
          ? Object.entries(snapshot.val()).map(([id, data]) => ({ id, ...data }))
          : []

        // Sort by creation date (newest first)
        rfis.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

        callback(rfis)
      })

      return projectRFIsQuery
    } catch (error) {
      console.error('Error subscribing to project RFIs:', error)
      throw error
    }
  }

  subscribeToProjectSubmittals(projectId, callback) {
    try {
      const submittalsRef = ref(firebaseCore.database, 'submittals')
      const projectSubmittalsQuery = query(
        submittalsRef,
        orderByChild('projectId'),
        equalTo(projectId),
      )

      onValue(projectSubmittalsQuery, (snapshot) => {
        const submittals = snapshot.exists()
          ? Object.entries(snapshot.val()).map(([id, data]) => ({ id, ...data }))
          : []

        // Sort by creation date (newest first)
        submittals.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

        callback(submittals)
      })

      return projectSubmittalsQuery
    } catch (error) {
      console.error('Error subscribing to project submittals:', error)
      throw error
    }
  }

  subscribeToProjectChangeOrders(projectId, callback) {
    try {
      const changeOrdersRef = ref(firebaseCore.database, 'changeOrders')
      const projectCOsQuery = query(changeOrdersRef, orderByChild('projectId'), equalTo(projectId))

      onValue(projectCOsQuery, (snapshot) => {
        const changeOrders = snapshot.exists()
          ? Object.entries(snapshot.val()).map(([id, data]) => ({ id, ...data }))
          : []

        // Sort by creation date (newest first)
        changeOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

        callback(changeOrders)
      })

      return projectCOsQuery
    } catch (error) {
      console.error('Error subscribing to project change orders:', error)
      throw error
    }
  }

  /**
   * Project-specific validation
   */
  validateProjectData(projectData) {
    const validation = super.validateData(projectData, ['name', 'jobNumber'])

    // Add project-specific validations
    if (projectData.startDate && projectData.endDate) {
      if (new Date(projectData.startDate) > new Date(projectData.endDate)) {
        validation.errors.endDate = 'End date cannot be before start date'
        validation.isValid = false
      }
    }

    if (projectData.cost && projectData.cost < 0) {
      validation.errors.cost = 'Project cost cannot be negative'
      validation.isValid = false
    }

    if (projectData.status && !this.isValidProjectStatus(projectData.status)) {
      validation.errors.status = 'Invalid project status'
      validation.isValid = false
    }

    if (projectData.phase && !this.isValidProjectPhase(projectData.phase)) {
      validation.errors.phase = 'Invalid project phase'
      validation.isValid = false
    }

    // Business rule: Cannot mark as completed without end date
    if (projectData.status === 'completed' && !projectData.endDate) {
      validation.errors.endDate = 'End date required when marking project as completed'
      validation.isValid = false
    }

    return validation
  }

  /**
   * Bulk operations for projects
   */
  async bulkUpdateProjectStatus(projectIds, status) {
    try {
      const updates = {
        status,
        ...(status === 'completed' && { completedAt: new Date().toISOString() }),
      }

      const results = await this.bulkUpdate(projectIds, updates)

      // Use centralized bulk logging
      await ActivityService.logBulkActivity(
        'bulk_updated_project_status',
        'project',
        projectIds,
        `Bulk updated ${projectIds.length} projects to status: ${status}`,
        { newStatus: status, projectCount: projectIds.length },
      )

      return results
    } catch (error) {
      console.error('Error in bulk update project status:', error)
      throw error
    }
  }

  /**
   * Advanced project queries
   */
  async getProjectsWithFilters(filters = {}) {
    try {
      let projects = await this.getAll()

      // Apply filters
      if (filters.status && filters.status.length > 0) {
        projects = projects.filter((p) => filters.status.includes(p.status))
      }

      if (filters.clientId) {
        projects = projects.filter((p) => p.clientId === filters.clientId)
      }

      if (filters.phase && filters.phase.length > 0) {
        projects = projects.filter((p) => filters.phase.includes(p.phase))
      }

      if (filters.startDateFrom) {
        projects = projects.filter(
          (p) => p.startDate && new Date(p.startDate) >= new Date(filters.startDateFrom),
        )
      }

      if (filters.startDateTo) {
        projects = projects.filter(
          (p) => p.startDate && new Date(p.startDate) <= new Date(filters.startDateTo),
        )
      }

      if (filters.minCost) {
        projects = projects.filter((p) => (p.cost || 0) >= filters.minCost)
      }

      if (filters.maxCost) {
        projects = projects.filter((p) => (p.cost || 0) <= filters.maxCost)
      }

      // Apply sorting
      if (filters.sortBy) {
        projects = this.sortProjects(projects, filters.sortBy, filters.sortDirection)
      }

      return projects
    } catch (error) {
      console.error('Error getting projects with filters:', error)
      throw error
    }
  }

  // ==================== HELPER METHODS ====================

  /**
   * Check if project is overdue
   */
  isProjectOverdue(project) {
    if (!project.endDate || ['completed', 'cancelled'].includes(project.status)) {
      return false
    }

    return new Date(project.endDate) < new Date()
  }

  /**
   * Check if date is upcoming deadline
   */
  isUpcomingDeadline(dateString, days = 30) {
    const deadline = new Date(dateString)
    const today = new Date()
    const futureDate = new Date()
    futureDate.setDate(today.getDate() + days)

    return deadline >= today && deadline <= futureDate
  }

  /**
   * Get days until a specific date
   */
  getDaysUntilDate(dateString) {
    const targetDate = new Date(dateString)
    const today = new Date()
    const diffTime = targetDate - today
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  /**
   * Validate project status
   */
  isValidProjectStatus(status) {
    const validStatuses = [
      'planning',
      'active',
      'in-progress',
      'review',
      'completed',
      'on-hold',
      'cancelled',
    ]
    return validStatuses.includes(status)
  }

  /**
   * Validate project phase
   */
  isValidProjectPhase(phase) {
    const validPhases = [
      'initiation',
      'planning',
      'design',
      'construction',
      'testing',
      'deployment',
      'closure',
    ]
    return validPhases.includes(phase)
  }

  /**
   * Sort projects by various criteria
   */
  sortProjects(projects, sortBy, direction = 'asc') {
    return projects.sort((a, b) => {
      let aVal, bVal

      switch (sortBy) {
        case 'name':
          aVal = (a.name || '').toLowerCase()
          bVal = (b.name || '').toLowerCase()
          break
        case 'startDate':
        case 'endDate':
          aVal = a[sortBy] ? new Date(a[sortBy]) : new Date(0)
          bVal = b[sortBy] ? new Date(b[sortBy]) : new Date(0)
          break
        case 'cost':
          aVal = parseFloat(a.cost || 0)
          bVal = parseFloat(b.cost || 0)
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
}

export default new ProjectRepository()
