// src/composables/useDocuments.js - Documents business logic
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
//import googleDriveService from '@/services/api/googleDriveService'
import { formatFileSize } from '@/utils/index';
import { getAllProjects } from '@/services/api/projectsApi';
import { getAllUsers } from '@/services/api/usersApi';
import { getDocumentsByProject } from '@/services/api/documentsApi';

export function useDocuments(options = {}) {
  const {
    projectId = null,
    mode = 'search', // 'search' | 'project' | 'manage'
    initialPageSize = 25,
    enableRealtime = true,
  } = options;

  // ==================== STATE ====================
  const loading = ref(true);
  const searching = ref(false);
  const error = ref('');

  // Data
  const allDocuments = ref([]);
  const projects = ref([]);
  const users = ref([]);
  const documentStats = ref({
    total: 0,
    totalSize: 0,
    byCategory: {},
    byStatus: {},
    projectCount: 0,
  });

  // ==================== SEARCH & FILTERS ====================
  const searchQuery = ref('');
  const showAdvancedFilters = ref(false);

  const activeFilters = ref({
    projectIds: [],
    categories: [],
    tags: [],
    fileTypes: [],
    uploadedBy: [],
    status: [],
    customFileSize: null,
    versionFilter: { latestOnly: false },
    dateRange: { from: null, to: null },
  });

  // ==================== SORTING & PAGINATION ====================
  const sortOption = ref('uploadedAt-desc');
  const currentPage = ref(1);
  const pageSize = ref(initialPageSize);
  const first = ref(0);

  const sortOptions = [
    { label: 'Newest First', value: 'uploadedAt-desc' },
    { label: 'Oldest First', value: 'uploadedAt-asc' },
    { label: 'Name A-Z', value: 'name-asc' },
    { label: 'Name Z-A', value: 'name-desc' },
    { label: 'Size Largest', value: 'fileSize-desc' },
    { label: 'Size Smallest', value: 'fileSize-asc' },
    { label: 'Most Recent Update', value: 'updatedAt-desc' },
  ];

  // ==================== UI STATE ====================
  const showUploadDialog = ref(false);
  const showDocumentViewer = ref(false);
  const selectedDocument = ref(null);

  // Realtime subscriptions
  let documentsSubscription = null;

  // ==================== FILTER CONFIGURATION ====================
  const filterConfig = computed(() => [
    // Only show project filter in search mode (not project-specific modes)
    ...(mode === 'search'
      ? [
          {
            field: 'projectIds',
            label: 'Projects',
            type: 'multiselect',
            options: projects.value.map((p) => ({
              label: `${p.jobNumber} - ${p.name}`,
              value: p.id,
            })),
            placeholder: 'Select projects...',
          },
        ]
      : []),

    {
      field: 'categories',
      label: 'Categories',
      type: 'multiselect',
      options: getCategoryOptions(),
      placeholder: 'Select categories...',
    },
    {
      field: 'status',
      label: 'Status',
      type: 'multiselect',
      options: getStatusOptions(),
      placeholder: 'Select status...',
    },
    {
      field: 'fileTypes',
      label: 'File Types',
      type: 'multiselect',
      options: getFileTypeOptions(),
      placeholder: 'Select file types...',
    },
    {
      field: 'uploadedBy',
      label: 'Uploaded By',
      type: 'multiselect',
      options: users.value.map((u) => ({ label: u.name || u.email, value: u.id })),
      placeholder: 'Select users...',
    },
    {
      field: 'customFileSize',
      label: 'File Size',
      type: 'custom',
    },
    {
      field: 'versionFilter',
      label: 'Version Options',
      type: 'custom',
    },
    {
      field: 'dateRange',
      label: 'Date Range',
      type: 'custom',
    },
    {
      field: 'tags',
      label: 'Tags',
      type: 'chips',
      placeholder: 'Enter tags...',
    },
  ]);

  // ==================== COMPUTED PROPERTIES ====================
  const filteredDocuments = computed(() => {
    let docs = [...allDocuments.value];

    // Project filter (automatic for project mode, manual for search mode)
    if (projectId) {
      docs = docs.filter((doc) => doc.projectId === projectId);
    } else if (activeFilters.value.projectIds.length > 0) {
      docs = docs.filter((doc) => activeFilters.value.projectIds.includes(doc.projectId));
    }

    // Text search
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase();
      docs = docs.filter(
        (doc) =>
          doc.name?.toLowerCase().includes(query) ||
          doc.description?.toLowerCase().includes(query) ||
          doc.tags?.some((tag) => tag.toLowerCase().includes(query)) ||
          doc.content?.toLowerCase().includes(query)
      );
    }

    // Apply all other filters
    docs = applyAdvancedFilters(docs);

    // Apply sorting
    return sortDocuments(docs, sortOption.value);
  });

  const paginatedDocuments = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value;
    const end = start + pageSize.value;
    return filteredDocuments.value.slice(start, end);
  });

  const totalPages = computed(() => Math.ceil(filteredDocuments.value.length / pageSize.value));

  const searchStats = computed(() => {
    const docs = filteredDocuments.value;
    const projectIds = new Set(docs.map((doc) => doc.projectId));

    return {
      total: docs.length,
      totalSize: docs.reduce((sum, doc) => sum + (doc.fileSize || 0), 0),
      projectCount: projectIds.size,
    };
  });

  // ==================== HELPER FUNCTIONS ====================
  const getCategoryOptions = () => [
    { label: 'Contracts & Agreements', value: 'contracts' },
    { label: 'Permits & Approvals', value: 'permits' },
    { label: 'Plans & Drawings', value: 'plans' },
    { label: 'Specifications', value: 'specifications' },
    { label: 'Progress Photos', value: 'photos' },
    { label: 'Daily/Weekly Reports', value: 'reports' },
    { label: 'Inspection Reports', value: 'inspections' },
    { label: 'Submittals', value: 'submittals' },
    { label: 'Correspondence', value: 'correspondence' },
    { label: 'Invoices & Billing', value: 'invoices' },
    { label: 'Insurance Documents', value: 'insurance' },
    { label: 'Safety Documents', value: 'safety' },
    { label: 'RFI Documentation', value: 'rfis' },
    { label: 'Change Order Documents', value: 'changeOrders' },
    { label: 'Warranties', value: 'warranties' },
    { label: 'Project Closeout', value: 'closeout' },
  ];

  const getStatusOptions = () => [
    { label: 'Draft', value: 'draft' },
    { label: 'Pending Review', value: 'pending' },
    { label: 'Under Review', value: 'review' },
    { label: 'Approved', value: 'approved' },
    { label: 'Rejected', value: 'rejected' },
    { label: 'Superseded', value: 'superseded' },
  ];

  const getFileTypeOptions = () => [
    { label: 'PDF', value: 'pdf' },
    { label: 'Word Document', value: 'docx' },
    { label: 'Excel', value: 'xlsx' },
    { label: 'PowerPoint', value: 'pptx' },
    { label: 'Image', value: 'image' },
    { label: 'CAD Drawing', value: 'dwg' },
    { label: 'Text', value: 'txt' },
    { label: 'Other', value: 'other' },
  ];

  const getFileType = (fileName) => {
    if (!fileName) return 'other';
    const ext = fileName.split('.').pop()?.toLowerCase();

    const typeMap = {
      pdf: 'pdf',
      doc: 'docx',
      docx: 'docx',
      xls: 'xlsx',
      xlsx: 'xlsx',
      ppt: 'pptx',
      pptx: 'pptx',
      jpg: 'image',
      jpeg: 'image',
      png: 'image',
      gif: 'image',
      dwg: 'dwg',
      dxf: 'dwg',
      txt: 'txt',
    };

    return typeMap[ext] || 'other';
  };

  const applyAdvancedFilters = (docs) => {
    // Category filter
    if (activeFilters.value.categories.length > 0) {
      docs = docs.filter((doc) => activeFilters.value.categories.includes(doc.category));
    }

    // Status filter
    if (activeFilters.value.status.length > 0) {
      docs = docs.filter((doc) => activeFilters.value.status.includes(doc.status));
    }

    // File type filter
    if (activeFilters.value.fileTypes.length > 0) {
      docs = docs.filter((doc) => {
        const fileType = getFileType(doc.name || doc.fileName);
        return activeFilters.value.fileTypes.includes(fileType);
      });
    }

    // Uploaded by filter
    if (activeFilters.value.uploadedBy.length > 0) {
      docs = docs.filter((doc) => activeFilters.value.uploadedBy.includes(doc.uploadedBy));
    }

    // File size filter
    if (activeFilters.value.customFileSize) {
      docs = docs.filter((doc) => {
        const size = doc.fileSize || 0;
        const sizeInMB = size / (1024 * 1024);

        switch (activeFilters.value.customFileSize) {
          case 'small':
            return sizeInMB < 1;
          case 'medium':
            return sizeInMB >= 1 && sizeInMB <= 10;
          case 'large':
            return sizeInMB > 10;
          default:
            return true;
        }
      });
    }

    // Date range filter
    if (activeFilters.value.dateRange.from || activeFilters.value.dateRange.to) {
      docs = docs.filter((doc) => {
        const docDate = new Date(doc.uploadedAt || doc.createdAt);
        const fromDate = activeFilters.value.dateRange.from;
        const toDate = activeFilters.value.dateRange.to;

        if (fromDate && docDate < fromDate) return false;
        if (toDate && docDate > toDate) return false;
        return true;
      });
    }

    // Tags filter
    if (activeFilters.value.tags.length > 0) {
      docs = docs.filter((doc) =>
        doc.tags?.some((tag) =>
          activeFilters.value.tags.some((filterTag) =>
            tag.toLowerCase().includes(filterTag.toLowerCase())
          )
        )
      );
    }

    // Version filter (latest only)
    if (activeFilters.value.versionFilter.latestOnly) {
      const groupedDocs = docs.reduce((groups, doc) => {
        const baseName = doc.name?.replace(/\s*\(v\d+\)/, '') || doc.fileName;
        if (!groups[baseName] || new Date(doc.uploadedAt) > new Date(groups[baseName].uploadedAt)) {
          groups[baseName] = doc;
        }
        return groups;
      }, {});
      docs = Object.values(groupedDocs);
    }

    return docs;
  };

  const sortDocuments = (docs, sortBy) => {
    const [field, direction] = sortBy.split('-');

    return docs.sort((a, b) => {
      let aVal = a[field];
      let bVal = b[field];

      if (field === 'name') {
        aVal = (a.name || a.fileName || '').toLowerCase();
        bVal = (b.name || b.fileName || '').toLowerCase();
      } else if (field === 'uploadedAt' || field === 'updatedAt') {
        aVal = new Date(aVal || 0);
        bVal = new Date(bVal || 0);
      } else if (field === 'fileSize') {
        aVal = aVal || 0;
        bVal = bVal || 0;
      }

      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  // ==================== METHODS ====================
  const loadDocuments = async () => {
    try {
      loading.value = true;
      error.value = '';

      // Load supporting data
      const [projectsData, usersData] = await Promise.all([getAllProjects(), getAllUsers()]);

      projects.value = projectsData;
      users.value = usersData;

      // Load documents based on mode
      if (projectId) {
        // Project-specific modes (project, manage)
        const documentsData = await getDocumentsByProject(projectId);
        allDocuments.value = documentsData;

        // Calculate stats for project documents
        documentStats.value = {
          total: documentsData.length,
          totalSize: documentsData.reduce((sum, doc) => sum + (doc.fileSize || 0), 0),
          byCategory: {},
          byStatus: {},
          projectCount: 1,
        };
      } else {
        // Global search mode
        const allProjectDocs = await Promise.all(
          projectsData.map((project) => getDocumentsByProject(project.id).catch(() => []))
        );
        allDocuments.value = allProjectDocs.flat();

        // Calculate stats
        documentStats.value = {
          total: allDocuments.value.length,
          totalSize: allDocuments.value.reduce((sum, doc) => sum + (doc.fileSize || 0), 0),
          byCategory: {},
          byStatus: {},
          projectCount: new Set(allDocuments.value.map((doc) => doc.projectId)).size,
        };
      }
    } catch (err) {
      console.error('Error loading documents:', err);
      error.value = err.message || 'Failed to load documents';
    } finally {
      loading.value = false;
    }
  };

  const setupRealtimeListener = () => {
    // Real-time subscriptions are now handled by the document store
    // This composable relies on the store's Supabase subscriptions
    if (!enableRealtime || !projectId) return;

    console.log('Real-time listener - managed by document store with Supabase');
    // The document store automatically updates via Supabase real-time
  };

  const refreshDocuments = () => {
    loadDocuments();
  };

  const performSearch = async () => {
    searching.value = true;
    setTimeout(() => {
      searching.value = false;
      currentPage.value = 1;
      first.value = 0;
    }, 300);
  };

  const handleFilterChange = (filterKey, value) => {
    activeFilters.value[filterKey] = value;
    currentPage.value = 1;
    first.value = 0;
  };

  const clearAllFilters = () => {
    searchQuery.value = '';
    activeFilters.value = {
      projectIds: [],
      categories: [],
      tags: [],
      fileTypes: [],
      uploadedBy: [],
      status: [],
      customFileSize: null,
      versionFilter: { latestOnly: false },
      dateRange: { from: null, to: null },
    };
    currentPage.value = 1;
    first.value = 0;
  };

  const handleSortChange = (newSort) => {
    sortOption.value = newSort;
    currentPage.value = 1;
    first.value = 0;
  };

  const onPageChange = (event) => {
    currentPage.value = Math.floor(event.first / event.rows) + 1;
    first.value = event.first;
    pageSize.value = event.rows;
  };

  const openDocument = (document) => {
    selectedDocument.value = document;
    showDocumentViewer.value = true;
  };

  const handleDocumentAction = ({ action, document }) => {
    switch (action) {
      case 'view':
        if (document.googleDriveLink) {
          window.open(document.googleDriveLink, '_blank');
        }
        break;
      case 'download':
        if (document.googleDriveFileId) {
          const downloadUrl = `https://drive.google.com/uc?export=download&id=${document.googleDriveFileId}`;
          window.open(downloadUrl, '_blank');
        }
        break;
      case 'drive':
        if (document.googleDriveLink) {
          window.open(document.googleDriveLink, '_blank');
        }
        break;
      case 'edit':
        openDocument(document);
        break;
    }
  };

  const handleViewModeChange = (mode) => {
    console.log('View mode changed to:', mode);
    // Could save to localStorage or user preferences
  };

  const handleDocumentUploaded = (newDocument) => {
    console.log('Document uploaded:', newDocument.name);
    // Document will be updated via realtime listener or manual refresh
    if (!enableRealtime) {
      refreshDocuments();
    }
  };

  const handleDocumentUpdated = (updatedDocument) => {
    const index = allDocuments.value.findIndex((doc) => doc.id === updatedDocument.id);
    if (index !== -1) {
      allDocuments.value[index] = updatedDocument;
    }
  };

  const exportResults = () => {
    const dataToExport = filteredDocuments.value.map((doc) => ({
      name: doc.name || doc.fileName,
      project: projects.value.find((p) => p.id === doc.projectId)?.name,
      category: doc.category,
      status: doc.status,
      fileSize: formatFileSize(doc.fileSize || 0),
      uploadedAt: new Date(doc.uploadedAt).toLocaleDateString(),
      uploadedBy: users.value.find((u) => u.id === doc.uploadedBy)?.name,
      tags: doc.tags?.join(', ') || '',
    }));

    console.log('Exporting results...', dataToExport);
    // Could generate CSV/Excel export here
  };

  // ==================== WATCHERS ====================
  watch(
    () => searchQuery.value,
    () => {
      if (searchQuery.value.length > 2 || searchQuery.value.length === 0) {
        performSearch();
      }
    },
    { debounce: 500 }
  );

  // ==================== LIFECYCLE ====================
  onMounted(async () => {
    await loadDocuments();
    setupRealtimeListener();
  });

  onBeforeUnmount(() => {
    // Document store manages its own Supabase subscriptions
    // No manual cleanup needed here
    console.log('useDocuments composable unmounting - store handles cleanup');
  });

  // ==================== RETURN ====================
  return {
    // State
    loading,
    searching,
    error,
    allDocuments,
    documentStats,
    projects,
    users,

    // Search & Filters
    searchQuery,
    activeFilters,
    showAdvancedFilters,
    filteredDocuments,
    searchStats,

    // Sorting & Pagination
    sortOption,
    sortOptions,
    currentPage,
    pageSize,
    paginatedDocuments,
    totalPages,
    first,

    // UI State
    showUploadDialog,
    showDocumentViewer,
    selectedDocument,

    // Methods
    loadDocuments,
    refreshDocuments,
    performSearch,
    handleFilterChange,
    clearAllFilters,
    handleSortChange,
    onPageChange,
    openDocument,
    handleDocumentAction,
    handleViewModeChange,
    handleDocumentUploaded,
    handleDocumentUpdated,
    exportResults,

    // Config
    filterConfig,
  };
}
