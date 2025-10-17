// src/services/firebase/Repositories/ProjectRepository.js
import { CrudMixin } from '../mixins/CrudMixin';
import { RealtimeMixin } from '../mixins/RealtimeMixin';
import BaseRepository from '../core/BaseRepository';
import firebaseCore from '../core/FirebaseCore';
import { createSafeFetcher } from '@/utils/errorHandler';
import { ref, get, onValue, query, orderByChild, equalTo } from 'firebase/database';

/**
 * Repository for Project entities using Firebase RTDB.
 * Extends CrudMixin for standard CRUD, adds project-specific methods and subscriptions.
 */
class ProjectRepository extends CrudMixin(RealtimeMixin(BaseRepository)) {
  constructor() {
    super('projects'); // Inherit CRUD from CrudMixin (ensures getById, etc. available)
    //this.collectionName = 'projects';
    //this.entityName = 'project';
  }

  /**
   * Create project.
   * @param {Object} data - Project data.
   * @returns {Promise<Object>} Created project with ID.
   */
  async createProject(data) {
    const safeCreate = createSafeFetcher(
      async () => {
        const dataWithMeta = firebaseCore.addCreateMetadata(data); // Existing meta
        return await this.create(dataWithMeta); // Inherited push/set + return {id, ...}
      },
      { context: 'Create project', retries: 0 }
    );
    const result = await safeCreate(data);
    console.log('createProject returning:', result.id);
    return result;
  }

  /**
   * Get all projects.
   * @returns {Promise<Array<Object>>} Array of projects with IDs.
   */
  async getAllProjects() {
    const safeGetAll = createSafeFetcher(() => this.getAll(), {
      context: 'Get all projects',
      retries: 2,
    });
    const data = await safeGetAll();
    console.log('getAllProjects returning:', data.length);
    return data || [];
  }

  /**
   * Get project by project ID.
   * @param {string} projectId - Project ID.
   * @returns {Promise<Object|null>} Project data or null.
   */
  async getProject(projectId) {
    console.log('RTDB getProject called for ID:', projectId, 'path: projects/' + projectId);
    const safeGet = createSafeFetcher(() => this.getById(projectId), {
      context: 'Get project by ID',
      retries: 2,
    });
    const data = await safeGet(projectId);
    console.log('getProject returning:', data);
    return data;
  }

  /**
   * Get projects by client.
   * @param {string} clientId - Client ID.
   * @returns {Promise<Array<Object>>} Array of matching projects.
   */
  async getProjectsByClient(clientId) {
    const safeGetByClient = createSafeFetcher(() => this.getByField('clientId', clientId), {
      context: 'Get projects by client',
      retries: 2,
    });
    const data = await safeGetByClient(clientId);
    console.log('getProjectsByClient returning:', data.length);
    return data || [];
  }

  /**
   * Get projects by status.
   * @param {string} status - Status filter.
   * @returns {Promise<Array<Object>>} Array of matching projects.
   */
  async getProjectsByStatus(status) {
    const safeGetByStatus = createSafeFetcher(() => this.getByField('status', status), {
      context: 'Get projects by status',
      retries: 2,
    });
    const data = await safeGetByStatus(status);
    console.log('getProjectsByStatus returning:', data.length);
    return data || [];
  }

  /**
   * Get active projects.
   * @returns {Promise<Array<Object>>} Array of active projects.
   */
  async getActiveProjects() {
    const safeGet = createSafeFetcher(
      async () => {
        const activeRef = ref(firebaseCore.database, this.collectionName);
        const activeQuery = query(activeRef, orderByChild('status'), equalTo('active'));
        const snapshot = await get(activeQuery);
        if (!snapshot.exists()) return [];
        return Object.entries(snapshot.val()).map(([id, data]) => ({ id, ...data }));
      },
      { context: 'Get active projects', retries: 1 } // 1 for query
    );
    const data = await safeGet();
    console.log('getActiveProjects returning:', data.length);
    return data || [];
  }

  /**
   * Update project.
   * @param {string} projectId - Project ID.
   * @param {Object} updates - Updates.
   * @returns {Promise<Object>} Updated project.
   */
  async updateProject(projectId, updates) {
    const safeUpdate = createSafeFetcher(
      async () => {
        return await this.update(projectId, updates);
      },
      { context: 'Update project', retries: 0 } // No retry on write
    );
    await safeUpdate(projectId, updates);
    console.log('updateProject success for', projectId);
    return { id: projectId, success: true }; // Or re-fetch if needed
  }

  /**
   * Get project with details (e.g., join client).
   * @param {string} projectId - Project ID.
   * @returns {Promise<Object>} Project with joined data.
   */
  async getProjectWithDetails(projectId) {
    const project = await this.getProject(projectId);
    if (!project) return null;
    // const clientRepo = new ClientRepository();
    // const client = await clientRepo.getClient(project.clientId);  // If ClientRepository exists
    // return { ...project, client };
    return project; // Stub - add join if needed
  }

  /**
   * Get project statistics.
   * @param {string} projectId - Project ID.
   * @returns {Promise<Object>} Stats.
   */
  async getProjectStatistics(projectId) {
    const safeStats = createSafeFetcher(
      async () => {
        // Assume custom under project/stats
        const statsRef = ref(firebaseCore.database, `${this.collectionName}/${projectId}/stats`);
        const snapshot = await get(statsRef);
        if (!snapshot.exists()) return { tasks: 0, rfis: 0, submittals: 0, changeOrders: 0 };
        return snapshot.val();
      },
      { context: 'Get project statistics', retries: 2 }
    );
    const data = await safeStats(projectId);
    console.log('getProjectStatistics returning:', data);
    return data || { tasks: 0, rfis: 0, submittals: 0, changeOrders: 0 };
  }

  /**
   * Search projects.
   * @param {string} query - Search query.
   * @returns {Promise<Array<Object>>} Matching projects.
   */
  async searchProjects(query) {
    const safeSearch = createSafeFetcher(
      async () => {
        const all = await this.getAllProjects(); // Reuses migrated getAll
        const lowerQuery = query.toLowerCase();
        return all.filter(
          (p) =>
            p.name.toLowerCase().includes(lowerQuery) ||
            (p.jobNumber || '').toLowerCase().includes(lowerQuery)
        );
      },
      { context: 'Search projects', retries: 1 }
    );
    const data = await safeSearch(query);
    console.log('searchProjects returning:', data.length);
    return data || [];
  }

  /**
   * Get projects with upcoming deadlines.
   * @returns {Promise<Array<Object>>} Projects with deadlines.
   */
  async getProjectsWithUpcomingDeadlines() {
    const safeGet = createSafeFetcher(
      async () => {
        const all = await this.getAllProjects();
        return all.filter((p) => this.isUpcomingDeadline(p.endDate));
      },
      { context: 'Get projects with upcoming deadlines', retries: 2 }
    );
    const data = await safeGet();
    console.log('getProjectsWithUpcomingDeadlines returning:', data.length);
    return data || [];
  }

  /**
   * Subscribe to all projects.
   * @param {Function} callback - Data callback.
   * @param {Function} sortFn - Optional sort.
   * @param {Function} errorCallback - Error callback.
   * @returns {Function} Unsubscribe.
   */
  subscribeToAll(callback, sortFn = null, errorCallback = null) {
    // L325-327: RTDB onValue for full list
    const projectsRef = ref(firebaseCore.database, this.collectionName);
    const unsubscribe = onValue(
      projectsRef,
      (snap) => {
        if (snap.exists()) {
          const data = Object.entries(snap.val()).map(([id, p]) => ({ id, ...p }));
          callback(sortFn ? data.sort(sortFn) : data);
        } else {
          callback([]);
        }
      },
      errorCallback
    );
    return unsubscribe;
  }

  /**
   * Subscribe to single project.
   * @param {string} projectId - Project ID.
   * @param {Function} callback - Data callback.
   * @param {Function} errorCallback - Error callback.
   * @returns {Function} Unsubscribe.
   */
  subscribeToProject(projectId, callback, errorCallback = null) {
    // L335-337: RTDB onValue for single node
    const projectRef = ref(firebaseCore.database, `${this.collectionName}/${projectId}`);
    const unsubscribe = onValue(
      projectRef,
      (snap) => {
        callback(snap.exists() ? { id: projectId, ...snap.val() } : null);
      },
      errorCallback
    );
    return unsubscribe;
  }

  /**
   * Subscribe to projects (filtered).
   * @param {Object} filters - Filters.
   * @param {Function} callback - Data callback.
   * @returns {Function} Unsubscribe.
   */
  subscribeToProjects(filters, callback) {
    // L344-374: RTDB query with filters
    const projectsRef = ref(firebaseCore.database, this.collectionName);
    let q = projectsRef;
    if (filters.status) q = query(q, orderByChild('status'), equalTo(filters.status));
    if (filters.phase) q = query(q, orderByChild('phase'), equalTo(filters.phase));
    const unsubscribe = onValue(q, (snap) => {
      if (snap.exists()) {
        const data = Object.entries(snap.val()).map(([id, p]) => ({ id, ...p }));
        callback(data);
      } else {
        callback([]);
      }
    });
    return unsubscribe;
  }

  /**
   * Subscribe to projects by client.
   * @param {string} clientId - Client ID.
   * @param {Function} callback - Data callback.
   * @returns {Function} Unsubscribe.
   */
  subscribeToProjectsByClient(clientId, callback) {
    // L382-384: RTDB query equalTo clientId
    const projectsRef = ref(firebaseCore.database, this.collectionName);
    const q = query(projectsRef, orderByChild('clientId'), equalTo(clientId));
    const unsubscribe = onValue(q, (snap) => {
      if (snap.exists()) {
        const data = Object.entries(snap.val()).map(([id, p]) => ({ id, ...p }));
        callback(data);
      } else {
        callback([]);
      }
    });
    return unsubscribe;
  }

  /**
   * Subscribe to active projects.
   * @param {Function} callback - Data callback.
   * @returns {Function} Unsubscribe.
   */
  subscribeToActiveProjects(callback) {
    // L391-400: RTDB query status 'active'
    const projectsRef = ref(firebaseCore.database, this.collectionName);
    const q = query(projectsRef, orderByChild('status'), equalTo('active'));
    const unsubscribe = onValue(q, (snap) => {
      if (snap.exists()) {
        const data = Object.entries(snap.val()).map(([id, p]) => ({ id, ...p }));
        callback(data);
      } else {
        callback([]);
      }
    });
    return unsubscribe;
  }

  /**
   * Subscribe to project tasks.
   * @param {string} projectId - Project ID.
   * @param {Function} callback - Data callback.
   * @returns {Function} Unsubscribe.
   */
  subscribeToProjectTasks(projectId, callback) {
    // L408-447: onValue under projects/[id]/tasks
    const tasksRef = ref(firebaseCore.database, `projects/${projectId}/tasks`);
    const unsubscribe = onValue(tasksRef, (snap) => {
      if (snap.exists()) {
        const data = Object.entries(snap.val()).map(([id, task]) => ({ id, ...task }));
        callback(data);
      } else {
        callback([]);
      }
    });
    return unsubscribe;
  }

  /**
   * Subscribe to project documents.
   * @param {string} projectId - Project ID.
   * @param {Function} callback - Data callback.
   * @returns {Function} Unsubscribe.
   */
  subscribeToProjectDocuments(projectId, callback) {
    // L455-486: onValue under projects/[id]/documents
    const documentsRef = ref(firebaseCore.database, `projects/${projectId}/documents`);
    const unsubscribe = onValue(documentsRef, (snap) => {
      if (snap.exists()) {
        const data = Object.entries(snap.val()).map(([id, doc]) => ({ id, ...doc }));
        callback(data);
      } else {
        callback([]);
      }
    });
    return unsubscribe;
  }

  /**
   * Subscribe to project RFIs.
   * @param {string} projectId - Project ID.
   * @param {Function} callback - Data callback.
   * @returns {Function} Unsubscribe.
   */
  subscribeToProjectRFIs(projectId, callback) {
    // L494-522: onValue under projects/[id]/rfis
    const rfiRef = ref(firebaseCore.database, `projects/${projectId}/rfis`);
    const unsubscribe = onValue(rfiRef, (snap) => {
      if (snap.exists()) {
        const data = Object.entries(snap.val()).map(([id, rfi]) => ({ id, ...rfi }));
        callback(data);
      } else {
        callback([]);
      }
    });
    return unsubscribe;
  }

  /**
   * Subscribe to project submittals.
   * @param {string} projectId - Project ID.
   * @param {Function} callback - Data callback.
   * @returns {Function} Unsubscribe.
   */
  subscribeToProjectSubmittals(projectId, callback) {
    // L530-562: onValue under projects/[id]/submittals
    const submittalsRef = ref(firebaseCore.database, `projects/${projectId}/submittals`);
    const unsubscribe = onValue(submittalsRef, (snap) => {
      if (snap.exists()) {
        const data = Object.entries(snap.val()).map(([id, sub]) => ({ id, ...sub }));
        callback(data);
      } else {
        callback([]);
      }
    });
    return unsubscribe;
  }

  /**
   * Subscribe to project change orders.
   * @param {string} projectId - Project ID.
   * @param {Function} callback - Data callback.
   * @returns {Function} Unsubscribe.
   */
  subscribeToProjectChangeOrders(projectId, callback) {
    // L570-602: onValue under projects/[id]/changeOrders
    const coRef = ref(firebaseCore.database, `projects/${projectId}/changeOrders`);
    const unsubscribe = onValue(coRef, (snap) => {
      if (snap.exists()) {
        const data = Object.entries(snap.val()).map(([id, co]) => ({ id, ...co }));
        callback(data);
      } else {
        callback([]);
      }
    });
    return unsubscribe;
  }

  /**
   * Validate project data.
   * @param {Object} data - Project data.
   * @returns {Object} Validation result.
   */
  validateProjectData(data) {
    // L609-642: Existing validation logic (e.g., required fields)
    const errors = {};
    if (!data.name || data.name.trim() === '') errors.name = 'Project name is required';
    if (!data.jobNumber || data.jobNumber.trim() === '')
      errors.jobNumber = 'Job number is required';
    if (!data.clientId) errors.clientId = 'Client is required';
    if (!['preConstruction', 'construction', 'closeOut', 'complete'].includes(data.phase))
      errors.phase = 'Invalid phase';
    return { isValid: Object.keys(errors).length === 0, errors };
  }

  /**
   * Bulk update project status.
   * @param {Array} projectIds - IDs.
   * @param {string} status - New status.
   * @returns {Promise<Array>} Updated IDs.
   */
  async bulkUpdateProjectStatus(projectIds, status) {
    const safeBulk = createSafeFetcher(
      async () => {
        const promises = projectIds.map((id) => this.update(id, { status }));
        await Promise.all(promises);
        return projectIds.map((id) => ({ id, success: true }));
      },
      { context: 'Bulk update project status', retries: 0 }
    );
    const data = await safeBulk(projectIds, status);
    console.log('bulkUpdateProjectStatus success for', projectIds.length, 'projects');
    return data;
  }

  /**
   * Get projects with filters.
   * @param {Object} filters - Filters (status, phase, etc.).
   * @returns {Promise<Array>} Filtered projects.
   */
  async getProjectsWithFilters(filters) {
    const safeFilter = createSafeFetcher(
      async () => {
        let q = ref(firebaseCore.database, this.collectionName);
        if (filters.status) q = query(q, orderByChild('status'), equalTo(filters.status));
        if (filters.phase) q = query(q, orderByChild('phase'), equalTo(filters.phase));
        const snap = await get(q);
        if (!snap.exists()) return [];
        return Object.entries(snap.val()).map(([id, p]) => ({ id, ...p }));
      },
      { context: 'Get projects with filters', retries: 2 }
    );
    const data = await safeFilter(filters);
    console.log('getProjectsWithFilters returning:', data.length);
    return data || [];
  }

  /**
   * Check if project is overdue.
   * @param {string} endDate - End date.
   * @returns {boolean} Overdue or not.
   */
  isProjectOverdue(endDate) {
    // L738-744: Existing
    const today = new Date();
    const due = new Date(endDate);
    return due < today;
  }

  /**
   * Check if deadline is upcoming.
   * @param {string} date - Date.
   * @param {number} days - Days ahead.
   * @returns {boolean} Upcoming or not.
   */
  isUpcomingDeadline(date, days = 7) {
    // L751-758: Existing
    const today = new Date();
    const d = new Date(date);
    const diff = d - today;
    return diff > 0 && diff <= days * 24 * 60 * 60 * 1000;
  }

  /**
   * Get days until date.
   * @param {string} date - Date.
   * @returns {number} Days until.
   */
  getDaysUntilDate(date) {
    // L765-770: Existing
    const today = new Date();
    const d = new Date(date);
    const diff = d - today;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  /**
   * Check valid project status.
   * @param {string} status - Status.
   * @returns {boolean} Valid or not.
   */
  isValidProjectStatus(status) {
    // L777-788: Existing
    return ['active', 'on-hold', 'completed', 'cancelled'].includes(status);
  }

  /**
   * Check valid project phase.
   * @param {string} phase - Phase.
   * @returns {boolean} Valid or not.
   */
  isValidProjectPhase(phase) {
    // L795-806: Existing
    return ['preConstruction', 'construction', 'closeOut', 'complete'].includes(phase);
  }

  /**
   * Sort projects.
   * @param {Array<Object>} projects - Projects.
   * @param {string} by - Sort field.
   * @returns {Array<Object>} Sorted.
   */
  sortProjects(projects, by = 'name') {
    // L815-843: Existing
    return projects.sort((a, b) => (a[by] || '').localeCompare(b[by] || ''));
  }
}

export default new ProjectRepository();
