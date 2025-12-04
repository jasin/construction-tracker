// src/services/firebase/repositories/ClientRepository.ts
import BaseRepository from '../core/BaseRepository'
import { CrudMixin } from '../mixins/CrudMixin'
import { RealtimeMixin } from '../mixins/RealtimeMixin'
import ActivityService from '../../logging/ActivityService'
import { CLIENT_SCHEMA } from '../schemas'
import type { Client, ValidationResult } from '@/types/models'

interface ClientFilters {
  active?: boolean
  company?: string
  hasProjects?: boolean
  sortBy?: string
  sortDirection?: 'asc' | 'desc'
}

interface ClientStatistics {
  total: number
  active: number
  inactive: number
  withProjects: number
  withoutProjects: number
  totalProjectValue: number
  averageProjectValue: number
  byCompanySize: {
    individual: number
    small: number
    medium: number
    large: number
  }
  recentlyContacted: number
  needsFollow: number
}

interface ClientProjectSummary {
  clientId: string
  clientName: string
  totalProjects: number
  totalProjectValue: number
  averageProjectValue: number
  lastProjectDate: string | null | undefined
  lastContactDate: string | null | undefined
  active: boolean
}

/**
 * Client Repository - handles all client-related Firebase operations
 * Includes client management, project relationships, and contact information
 */
class ClientRepository extends CrudMixin(RealtimeMixin(BaseRepository)) {
  constructor() {
    super('clients')
  }

  /**
   * Create a new client with validation and activity logging
   */
  async createClient(clientData: Partial<Client>): Promise<Client> {
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

      const newClient = await this.create(clientDataWithDefaults, CLIENT_SCHEMA) as Client

      // Log activity - clients are independent entities
      await ActivityService.logActivity(
        null, // No project context for client creation
        'created_client',
        'client',
        newClient.id,
        `Created client: ${newClient.name}`,
        { company: (newClient as any).company },
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
  async getAllClients(filters: ClientFilters = {}): Promise<Client[]> {
    try {
      let clients = await this.getAll() as Client[]

      // Apply filters
      if (filters.active !== undefined) {
        clients = clients.filter((client) => (client as any).active === filters.active)
      }

      if (filters.company) {
        clients = clients.filter((client) =>
          (client as any).company?.toLowerCase().includes(filters.company!.toLowerCase()),
        )
      }

      if (filters.hasProjects !== undefined) {
        clients = clients.filter((client) => {
          const hasProjects = (client as any).projects && (client as any).projects.length > 0
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
  async getActiveClients(): Promise<Client[]> {
    try {
      const allClients = await this.getAll() as Client[]
      return allClients.filter((client) => (client as any).active !== false)
    } catch (error) {
      console.error('Error getting active clients:', error)
      throw error
    }
  }

  /**
   * Get clients with projects
   */
  async getClientsWithProjects(): Promise<Client[]> {
    try {
      const allClients = await this.getAll() as Client[]
      return allClients.filter((client) => (client as any).projects && (client as any).projects.length > 0)
    } catch (error) {
      console.error('Error getting clients with projects:', error)
      throw error
    }
  }

  /**
   * Search clients by name, company, or email
   */
  async searchClients(searchTerm: string): Promise<Client[]> {
    try {
      const allClients = await this.getAll() as Client[]
      const term = searchTerm.toLowerCase().trim()

      return allClients.filter((client) => {
        return (
          client.name?.toLowerCase().includes(term) ||
          (client as any).company?.toLowerCase().includes(term) ||
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
  async updateClient(clientId: string, updates: Partial<Client>): Promise<any> {
    try {
      const originalClient = await this.getById(clientId) as Client
      if (!originalClient) {
        throw new Error('Client not found')
      }

      const result = await this.updateWithValidation(clientId, updates)

      // Log significant updates
      const significantFields = ['name', 'company', 'email', 'active']
      const significantChanges = Object.keys(updates).filter(
        (key) => significantFields.includes(key) && (updates as any)[key] !== (originalClient as any)[key],
      )

      if (significantChanges.length > 0) {
        await ActivityService.logEntityUpdated(
          null, // No project context
          'client',
          clientId,
          originalClient.name,
          Object.fromEntries(significantChanges.map((key) => [key, (updates as any)[key]])),
        )
      }

      // Special logging for status changes
      if ((updates as any).active !== undefined && (updates as any).active !== (originalClient as any).active) {
        const action = (updates as any).active ? 'reactivated' : 'deactivated'
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
  async deactivateClient(clientId: string): Promise<any> {
    try {
      return await this.updateClient(clientId, { active: false } as any)
    } catch (error) {
      console.error('Error deactivating client:', error)
      throw error
    }
  }

  /**
   * Reactivate client
   */
  async reactivateClient(clientId: string): Promise<any> {
    try {
      return await this.updateClient(clientId, { active: true } as any)
    } catch (error) {
      console.error('Error reactivating client:', error)
      throw error
    }
  }

  /**
   * Delete client (hard delete)
   */
  async deleteClient(clientId: string): Promise<{ success: boolean; id: string }> {
    try {
      const client = await this.getById(clientId) as Client
      if (!client) {
        throw new Error('Client not found')
      }

      // Check if client has active projects
      if ((client as any).projects && (client as any).projects.length > 0) {
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
  async addProjectToClient(clientId: string, projectId: string, projectValue: number = 0): Promise<boolean> {
    try {
      const client = await this.getById(clientId) as Client
      if (!client) {
        throw new Error('Client not found')
      }

      const projects = (client as any).projects || []
      if (!projects.includes(projectId)) {
        projects.push(projectId)

        const updates = {
          projects,
          totalProjectValue: ((client as any).totalProjectValue || 0) + projectValue,
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
  async removeProjectFromClient(clientId: string, projectId: string, projectValue: number = 0): Promise<boolean> {
    try {
      const client = await this.getById(clientId) as Client
      if (!client) {
        throw new Error('Client not found')
      }

      const projects = ((client as any).projects || []).filter((id: string) => id !== projectId)

      const updates = {
        projects,
        totalProjectValue: Math.max(0, ((client as any).totalProjectValue || 0) - projectValue),
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
  async updateLastContact(clientId: string, contactDate: string | null = null, notes: string = ''): Promise<any> {
    try {
      const updates = {
        lastContactDate: contactDate || new Date().toISOString(),
        lastContactNotes: notes,
      }

      const result = await this.update(clientId, updates)

      // Log activity
      const client = await this.getById(clientId) as Client
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
  async getClientStatistics(): Promise<ClientStatistics> {
    try {
      const allClients = await this.getAll() as Client[]

      const stats: ClientStatistics = {
        total: allClients.length,
        active: allClients.filter((c) => (c as any).active !== false).length,
        inactive: allClients.filter((c) => (c as any).active === false).length,
        withProjects: allClients.filter((c) => (c as any).projects && (c as any).projects.length > 0).length,
        withoutProjects: allClients.filter((c) => !(c as any).projects || (c as any).projects.length === 0).length,
        totalProjectValue: allClients.reduce(
          (sum, client) => sum + ((client as any).totalProjectValue || 0),
          0,
        ),
        averageProjectValue: 0,
        byCompanySize: {
          individual: 0,
          small: 0,
          medium: 0,
          large: 0,
        },
        recentlyContacted: 0,
        needsFollow: 0,
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
        if (!(client as any).company || (client as any).company.trim() === '') {
          stats.byCompanySize.individual++
        } else {
          const projectCount = (client as any).projects ? (client as any).projects.length : 0
          if (projectCount <= 2) {
            stats.byCompanySize.small++
          } else if (projectCount <= 5) {
            stats.byCompanySize.medium++
          } else {
            stats.byCompanySize.large++
          }
        }

        // Contact analysis
        if ((client as any).lastContactDate) {
          const lastContact = new Date((client as any).lastContactDate)
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
  async getClientProjectSummary(clientId: string): Promise<ClientProjectSummary> {
    try {
      const client = await this.getById(clientId) as Client
      if (!client) {
        throw new Error('Client not found')
      }

      return {
        clientId,
        clientName: client.name,
        totalProjects: (client as any).projects ? (client as any).projects.length : 0,
        totalProjectValue: (client as any).totalProjectValue || 0,
        averageProjectValue:
          (client as any).projects && (client as any).projects.length > 0
            ? ((client as any).totalProjectValue || 0) / (client as any).projects.length
            : 0,
        lastProjectDate: (client as any).lastProjectDate,
        lastContactDate: (client as any).lastContactDate,
        active: (client as any).active !== false,
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
  async bulkDeactivateClients(clientIds: string[]): Promise<any[]> {
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
  async bulkUpdateClients(clientIds: string[], updates: Partial<Client>): Promise<any[]> {
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
  subscribeToClients(callback: (clients: Client[]) => void): () => void {
    const sortByName = (a: Client, b: Client) => {
      const nameA = (a.name || '').toLowerCase()
      const nameB = (b.name || '').toLowerCase()
      return nameA.localeCompare(nameB)
    }

    return this.subscribeToAll(callback, sortByName)
  }

  /**
   * Subscribe to active clients only
   */
  subscribeToActiveClients(callback: (clients: Client[]) => void): () => void {
    const filterActive = (clients: any[]) => {
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
  subscribeToClientsWithProjects(callback: (clients: Client[]) => void): () => void {
    const filterWithProjects = (clients: any[]) => {
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
  sortClients(clients: Client[], sortBy: string = 'name', direction: 'asc' | 'desc' = 'asc'): Client[] {
    return clients.sort((a, b) => {
      let aVal: any, bVal: any

      switch (sortBy) {
        case 'name':
          aVal = (a.name || '').toLowerCase()
          bVal = (b.name || '').toLowerCase()
          break

        case 'company':
          aVal = ((a as any).company || '').toLowerCase()
          bVal = ((b as any).company || '').toLowerCase()
          break

        case 'email':
          aVal = (a.email || '').toLowerCase()
          bVal = (b.email || '').toLowerCase()
          break

        case 'projectCount':
          aVal = (a as any).projects ? (a as any).projects.length : 0
          bVal = (b as any).projects ? (b as any).projects.length : 0
          break

        case 'totalProjectValue':
          aVal = (a as any).totalProjectValue || 0
          bVal = (b as any).totalProjectValue || 0
          break

        case 'lastContactDate':
          aVal = (a as any).lastContactDate ? new Date((a as any).lastContactDate) : new Date(0)
          bVal = (b as any).lastContactDate ? new Date((b as any).lastContactDate) : new Date(0)
          break

        case 'createdAt':
          aVal = new Date(a.createdAt || 0)
          bVal = new Date(b.createdAt || 0)
          break

        default:
          aVal = (a as any)[sortBy] || ''
          bVal = (b as any)[sortBy] || ''
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
  validateClientData(clientData: any): ValidationResult {
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
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  /**
   * Website URL validation helper
   */
  isValidWebsite(website: string): boolean {
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
  isValidPhone(phone: string): boolean {
    const phoneRegex = /^[+]?[\d\s\-()]+$/
    return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10
  }

  /**
   * Format client display name
   */
  getDisplayName(client: Client): string {
    if (!client) return 'Unknown Client'

    if ((client as any).company && (client as any).company.trim()) {
      return `${client.name} (${(client as any).company})`
    }

    return client.name || 'Unknown Client'
  }

  /**
   * Check if client needs follow-up
   */
  needsFollowUp(client: Client, daysThreshold: number = 90): boolean {
    if (!(client as any).lastContactDate) return true

    const lastContact = new Date((client as any).lastContactDate)
    const threshold = new Date()
    threshold.setDate(threshold.getDate() - daysThreshold)

    return lastContact < threshold
  }

  /**
   * Get client health score (0-100)
   */
  getHealthScore(client: Client): number {
    let score = 50 // Base score

    // Active client bonus
    if ((client as any).active !== false) score += 10

    // Project activity bonus
    const projectCount = (client as any).projects ? (client as any).projects.length : 0
    if (projectCount > 0) score += 15
    if (projectCount > 3) score += 10

    // Recent contact bonus
    if ((client as any).lastContactDate) {
      const daysSinceContact =
        (new Date().getTime() - new Date((client as any).lastContactDate).getTime()) / (1000 * 60 * 60 * 24)
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
    if ((client as any).company) completeness++
    if ((client as any).address) completeness++

    score += (completeness / 5) * 10

    return Math.max(0, Math.min(100, score))
  }
}

export default new ClientRepository()
