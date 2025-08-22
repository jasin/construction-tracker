// utils.js - Common utility functions used across components

import firebaseService from '@/services/firebaseService'

// ==================== DATA LOADING UTILITIES ====================

/**
 * Load clients data with error handling
 * @returns {Promise<Array>} Array of client objects
 */
export const loadClients = async () => {
  try {
    console.log('Loading clients...')
    const clientData = await firebaseService.getAllClients()
    console.log('Loaded clients:', clientData?.length || 0)
    return clientData || []
  } catch (err) {
    console.error('Error loading clients:', err)
    return []
  }
}

/**
 * Load users data with error handling
 * @returns {Promise<Array>} Array of user objects
 */
export const loadUsers = async () => {
  try {
    const allUsers = await firebaseService.getAllUsers()
    console.log('Loaded users:', allUsers?.length || 0)
    return allUsers.filter((user) => user.active) // Only return active users
  } catch (err) {
    console.error('Error loading users:', err)
    return []
  }
}

/**
 * Load minimal user data for lookups/assignments
 * @returns {Promise<Array>} Array of minimal user objects
 */
export const loadUsersMinimal = async () => {
  try {
    const users = await firebaseService.getUsersMinimal()
    return users.filter((user) => user.active)
  } catch (err) {
    console.error('Error loading minimal users:', err)
    return []
  }
}

/**
 * Load all projects with error handling
 * @returns {Promise<Array>} Array of project objects
 */
export const loadProjects = async () => {
  try {
    const projectData = await firebaseService.getAllProjects()
    console.log('Loaded projects:', projectData?.length || 0)
    return projectData || []
  } catch (err) {
    console.error('Error loading projects:', err)
    return []
  }
}

// ==================== LOOKUP UTILITIES ====================

/**
 * Create a map for fast lookups by ID
 * @param {Array} items - Array of objects with id property
 * @returns {Object} Map of id -> object
 */
export const createLookupMap = (items) => {
  if (!Array.isArray(items)) return {}
  return items.reduce((map, item) => {
    if (item && item.id) {
      map[item.id] = item
    }
    return map
  }, {})
}

/**
 * Get client name by ID with fallback
 * @param {string} clientId - Client ID to lookup
 * @param {Object} clientsMap - Map of client ID -> client object
 * @returns {string} Client name or empty string
 */
export const getClientName = (clientId, clientsMap) => {
  if (!clientId) return ''
  const client = clientsMap[clientId]
  return client ? ` - ${client.name}` : ''
}

/**
 * Get user name by ID with fallback
 * @param {string} userId - User ID to lookup
 * @param {Array|Object} users - Array of users or users map
 * @returns {string} User name or fallback
 */
export const getUserName = (userId, users) => {
  if (!userId) return 'Unassigned'

  // Handle both array and map formats
  let user
  if (Array.isArray(users)) {
    user = users.find((u) => u.id === userId)
  } else {
    user = users[userId]
  }

  return user ? user.name || user.email : userId
}

/**
 * Get project name by ID with fallback
 * @param {string} projectId - Project ID to lookup
 * @param {Array|Object} projects - Array of projects or projects map
 * @returns {string} Project name or fallback
 */
export const getProjectName = (projectId, projects) => {
  if (!projectId) return 'Unknown Project'

  // Handle both array and map formats
  let project
  if (Array.isArray(projects)) {
    project = projects.find((p) => p.id === projectId)
  } else {
    project = projects[projectId]
  }

  return project ? `${project.jobNumber} - ${project.name}` : 'Unknown Project'
}

// ==================== FORMATTING UTILITIES ====================

/**
 * Format date string for display
 * @param {string} dateString - ISO date string
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date
 */
export const formatDate = (dateString, options = {}) => {
  if (!dateString) return 'N/A'

  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }

  try {
    return new Date(dateString).toLocaleDateString('en-US', { ...defaultOptions, ...options })
  } catch (err) {
    console.error('Error formatting date:', err)
    return 'Invalid Date'
  }
}

/**
 * Format time ago (relative time)
 * @param {string} timestamp - ISO timestamp
 * @returns {string} Relative time string
 */
export const formatTimeAgo = (timestamp) => {
  if (!timestamp) return 'Unknown time'

  try {
    const now = new Date()
    const time = new Date(timestamp)
    const diffInMs = now - time
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
    const diffInHours = Math.floor(diffInMinutes / 60)
    const diffInDays = Math.floor(diffInHours / 24)

    if (diffInMinutes < 1) {
      return 'Just now'
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`
    } else if (diffInDays < 7) {
      return `${diffInDays}d ago`
    } else {
      return time.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: time.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      })
    }
  } catch (err) {
    console.error('Error formatting time ago:', err)
    return 'Unknown time'
  }
}

/**
 * Format currency amount
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (default: USD)
 * @returns {string} Formatted currency
 */
export const formatCurrency = (amount, currency = 'USD') => {
  if (!amount && amount !== 0) return '0'

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount)
  } catch (err) {
    console.error('Error while formating currancy', err.message)
    // Fallback to simple number formatting
    console.log('Falling back to simple number formatting')
    return `$${new Intl.NumberFormat('en-US').format(amount || 0)}`
  }
}

/**
 * Format number with commas
 * @param {number} number - Number to format
 * @returns {string} Formatted number
 */
export const formatNumber = (number) => {
  if (!number && number !== 0) return '0'
  return new Intl.NumberFormat('en-US').format(number)
}

// ==================== STATUS FORMATTING UTILITIES ====================

/**
 * Format task status for display
 * @param {string} status - Task status
 * @returns {string} Formatted status
 */
export const formatTaskStatus = (status) => {
  const statusMap = {
    todo: 'To Do',
    'in-progress': 'In Progress',
    review: 'Review',
    complete: 'Complete',
    'on-hold': 'On Hold',
  }
  return statusMap[status] || status
}

/**
 * Format project phase for display
 * @param {string} phase - Project phase
 * @returns {string} Formatted phase
 */
export const formatPhase = (phase) => {
  const phaseMap = {
    'pre-construction': 'Pre-Construction',
    construction: 'Construction',
    'close-out': 'Close-Out',
    complete: 'Complete',
  }
  return phaseMap[phase] || phase
}

/**
 * Format user role for display
 * @param {string} role - User role
 * @returns {string} Formatted role
 */
export const formatRole = (role) => {
  const roleMap = {
    'project-manager': 'Project Manager',
    superintendent: 'Superintendent',
    foreman: 'Foreman',
    admin: 'Admin',
    user: 'User',
  }
  return roleMap[role] || role
}

/**
 * Format category for display
 * @param {string} category - Category
 * @returns {string} Formatted category
 */
export const formatCategory = (category) => {
  const categoryMap = {
    planning: 'Planning',
    design: 'Design',
    construction: 'Construction',
    inspection: 'Inspection',
    documentation: 'Documentation',
    administrative: 'Administrative',
  }
  return categoryMap[category] || category
}

/**
 * Format file size in bytes to human readable format
 * @param {number} bytes - File size in bytes
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} Formatted file size
 */
export const formatFileSize = (bytes, decimals = 2) => {
  if (!bytes && bytes !== 0) return '0 B'
  if (bytes === 0) return '0 B'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

// Alternative implementation with more control
export const formatFileSizeDetailed = (bytes, options = {}) => {
  const {
    decimals = 2,
    binary = true, // Use 1024 (binary) vs 1000 (decimal)
    longForm = false // Use "bytes" instead of "B"
  } = options

  if (!bytes && bytes !== 0) return '0 bytes'
  if (bytes === 0) return '0 bytes'

  const k = binary ? 1024 : 1000
  const dm = decimals < 0 ? 0 : decimals

  const sizes = longForm
    ? ['bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
    : ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  // Handle edge case for bytes
  if (i === 0 && longForm) {
    return bytes === 1 ? '1 byte' : `${bytes} bytes`
  }

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

// Quick utility for common file size ranges
export const getFileSizeCategory = (bytes) => {
  if (!bytes) return 'empty'
  if (bytes < 1024) return 'tiny'           // < 1KB
  if (bytes < 1024 * 1024) return 'small'   // < 1MB
  if (bytes < 1024 * 1024 * 10) return 'medium' // < 10MB
  if (bytes < 1024 * 1024 * 100) return 'large' // < 100MB
  return 'huge' // >= 100MB
}

// ==================== VALIDATION UTILITIES ====================

/**
 * Check if a task is overdue
 * @param {Object} task - Task object with dueDate and status
 * @returns {boolean} True if task is overdue
 */
export const isOverdue = (task) => {
  if (!task.dueDate || task.status === 'complete') return false
  return new Date(task.dueDate) < new Date()
}

/**
 * Get initials from a name
 * @param {string} name - Full name
 * @returns {string} Initials (max 2 characters)
 */
export const getInitials = (name) => {
  if (!name) return '??'
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// ==================== CSS CLASS UTILITIES ====================

/**
 * Get CSS classes for priority indicators
 * @param {string} priority - Priority level
 * @returns {string} CSS classes
 */
export const getPriorityClasses = (priority) => {
  const classMap = {
    critical: 'bg-red-500',
    high: 'bg-orange-500',
    medium: 'bg-yellow-500',
    low: 'bg-green-500',
  }
  return classMap[priority] || 'bg-gray-500'
}

/**
 * Get CSS classes for status badges
 * @param {string} status - Status
 * @returns {string} CSS classes
 */
export const getStatusClasses = (status) => {
  const classMap = {
    todo: 'bg-gray-100 text-gray-800',
    'in-progress': 'bg-blue-100 text-blue-800',
    review: 'bg-yellow-100 text-yellow-800',
    complete: 'bg-green-100 text-green-800',
    'on-hold': 'bg-red-100 text-red-800',
    draft: 'bg-gray-100 text-gray-800',
    submitted: 'bg-blue-100 text-blue-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    pending: 'bg-yellow-100 text-yellow-800',
  }
  return classMap[status] || 'bg-gray-100 text-gray-800'
}

/**
 * Get CSS classes for role badges
 * @param {string} role - User role
 * @returns {string} CSS classes
 */
export const getRoleClasses = (role) => {
  const classMap = {
    admin: 'bg-purple-100 text-purple-800',
    'project-manager': 'bg-blue-100 text-blue-800',
    superintendent: 'bg-indigo-100 text-indigo-800',
    foreman: 'bg-yellow-100 text-yellow-800',
    user: 'bg-gray-100 text-gray-800',
  }
  return classMap[role] || 'bg-gray-100 text-gray-800'
}

// ==================== ACTIVITY UTILITIES ====================

/**
 * Get icon class for activity type
 * @param {string} action - Activity action
 * @returns {string} CSS classes
 */
export const getActivityIconClass = (action) => {
  const classMap = {
    created_project: 'bg-blue-100 text-blue-700',
    updated_project_phase: 'bg-purple-100 text-purple-700',
    created_rfi: 'bg-orange-100 text-orange-700',
    created_submittal: 'bg-green-100 text-green-700',
    created_change_order: 'bg-yellow-100 text-yellow-700',
    uploaded_document: 'bg-pink-100 text-pink-700',
    created_task: 'bg-blue-100 text-blue-700',
    updated_task_status: 'bg-purple-100 text-purple-700',
    assigned_task: 'bg-green-100 text-green-700',
  }
  return classMap[action] || 'bg-gray-100 text-gray-600'
}

/**
 * Get icon for activity type
 * @param {string} action - Activity action
 * @returns {string} Icon class
 */
export const getActivityIcon = (action) => {
  const iconMap = {
    created_project: 'pi pi-folder',
    updated_project_phase: 'pi pi-refresh',
    created_rfi: 'pi pi-question-circle',
    created_submittal: 'pi pi-file-check',
    created_change_order: 'pi pi-file-edit',
    uploaded_document: 'pi pi-file',
    created_task: 'pi pi-list',
    updated_task_status: 'pi pi-refresh',
    assigned_task: 'pi pi-user',
  }
  return iconMap[action] || 'pi pi-circle'
}

// ==================== ARRAY/OBJECT UTILITIES ====================

/**
 * Safe array access that always returns an array
 * @param {any} value - Value that might be an array
 * @returns {Array} Always returns an array
 */
export const ensureArray = (value) => {
  if (Array.isArray(value)) return value
  if (value && typeof value === 'object') {
    return Object.values(value).filter((item) => item && typeof item === 'object')
  }
  return []
}

/**
 * Group array items by a property
 * @param {Array} items - Items to group
 * @param {string} property - Property to group by
 * @returns {Object} Grouped items
 */
export const groupBy = (items, property) => {
  if (!Array.isArray(items)) return {}

  return items.reduce((groups, item) => {
    const key = item[property] || 'unknown'
    if (!groups[key]) {
      groups[key] = []
    }
    groups[key].push(item)
    return groups
  }, {})
}

/**
 * Sort items by priority and due date
 * @param {Array} items - Items to sort (should have priority and dueDate)
 * @returns {Array} Sorted items
 */
export const sortByPriorityAndDate = (items) => {
  if (!Array.isArray(items)) return []

  return [...items].sort((a, b) => {
    // Sort by priority first
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
    const priorityDiff = (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2)
    if (priorityDiff !== 0) return priorityDiff

    // Then by due date (nulls last)
    if (a.dueDate && !b.dueDate) return -1
    if (!a.dueDate && b.dueDate) return 1
    if (a.dueDate && b.dueDate) {
      return new Date(a.dueDate) - new Date(b.dueDate)
    }

    return 0
  })
}

// ==================== FORM VALIDATION UTILITIES ====================

/**
 * Basic email validation
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email format
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Check if string is not empty after trimming
 * @param {string} value - Value to check
 * @returns {boolean} True if not empty
 */
export const isNotEmpty = (value) => {
  return value && typeof value === 'string' && value.trim().length > 0
}

/**
 * Validate required fields in an object
 * @param {Object} data - Data to validate
 * @param {Array} requiredFields - Array of required field names
 * @returns {Object} Validation result with isValid and errors
 */
export const validateRequired = (data, requiredFields) => {
  const errors = {}

  requiredFields.forEach((field) => {
    if (!data[field] || (typeof data[field] === 'string' && !data[field].trim())) {
      errors[field] = `${field} is required`
    }
  })

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  }
}

// ==================== LOCAL STORAGE UTILITIES ====================

/**
 * Safe localStorage getter with fallback
 * @param {string} key - Storage key
 * @param {any} defaultValue - Default value if key doesn't exist
 * @returns {any} Stored value or default
 */
export const getStorageItem = (key, defaultValue = null) => {
  try {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : defaultValue
  } catch (err) {
    console.error('Error reading from localStorage:', err)
    return defaultValue
  }
}

/**
 * Safe localStorage setter
 * @param {string} key - Storage key
 * @param {any} value - Value to store
 * @returns {boolean} True if successful
 */
export const setStorageItem = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch (err) {
    console.error('Error writing to localStorage:', err)
    return false
  }
}

/**
 * Remove item from localStorage
 * @param {string} key - Storage key
 * @returns {boolean} True if successful
 */
export const removeStorageItem = (key) => {
  try {
    localStorage.removeItem(key)
    return true
  } catch (err) {
    console.error('Error removing from localStorage:', err)
    return false
  }
}
