// src/services/firebase/repositories/ClientRepository.js
import BaseRepository from '@/services/firebase/core/BaseRepository'
import ActivityService from '@/services/logging/ActivityService'
import { CLIENT_SCHEMA } from '../schemas'

/*// Client schema
const CLIENT_SCHEMA = {
  name: 'string',
  company: 'string',
  email: 'string',
  phone: 'string',
  address: 'string',
  notes: 'string',
  website: 'string',
  contactPerson: 'string',
  active: 'boolean',
}*/

/**
 * Client Repository - handles all client-related Firebase operations
 * Includes client management, project relationships, and contact information
 */
class ClientRepository extends BaseRepository {
  constructor() {
    super('clients', 'Client', CLIENT_SCHEMA)
  }

  /**
   * Create a new client with validation and activity logging
   */
  async createClient(clientData) {
    try {
      const validation = this.validateData(clientData, ['name', 'email'])
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${Object.values(validation.errors).join(', ')}`)
      }

      // Add client-specific defaults
      const clientDataWithDefaults = {
        ...validation.cleanData,
        active: validation.cleanData.active !== undefined ? validation.cleanData.active : true,
        createdAt: new Date().toISOString(),
        projects: [], // Array of project IDs associated with this client
        totalProjectValue: 0,
        lastContactDate: null,
      }

      const newClient = await this.create(clientDataWithDefaults, CLIENT_SCHEMA)

      // Log activity - clients are independent entities
      await ActivityService.logActivity(
        null, // No project context for client creation
        'created_client',
        'client',
        newClient.id,
        `Created client: ${newClient.name}`,
        { company: newClient.company },
      )

      return newClient
    } catch (error) {
      console.error('Error creating client:', error)
      throw error
    }
  }

  /**
   * Get all clients with optional filtering
   */
  async getAllClients(filters = {}) {
    try {
      let clients = await this.getAll()

      // Apply filters
      if (filters.active !== undefined) {
        clients = clients.filter((client) => client.active === filters.active)
      }

      if (filters.company) {
        clients = clients.filter((client) =>
          client.company?.toLowerCase().includes(filters.company.toLowerCase()),
        )
      }

      if (filters.hasProjects !== undefined) {
        clients = clients.filter((client) => {
          const hasProjects = client.projects && client.projects.length > 0
          return filters.hasProjects ? hasProjects : !hasProjects
        })
      }

      // Apply sorting
      const sortBy = filters.sortBy || 'name'
      const sortDirection = filters.sortDirection || 'asc'
      clients = this.sortClients(clients, sortBy, sortDirection)

      return clients
    } catch (error) {
      console.error('Error getting all clients:', error)
      throw error
    }
  }

  /**
   * Get active clients only
   */
  async getActiveClients() {
    try {
      const allClients = await this.getAll()
      return allClients.filter((client) => client.active !== false)
    } catch (error) {
      console.error('Error getting active clients:', error)
      throw error
    }
  }

  /**
   * Get clients with projects
   */
  async getClientsWithProjects() {
    try {
      const allClients = await this.getAll()
      return allClients.filter((client) => client.projects && client.projects.length > 0)
    } catch (error) {
      console.error('Error getting clients with projects:', error)
      throw error
    }
  }

  /**
   * Search clients by name, company, or email
   */
  async searchClients(searchTerm) {
    try {
      const allClients = await this.getAll()
      const term = searchTerm.toLowerCase().trim()

      return allClients.filter((client) => {
        return (
          client.name?.toLowerCase().includes(term) ||
          client.company?.toLowerCase().includes(term) ||
          client.email?.toLowerCase().includes(term) ||
          client.contactPerson?.toLowerCase().includes(term)
        )
      })
    } catch (error) {
      console.error('Error searching clients:', error)
      throw error
    }
  }

  /**
   * Update client with validation and activity logging
   */
  async updateClient(clientId, updates) {
    try {
      const originalClient = await this.getById(clientId)
      if (!originalClient) {
        throw new Error('Client not found')
      }

      const result = await this.updateWithValidation(clientId, updates)

      // Log significant updates
      const significantFields = ['name', 'company', 'email', 'active']
      const significantChanges = Object.keys(updates).filter(
        (key) => significantFields.includes(key) && updates[key] !== originalClient[key],
      )

      if (significantChanges.length > 0) {
        await ActivityService.logEntityUpdated(
          null, // No project context
          'client',
          clientId,
          originalClient.name,
          Object.fromEntries(significantChanges.map((key) => [key, updates[key]])),
        )
      }

      // Special logging for status changes
      if (updates.active !== undefined && updates.active !== originalClient.active) {
        const action = updates.active ? 'reactivated' : 'deactivated'
        await ActivityService.logActivity(
          null,
          `${action}_client`,
          'client',
          clientId,
          `${action.charAt(0).toUpperCase() + action.slice(1)} client: ${originalClient.name}`,
        )
      }

      return result
    } catch (error) {
      console.error('Error updating client:', error)
      throw error
    }
  }

  /**
   * Deactivate client instead of deleting
   */
  async deactivateClient(clientId) {
    try {
      return await this.updateClient(clientId, { active: false })
    } catch (error) {
      console.error('Error deactivating client:', error)
      throw error
    }
  }

  /**
   * Reactivate client
   */
  async reactivateClient(clientId) {
    try {
      return await this.updateClient(clientId, { active: true })
    } catch (error) {
      console.error('Error reactivating client:', error)
      throw error
    }
  }

  /**
   * Delete client (hard delete)
   */
  async deleteClient(clientId) {
    try {
      const client = await this.getById(clientId)
      if (!client) {
        throw new Error('Client not found')
      }

      // Check if client has active projects
      if (client.projects && client.projects.length > 0) {
        throw new Error(
          'Cannot delete client with active projects. Please remove or reassign projects first.',
        )
      }

      await this.delete(clientId)

      // Log activity
      await ActivityService.logEntityDeleted(
        null, // No project context
        'client',
        clientId,
        client.name,
      )

      return { success: true, id: clientId }
    } catch (error) {
      console.error('Error deleting client:', error)
      throw error
    }
  }

  // ==================== CLIENT-PROJECT RELATIONSHIPS ====================

  /**
   * Add project to client
   */
  async addProjectToClient(clientId, projectId, projectValue = 0) {
    try {
      const client = await this.getById(clientId)
      if (!client) {
        throw new Error('Client not found')
      }

      const projects = client.projects || []
      if (!projects.includes(projectId)) {
        projects.push(projectId)

        const updates = {
          projects,
          totalProjectValue: (client.totalProjectValue || 0) + projectValue,
          lastProjectDate: new Date().toISOString(),
        }

        await this.update(clientId, updates)

        // Log activity
        await ActivityService.logActivity(
          projectId,
          'assigned_client_to_project',
          'client',
          clientId,
          `Assigned client ${client.name} to project`,
          { projectId, projectValue },
        )
      }

      return true
    } catch (error) {
      console.error('Error adding project to client:', error)
      throw error
    }
  }

  /**
   * Remove project from client
   */
  async removeProjectFromClient(clientId, projectId, projectValue = 0) {
    try {
      const client = await this.getById(clientId)
      if (!client) {
        throw new Error('Client not found')
      }

      const projects = (client.projects || []).filter((id) => id !== projectId)

      const updates = {
        projects,
        totalProjectValue: Math.max(0, (client.totalProjectValue || 0) - projectValue),
      }

      await this.update(clientId, updates)

      // Log activity
      await ActivityService.logActivity(
        projectId,
        'removed_client_from_project',
        'client',
        clientId,
        `Removed client ${client.name} from project`,
        { projectId, projectValue },
      )

      return true
    } catch (error) {
      console.error('Error removing project from client:', error)
      throw error
    }
  }

  /**
   * Update client's last contact date
   */
  async updateLastContact(clientId, contactDate = null, notes = '') {
    try {
      const updates = {
        lastContactDate: contactDate || new Date().toISOString(),
        lastContactNotes: notes,
      }

      const result = await this.update(clientId, updates)

      // Log activity
      const client = await this.getById(clientId)
      await ActivityService.logActivity(
        null,
        'updated_client_contact',
        'client',
        clientId,
        `Updated last contact for client: ${client?.name}`,
        { contactDate: updates.lastContactDate, notes },
      )

      return result
    } catch (error) {
      console.error('Error updating last contact:', error)
      throw error
    }
  }

  // ==================== CLIENT STATISTICS ====================

  /**
   * Get client statistics
   */
  async getClientStatistics() {
    try {
      const allClients = await this.getAll()

      const stats = {
        total: allClients.length,
        active: allClients.filter((c) => c.active !== false).length,
        inactive: allClients.filter((c) => c.active === false).length,
        withProjects: allClients.filter((c) => c.projects && c.projects.length > 0).length,
        withoutProjects: allClients.filter((c) => !c.projects || c.projects.length === 0).length,
        totalProjectValue: allClients.reduce(
          (sum, client) => sum + (client.totalProjectValue || 0),
          0,
        ),
        averageProjectValue: 0,
        byCompanySize: {
          individual: 0, // No company name
          small: 0, // 1-50 (estimated based on project count)
          medium: 0, // 51-200
          large: 0, // 200+
        },
        recentlyContacted: 0, // Last 30 days
        needsFollow: 0, // No contact in 90+ days
      }

      // Calculate averages
      if (stats.withProjects > 0) {
        stats.averageProjectValue = stats.totalProjectValue / stats.withProjects
      }

      // Analyze company sizes and contact patterns
      const now = new Date()
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

      allClients.forEach((client) => {
        // Company size estimation
        if (!client.company || client.company.trim() === '') {
          stats.byCompanySize.individual++
        } else {
          const projectCount = client.projects ? client.projects.length : 0
          if (projectCount <= 2) {
            stats.byCompanySize.small++
          } else if (projectCount <= 5) {
            stats.byCompanySize.medium++
          } else {
            stats.byCompanySize.large++
          }
        }

        // Contact analysis
        if (client.lastContactDate) {
          const lastContact = new Date(client.lastContactDate)
          if (lastContact > thirtyDaysAgo) {
            stats.recentlyContacted++
          } else if (lastContact < ninetyDaysAgo) {
            stats.needsFollow++
          }
        } else {
          stats.needsFollow++
        }
      })

      return stats
    } catch (error) {
      console.error('Error getting client statistics:', error)
      throw error
    }
  }

  /**
   * Get client project summary
   */
  async getClientProjectSummary(clientId) {
    try {
      const client = await this.getById(clientId)
      if (!client) {
        throw new Error('Client not found')
      }

      return {
        clientId,
        clientName: client.name,
        totalProjects: client.projects ? client.projects.length : 0,
        totalProjectValue: client.totalProjectValue || 0,
        averageProjectValue:
          client.projects && client.projects.length > 0
            ? (client.totalProjectValue || 0) / client.projects.length
            : 0,
        lastProjectDate: client.lastProjectDate,
        lastContactDate: client.lastContactDate,
        active: client.active !== false,
      }
    } catch (error) {
      console.error('Error getting client project summary:', error)
      throw error
    }
  }

  // ==================== BULK OPERATIONS ====================

  /**
   * Bulk deactivate clients
   */
  async bulkDeactivateClients(clientIds) {
    try {
      const updates = { active: false }
      const results = await this.bulkUpdate(clientIds, updates)

      // Log bulk activity
      await ActivityService.logBulkActivity(
        'bulk_deactivated_clients',
        'client',
        clientIds,
        `Bulk deactivated ${clientIds.length} clients`,
      )

      return results
    } catch (error) {
      console.error('Error in bulk deactivate clients:', error)
      throw error
    }
  }

  /**
   * Bulk update client information
   */
  async bulkUpdateClients(clientIds, updates) {
    try {
      const results = await this.bulkUpdate(clientIds, updates)

      // Log bulk activity
      await ActivityService.logBulkActivity(
        'bulk_updated_clients',
        'client',
        clientIds,
        `Bulk updated ${clientIds.length} clients`,
        { updates },
      )

      return results
    } catch (error) {
      console.error('Error in bulk update clients:', error)
      throw error
    }
  }

  // ==================== REAL-TIME SUBSCRIPTIONS ====================

  /**
   * Subscribe to all clients with sorting
   */
  subscribeToClients(callback) {
    const sortByName = (a, b) => {
      const nameA = (a.name || '').toLowerCase()
      const nameB = (b.name || '').toLowerCase()
      return nameA.localeCompare(nameB)
    }

    return this.subscribeToAll(callback, sortByName)
  }

  /**
   * Subscribe to active clients only
   */
  subscribeToActiveClients(callback) {
    const filterActive = (clients) => {
      const activeClients = clients
        .filter((client) => client.active !== false)
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      callback(activeClients)
    }

    return this.subscribeToAll(filterActive)
  }

  /**
   * Subscribe to clients with projects
   */
  subscribeToClientsWithProjects(callback) {
    const filterWithProjects = (clients) => {
      const clientsWithProjects = clients
        .filter((client) => client.projects && client.projects.length > 0)
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      callback(clientsWithProjects)
    }

    return this.subscribeToAll(filterWithProjects)
  }

  // ==================== HELPER METHODS ====================

  /**
   * Sort clients by various criteria
   */
  sortClients(clients, sortBy = 'name', direction = 'asc') {
    return clients.sort((a, b) => {
      let aVal, bVal

      switch (sortBy) {
        case 'name':
          aVal = (a.name || '').toLowerCase()
          bVal = (b.name || '').toLowerCase()
          break

        case 'company':
          aVal = (a.company || '').toLowerCase()
          bVal = (b.company || '').toLowerCase()
          break

        case 'email':
          aVal = (a.email || '').toLowerCase()
          bVal = (b.email || '').toLowerCase()
          break

        case 'projectCount':
          aVal = a.projects ? a.projects.length : 0
          bVal = b.projects ? b.projects.length : 0
          break

        case 'totalProjectValue':
          aVal = a.totalProjectValue || 0
          bVal = b.totalProjectValue || 0
          break

        case 'lastContactDate':
          aVal = a.lastContactDate ? new Date(a.lastContactDate) : new Date(0)
          bVal = b.lastContactDate ? new Date(b.lastContactDate) : new Date(0)
          break

        case 'createdAt':
          aVal = new Date(a.createdAt || 0)
          bVal = new Date(b.createdAt || 0)
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
   * Validate client-specific data
   */
  validateClientData(clientData) {
    const validation = super.validateData(clientData, ['name', 'email'])

    // Add client-specific validations
    if (clientData.email && !this.isValidEmail(clientData.email)) {
      validation.errors.email = 'Invalid email format'
      validation.isValid = false
    }

    if (
      clientData.website &&
      clientData.website.trim() &&
      !this.isValidWebsite(clientData.website)
    ) {
      validation.errors.website = 'Invalid website URL format'
      validation.isValid = false
    }

    if (clientData.phone && clientData.phone.trim() && !this.isValidPhone(clientData.phone)) {
      validation.errors.phone = 'Invalid phone number format'
      validation.isValid = false
    }

    return validation
  }

  /**
   * Email validation helper
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  /**
   * Website URL validation helper
   */
  isValidWebsite(website) {
    try {
      new URL(website.startsWith('http') ? website : `https://${website}`)
      return true
    } catch {
      return false
    }
  }

  /**
   * Phone validation helper
   */
  isValidPhone(phone) {
    // Basic phone validation - adjust regex based on your needs
    const phoneRegex = /^[+]?[\d\s\-()]+$/
    return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10
  }

  /**
   * Format client display name
   */
  getDisplayName(client) {
    if (!client) return 'Unknown Client'

    if (client.company && client.company.trim()) {
      return `${client.name} (${client.company})`
    }

    return client.name || 'Unknown Client'
  }

  /**
   * Check if client needs follow-up
   */
  needsFollowUp(client, daysThreshold = 90) {
    if (!client.lastContactDate) return true

    const lastContact = new Date(client.lastContactDate)
    const threshold = new Date()
    threshold.setDate(threshold.getDate() - daysThreshold)

    return lastContact < threshold
  }

  /**
   * Get client health score (0-100)
   */
  getHealthScore(client) {
    let score = 50 // Base score

    // Active client bonus
    if (client.active !== false) score += 10

    // Project activity bonus
    const projectCount = client.projects ? client.projects.length : 0
    if (projectCount > 0) score += 15
    if (projectCount > 3) score += 10

    // Recent contact bonus
    if (client.lastContactDate) {
      const daysSinceContact =
        (new Date() - new Date(client.lastContactDate)) / (1000 * 60 * 60 * 24)
      if (daysSinceContact < 30) score += 15
      else if (daysSinceContact < 90) score += 5
      else score -= 10
    } else {
      score -= 15 // No contact record
    }

    // Complete profile bonus
    let completeness = 0
    if (client.name) completeness++
    if (client.email) completeness++
    if (client.phone) completeness++
    if (client.company) completeness++
    if (client.address) completeness++

    score += (completeness / 5) * 10

    return Math.max(0, Math.min(100, score))
  }
}

export default new ClientRepository()
