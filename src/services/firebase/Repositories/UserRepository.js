// src/services/firebase/repositories/UserRepository.js
import BaseRepository from '@/services/firebase/core/BaseRepository'

// User-specific schema (moved from the original service)
const USER_SCHEMA = {
  name: 'string',
  email: 'string',
  role: 'string',
  phone: 'string',
  active: 'boolean',
}

/**
 * User Repository - handles all user-related Firebase operations
 * Extends BaseRepository to get CRUD + Real-time functionality
 */
class UserRepository extends BaseRepository {
  constructor() {
    super('users', 'User', USER_SCHEMA)
  }

  /**
   * Create a new user with validation
   */
  async createUser(userData) {
    return await this.createWithValidation(userData, ['name', 'email'])
  }

  /**
   * Get all users
   * @returns All users
   */
  async getAllUsers() {
    try {
      return await this.getAll()
    } catch (error) {
      console.error('Error getting all users:', error)
      throw error
    }
  }

  /**
   * Get user by email - common user lookup pattern
   */
  async getUserByEmail(email) {
    try {
      const users = await this.getByField('email', email)
      return users.length > 0 ? users[0] : null
    } catch (error) {
      console.error('Error getting user by email:', error)
      throw error
    }
  }

  /**
   * Get minimal user data (for dropdowns, etc.)
   */
  async getUsersMinimal() {
    try {
      const allUsers = await this.getAll()

      return allUsers.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        active: user.active ?? true,
      }))
    } catch (error) {
      console.error('Error getting minimal users:', error)
      throw error
    }
  }

  /**
   * Get only active users
   */
  async getActiveUsers() {
    try {
      const allUsers = await this.getAll()
      return allUsers.filter((user) => user.active !== false)
    } catch (error) {
      console.error('Error getting active users:', error)
      throw error
    }
  }

  /**
   * Update user with validation
   */
  async updateUser(userId, updates) {
    return await this.updateWithValidation(userId, updates)
  }

  /**
   * Deactivate user instead of deleting
   */
  async deactivateUser(userId) {
    return await this.update(userId, { active: false })
  }

  /**
   * Reactivate user
   */
  async reactivateUser(userId) {
    return await this.update(userId, { active: true })
  }

  /**
   * Get users by role
   */
  async getUsersByRole(role) {
    return await this.getByField('role', role)
  }

  /**
   * Subscribe to all users with default sorting (by name)
   */
  subscribeToUsers(callback) {
    const sortByName = (a, b) => {
      const nameA = (a.name || '').toLowerCase()
      const nameB = (b.name || '').toLowerCase()
      return nameA.localeCompare(nameB)
    }

    return this.subscribeToAll(callback, sortByName)
  }

  /**
   * Subscribe to active users only
   */
  subscribeToActiveUsers(callback) {
    const allUsersCallback = (users) => {
      const activeUsers = users.filter((user) => user.active !== false)
      callback(activeUsers)
    }

    return this.subscribeToAll(allUsersCallback, (a, b) => a.name?.localeCompare(b.name))
  }

  /**
   * User-specific validation
   */
  validateUserData(userData) {
    const validation = super.validateData(userData, ['name', 'email'])

    // Add user-specific validations
    if (userData.email && !this.isValidEmail(userData.email)) {
      validation.errors.email = 'Invalid email format'
      validation.isValid = false
    }

    if (userData.role && !['admin', 'pm', 'team', 'client'].includes(userData.role)) {
      validation.errors.role = 'Invalid role. Must be: admin, pm, team, or client'
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
   * Get user statistics
   */
  async getUserStatistics() {
    try {
      const allUsers = await this.getAll()

      const stats = {
        total: allUsers.length,
        active: allUsers.filter((u) => u.active !== false).length,
        inactive: allUsers.filter((u) => u.active === false).length,
        byRole: {},
      }

      // Count by role
      allUsers.forEach((user) => {
        const role = user.role || 'unassigned'
        stats.byRole[role] = (stats.byRole[role] || 0) + 1
      })

      return stats
    } catch (error) {
      console.error('Error getting user statistics:', error)
      throw error
    }
  }
}

export default new UserRepository()
