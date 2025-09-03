// firebaseService.js - Cleaned up version with migrated methods removed
import {
  ref,
  push,
  set,
  get,
  update,
  remove,
  query,
  orderByChild,
  equalTo,
  onValue,
  off,
} from 'firebase/database'
import { database } from '@/configs/firebase'
import { getCurrentUserId, getCurrentUserName } from '@/services/auth/authService'
import {
  sanitizeForFirebase,
  sanitizeWithSchema,
  validateAndCleanForm,
  deepClean,
  // Add more schemas as needed
} from '@/utils/index'

// Define data schemas for validation - TODO: Move these to individual repositories
const CLIENT_SCHEMA = {
  name: 'string',
  company: 'string',
  email: 'string',
  phone: 'string',
  address: 'string',
  notes: 'string',
}

const RFI_SCHEMA = {
  title: 'string',
  description: 'string',
  priority: 'string',
  status: 'string',
  projectId: 'string',
  submittedBy: 'string',
  assignedTo: 'string',
  dueDate: 'date',
  response: 'string',
}

const SUBMITTAL_SCHEMA = {
  title: 'string',
  description: 'string',
  status: 'string',
  projectId: 'string',
  submittedBy: 'string',
  reviewedBy: 'string',
  dueDate: 'date',
  comments: 'string',
}

const CHANGE_ORDER_SCHEMA = {
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
}

class FirebaseService {
  // ==================== HELPER METHODS ====================

  /**
   * Add timestamp and user info to data
   */
  addCreateMetadata(data) {
    return {
      ...data,
      createdAt: new Date().toISOString(),
      createdBy: this.getCurrentUserId(),
      createdByName: this.getCurrentUserName(),
    }
  }

  /**
   * Add update timestamp and user info
   */
  addUpdateMetadata(data) {
    return {
      ...data,
      updatedAt: new Date().toISOString(),
      updatedBy: this.getCurrentUserId(),
      updatedByName: this.getCurrentUserName(),
    }
  }

  /**
   * Generic create method with sanitization
   */
  async createEntity(collectionName, data, schema = null) {
    const entityRef = ref(database, collectionName)
    const newEntityRef = push(entityRef)

    // Add metadata first
    const dataWithMeta = this.addCreateMetadata(data)

    // Sanitize data
    const cleanData = schema
      ? sanitizeWithSchema(dataWithMeta, schema)
      : sanitizeForFirebase(dataWithMeta)

    console.log(`Creating ${collectionName} with clean data:`, cleanData)

    await set(newEntityRef, cleanData)
    return { id: newEntityRef.key, ...cleanData }
  }

  /**
   * Generic update method with sanitization
   */
  async updateEntity(collectionName, entityId, updates, schema = null) {
    const entityRef = ref(database, `${collectionName}/${entityId}`)

    // Add metadata
    const updatesWithMeta = this.addUpdateMetadata(updates)

    // Sanitize data
    const cleanUpdates = schema
      ? sanitizeWithSchema(updatesWithMeta, schema)
      : sanitizeForFirebase(updatesWithMeta)

    console.log(`Updating ${collectionName}/${entityId} with clean data:`, cleanUpdates)

    await update(entityRef, cleanUpdates)
    return { id: entityId, ...cleanUpdates }
  }

  // ==================== CLIENTS ====================
  // TODO: Migrate to ClientRepository

  async createClient(clientData) {
    try {
      const validation = validateAndCleanForm(clientData, ['name', 'email'])
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${Object.values(validation.errors).join(', ')}`)
      }

      return await this.createEntity('clients', validation.cleanData, CLIENT_SCHEMA)
    } catch (error) {
      console.error('Error creating client:', error)
      throw error
    }
  }

  async getClient(clientId) {
    const clientRef = ref(database, `clients/${clientId}`)
    const snapshot = await get(clientRef)
    return snapshot.exists() ? { id: clientId, ...snapshot.val() } : null
  }

  async getAllClients() {
    const clientsRef = ref(database, 'clients')
    const snapshot = await get(clientsRef)
    if (!snapshot.exists()) return []

    return Object.entries(snapshot.val()).map(([id, data]) => ({
      id,
      ...data,
    }))
  }

  async updateClient(clientId, updates) {
    try {
      return await this.updateEntity('clients', clientId, updates, CLIENT_SCHEMA)
    } catch (error) {
      console.error('Error updating client:', error)
      throw error
    }
  }

  async deleteClient(clientId) {
    const clientRef = ref(database, `clients/${clientId}`)
    await remove(clientRef)
  }

  // ==================== PROJECTS ====================
  // ✅ MIGRATED TO ProjectRepository - Remove these methods

  // ==================== USERS ====================
  // ✅ MIGRATED TO UserRepository - Remove these methods

  // ==================== TASKS ====================
  // ✅ MIGRATED TO TaskRepository - Remove these methods

  // ==================== DOCUMENTS ====================
  // ✅ MIGRATED TO DocumentRepository - Remove these methods

  // ==================== RFIs ====================
  // TODO: Migrate to RFIRepository

  async createRFI(rfiData) {
    try {
      const validation = validateAndCleanForm(rfiData, ['title', 'projectId'])
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${Object.values(validation.errors).join(', ')}`)
      }

      const rfiDataWithDefaults = {
        ...validation.cleanData,
        status: validation.cleanData.status || 'draft',
        priority: validation.cleanData.priority || 'medium',
      }

      const newRFI = await this.createEntity('rfis', rfiDataWithDefaults, RFI_SCHEMA)

      await this.logActivity(
        newRFI.projectId,
        'created_rfi',
        'rfi',
        newRFI.id,
        `Created RFI: ${newRFI.title}`,
      )

      return newRFI
    } catch (error) {
      console.error('Error creating RFI:', error)
      throw error
    }
  }

  async getRFI(rfiId) {
    const rfiRef = ref(database, `rfis/${rfiId}`)
    const snapshot = await get(rfiRef)
    return snapshot.exists() ? { id: rfiId, ...snapshot.val() } : null
  }

  async getRFIsByProject(projectId) {
    const rfisRef = ref(database, 'rfis')
    const projectRFIsQuery = query(rfisRef, orderByChild('projectId'), equalTo(projectId))
    const snapshot = await get(projectRFIsQuery)

    if (!snapshot.exists()) return []
    return Object.entries(snapshot.val()).map(([id, data]) => ({
      id,
      ...data,
    }))
  }

  async getAllRFIs() {
    const rfisRef = ref(database, 'rfis')
    const snapshot = await get(rfisRef)
    if (!snapshot.exists()) return []

    return Object.entries(snapshot.val()).map(([id, data]) => ({
      id,
      ...data,
    }))
  }

  async updateRFI(rfiId, updates) {
    try {
      return await this.updateEntity('rfis', rfiId, updates, RFI_SCHEMA)
    } catch (error) {
      console.error('Error updating RFI:', error)
      throw error
    }
  }

  async deleteRFI(rfiId) {
    const rfiRef = ref(database, `rfis/${rfiId}`)
    await remove(rfiRef)
  }

  // ==================== SUBMITTALS ====================
  // TODO: Migrate to SubmittalRepository

  async createSubmittal(submittalData) {
    try {
      const validation = validateAndCleanForm(submittalData, ['title', 'projectId'])
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${Object.values(validation.errors).join(', ')}`)
      }

      const submittalDataWithDefaults = {
        ...validation.cleanData,
        status: validation.cleanData.status || 'draft',
      }

      const newSubmittal = await this.createEntity(
        'submittals',
        submittalDataWithDefaults,
        SUBMITTAL_SCHEMA,
      )

      await this.logActivity(
        newSubmittal.projectId,
        'created_submittal',
        'submittal',
        newSubmittal.id,
        `Created submittal: ${newSubmittal.title}`,
      )

      return newSubmittal
    } catch (error) {
      console.error('Error creating submittal:', error)
      throw error
    }
  }

  async getSubmittal(submittalId) {
    const submittalRef = ref(database, `submittals/${submittalId}`)
    const snapshot = await get(submittalRef)
    return snapshot.exists() ? { id: submittalId, ...snapshot.val() } : null
  }

  async getSubmittalsByProject(projectId) {
    const submittalsRef = ref(database, 'submittals')
    const projectSubmittalsQuery = query(
      submittalsRef,
      orderByChild('projectId'),
      equalTo(projectId),
    )
    const snapshot = await get(projectSubmittalsQuery)

    if (!snapshot.exists()) return []
    return Object.entries(snapshot.val()).map(([id, data]) => ({
      id,
      ...data,
    }))
  }

  async getAllSubmittals() {
    const submittalsRef = ref(database, 'submittals')
    const snapshot = await get(submittalsRef)
    if (!snapshot.exists()) return []

    return Object.entries(snapshot.val()).map(([id, data]) => ({
      id,
      ...data,
    }))
  }

  async updateSubmittal(submittalId, updates) {
    try {
      return await this.updateEntity('submittals', submittalId, updates, SUBMITTAL_SCHEMA)
    } catch (error) {
      console.error('Error updating submittal:', error)
      throw error
    }
  }

  async deleteSubmittal(submittalId) {
    const submittalRef = ref(database, `submittals/${submittalId}`)
    await remove(submittalRef)
  }

  // ==================== CHANGE ORDERS ====================
  // TODO: Migrate to ChangeOrderRepository

  async createChangeOrder(changeOrderData) {
    try {
      const validation = validateAndCleanForm(changeOrderData, ['title', 'projectId'])
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${Object.values(validation.errors).join(', ')}`)
      }

      const coDataWithDefaults = {
        ...validation.cleanData,
        status: validation.cleanData.status || 'proposed',
        billable: false,
        costImpact: validation.cleanData.costImpact || 0,
        timeImpact: validation.cleanData.timeImpact || 0,
      }

      const newCO = await this.createEntity('changeOrders', coDataWithDefaults, CHANGE_ORDER_SCHEMA)

      await this.logActivity(
        newCO.projectId,
        'created_change_order',
        'changeOrder',
        newCO.id,
        `Created change order: ${newCO.title}`,
      )

      return newCO
    } catch (error) {
      console.error('Error creating change order:', error)
      throw error
    }
  }

  async getChangeOrder(changeOrderId) {
    const coRef = ref(database, `changeOrders/${changeOrderId}`)
    const snapshot = await get(coRef)
    return snapshot.exists() ? { id: changeOrderId, ...snapshot.val() } : null
  }

  async getChangeOrdersByProject(projectId) {
    const changeOrdersRef = ref(database, 'changeOrders')
    const projectCOsQuery = query(changeOrdersRef, orderByChild('projectId'), equalTo(projectId))
    const snapshot = await get(projectCOsQuery)

    if (!snapshot.exists()) return []
    return Object.entries(snapshot.val()).map(([id, data]) => ({
      id,
      ...data,
    }))
  }

  async getAllChangeOrders() {
    const changeOrdersRef = ref(database, 'changeOrders')
    const snapshot = await get(changeOrdersRef)
    if (!snapshot.exists()) return []

    return Object.entries(snapshot.val()).map(([id, data]) => ({
      id,
      ...data,
    }))
  }

  async updateChangeOrder(changeOrderId, updates) {
    try {
      return await this.updateEntity('changeOrders', changeOrderId, updates, CHANGE_ORDER_SCHEMA)
    } catch (error) {
      console.error('Error updating change order:', error)
      throw error
    }
  }

  async deleteChangeOrder(changeOrderId) {
    const coRef = ref(database, `changeOrders/${changeOrderId}`)
    await remove(coRef)
  }

  // ==================== ACTIVITY LOG ====================
  // TODO: This is now handled by ActivityService - remove these methods

  async logActivity(projectId, action, entityType, entityId, description) {
    try {
      const activityData = {
        projectId,
        userId: this.getCurrentUserId(),
        userName: this.getCurrentUserName(),
        action,
        entityType,
        entityId,
        description,
        timestamp: new Date().toISOString(),
      }

      // Sanitize activity data
      const cleanActivity = sanitizeForFirebase(activityData)

      const activityRef = ref(database, 'activityLog')
      const newActivityRef = push(activityRef)

      await set(newActivityRef, cleanActivity)
      return { id: newActivityRef.key, ...cleanActivity }
    } catch (error) {
      console.error('Error logging activity:', error)
      // Don't throw here as activity logging shouldn't break main operations
    }
  }

  async getActivityByProject(projectId) {
    const activityRef = ref(database, 'activityLog')
    const projectActivityQuery = query(activityRef, orderByChild('projectId'), equalTo(projectId))
    const snapshot = await get(projectActivityQuery)

    if (!snapshot.exists()) return []
    return Object.entries(snapshot.val()).map(([id, data]) => ({
      id,
      ...data,
    }))
  }

  // ==================== REAL-TIME LISTENERS ====================
  // TODO: Most of these have been migrated to repositories

  subscribeToProjectRFIs(projectId, callback) {
    const rfisRef = ref(database, 'rfis')
    const projectRFIsQuery = query(rfisRef, orderByChild('projectId'), equalTo(projectId))
    onValue(projectRFIsQuery, (snapshot) => {
      const rfis = snapshot.exists()
        ? Object.entries(snapshot.val()).map(([id, data]) => ({ id, ...data }))
        : []
      callback(rfis)
    })
    return projectRFIsQuery
  }

  subscribeToProjectSubmittals(projectId, callback) {
    const submittalsRef = ref(database, 'submittals')
    const projectSubmittalsQuery = query(
      submittalsRef,
      orderByChild('projectId'),
      equalTo(projectId),
    )
    onValue(projectSubmittalsQuery, (snapshot) => {
      const submittals = snapshot.exists()
        ? Object.entries(snapshot.val()).map(([id, data]) => ({ id, ...data }))
        : []
      callback(submittals)
    })
    return projectSubmittalsQuery
  }

  subscribeToProjectChangeOrders(projectId, callback) {
    const changeOrdersRef = ref(database, 'changeOrders')
    const projectCOsQuery = query(changeOrdersRef, orderByChild('projectId'), equalTo(projectId))
    onValue(projectCOsQuery, (snapshot) => {
      const changeOrders = snapshot.exists()
        ? Object.entries(snapshot.val()).map(([id, data]) => ({ id, ...data }))
        : []
      callback(changeOrders)
    })
    return projectCOsQuery
  }

  unsubscribe(queryRef) {
    off(queryRef)
  }

  // ==================== ANALYTICS & REPORTING ====================
  // TODO: Move to AnalyticsService or individual repositories

  async getProjectAnalytics(projectId) {
    try {
      const [tasks, rfis, submittals, changeOrders, activities] = await Promise.all([
        // These calls will fail now since methods were migrated
        // this.getTasksByProject(projectId),
        this.getRFIsByProject(projectId),
        this.getSubmittalsByProject(projectId),
        this.getChangeOrdersByProject(projectId),
        this.getActivityByProject(projectId),
      ])

      // Analytics logic here...
      return {
        // Analytics data
      }
    } catch (error) {
      console.error('Error getting project analytics:', error)
      throw error
    }
  }

  // ==================== MAINTENANCE & UTILITIES ====================

  async cleanupOldActivities(daysToKeep = 90) {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)
      const cutoffTimestamp = cutoffDate.toISOString()

      const activityRef = ref(database, 'activityLog')
      const snapshot = await get(activityRef)

      if (snapshot.exists()) {
        const activities = snapshot.val()
        const deletePromises = []

        Object.entries(activities).forEach(([id, activity]) => {
          if (activity.timestamp < cutoffTimestamp) {
            deletePromises.push(remove(ref(database, `activityLog/${id}`)))
          }
        })

        await Promise.all(deletePromises)
        return deletePromises.length
      }

      return 0
    } catch (error) {
      console.error('Error cleaning up old activities:', error)
      throw error
    }
  }

  async exportProjectData(projectId) {
    try {
      // This will need to be updated to use new repositories
      console.warn('exportProjectData needs to be updated for new repository architecture')
      return {
        error: 'Method needs migration to new repository architecture',
      }
    } catch (error) {
      console.error('Error exporting project data:', error)
      throw error
    }
  }

  // ==================== UTILITY METHODS ====================

  getCurrentUserId() {
    return getCurrentUserId() || 'system'
  }

  getCurrentUserName() {
    return getCurrentUserName() || 'System'
  }

  // Generic batch operations
  async batchUpdate(updates) {
    try {
      const cleanUpdates = deepClean(updates)
      const promises = Object.entries(cleanUpdates).map(([path, value]) => {
        const ref = ref(database, path)
        return set(ref, value)
      })

      await Promise.all(promises)
      return true
    } catch (error) {
      console.error('Error in batch update:', error)
      throw error
    }
  }

  // System health check
  async getSystemHealth() {
    try {
      // This needs to be updated to use new repositories
      console.warn('getSystemHealth needs to be updated for new repository architecture')
      return {
        status: 'needs_migration',
        message: 'Method needs migration to new repository architecture',
      }
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        lastChecked: new Date().toISOString(),
      }
    }
  }

  // Validation helpers - TODO: Move to individual repositories
  validateProjectData(projectData) {
    console.warn('validateProjectData moved to ProjectRepository')
    const validation = validateAndCleanForm(projectData, ['name', 'jobNumber'])
    return validation
  }

  validateTaskData(taskData) {
    console.warn('validateTaskData moved to TaskRepository')
    const validation = validateAndCleanForm(taskData, ['title'])
    return validation
  }
}

export default new FirebaseService()
