// src/services/firebase/Repositories/ProjectRepository.js
import { validateRequired } from '@/utils/index';
import BaseRepository from '../core/BaseRepository'; // ES module import for base class
import { CrudMixin } from '../mixins/CrudMixin'; // ES module import for CRUD mixin
import { RealtimeMixin } from '../mixins/RealtimeMixin'; // ES module import for real-time mixin
import ActivityService from '@/services/logging/ActivityService'; // ES module import for activity logging
import firebaseCore from '../core/FirebaseCore'; // ES module import for core utilities
import { ref, query, orderByChild, equalTo, onValue } from 'firebase/database'; // ES module imports for Firebase RTDB functions
import { PROJECT_SCHEMA } from '../schemas'; // ES module import for project schema (assuming exists)
import { handleAsync, handleError, extractData } from '../../../utils/errorHandler';

/**
 * Project Repository - handles all project-related Firebase operations.
 * Extends BaseRepository with Realtime and CRUD mixins for full functionality.
 * More complex than UserRepository due to relationships and business logic.
 * Uses /projects/{id} path for storage.
 */
class ProjectRepository extends CrudMixin(RealtimeMixin(BaseRepository)) {
  constructor() {
    super('projects'); // Changed: Pass 'projects' as collectionName; removed unused entityName and schema params for consistency with mixin pattern
  }

  /**
   * Create a new project with validation and activity logging.
   * @param {Object} projectData - Project data to create.
   * @returns {Promise<Object>} Created project.
   */
  async createProject(projectData) {
    return handleAsync(
      async () => {
        // Added: Validate required fields before create (assuming validateRequired from utils or implement here)
        const validation = validateRequired(projectData, ['name', 'jobNumber']);
        if (!validation.isValid) {
          throw new Error(`Validation failed: ${JSON.stringify(validation.errors)}`);
        }

        const result = await super.create(projectData, PROJECT_SCHEMA); // Changed: Use super.create from CrudMixin with schema

        // Use centralized logging service
        await ActivityService.logEntityCreated(result.id, 'project', result.id, result.name);

        return result;
      },
      { context: `Create new project ${projectData.jobNumber} - ${projectData.name}` }
    );
  }

  /**
   * Get all projects.
   * @returns {Promise<Array<Object>>} Array of projects.
   */
  async getAllProjects() {
    const result = handleAsync(
      async () => {
        return await super.getAll(); // Changed: Use super.getAll from CrudMixin
      },
      { context: 'Get all projects' }
    );
    return extractData(result);
  }

  /**
   * Get project by project ID.
   * @param {string} projectId - Project ID.
   * @returns {Promise<Object|null>} Project data or null.
   */
  async getProject(projectId) {
    const result = handleAsync(
      async () => {
        return await super.getById(projectId); // Changed: Use super.getById from CrudMixin
      },
      { context: `Get project by projectId: ${projectId}` }
    );
    return extractData(result);
  }

  /**
   * Get projects by client ID.
   * @param {string} clientId - Client ID.
   * @returns {Promise<Array<Object>>} Array of matching projects.
   */
  async getProjectsByClient(clientId) {
    const result = handleAsync(
      async () => {
        return await super.getByField('clientId', clientId); // Changed: Use super.getByField from CrudMixin
      },
      { context: `Get project by clientId: ${clientId}` }
    );
    return extractData(result);
  }

  /**
   * Get projects by status.
   * @param {string} status - Project status.
   * @returns {Promise<Array<Object>>} Array of matching projects.
   */
  async getProjectsByStatus(status) {
    const result = handleAsync(
      async () => {
        return await super.getByField('status', status); // Changed: Use super.getByField from CrudMixin
      },
      { context: `Get projects by status: ${status}` }
    );
    return extractData(result);
  }

  /**
   * Get active projects (not completed or cancelled).
   * @returns {Promise<Array<Object>>} Array of active projects.
   */
  async getActiveProjects() {
    const result = handleAsync(
      async () => {
        const allProjects = await super.getAll(); // Changed: Use super.getAll from CrudMixin
        return allProjects.filter(
          (project) => !['completed', 'cancelled', 'on-hold'].includes(project.status)
        );
      },
      { context: 'Get active projects' }
    );
    return extractData(result);
  }

  /**
   * Update project with enhanced validation and activity logging.
   * @param {string} projectId - Project ID.
   * @param {Object} updates - Updates to apply.
   * @returns {Promise<Object>} Updated project.
   */
  async updateProject(projectId, updates) {
    const result = handleAsync(
      async () => {
        // Added: Validate updates before proceeding (implement validateUpdates if needed)
        const validation = validateRequired(updates, []); // Example; adjust for optional fields
        if (!validation.isValid) {
          throw new Error(`Validation failed: ${JSON.stringify(validation.errors)}`);
        }

        const result = await super.update(projectId, updates, PROJECT_SCHEMA); // Changed: Use super.update from CrudMixin with schema

        // Log significant updates using centralized service
        if (updates.phase) {
          await ActivityService.logActivity(
            projectId,
            'updated_project_phase',
            'project',
            projectId,
            `Updated project phase to: ${updates.phase}`,
            { oldPhase: result.previousPhase, newPhase: updates.phase }
          );
        }

        if (updates.status) {
          const project = await super.getById(projectId); // Use super.getById
          await ActivityService.logStatusChange(
            projectId,
            'project',
            projectId,
            project?.name || 'Unknown Project',
            project?.status || 'unknown',
            updates.status
          );
        }

        // Log general updates for other fields
        const significantFields = ['name', 'cost', 'endDate', 'clientId'];
        const significantChanges = Object.keys(updates).filter(
          (key) => significantFields.includes(key) && !['phase', 'status'].includes(key)
        );

        if (significantChanges.length > 0) {
          const project = await super.getById(projectId); // Use super.getById
          await ActivityService.logEntityUpdated(
            projectId,
            'project',
            projectId,
            project?.name || 'Unknown Project',
            Object.fromEntries(significantChanges.map((key) => [key, updates[key]]))
          );
        }

        return result;
      },
      { context: `Update project: ${projectId} ${updates}` }
    );
    return extractData(result);
  }

  /**
   * Get project with all related entities (comprehensive project view).
   * @param {string} projectId - Project ID.
   * @returns {Promise<Object|null>} Project with details or null.
   */
  async getProjectWithDetails(projectId) {
    const result = handleAsync(
      async () => {
        const project = await super.getById(projectId); // Changed: Use super.getById from CrudMixin
        if (!project) return null;

        // We'll need to import other repositories or use dependency injection
        // For now, return the project and let the caller fetch related data
        return {
          ...project,
          _hasRelatedData: true, // Flag indicating this could be enhanced
        };
      },
      { context: `Get project with details: ${projectId}` }
    );
    return extractData(result);
  }

  /**
   * Get project analytics/statistics.
   * @returns {Promise<Object>} Project statistics.
   */
  async getProjectStatistics() {
    const result = handleAsync(
      async () => {
        const allProjects = await super.getAll(); // Changed: Use super.getAll from CrudMixin

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
        };

        // Calculate distributions and totals
        allProjects.forEach((project) => {
          // Status distribution
          const status = project.status || 'unknown';
          stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;

          // Phase distribution
          const phase = project.phase || 'unknown';
          stats.byPhase[phase] = (stats.byPhase[phase] || 0) + 1;

          // Client distribution
          const clientName = project.clientName || project.clientId || 'unknown';
          stats.byClient[clientName] = (stats.byClient[clientName] || 0) + 1;

          // Financial totals
          const value = parseFloat(project.cost || project.value || 0);
          stats.totalValue += value;

          // Upcoming deadlines (next 30 days)
          if (project.endDate && this.isUpcomingDeadline(project.endDate)) {
            stats.upcomingDeadlines.push({
              id: project.id,
              name: project.name,
              endDate: project.endDate,
              daysUntilDue: this.getDaysUntilDate(project.endDate),
            });
          }
        });

        // Calculate averages
        stats.averageValue = stats.total > 0 ? stats.totalValue / stats.total : 0;

        // Sort upcoming deadlines by due date
        stats.upcomingDeadlines.sort((a, b) => a.daysUntilDue - b.daysUntilDue);

        return stats;
      },
      { context: `Get project statistics` }
    );
    return extractData(result);
  }

  /**
   * Search projects by name, job number, or client.
   * @param {string} searchTerm - Search term.
   * @returns {Promise<Array<Object>>} Matching projects.
   */
  async searchProjects(searchTerm) {
    const result = handleAsync(
      async () => {
        const allProjects = await super.getAll(); // Changed: Use super.getAll from CrudMixin
        const term = searchTerm.toLowerCase().trim();

        return allProjects.filter((project) => {
          return (
            project.name?.toLowerCase().includes(term) ||
            project.jobNumber?.toLowerCase().includes(term) ||
            project.clientName?.toLowerCase().includes(term) ||
            project.description?.toLowerCase().includes(term)
          );
        });
      },
      { context: `Search projects by: ${searchTerm.toLocaleLowerCase().trim()}` }
    );
    return extractData(result);
  }

  /**
   * Get projects with upcoming deadlines.
   * @param {number} days - Number of days ahead (default 30).
   * @returns {Promise<Array<Object>>} Projects with upcoming deadlines.
   */
  async getProjectsWithUpcomingDeadlines(days = 30) {
    const result = handleAsync(
      async () => {
        const allProjects = await super.getAll(); // Changed: Use super.getAll from CrudMixin
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() + days);

        return allProjects
          .filter((project) => {
            if (!project.endDate) return false;

            const endDate = new Date(project.endDate);
            const today = new Date();

            return endDate >= today && endDate <= cutoffDate;
          })
          .sort((a, b) => new Date(a.endDate) - new Date(b.endDate));
      },
      { context: `Get projects with upcoming deadlines` }
    );
    return extractData(result);
  }

  /**
   * Subscribe to all projects in realtime.
   * @param {Function} callback - Callback to receive projects array.
   * @param {Function|null} sortFn - Optional sorting function.
   * @param {Function} [errorCallback] - Optional callback for errors.
   * @returns {Function} Unsubscribe function.
   */
  subscribeToAll(callback, sortFn = null, errorCallback = () => {}) {
    return super.subscribeToAll(callback, sortFn, errorCallback);
  }

  /**
   * Subscribe to a single project (for project detail views).
   * @param {string} projectId - Project ID.
   * @param {Function} callback - Callback for project data.
   * @returns {Function} Unsubscribe function.
   */
  subscribeToProject(projectId, callback, errorCallback = () => {}) {
    return this.subscribeToOne(projectId, callback, errorCallback);
  }

  /**
   * Real-time subscriptions with business logic.
   * @param {Function} callback - Callback for projects.
   * @returns {Object} Unsubscribe reference.
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
      };

      const aPriority = statusPriority[a.status] ?? 3;
      const bPriority = statusPriority[b.status] ?? 3;

      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }

      // If same status, sort by end date (soonest first)
      if (a.endDate && b.endDate) {
        return new Date(a.endDate) - new Date(b.endDate);
      }

      // Finally sort by name
      return (a.name || '').localeCompare(b.name || '');
    };

    return this.subscribeToAll(callback, sortByPriority); // Changed: Use super.subscribeToAll from RealtimeMixin
  }

  /**
   * Subscribe to projects by client.
   * @param {string} clientId - Client ID.
   * @param {Function} callback - Callback for projects.
   * @returns {Object} Unsubscribe reference.
   */
  subscribeToProjectsByClient(clientId, callback) {
    return super.subscribeToByField('clientId', clientId, callback); // Changed: Use super.subscribeToByField from RealtimeMixin
  }

  /**
   * Subscribe to active projects only.
   * @param {Function} callback - Callback for active projects.
   * @returns {Object} Unsubscribe reference.
   */
  subscribeToActiveProjects(callback) {
    const filterActive = (projects) => {
      const activeProjects = projects.filter(
        (project) => !['completed', 'cancelled', 'on-hold'].includes(project.status)
      );
      callback(activeProjects);
    };

    return super.subscribeToAll(filterActive); // Changed: Use super.subscribeToAll from RealtimeMixin
  }

  /**
   * Subscribe to project tasks with real-time updates.
   * @param {string} projectId - The project ID to subscribe to tasks for.
   * @param {Function} callback - Callback function that receives the tasks array.
   * @returns {Function} Unsubscribe function to clean up the subscription.
   */
  subscribeToProjectTasks(projectId, callback) {
    const result = handleAsync(
      async () => {
        const tasksRef = ref(firebaseCore.database, 'tasks');
        const projectTasksQuery = query(tasksRef, orderByChild('projectId'), equalTo(projectId));

        const unsubscribe = onValue(
          projectTasksQuery,
          (snapshot) => {
            const tasks = snapshot.exists()
              ? Object.entries(snapshot.val()).map(([id, data]) => ({ id, ...data }))
              : [];

            // Sort by due date and priority (same logic as original)
            tasks.sort((a, b) => {
              if (a.dueDate && !b.dueDate) return -1;
              if (!a.dueDate && b.dueDate) return 1;
              if (a.dueDate && b.dueDate) {
                const dateComparison = new Date(a.dueDate) - new Date(b.dueDate);
                if (dateComparison !== 0) return dateComparison;
              }

              const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
              return (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
            });

            callback(tasks);
          },
          (error) => {
            handleError(error, `ProjectRepository.subscribeToProjectTasks - ${projectId}`);
          }
        );

        // Return the unsubscribe function, not the query
        return () => unsubscribe();
      },
      { context: `Subscribe to project tasks: ${projectId}` }
    );
    return extractData(result, () => {});
  }

  /**
   * Subscribe to project documents with real-time updates.
   * @param {string} projectId - The project ID to subscribe to documents for.
   * @param {Function} callback - Callback function that receives the documents array.
   * @returns {Function} Unsubscribe function to clean up the subscription.
   */
  subscribeToProjectDocuments(projectId, callback) {
    const result = handleAsync(
      async () => {
        const documentsRef = ref(firebaseCore.database, 'documents');
        const projectDocsQuery = query(documentsRef, orderByChild('projectId'), equalTo(projectId));

        const unsubscribe = onValue(
          projectDocsQuery,
          (snapshot) => {
            const documents = snapshot.exists()
              ? Object.entries(snapshot.val()).map(([id, data]) => ({ id, ...data }))
              : [];

            // Sort by upload date (newest first)
            documents.sort(
              (a, b) =>
                new Date(b.uploadedAt || b.createdAt) - new Date(a.uploadedAt || a.createdAt)
            );

            callback(documents);
          },
          (error) => {
            handleError(error, `ProjectRepository.subscribeToProjectDocuments - ${projectId}`);
          }
        );

        return () => unsubscribe();
      },
      { context: `Subscribe to project documents: ${projectId}` }
    );
    return extractData(result, () => {});
  }

  /**
   * Subscribe to project RFIs (Request for Information) with real-time updates.
   * @param {string} projectId - The project ID to subscribe to RFIs for.
   * @param {Function} callback - Callback function that receives the RFIs array.
   * @returns {Function} Unsubscribe function to clean up the subscription.
   */
  subscribeToProjectRFIs(projectId, callback) {
    const result = handleAsync(
      async () => {
        const rfisRef = ref(firebaseCore.database, 'rfis');
        const projectRFIsQuery = query(rfisRef, orderByChild('projectId'), equalTo(projectId));

        const unsubscribe = onValue(
          projectRFIsQuery,
          (snapshot) => {
            const rfis = snapshot.exists()
              ? Object.entries(snapshot.val()).map(([id, data]) => ({ id, ...data }))
              : [];

            // Sort by creation date (newest first)
            rfis.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            callback(rfis);
          },
          (error) => {
            handleError(error, `ProjectRepository.subscribeToProjectRFIs - ${projectId}`);
          }
        );

        return () => unsubscribe();
      },
      { context: `Subscribe to project RFIs: ${projectId}` }
    );
    return extractData(result, () => {});
  }

  /**
   * Subscribe to project submittals with real-time updates.
   * @param {string} projectId - The project ID to subscribe to submittals for.
   * @param {Function} callback - Callback function that receives the submittals array.
   * @returns {Function} Unsubscribe function to clean up the subscription.
   */
  subscribeToProjectSubmittals(projectId, callback) {
    const result = handleAsync(
      async () => {
        const submittalsRef = ref(firebaseCore.database, 'submittals');
        const projectSubmittalsQuery = query(
          submittalsRef,
          orderByChild('projectId'),
          equalTo(projectId)
        );

        const unsubscribe = onValue(
          projectSubmittalsQuery,
          (snapshot) => {
            const submittals = snapshot.exists()
              ? Object.entries(snapshot.val()).map(([id, data]) => ({ id, ...data }))
              : [];

            // Sort by creation date (newest first)
            submittals.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            callback(submittals);
          },
          (error) => {
            handleError(error, `ProjectRepository.subscribeToProjectSubmittals - ${projectId}`);
          }
        );

        return () => unsubscribe();
      },
      { context: `Subscribe to project submittals: ${projectId}` }
    );
    return extractData(result, () => {});
  }

  /**
   * Subscribe to project change orders with real-time updates.
   * @param {string} projectId - The project ID to subscribe to change orders for.
   * @param {Function} callback - Callback function that receives the change orders array.
   * @returns {Function} Unsubscribe function to clean up the subscription.
   */
  subscribeToProjectChangeOrders(projectId, callback) {
    const result = handleAsync(
      async () => {
        const changeOrdersRef = ref(firebaseCore.database, 'changeOrders');
        const projectCOsQuery = query(
          changeOrdersRef,
          orderByChild('projectId'),
          equalTo(projectId)
        );

        const unsubscribe = onValue(
          projectCOsQuery,
          (snapshot) => {
            const changeOrders = snapshot.exists()
              ? Object.entries(snapshot.val()).map(([id, data]) => ({ id, ...data }))
              : [];

            // Sort by creation date (newest first)
            changeOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            callback(changeOrders);
          },
          (error) => {
            handleError(error, `ProjectRepository.subscribeToProjectChangeOrders - ${projectId}`);
          }
        );

        return () => unsubscribe();
      },
      { context: `Subscribe to project change orders: ${projectId}` }
    );
    return extractData(result, () => {});
  }

  /**
   * Project-specific validation.
   * @param {Object} projectData - Data to validate.
   * @returns {Object} Validation result with isValid and errors.
   */
  validateProjectData(projectData) {
    const validation = validateRequired(projectData, ['name', 'jobNumber']); // Assuming validateRequired is in utils; implement if needed

    // Add project-specific validations
    if (projectData.startDate && projectData.endDate) {
      if (new Date(projectData.startDate) > new Date(projectData.endDate)) {
        validation.errors.endDate = 'End date cannot be before start date';
        validation.isValid = false;
      }
    }

    if (projectData.cost && projectData.cost < 0) {
      validation.errors.cost = 'Project cost cannot be negative';
      validation.isValid = false;
    }

    if (projectData.status && !this.isValidProjectStatus(projectData.status)) {
      validation.errors.status = 'Invalid project status';
      validation.isValid = false;
    }

    if (projectData.phase && !this.isValidProjectPhase(projectData.phase)) {
      validation.errors.phase = 'Invalid project phase';
      validation.isValid = false;
    }

    // Business rule: Cannot mark as completed without end date
    if (projectData.status === 'completed' && !projectData.endDate) {
      validation.errors.endDate = 'End date required when marking project as completed';
      validation.isValid = false;
    }

    return validation;
  }

  /**
   * Bulk operations for projects.
   * @param {Array<string>} projectIds - Array of project IDs.
   * @param {string} status - New status.
   * @returns {Promise<Array<Object>>} Updated results.
   */
  async bulkUpdateProjectStatus(projectIds, status) {
    const result = handleAsync(
      async () => {
        const updates = {
          status,
          ...(status === 'completed' && { completedAt: new Date().toISOString() }),
        };

        const results = await Promise.all(projectIds.map((id) => super.update(id, updates))); // Changed: Use super.update from CrudMixin in loop

        // Use centralized bulk logging
        await ActivityService.logBulkActivity(
          'bulk_updated_project_status',
          'project',
          projectIds,
          `Bulk updated ${projectIds.length} projects to status: ${status}`,
          { newStatus: status, projectCount: projectIds.length }
        );

        return results;
      },
      { context: `Bulk update projects status: ${projectIds}` }
    );
    return extractData(result);
  }

  /**
   * Advanced project queries.
   * @param {Object} filters - Filter options.
   * @returns {Promise<Array<Object>>} Filtered projects.
   */
  async getProjectsWithFilters(filters = {}) {
    const result = handleAsync(
      async () => {
        let projects = await super.getAll(); // Changed: Use super.getAll from CrudMixin

        // Apply filters
        if (filters.status && filters.status.length > 0) {
          projects = projects.filter((p) => filters.status.includes(p.status));
        }

        if (filters.clientId) {
          projects = projects.filter((p) => p.clientId === filters.clientId);
        }

        if (filters.phase && filters.phase.length > 0) {
          projects = projects.filter((p) => filters.phase.includes(p.phase));
        }

        if (filters.startDateFrom) {
          projects = projects.filter(
            (p) => p.startDate && new Date(p.startDate) >= new Date(filters.startDateFrom)
          );
        }

        if (filters.startDateTo) {
          projects = projects.filter(
            (p) => p.startDate && new Date(p.startDate) <= new Date(filters.startDateTo)
          );
        }

        if (filters.minCost) {
          projects = projects.filter((p) => (p.cost || 0) >= filters.minCost);
        }

        if (filters.maxCost) {
          projects = projects.filter((p) => (p.cost || 0) <= filters.maxCost);
        }

        // Apply sorting
        if (filters.sortBy) {
          projects = this.sortProjects(projects, filters.sortBy, filters.sortDirection);
        }

        return projects;
      },
      { context: `Get projects with filters: ${filters}` }
    );
    return extractData(result);
  }

  // ==================== HELPER METHODS ====================

  /**
   * Check if project is overdue.
   * @param {Object} project - Project data.
   * @returns {boolean} True if overdue.
   */
  isProjectOverdue(project) {
    if (!project.endDate || ['completed', 'cancelled'].includes(project.status)) {
      return false;
    }

    return new Date(project.endDate) < new Date();
  }

  /**
   * Check if date is upcoming deadline.
   * @param {string} dateString - Date string.
   * @returns {boolean} True if upcoming.
   */
  isUpcomingDeadline(dateString) {
    const deadline = new Date(dateString);
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + 30);

    return deadline >= today && deadline <= futureDate;
  }

  /**
   * Get days until a specific date.
   * @param {string} dateString - Date string.
   * @returns {number} Days until date.
   */
  getDaysUntilDate(dateString) {
    const targetDate = new Date(dateString);
    const today = new Date();
    const diffTime = targetDate - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Validate project status.
   * @param {string} status - Status to validate.
   * @returns {boolean} True if valid.
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
    ];
    return validStatuses.includes(status);
  }

  /**
   * Validate project phase.
   * @param {string} phase - Phase to validate.
   * @returns {boolean} True if valid.
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
    ];
    return validPhases.includes(phase);
  }

  /**
   * Sort projects by various criteria.
   * @param {Array<Object>} projects - Projects to sort.
   * @param {string} sortBy - Field to sort by.
   * @param {string} direction - 'asc' or 'desc' (default 'asc').
   * @returns {Array<Object>} Sorted projects.
   */
  sortProjects(projects, sortBy, direction = 'asc') {
    return projects.sort((a, b) => {
      let aVal, bVal;

      switch (sortBy) {
        case 'name':
          aVal = (a.name || '').toLowerCase();
          bVal = (b.name || '').toLowerCase();
          break;
        case 'startDate':
        case 'endDate':
          aVal = a[sortBy] ? new Date(a[sortBy]) : new Date(0);
          bVal = b[sortBy] ? new Date(b[sortBy]) : new Date(0);
          break;
        case 'cost':
          aVal = parseFloat(a.cost || 0);
          bVal = parseFloat(b.cost || 0);
          break;
        default:
          aVal = a[sortBy] || '';
          bVal = b[sortBy] || '';
      }

      if (direction === 'desc') {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
      return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
    });
  }
}

// Export singleton instance as per repository pattern
export default new ProjectRepository();
