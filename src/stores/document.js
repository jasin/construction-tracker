// stores/document.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import {
  getAllDocuments,
  uploadDocument as uploadDocumentApi,
  updateDocument as updateDocumentApi,
  deleteDocument as deleteDocumentApi,
  getDocumentById as getDocumentByIdApi,
  getDocumentsByProject,
} from '../services/api/documentsApi';
import { supabase } from '@/configs/supabase';
import { useAuthStore } from './auth';

export const useDocumentStore = defineStore('document', () => {
  // State - User Documents (for dashboard - uploaded by or reviewed by user)
  const userDocuments = ref([]);
  const userDocumentsLoading = ref(true);
  const userDocumentsInitialized = ref(false);

  // State - Project Documents (for project detail views)
  const projectDocuments = ref([]);
  const projectDocumentsLoading = ref(false);
  const currentProjectId = ref(null);

  // State - Single Document (for detail view/editing)
  const currentDocument = ref(null);
  const loading = ref(false);
  const error = ref(null);

  // Subscription management
  let userDocumentsUnsubscribe = null;
  let projectDocumentsUnsubscribe = null;

  // Getters - User Documents
  const userDocumentCount = computed(() => userDocuments.value.length);

  const userRecentDocuments = computed(() =>
    userDocuments.value
      .slice()
      .sort((a, b) => new Date(b.uploadedAt || b.createdAt) - new Date(a.uploadedAt || a.createdAt))
      .slice(0, 10)
  );

  const userPendingDocuments = computed(() =>
    userDocuments.value.filter((doc) => doc.status === 'pending')
  );

  const userDocumentsByCategory = computed(() => {
    const grouped = {};
    userDocuments.value.forEach((document) => {
      const category = document.category || 'uncategorized';
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push(document);
    });
    return grouped;
  });

  const userDocumentsByStatus = computed(() => {
    const grouped = {};
    userDocuments.value.forEach((document) => {
      const status = document.status || 'pending';
      if (!grouped[status]) grouped[status] = [];
      grouped[status].push(document);
    });
    return grouped;
  });

  const userDocumentsNeedingReview = computed(() =>
    userDocuments.value.filter((doc) => doc.status === 'pending')
  );

  const userTotalDocumentSize = computed(() =>
    userDocuments.value.reduce((sum, doc) => sum + (doc.fileSize || 0), 0)
  );

  // Getters - Project Documents
  const projectDocumentCount = computed(() => projectDocuments.value.length);

  const projectRecentDocuments = computed(() =>
    projectDocuments.value
      .slice()
      .sort((a, b) => new Date(b.uploadedAt || b.createdAt) - new Date(a.uploadedAt || a.createdAt))
      .slice(0, 10)
  );

  const projectDocumentsByCategory = computed(() => {
    const grouped = {};
    projectDocuments.value.forEach((document) => {
      const category = document.category || 'uncategorized';
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push(document);
    });
    return grouped;
  });

  // Actions - User Documents Subscription (for dashboard)
  /**
   * Initializes real-time subscription to current user's documents
   * Subscribes to all documents uploaded by or reviewed by the current user
   */
  async function initializeUserDocumentsSubscription() {
    if (userDocumentsInitialized.value) {
      console.log('Document Store: User documents subscription already initialized');
      return;
    }

    const authStore = useAuthStore();
    const userId = authStore.user?.id;
    if (!userId) {
      console.warn('Document Store: Cannot initialize user documents subscription - no user ID');
      userDocumentsLoading.value = false;
      return;
    }

    console.log('Document Store: Initializing user documents subscription for user:', userId);
    userDocumentsLoading.value = true;

    try {
      // Cleanup existing subscription before creating a new one
      cleanupUserDocumentsSubscription();

      // Load initial data from API
      const allDocuments = await getAllDocuments();
      userDocuments.value = allDocuments.filter(
        (doc) => doc.uploadedBy === userId || doc.reviewedBy === userId
      );

      console.log('Document Store: User documents loaded, count:', userDocuments.value.length);

      // Subscribe to real-time updates with Supabase
      const channel = supabase
        .channel('user-documents')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'documents',
          },
          (payload) => {
            handleUserDocumentChange(payload);
          }
        )
        .subscribe();

      userDocumentsUnsubscribe = () => supabase.removeChannel(channel);
      userDocumentsInitialized.value = true;
      userDocumentsLoading.value = false;
    } catch (error) {
      console.error('Document Store: Error initializing user documents subscription:', error);
      userDocumentsLoading.value = false;
    }
  }

  /**
   * Cleanup user documents subscription
   */
  function cleanupUserDocumentsSubscription() {
    if (userDocumentsUnsubscribe) {
      console.log('Document Store: Cleaning up user documents subscription');
      userDocumentsUnsubscribe();
      userDocumentsUnsubscribe = null;
    }
    userDocuments.value = [];
    userDocumentsInitialized.value = false;
    userDocumentsLoading.value = true;
  }

  // Actions - Project Documents Subscription (for project detail)
  /**
   * Initializes real-time subscription to documents for a specific project
   */
  async function initializeProjectDocumentsSubscription(projectId) {
    if (!projectId) {
      console.warn('Document Store: Cannot initialize project documents - no project ID');
      return;
    }

    // If already subscribed to this project, do nothing
    if (currentProjectId.value === projectId && projectDocumentsUnsubscribe) {
      console.log('Document Store: Already subscribed to project documents:', projectId);
      return;
    }

    // Cleanup existing subscription before creating a new one
    cleanupProjectDocumentsSubscription();

    console.log('Document Store: Initializing project documents subscription for:', projectId);
    currentProjectId.value = projectId;
    projectDocumentsLoading.value = true;

    try {
      // Load initial data from API
      projectDocuments.value = await getDocumentsByProject(projectId);

      console.log(
        'Document Store: Project documents loaded, count:',
        projectDocuments.value.length
      );

      // Subscribe to real-time updates with Supabase
      const channel = supabase
        .channel(`project-${projectId}-documents`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'documents',
            filter: `project_id=eq.${projectId}`,
          },
          (payload) => {
            handleProjectDocumentChange(payload);
          }
        )
        .subscribe();

      projectDocumentsUnsubscribe = () => supabase.removeChannel(channel);
      projectDocumentsLoading.value = false;
    } catch (error) {
      console.error('Document Store: Error initializing project documents subscription:', error);
      projectDocumentsLoading.value = false;
    }
  }

  /**
   * Cleanup project documents subscription
   */
  function cleanupProjectDocumentsSubscription() {
    if (projectDocumentsUnsubscribe) {
      console.log('Document Store: Cleaning up project documents subscription');
      projectDocumentsUnsubscribe();
      projectDocumentsUnsubscribe = null;
    }
    projectDocuments.value = [];
    currentProjectId.value = null;
    projectDocumentsLoading.value = false;
  }

  // Actions - CRUD Operations
  /**
   * Create a new document
   */
  async function createDocument(documentData) {
    loading.value = true;
    error.value = null;

    try {
      const newDocument = await uploadDocumentApi(documentData);
      console.log('Document Store: Document created successfully:', newDocument.id);
      return newDocument;
    } catch (err) {
      console.error('Document Store: Error creating document:', err);
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Update an existing document
   */
  async function updateDocument(documentId, updates) {
    loading.value = true;
    error.value = null;

    try {
      const updatedDocument = await updateDocumentApi(documentId, updates);
      console.log('Document Store: Document updated successfully:', documentId);
      return updatedDocument;
    } catch (err) {
      console.error('Document Store: Error updating document:', err);
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Delete a document
   */
  async function deleteDocument(documentId) {
    loading.value = true;
    error.value = null;

    try {
      await deleteDocumentApi(documentId);
      console.log('Document Store: Document deleted successfully:', documentId);
    } catch (err) {
      console.error('Document Store: Error deleting document:', err);
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Get document by ID
   */
  async function getDocumentById(documentId) {
    loading.value = true;
    error.value = null;

    try {
      const document = await getDocumentByIdApi(documentId);
      currentDocument.value = document;
      return document;
    } catch (err) {
      console.error('Document Store: Error getting document:', err);
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Update document status
   */
  async function updateDocumentStatus(documentId, status, comments = '') {
    loading.value = true;
    error.value = null;

    try {
      const updatedDocument = await updateDocumentApi(documentId, {
        status,
        ...(comments && { comments }),
      });
      console.log('Document Store: Document status updated:', documentId);
      return updatedDocument;
    } catch (err) {
      console.error('Document Store: Error updating document status:', err);
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Approve document
   */
  async function approveDocument(documentId, comments = '') {
    return await updateDocumentStatus(documentId, 'approved', comments);
  }

  /**
   * Reject document
   */
  async function rejectDocument(documentId, comments = '') {
    return await updateDocumentStatus(documentId, 'rejected', comments);
  }

  return {
    // State - User Documents
    userDocuments,
    userDocumentsLoading,
    userDocumentsInitialized,

    // State - Project Documents
    projectDocuments,
    projectDocumentsLoading,
    currentProjectId,

    // State - Single Document
    currentDocument,
    loading,
    error,

    // Getters - User Documents
    userDocumentCount,
    userRecentDocuments,
    userPendingDocuments,
    userDocumentsByCategory,
    userDocumentsByStatus,
    userDocumentsNeedingReview,
    userTotalDocumentSize,

    // Getters - Project Documents
    projectDocumentCount,
    projectRecentDocuments,
    projectDocumentsByCategory,

    // Actions - Subscriptions
    initializeUserDocumentsSubscription,
    cleanupUserDocumentsSubscription,
    initializeProjectDocumentsSubscription,
    cleanupProjectDocumentsSubscription,

    // Actions - CRUD
    createDocument,
    updateDocument,
    deleteDocument,
    getDocumentById,
    updateDocumentStatus,
    approveDocument,
    rejectDocument,
  };
});
