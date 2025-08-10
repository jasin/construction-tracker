// firebaseService.js
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
import { database } from './firebase-config' // Your Firebase config file
import authService from './authService'

class FirebaseService {
  // ==================== CLIENTS ====================

  async createClient(clientData) {
    const clientsRef = ref(database, 'clients')
    const newClientRef = push(clientsRef)
    const clientWithTimestamp = {
      ...clientData,
      createdAt: new Date().toISOString(),
      createdBy: this.getCurrentUserId(),
    }
    await set(newClientRef, clientWithTimestamp)
    return { id: newClientRef.key, ...clientWithTimestamp }
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
    const clientRef = ref(database, `clients/${clientId}`)
    await update(clientRef, updates)
    return { id: clientId, ...updates }
  }

  async deleteClient(clientId) {
    const clientRef = ref(database, `clients/${clientId}`)
    await remove(clientRef)
  }

  // ==================== PROJECTS ====================

  async createProject(projectData) {
    const projectsRef = ref(database, 'projects')
    const newProjectRef = push(projectsRef)
    const projectWithTimestamp = {
      ...projectData,
      createdAt: new Date().toISOString(),
      createdBy: this.getCurrentUserId(),
    }
    await set(newProjectRef, projectWithTimestamp)

    // Add activity log entry
    await this.logActivity(
      newProjectRef.key,
      'created_project',
      'project',
      newProjectRef.key,
      `Created project: ${projectData.name}`,
    )

    return { id: newProjectRef.key, ...projectWithTimestamp }
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

  async getProjectsByPhase(phase) {
    const projectsRef = ref(database, 'projects')
    const phaseProjectsQuery = query(projectsRef, orderByChild('phase'), equalTo(phase))
    const snapshot = await get(phaseProjectsQuery)

    if (!snapshot.exists()) return []
    return Object.entries(snapshot.val()).map(([id, data]) => ({
      id,
      ...data,
    }))
  }

  async updateProject(projectId, updates) {
    const projectRef = ref(database, `projects/${projectId}`)
    await update(projectRef, updates)

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

    return { id: projectId, ...updates }
  }

  async deleteProject(projectId) {
    const projectRef = ref(database, `projects/${projectId}`)
    await remove(projectRef)
  }

  // ==================== USERS ====================

  async createUser(userData) {
    const usersRef = ref(database, 'users')
    const newUserRef = push(usersRef)
    await set(newUserRef, userData)
    return { id: newUserRef.key, ...userData }
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

    const userData = Object.entries(snapshot.val())[0] // Get first match
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

  async updateUser(userId, updates) {
    const userRef = ref(database, `users/${userId}`)
    await update(userRef, updates)
    return { id: userId, ...updates }
  }

  async deleteUser(userId) {
    const userRef = ref(database, `users/${userId}`)
    await remove(userRef)
  }

  // ==================== DOCUMENTS ====================

  async createDocument(documentData) {
    const documentsRef = ref(database, 'documents')
    const newDocRef = push(documentsRef)
    const docWithTimestamp = {
      ...documentData,
      uploadedAt: new Date().toISOString(),
      uploadedBy: this.getCurrentUserId(),
      version: documentData.version || 1,
      status: documentData.status || 'pending',
    }
    await set(newDocRef, docWithTimestamp)

    await this.logActivity(
      documentData.projectId,
      'uploaded_document',
      'document',
      newDocRef.key,
      `Uploaded document: ${documentData.name}`,
    )

    return { id: newDocRef.key, ...docWithTimestamp }
  }

  async getDocument(documentId) {
    const docRef = ref(database, `documents/${documentId}`)
    const snapshot = await get(docRef)
    return snapshot.exists() ? { id: documentId, ...snapshot.val() } : null
  }

  async getDocumentsByProject(projectId) {
    const documentsRef = ref(database, 'documents')
    const projectDocsQuery = query(documentsRef, orderByChild('projectId'), equalTo(projectId))
    const snapshot = await get(projectDocsQuery)

    if (!snapshot.exists()) return []
    return Object.entries(snapshot.val()).map(([id, data]) => ({
      id,
      ...data,
    }))
  }

  async getDocumentsByCategory(projectId, category) {
    const documents = await this.getDocumentsByProject(projectId)
    return documents.filter((doc) => doc.category === category)
  }

  async updateDocument(documentId, updates) {
    const docRef = ref(database, `documents/${documentId}`)

    // Add approval timestamp if status is being approved
    if (updates.status === 'approved' && !updates.approvedAt) {
      updates.approvedAt = new Date().toISOString()
      updates.approvedBy = this.getCurrentUserId()
    }

    await update(docRef, updates)
    return { id: documentId, ...updates }
  }

  async deleteDocument(documentId) {
    const docRef = ref(database, `documents/${documentId}`)
    await remove(docRef)
  }

  // ==================== RFIs ====================

  async createRFI(rfiData) {
    const rfisRef = ref(database, 'rfis')
    const newRFIRef = push(rfisRef)
    const rfiWithTimestamp = {
      ...rfiData,
      createdAt: new Date().toISOString(),
      status: 'draft',
    }
    await set(newRFIRef, rfiWithTimestamp)

    await this.logActivity(
      rfiData.projectId,
      'created_rfi',
      'rfi',
      newRFIRef.key,
      `Created RFI: ${rfiData.title}`,
    )

    return { id: newRFIRef.key, ...rfiWithTimestamp }
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

  async submitRFI(rfiId) {
    const updates = {
      status: 'submitted',
      submittedAt: new Date().toISOString(),
    }
    return await this.updateRFI(rfiId, updates)
  }

  async answerRFI(rfiId, response) {
    const updates = {
      status: 'answered',
      response: response,
      answeredAt: new Date().toISOString(),
    }
    return await this.updateRFI(rfiId, updates)
  }

  async closeRFI(rfiId) {
    const updates = {
      status: 'closed',
      closedAt: new Date().toISOString(),
    }
    return await this.updateRFI(rfiId, updates)
  }

  async updateRFI(rfiId, updates) {
    const rfiRef = ref(database, `rfis/${rfiId}`)
    await update(rfiRef, updates)
    return { id: rfiId, ...updates }
  }

  async deleteRFI(rfiId) {
    const rfiRef = ref(database, `rfis/${rfiId}`)
    await remove(rfiRef)
  }

  // ==================== SUBMITTALS ====================

  async createSubmittal(submittalData) {
    const submittalsRef = ref(database, 'submittals')
    const newSubmittalRef = push(submittalsRef)
    const submittalWithTimestamp = {
      ...submittalData,
      createdAt: new Date().toISOString(),
      status: 'draft',
    }
    await set(newSubmittalRef, submittalWithTimestamp)

    await this.logActivity(
      submittalData.projectId,
      'created_submittal',
      'submittal',
      newSubmittalRef.key,
      `Created submittal: ${submittalData.title}`,
    )

    return { id: newSubmittalRef.key, ...submittalWithTimestamp }
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

  async submitSubmittal(submittalId) {
    const updates = {
      status: 'submitted',
      submittedAt: new Date().toISOString(),
    }
    return await this.updateSubmittal(submittalId, updates)
  }

  async approveSubmittal(submittalId, comments = '') {
    const updates = {
      status: 'approved',
      comments: comments,
      reviewedAt: new Date().toISOString(),
    }
    return await this.updateSubmittal(submittalId, updates)
  }

  async rejectSubmittal(submittalId, comments) {
    const updates = {
      status: 'rejected',
      comments: comments,
      reviewedAt: new Date().toISOString(),
    }
    return await this.updateSubmittal(submittalId, updates)
  }

  async updateSubmittal(submittalId, updates) {
    const submittalRef = ref(database, `submittals/${submittalId}`)
    await update(submittalRef, updates)
    return { id: submittalId, ...updates }
  }

  async deleteSubmittal(submittalId) {
    const submittalRef = ref(database, `submittals/${submittalId}`)
    await remove(submittalRef)
  }

  // ==================== CHANGE ORDERS ====================

  async createChangeOrder(changeOrderData) {
    const changeOrdersRef = ref(database, 'changeOrders')
    const newCORef = push(changeOrdersRef)
    const coWithTimestamp = {
      ...changeOrderData,
      createdAt: new Date().toISOString(),
      status: 'proposed',
      billable: false,
    }
    await set(newCORef, coWithTimestamp)

    await this.logActivity(
      changeOrderData.projectId,
      'created_change_order',
      'changeOrder',
      newCORef.key,
      `Created change order: ${changeOrderData.title}`,
    )

    return { id: newCORef.key, ...coWithTimestamp }
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

  async approveChangeOrder(changeOrderId) {
    const updates = {
      status: 'approved',
      approvedAt: new Date().toISOString(),
      approvedBy: this.getCurrentUserId(),
    }
    return await this.updateChangeOrder(changeOrderId, updates)
  }

  async rejectChangeOrder(changeOrderId) {
    const updates = {
      status: 'rejected',
      approvedAt: new Date().toISOString(),
      approvedBy: this.getCurrentUserId(),
    }
    return await this.updateChangeOrder(changeOrderId, updates)
  }

  async completeChangeOrderWork(changeOrderId) {
    const updates = {
      status: 'work-completed',
      workCompletedAt: new Date().toISOString(),
      billable: true,
    }
    return await this.updateChangeOrder(changeOrderId, updates)
  }

  async updateChangeOrder(changeOrderId, updates) {
    const coRef = ref(database, `changeOrders/${changeOrderId}`)
    await update(coRef, updates)
    return { id: changeOrderId, ...updates }
  }

  async deleteChangeOrder(changeOrderId) {
    const coRef = ref(database, `changeOrders/${changeOrderId}`)
    await remove(coRef)
  }

  // ==================== TASK ============================

  async createTask(taskData) {
    const tasksRef = ref(database, 'tasks')
    const newTaskRef = push(tasksRef)
    const taskWithTimestamp = {
      ...taskData,
      createdAt: new Date().toISOString(),
      createdBy: this.getCurrentUserId(),
      updatedAt: new Date().toISOString(),
      actualHours: 0,
      progress: 0
    }
    await set(newTaskRef, taskWithTimestamp)

    // Log activity
    await this.logActivity(
      taskData.projectId,
      'created_task',
      'task',
      newTaskRef.key,
      `Created task: ${taskData.title}`,
    )

    return { id: newTaskRef.key, ...taskWithTimestamp }
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

  async getTasksByAssignee(userId) {
    const tasksRef = ref(database, 'tasks')
    const assigneeTasksQuery = query(tasksRef, orderByChild('assignedTo'), equalTo(userId))
    const snapshot = await get(assigneeTasksQuery)

    if (!snapshot.exists()) return []
    return Object.entries(snapshot.val()).map(([id, data]) => ({
      id,
      ...data,
    }))
  }

  async getTasksByStatus(projectId, status) {
    const tasks = await this.getTasksByProject(projectId)
    return tasks.filter((task) => task.status === status)
  }

  async getOverdueTasks(projectId = null) {
    const now = new Date().toISOString()
    let tasks = []

    if (projectId) {
      tasks = await this.getTasksByProject(projectId)
    } else {
      tasks = await this.getAllTasks()
    }

    return tasks.filter((task) => {
      return task.dueDate &&
             task.dueDate < now &&
             task.status !== 'complete'
    })
  }

  async updateTask(taskId, updates) {
    const taskRef = ref(database, `tasks/${taskId}`)
    const updateData = {
      ...updates,
      updatedAt: new Date().toISOString(),
      updatedBy: this.getCurrentUserId()
    }

    await update(taskRef, updateData)

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

    return { id: taskId, ...updateData }
  }

  async completeTask(taskId, actualHours = null) {
    const updates = {
      status: 'complete',
      completedAt: new Date().toISOString(),
      completedBy: this.getCurrentUserId(),
      progress: 100
    }

    if (actualHours !== null) {
      updates.actualHours = actualHours
    }

    return await this.updateTask(taskId, updates)
  }

  async assignTask(taskId, userId) {
    const updates = {
      assignedTo: userId,
      assignedAt: new Date().toISOString(),
      assignedBy: this.getCurrentUserId()
    }

    const task = await this.getTask(taskId)
    await this.logActivity(
      task.projectId,
      'assigned_task',
      'task',
      taskId,
      `Assigned task "${task.title}" to user: ${userId}`,
    )

    return await this.updateTask(taskId, updates)
  }

  async updateTaskProgress(taskId, progress) {
    const updates = {
      progress: Math.max(0, Math.min(100, progress)) // Clamp between 0-100
    }

    // Auto-complete if progress reaches 100%
    if (progress >= 100) {
      updates.status = 'complete'
      updates.completedAt = new Date().toISOString()
      updates.completedBy = this.getCurrentUserId()
    }

    return await this.updateTask(taskId, updates)
  }

  async addTaskComment(taskId, comment) {
    const commentsRef = ref(database, `taskComments/${taskId}`)
    const newCommentRef = push(commentsRef)
    const commentData = {
      text: comment,
      createdAt: new Date().toISOString(),
      createdBy: this.getCurrentUserId(),
      createdByName: this.getCurrentUserName()
    }

    await set(newCommentRef, commentData)
    return { id: newCommentRef.key, ...commentData }
  }

  async getTaskComments(taskId) {
    const commentsRef = ref(database, `taskComments/${taskId}`)
    const snapshot = await get(commentsRef)

    if (!snapshot.exists()) return []
    return Object.entries(snapshot.val())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) // Newest first
  }

  async deleteTask(taskId) {
    const taskRef = ref(database, `tasks/${taskId}`)
    const commentsRef = ref(database, `taskComments/${taskId}`)

    // Delete task and all its comments
    await Promise.all([
      remove(taskRef),
      remove(commentsRef)
    ])
  }

  // ==================== ACTIVITY LOG ====================

  async logActivity(projectId, action, entityType, entityId, description) {
    const activityRef = ref(database, 'activityLog')
    const newActivityRef = push(activityRef)
    const activity = {
      projectId,
      userId: this.getCurrentUserId(),
      userName: this.getCurrentUserName(),
      action,
      entityType,
      entityId,
      description,
      timestamp: new Date().toISOString(),
    }
    await set(newActivityRef, activity)
    return { id: newActivityRef.key, ...activity }
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

  subscribeToProjectTasks(projectId, callback) {
    const tasksRef = ref(database, 'tasks')
    const projectTasksQuery = query(tasksRef, orderByChild('projectId'), equalTo(projectId))

    onValue(projectTasksQuery, (snapshot) => {
      const tasks = snapshot.exists()
        ? Object.entries(snapshot.val()).map(([id, data]) => ({ id, ...data }))
        : []

      // Sort by due date and priority
      tasks.sort((a, b) => {
        // First sort by due date (nulls last)
        if (a.dueDate && !b.dueDate) return -1
        if (!a.dueDate && b.dueDate) return 1
        if (a.dueDate && b.dueDate) {
          const dateComparison = new Date(a.dueDate) - new Date(b.dueDate)
          if (dateComparison !== 0) return dateComparison
        }

        // Then by priority
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
        return (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2)
      })

      callback(tasks)
    })

    return projectTasksQuery
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

  subscribeToTaskComments(taskId, callback) {
    const commentsRef = ref(database, `taskComments/${taskId}`)

    onValue(commentsRef, (snapshot) => {
      const comments = snapshot.exists()
        ? Object.entries(snapshot.val())
            .map(([id, data]) => ({ id, ...data }))
            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)) // Oldest first for comments
        : []
      callback(comments)
    })

    return commentsRef
  }

  subscribeToProject(projectId, callback) {
    const projectRef = ref(database, `projects/${projectId}`)
    onValue(projectRef, (snapshot) => {
      const data = snapshot.exists() ? { id: projectId, ...snapshot.val() } : null
      callback(data)
    })
    return projectRef
  }

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

  // ==================== UTILITY METHODS ====================

  async getAllTasks() {
    const tasksRef = ref(database, 'tasks')
    const snapshot = await get(tasksRef)
    if (!snapshot.exists()) return []

    return Object.entries(snapshot.val()).map(([id, data]) => ({
      id,
      ...data,
    }))
  }

  async getTaskStatistics(projectId) {
    const tasks = await this.getTasksByProject(projectId)

    const stats = {
      total: tasks.length,
      completed: tasks.filter(t => t.status === 'complete').length,
      inProgress: tasks.filter(t => t.status === 'in-progress').length,
      overdue: tasks.filter(t => {
        return t.dueDate &&
               new Date(t.dueDate) < new Date() &&
               t.status !== 'complete'
      }).length,
      byPriority: {
        critical: tasks.filter(t => t.priority === 'critical').length,
        high: tasks.filter(t => t.priority === 'high').length,
        medium: tasks.filter(t => t.priority === 'medium').length,
        low: tasks.filter(t => t.priority === 'low').length
      },
      totalEstimatedHours: tasks.reduce((sum, task) => sum + (task.estimatedHours || 0), 0),
      totalActualHours: tasks.reduce((sum, task) => sum + (task.actualHours || 0), 0),
      averageProgress: tasks.length > 0
        ? tasks.reduce((sum, task) => sum + (task.progress || 0), 0) / tasks.length
        : 0
    }

    stats.completionRate = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0

    return stats
  }

  // Bulk operations
  async bulkUpdateTasks(taskIds, updates) {
    const promises = taskIds.map(taskId => this.updateTask(taskId, updates))
    return await Promise.all(promises)
  }

  async bulkAssignTasks(taskIds, userId) {
    const promises = taskIds.map(taskId => this.assignTask(taskId, userId))
    return await Promise.all(promises)
  }

  // Task dependencies
  async checkTaskDependencies(taskId) {
    const task = await this.getTask(taskId)
    if (!task || !task.dependencies || task.dependencies.length === 0) {
      return { canStart: true, blockedBy: [] }
    }

    const dependencies = await Promise.all(
      task.dependencies.map(depId => this.getTask(depId))
    )

    const blockedBy = dependencies.filter(dep => dep && dep.status !== 'complete')

    return {
      canStart: blockedBy.length === 0,
      blockedBy: blockedBy.map(dep => ({ id: dep.id, title: dep.title }))
    }
  }

  // Get current user ID
  getCurrentUserId() {
    return authService.getCurrentUserId()
  }

  // Get current user name
  getCurrentUserName() {
    return authService.getCurrentUserName()
  }

  // Batch operations for better performance
  async batchUpdate(updates) {
    const promises = Object.entries(updates).map(([path, value]) => {
      const ref = ref(database, path)
      return set(ref, value)
    })

    await Promise.all(promises)
  }

  // Get dashboard data in one call
  async getDashboardData(userId) {
    const [projects, rfis, submittals, changeOrders] = await Promise.all([
      this.getAllProjects(),
      this.getAllRFIs(),
      this.getAllSubmittals(),
      this.getAllChangeOrders(),
    ])

    // Filter by user's projects
    const user = await this.getUser(userId)
    const userProjectIds = user?.projects ? Object.keys(user.projects) : []

    return {
      projects: projects.filter((p) => userProjectIds.includes(p.id)),
      rfis: rfis.filter((r) => userProjectIds.includes(r.projectId)),
      submittals: submittals.filter((s) => userProjectIds.includes(s.projectId)),
      changeOrders: changeOrders.filter((co) => userProjectIds.includes(co.projectId)),
    }
  }

  // Helper methods for getting all entities (for dashboard/reports)
  async getAllRFIs() {
    const rfisRef = ref(database, 'rfis')
    const snapshot = await get(rfisRef)
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

  async getAllChangeOrders() {
    const changeOrdersRef = ref(database, 'changeOrders')
    const snapshot = await get(changeOrdersRef)
    if (!snapshot.exists()) return []

    return Object.entries(snapshot.val()).map(([id, data]) => ({
      id,
      ...data,
    }))
  }
}

export default new FirebaseService()
