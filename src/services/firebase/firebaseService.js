// firebaseService.js - Rewritten with comprehensive data sanitization
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
import authService from '@/services/auth/authService'
import {
  sanitizeForFirebase,
  sanitizeWithSchema,
  validateAndCleanForm,
  deepClean,
  PROJECT_SCHEMA,
  TASK_SCHEMA,
  // Add more schemas as needed
} from '@/utils/index'

// Define data schemas for validation
const CLIENT_SCHEMA = {
  name: 'string',
  company: 'string',
  email: 'string',
  phone: 'string',
  address: 'string',
  notes: 'string'
}

const USER_SCHEMA = {
  name: 'string',
  email: 'string',
  role: 'string',
  phone: 'string',
  active: 'boolean'
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
  response: 'string'
}

const SUBMITTAL_SCHEMA = {
  title: 'string',
  description: 'string',
  status: 'string',
  projectId: 'string',
  submittedBy: 'string',
  reviewedBy: 'string',
  dueDate: 'date',
  comments: 'string'
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
  billable: 'boolean'
}

const DOCUMENT_SCHEMA = {
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
  uploadedByName: 'string'
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

  async createProject(projectData) {
    try {
      const validation = validateAndCleanForm(projectData, ['name', 'jobNumber'])
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${Object.values(validation.errors).join(', ')}`)
      }

      const newProject = await this.createEntity('projects', validation.cleanData, PROJECT_SCHEMA)

      // Log activity
      await this.logActivity(
        newProject.id,
        'created_project',
        'project',
        newProject.id,
        `Created project: ${newProject.name}`,
      )

      return newProject
    } catch (error) {
      console.error('Error creating project:', error)
      throw error
    }
  }

  async getProject(projectId) {
    const projectRef = ref(database, `projects/${projectId}`)
    const snapshot = await get(projectRef)
    return snapshot.exists() ? { id: projectId, ...snapshot.val() } : null
  }

  async getAllProjects() {
    const projectsRef = ref(database, 'projects')
    const snapshot = await get(projectsRef)
    if (!snapshot.exists()) return []

    return Object.entries(snapshot.val()).map(([id, data]) => ({
      id,
      ...data,
    }))
  }

  async getProjectsByClient(clientId) {
    const projectsRef = ref(database, 'projects')
    const clientProjectsQuery = query(projectsRef, orderByChild('clientId'), equalTo(clientId))
    const snapshot = await get(clientProjectsQuery)

    if (!snapshot.exists()) return []
    return Object.entries(snapshot.val()).map(([id, data]) => ({
      id,
      ...data,
    }))
  }

  async updateProject(projectId, updates) {
    try {
      const result = await this.updateEntity('projects', projectId, updates, PROJECT_SCHEMA)

      // Log significant updates
      if (updates.phase) {
        await this.logActivity(
          projectId,
          'updated_project_phase',
          'project',
          projectId,
          `Updated project phase to: ${updates.phase}`,
        )
      }

      return result
    } catch (error) {
      console.error('Error updating project:', error)
      throw error
    }
  }

  async deleteProject(projectId) {
    const projectRef = ref(database, `projects/${projectId}`)
    await remove(projectRef)
  }

  // ==================== USERS ====================

  async createUser(userData) {
    try {
      const validation = validateAndCleanForm(userData, ['name', 'email'])
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${Object.values(validation.errors).join(', ')}`)
      }

      return await this.createEntity('users', validation.cleanData, USER_SCHEMA)
    } catch (error) {
      console.error('Error creating user:', error)
      throw error
    }
  }

  async getUser(userId) {
    const userRef = ref(database, `users/${userId}`)
    const snapshot = await get(userRef)
    return snapshot.exists() ? { id: userId, ...snapshot.val() } : null
  }

  async getUserByEmail(email) {
    const usersRef = ref(database, 'users')
    const userQuery = query(usersRef, orderByChild('email'), equalTo(email))
    const snapshot = await get(userQuery)

    if (!snapshot.exists()) return null

    const userData = Object.entries(snapshot.val())[0]
    return { id: userData[0], ...userData[1] }
  }

  async getAllUsers() {
    const usersRef = ref(database, 'users')
    const snapshot = await get(usersRef)
    if (!snapshot.exists()) return []

    return Object.entries(snapshot.val()).map(([id, data]) => ({
      id,
      ...data,
    }))
  }

  async getUsersMinimal() {
    const usersRef = ref(database, 'users')
    const snapshot = await get(usersRef)

    if (!snapshot.exists()) return []

    return Object.entries(snapshot.val()).map(([id, data]) => ({
      id,
      name: data.name,
      email: data.email,
      active: data.active,
    }))
  }

  async updateUser(userId, updates) {
    try {
      return await this.updateEntity('users', userId, updates, USER_SCHEMA)
    } catch (error) {
      console.error('Error updating user:', error)
      throw error
    }
  }

  async deleteUser(userId) {
    const userRef = ref(database, `users/${userId}`)
    await remove(userRef)
  }

  // ==================== TASKS ============================

  async createTask(taskData) {
    try {
      const validation = validateAndCleanForm(taskData, ['title', 'projectId'])
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${Object.values(validation.errors).join(', ')}`)
      }

      // Add task-specific defaults
      const taskDataWithDefaults = {
        ...validation.cleanData,
        status: validation.cleanData.status || 'todo',
        priority: validation.cleanData.priority || 'medium',
        actualHours: 0,
        progress: 0,
      }

      const newTask = await this.createEntity('tasks', taskDataWithDefaults, TASK_SCHEMA)

      // Log activity
      await this.logActivity(
        newTask.projectId,
        'created_task',
        'task',
        newTask.id,
        `Created task: ${newTask.title}`,
      )

      return newTask
    } catch (error) {
      console.error('Error creating task:', error)
      throw error
    }
  }

  async getTask(taskId) {
    const taskRef = ref(database, `tasks/${taskId}`)
    const snapshot = await get(taskRef)
    return snapshot.exists() ? { id: taskId, ...snapshot.val() } : null
  }

  async getTasksByProject(projectId) {
    const tasksRef = ref(database, 'tasks')
    const projectTasksQuery = query(tasksRef, orderByChild('projectId'), equalTo(projectId))
    const snapshot = await get(projectTasksQuery)

    if (!snapshot.exists()) return []
    return Object.entries(snapshot.val()).map(([id, data]) => ({
      id,
      ...data,
    }))
  }

  async getAllTasks() {
    const tasksRef = ref(database, 'tasks')
    const snapshot = await get(tasksRef)
    if (!snapshot.exists()) return []

    return Object.entries(snapshot.val()).map(([id, data]) => ({
      id,
      ...data,
    }))
  }

  async updateTask(taskId, updates) {
    try {
      const result = await this.updateEntity('tasks', taskId, updates, TASK_SCHEMA)

      // Log significant updates
      if (updates.status) {
        const task = await this.getTask(taskId)
        await this.logActivity(
          task.projectId,
          'updated_task_status',
          'task',
          taskId,
          `Updated task "${task.title}" status to: ${updates.status}`,
        )
      }

      return result
    } catch (error) {
      console.error('Error updating task:', error)
      throw error
    }
  }

  async deleteTask(taskId) {
    const taskRef = ref(database, `tasks/${taskId}`)
    const commentsRef = ref(database, `taskComments/${taskId}`)
    await Promise.all([remove(taskRef), remove(commentsRef)])
  }

  // ==================== RFIs ====================

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

      const newSubmittal = await this.createEntity('submittals', submittalDataWithDefaults, SUBMITTAL_SCHEMA)

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

  // ==================== DOCUMENTS ====================

  async createDocument(documentData) {
    try {
      const validation = validateAndCleanForm(documentData, ['name', 'projectId'])
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${Object.values(validation.errors).join(', ')}`)
      }

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
      }

      const newDoc = await this.createEntity('documents', docDataWithDefaults, DOCUMENT_SCHEMA)

      // Log activity
      await this.logActivity(
        newDoc.projectId,
        'uploaded_document',
        'document',
        newDoc.id,
        `Uploaded document: ${newDoc.name}`,
      )

      return newDoc
    } catch (error) {
      console.error('Error creating document:', error)
      throw error
    }
  }

  async getDocument(documentId) {
    const docRef = ref(database, `documents/${documentId}`)
    const snapshot = await get(docRef)
    return snapshot.exists() ? { id: documentId, ...snapshot.val() } : null
  }

  async getDocumentsByProject(projectId, options = {}) {
    const documentsRef = ref(database, 'documents')
    const projectDocsQuery = query(documentsRef, orderByChild('projectId'), equalTo(projectId))
    const snapshot = await get(projectDocsQuery)

    if (!snapshot.exists()) return []

    let documents = Object.entries(snapshot.val()).map(([id, data]) => ({
      id,
      ...data,
    }))

    // Apply filters
    if (options.category) {
      documents = documents.filter(doc => doc.category === options.category)
    }

    if (options.status) {
      documents = documents.filter(doc => doc.status === options.status)
    }

    // Sort by upload date (newest first)
    documents.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))

    // Apply limit if specified
    if (options.limit) {
      documents = documents.slice(0, options.limit)
    }

    return documents
  }

  async updateDocument(documentId, updates) {
    try {
      // Add approval timestamp if status is being approved
      if (updates.status === 'approved' && !updates.approvedAt) {
        updates.approvedAt = new Date().toISOString()
        updates.approvedBy = this.getCurrentUserId()
        updates.approvedByName = this.getCurrentUserName()
      }

      return await this.updateEntity('documents', documentId, updates, DOCUMENT_SCHEMA)
    } catch (error) {
      console.error('Error updating document:', error)
      throw error
    }
  }

  async updateDocumentStatus(documentId, status, comments = '', reviewedBy = null) {
    try {
      const updates = {
        status: status,
        reviewedAt: new Date().toISOString(),
        reviewedBy: reviewedBy || this.getCurrentUserId(),
        reviewedByName: this.getCurrentUserName(),
        reviewComments: comments,
      }

      if (status === 'approved') {
        updates.approvedAt = new Date().toISOString()
        updates.approvedBy = updates.reviewedBy
        updates.approvedByName = updates.reviewedByName
      }

      const result = await this.updateEntity('documents', documentId, updates, DOCUMENT_SCHEMA)

      // Log activity
      const doc = await this.getDocument(documentId)
      if (doc) {
        await this.logActivity(
          doc.projectId,
          `document_${status}`,
          'document',
          documentId,
          `${status.charAt(0).toUpperCase() + status.slice(1)} document: ${doc.name}`,
        )
      }

      return result
    } catch (error) {
      console.error('Error updating document status:', error)
      throw error
    }
  }

  async deleteDocument(documentId) {
    const docRef = ref(database, `documents/${documentId}`)
    await remove(docRef)
  }

  // ==================== ACTIVITY LOG ====================

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

  subscribeToProjects(callback) {
    const projectsRef = ref(database, 'projects')
    onValue(projectsRef, (snapshot) => {
      const projects = snapshot.exists()
        ? Object.entries(snapshot.val()).map(([id, data]) => ({ id, ...data }))
        : []
      callback(projects)
    })
    return projectsRef
  }

  subscribeToProject(projectId, callback) {
    const projectRef = ref(database, `projects/${projectId}`)
    onValue(projectRef, (snapshot) => {
      const data = snapshot.exists() ? { id: projectId, ...snapshot.val() } : null
      callback(data)
    })
    return projectRef
  }

  subscribeToProjectTasks(projectId, callback) {
    const tasksRef = ref(database, 'tasks')
    const projectTasksQuery = query(tasksRef, orderByChild('projectId'), equalTo(projectId))

    onValue(projectTasksQuery, (snapshot) => {
      const tasks = snapshot.exists()
        ? Object.entries(snapshot.val()).map(([id, data]) => ({ id, ...data }))
        : []

      // Sort by due date and priority
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
  }

  subscribeToProjectDocuments(projectId, callback) {
    const documentsRef = ref(database, 'documents')
    const projectDocsQuery = query(documentsRef, orderByChild('projectId'), equalTo(projectId))

    onValue(projectDocsQuery, (snapshot) => {
      const documents = snapshot.exists()
        ? Object.entries(snapshot.val()).map(([id, data]) => ({ id, ...data }))
        : []

      // Sort by upload date (newest first)
      documents.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))

      callback(documents)
    })

    return projectDocsQuery
  }

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

  subscribeToUserTasks(userId, callback) {
    const tasksRef = ref(database, 'tasks')
    const userTasksQuery = query(tasksRef, orderByChild('assignedTo'), equalTo(userId))

    onValue(userTasksQuery, (snapshot) => {
      const tasks = snapshot.exists()
        ? Object.entries(snapshot.val()).map(([id, data]) => ({ id, ...data }))
        : []
      callback(tasks)
    })

    return userTasksQuery
  }

  unsubscribe(queryRef) {
    off(queryRef)
  }

  // ==================== ADVANCED DOCUMENT METHODS ====================

  async getDocumentVersionHistory(documentId) {
    const doc = await this.getDocument(documentId)
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
  }

  async updateDocumentVersion(documentId, newFileData, updateData = {}) {
    try {
      const currentDoc = await this.getDocument(documentId)
      if (!currentDoc) {
        throw new Error('Document not found')
      }

      // Create new version data
      const newVersionData = {
        ...updateData,
        version: currentDoc.version + 1,
        previousVersions: [
          ...currentDoc.previousVersions,
          {
            version: currentDoc.version,
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
      }

      const result = await this.updateEntity('documents', documentId, newVersionData, DOCUMENT_SCHEMA)

      // Log activity
      await this.logActivity(
        currentDoc.projectId,
        'updated_document_version',
        'document',
        documentId,
        `Updated ${currentDoc.name} to version ${newVersionData.version}`,
      )

      return { id: documentId, ...currentDoc, ...result }
    } catch (error) {
      console.error('Error updating document version:', error)
      throw error
    }
  }

  async searchDocuments(projectId, searchTerm) {
    const documents = await this.getDocumentsByProject(projectId)
    const term = searchTerm.toLowerCase()

    return documents.filter(
      (doc) =>
        doc.name?.toLowerCase().includes(term) ||
        doc.description?.toLowerCase().includes(term) ||
        doc.tags?.some((tag) => tag.toLowerCase().includes(term)),
    )
  }

  // ==================== TASK COMMENTS ====================

  async addTaskComment(taskId, comment) {
    try {
      const commentData = {
        text: comment,
        taskId: taskId,
        createdBy: this.getCurrentUserId(),
        createdByName: this.getCurrentUserName(),
      }

      return await this.createEntity(`taskComments/${taskId}`, commentData)
    } catch (error) {
      console.error('Error adding task comment:', error)
      throw error
    }
  }

  async getTaskComments(taskId) {
    const commentsRef = ref(database, `taskComments/${taskId}`)
    const snapshot = await get(commentsRef)

    if (!snapshot.exists()) return []
    return Object.entries(snapshot.val())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }

  // ==================== BULK OPERATIONS ====================

  async bulkUpdateTasks(taskIds, updates) {
    try {
      const cleanUpdates = sanitizeForFirebase(updates)
      const promises = taskIds.map((taskId) => this.updateTask(taskId, cleanUpdates))
      return await Promise.all(promises)
    } catch (error) {
      console.error('Error in bulk update tasks:', error)
      throw error
    }
  }

  async bulkUpdateDocumentStatus(documentIds, status, comments = '') {
    try {
      const promises = documentIds.map((id) => this.updateDocumentStatus(id, status, comments))
      return await Promise.all(promises)
    } catch (error) {
      console.error('Error in bulk update document status:', error)
      throw error
    }
  }

  // ==================== ANALYTICS & REPORTING ====================

  async getProjectAnalytics(projectId) {
    try {
      const [tasks, rfis, submittals, changeOrders, activities] = await Promise.all([
        this.getTasksByProject(projectId),
        this.getRFIsByProject(projectId),
        this.getSubmittalsByProject(projectId),
        this.getChangeOrdersByProject(projectId),
        this.getActivityByProject(projectId),
      ])

      // Task analytics
      const taskStats = {
        total: tasks.length,
        completed: tasks.filter((t) => t.status === 'complete').length,
        inProgress: tasks.filter((t) => t.status === 'in-progress').length,
        overdue: tasks.filter((t) => {
          return t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'complete'
        }).length,
      }

      // RFI analytics
      const rfiStats = {
        total: rfis.length,
        open: rfis.filter((r) => r.status === 'open').length,
        answered: rfis.filter((r) => r.status === 'answered').length,
        closed: rfis.filter((r) => r.status === 'closed').length,
      }

      // Submittal analytics
      const submittalStats = {
        total: submittals.length,
        pending: submittals.filter((s) => s.status === 'pending').length,
        approved: submittals.filter((s) => s.status === 'approved').length,
        rejected: submittals.filter((s) => s.status === 'rejected').length,
      }

      // Change order analytics
      const changeOrderStats = {
        total: changeOrders.length,
        proposed: changeOrders.filter((co) => co.status === 'proposed').length,
        approved: changeOrders.filter((co) => co.status === 'approved').length,
        totalCostImpact: changeOrders
          .filter((co) => co.status === 'approved')
          .reduce((sum, co) => sum + (co.costImpact || 0), 0),
      }

      return {
        tasks: taskStats,
        rfis: rfiStats,
        submittals: submittalStats,
        changeOrders: changeOrderStats,
        activityCount: activities.length,
        lastActivity:
          activities.length > 0
            ? activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0]
            : null,
      }
    } catch (error) {
      console.error('Error getting project analytics:', error)
      throw error
    }
  }

  async getTaskStatistics(projectId) {
    try {
      const tasks = await this.getTasksByProject(projectId)

      const stats = {
        total: tasks.length,
        completed: tasks.filter((t) => t.status === 'complete').length,
        inProgress: tasks.filter((t) => t.status === 'in-progress').length,
        overdue: tasks.filter((t) => {
          return t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'complete'
        }).length,
        byPriority: {
          critical: tasks.filter((t) => t.priority === 'critical').length,
          high: tasks.filter((t) => t.priority === 'high').length,
          medium: tasks.filter((t) => t.priority === 'medium').length,
          low: tasks.filter((t) => t.priority === 'low').length,
        },
        totalEstimatedHours: tasks.reduce((sum, task) => sum + (task.estimatedHours || 0), 0),
        totalActualHours: tasks.reduce((sum, task) => sum + (task.actualHours || 0), 0),
        averageProgress:
          tasks.length > 0
            ? tasks.reduce((sum, task) => sum + (task.progress || 0), 0) / tasks.length
            : 0,
      }

      stats.completionRate = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0

      return stats
    } catch (error) {
      console.error('Error getting task statistics:', error)
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
      const [project, tasks, rfis, submittals, changeOrders, documents, activities] =
        await Promise.all([
          this.getProject(projectId),
          this.getTasksByProject(projectId),
          this.getRFIsByProject(projectId),
          this.getSubmittalsByProject(projectId),
          this.getChangeOrdersByProject(projectId),
          this.getDocumentsByProject(projectId),
          this.getActivityByProject(projectId),
        ])

      return {
        project,
        tasks,
        rfis,
        submittals,
        changeOrders,
        documents,
        activities,
        exportedAt: new Date().toISOString(),
        exportedBy: this.getCurrentUserId(),
      }
    } catch (error) {
      console.error('Error exporting project data:', error)
      throw error
    }
  }

  // ==================== UTILITY METHODS ====================

  getCurrentUserId() {
    return authService.getCurrentUserId() || 'system'
  }

  getCurrentUserName() {
    return authService.getCurrentUserName() || 'System'
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
      const [projectCount, userCount, taskCount] = await Promise.all([
        this.getAllProjects().then((p) => p.length),
        this.getAllUsers().then((u) => u.length),
        this.getAllTasks().then((t) => t.length),
      ])

      return {
        status: 'healthy',
        counts: {
          projects: projectCount,
          users: userCount,
          tasks: taskCount,
        },
        lastChecked: new Date().toISOString(),
      }
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        lastChecked: new Date().toISOString(),
      }
    }
  }

  // Validation helpers
  validateProjectData(projectData) {
    const validation = validateAndCleanForm(projectData, ['name', 'jobNumber'])

    // Additional custom validation
    if (projectData.cost && projectData.cost < 0) {
      validation.errors.cost = 'Project cost cannot be negative'
      validation.isValid = false
    }

    if (projectData.startDate && projectData.endDate) {
      if (new Date(projectData.startDate) > new Date(projectData.endDate)) {
        validation.errors.endDate = 'Start date cannot be after end date'
        validation.isValid = false
      }
    }

    return validation
  }

  validateTaskData(taskData) {
    const validation = validateAndCleanForm(taskData, ['title', 'projectId'])

    // Additional custom validation
    if (taskData.estimatedHours && taskData.estimatedHours < 0) {
      validation.errors.estimatedHours = 'Estimated hours cannot be negative'
      validation.isValid = false
    }

    if (taskData.progress && (taskData.progress < 0 || taskData.progress > 100)) {
      validation.errors.progress = 'Progress must be between 0 and 100'
      validation.isValid = false
    }

    return validation
  }
}

export default new FirebaseService()
