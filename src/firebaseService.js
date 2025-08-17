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

  // Get minimal user data (just ID, name, email) for lookups
  async getUsersMinimal() {
    const usersRef = ref(database, 'users')
    const snapshot = await get(usersRef)

    if (!snapshot.exists()) return []

    return Object.entries(snapshot.val()).map(([id, data]) => ({
      id,
      name: data.name,
      email: data.email,
      active: data.active
    }))
  }

  // Get users by project (if you have project-user relationships)
  async getUsersByProject(projectId) {
    const usersRef = ref(database, 'users')
    const projectUsersQuery = query(
      usersRef,
      orderByChild(`projects/${projectId}`),
      equalTo(true)
    )
    const snapshot = await get(projectUsersQuery)

    if (!snapshot.exists()) return []
    return Object.entries(snapshot.val()).map(([id, data]) => ({
      id,
      ...data,
    }))
  }

  // Get multiple users by IDs (batch operation)
  async getUsersByIds(userIds) {
    if (!userIds || userIds.length === 0) return []

    // Firebase doesn't have native "IN" queries, so we do multiple gets
    // For better performance, you might want to use a cloud function
    const promises = userIds.map(id => this.getUser(id))
    const results = await Promise.all(promises)
    return results.filter(Boolean) // Remove null results
  }

  // Get users assigned to any task in a project
  async getUsersAssignedToProject(projectId) {
    try {
      // Get all tasks for the project
      const tasks = await this.getTasksByProject(projectId)

      // Extract unique user IDs
      const userIds = [...new Set(
        tasks
          .map(task => task.assignedTo)
          .filter(Boolean) // Remove null/undefined
      )]

      if (userIds.length === 0) return []

      // Batch fetch users
      return await this.getUsersByIds(userIds)
    } catch (error) {
      console.error('Error getting users assigned to project:', error)
      return []
    }
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

  async getAllRFIs() {
    const rfisRef = ref(database, 'rfis')
    const snapshot = await get(rfisRef)
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

  async getAllSubmittals() {
    const submittalsRef = ref(database, 'submittals')
    const snapshot = await get(submittalsRef)
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

  async getAllChangeOrders() {
    const changeOrdersRef = ref(database, 'changeOrders')
    const snapshot = await get(changeOrdersRef)
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

  // ==================== TASKS ============================

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

  // Subscribe to minimal user data for a project
  subscribeToProjectUsers(projectId, callback) {
    // This would need to be implemented based on your data structure
    // Could subscribe to project users or derive from tasks
    const tasksRef = ref(database, 'tasks')
    const projectTasksQuery = query(tasksRef, orderByChild('projectId'), equalTo(projectId))

    onValue(projectTasksQuery, async (snapshot) => {
      if (snapshot.exists()) {
        const tasks = Object.values(snapshot.val())
        const userIds = [...new Set(tasks.map(t => t.assignedTo).filter(Boolean))]

        if (userIds.length > 0) {
          const users = await this.getUsersByIds(userIds)
          callback(users)
        } else {
          callback([])
        }
      } else {
        callback([])
      }
    })

    return projectTasksQuery
  }

  unsubscribe(queryRef) {
    off(queryRef)
  }

  // ==================== UTILITY METHODS ====================

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

  // ==================== SEARCH & FILTERING ====================

  // Search across multiple entity types
  async searchProjects(searchTerm) {
    const projects = await this.getAllProjects()
    const term = searchTerm.toLowerCase()

    return projects.filter(project =>
      project.name?.toLowerCase().includes(term) ||
      project.jobNumber?.toLowerCase().includes(term) ||
      project.client?.toLowerCase().includes(term) ||
      project.description?.toLowerCase().includes(term)
    )
  }

  async searchTasks(searchTerm, projectId = null) {
    let tasks = projectId ?
      await this.getTasksByProject(projectId) :
      await this.getAllTasks()

    const term = searchTerm.toLowerCase()

    return tasks.filter(task =>
      task.title?.toLowerCase().includes(term) ||
      task.description?.toLowerCase().includes(term)
    )
  }

  // ==================== ANALYTICS & REPORTING ====================

  async getProjectAnalytics(projectId) {
    const [tasks, rfis, submittals, changeOrders, activities] = await Promise.all([
      this.getTasksByProject(projectId),
      this.getRFIsByProject(projectId),
      this.getSubmittalsByProject(projectId),
      this.getChangeOrdersByProject(projectId),
      this.getActivityByProject(projectId)
    ])

    // Task analytics
    const taskStats = {
      total: tasks.length,
      completed: tasks.filter(t => t.status === 'complete').length,
      inProgress: tasks.filter(t => t.status === 'in-progress').length,
      overdue: tasks.filter(t => {
        return t.dueDate &&
               new Date(t.dueDate) < new Date() &&
               t.status !== 'complete'
      }).length
    }

    // RFI analytics
    const rfiStats = {
      total: rfis.length,
      open: rfis.filter(r => r.status === 'open').length,
      answered: rfis.filter(r => r.status === 'answered').length,
      closed: rfis.filter(r => r.status === 'closed').length
    }

    // Submittal analytics
    const submittalStats = {
      total: submittals.length,
      pending: submittals.filter(s => s.status === 'pending').length,
      approved: submittals.filter(s => s.status === 'approved').length,
      rejected: submittals.filter(s => s.status === 'rejected').length
    }

    // Change order analytics
    const changeOrderStats = {
      total: changeOrders.length,
      proposed: changeOrders.filter(co => co.status === 'proposed').length,
      approved: changeOrders.filter(co => co.status === 'approved').length,
      totalCostImpact: changeOrders
        .filter(co => co.status === 'approved')
        .reduce((sum, co) => sum + (co.costImpact || 0), 0)
    }

    return {
      tasks: taskStats,
      rfis: rfiStats,
      submittals: submittalStats,
      changeOrders: changeOrderStats,
      activityCount: activities.length,
      lastActivity: activities.length > 0 ?
        activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0] :
        null
    }
  }

  async getUserWorkload(userId) {
    const tasks = await this.getTasksByAssignee(userId)

    return {
      totalTasks: tasks.length,
      activeTasks: tasks.filter(t => ['todo', 'in-progress'].includes(t.status)).length,
      overdueTasks: tasks.filter(t => {
        return t.dueDate &&
               new Date(t.dueDate) < new Date() &&
               t.status !== 'complete'
      }).length,
      estimatedHours: tasks
        .filter(t => t.status !== 'complete')
        .reduce((sum, task) => sum + (task.estimatedHours || 0), 0),
      completionRate: tasks.length > 0 ?
        (tasks.filter(t => t.status === 'complete').length / tasks.length) * 100 :
        0
    }
  }

  // ==================== BACKUP & EXPORT ====================

  async exportProjectData(projectId) {
    const [project, tasks, rfis, submittals, changeOrders, documents, activities] = await Promise.all([
      this.getProject(projectId),
      this.getTasksByProject(projectId),
      this.getRFIsByProject(projectId),
      this.getSubmittalsByProject(projectId),
      this.getChangeOrdersByProject(projectId),
      this.getDocumentsByProject(projectId),
      this.getActivityByProject(projectId)
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
      exportedBy: this.getCurrentUserId()
    }
  }

  // ==================== ERROR HANDLING & VALIDATION ====================

  validateProjectData(projectData) {
    const errors = []

    if (!projectData.name?.trim()) {
      errors.push('Project name is required')
    }

    if (!projectData.jobNumber?.trim()) {
      errors.push('Job number is required')
    }

    if (projectData.cost && projectData.cost < 0) {
      errors.push('Project cost cannot be negative')
    }

    if (projectData.startDate && projectData.endDate) {
      if (new Date(projectData.startDate) > new Date(projectData.endDate)) {
        errors.push('Start date cannot be after end date')
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  validateTaskData(taskData) {
    const errors = []

    if (!taskData.title?.trim()) {
      errors.push('Task title is required')
    }

    if (!taskData.projectId) {
      errors.push('Project ID is required')
    }

    if (taskData.estimatedHours && taskData.estimatedHours < 0) {
      errors.push('Estimated hours cannot be negative')
    }

    if (taskData.progress && (taskData.progress < 0 || taskData.progress > 100)) {
      errors.push('Progress must be between 0 and 100')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  // ==================== MAINTENANCE ====================

  async cleanupOldActivities(daysToKeep = 90) {
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
  }

  async getSystemHealth() {
    try {
      const [projectCount, userCount, taskCount] = await Promise.all([
        this.getAllProjects().then(p => p.length),
        this.getAllUsers().then(u => u.length),
        this.getAllTasks().then(t => t.length)
      ])

      return {
        status: 'healthy',
        counts: {
          projects: projectCount,
          users: userCount,
          tasks: taskCount
        },
        lastChecked: new Date().toISOString()
      }
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        lastChecked: new Date().toISOString()
      }
    }
  }
}

export default new FirebaseService()
