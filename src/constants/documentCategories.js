// config/documentCategories.js

export const DOCUMENT_CATEGORIES = {
  // Pre-Construction
  contracts: {
    label: 'Contracts & Agreements',
    folder: '01 - Contracts & Agreements',
    icon: 'pi pi-file-check',
    color: '#059669',
    allowedTypes: ['.pdf', '.doc', '.docx'],
    requiresApproval: true,
    maxFileSize: 50 * 1024 * 1024, // 50MB
    description: 'Project contracts, agreements, and legal documents',
  },

  permits: {
    label: 'Permits & Approvals',
    folder: '02 - Permits & Approvals',
    icon: 'pi pi-verified',
    color: '#dc2626',
    allowedTypes: ['.pdf', '.jpg', '.jpeg', '.png'],
    requiresApproval: false,
    maxFileSize: 25 * 1024 * 1024, // 25MB
    description: 'Building permits, zoning approvals, and regulatory documents',
  },

  plans: {
    label: 'Plans & Drawings',
    folder: '03 - Plans & Drawings',
    icon: 'pi pi-map',
    color: '#2563eb',
    allowedTypes: ['.pdf', '.dwg', '.jpg', '.jpeg', '.png'],
    requiresApproval: true,
    maxFileSize: 100 * 1024 * 1024, // 100MB
    description: 'Architectural, structural, and MEP drawings',
    subfolders: {
      architectural: 'Architectural',
      structural: 'Structural',
      mep: 'MEP',
    },
  },

  specifications: {
    label: 'Specifications',
    folder: '04 - Specifications',
    icon: 'pi pi-list',
    color: '#7c3aed',
    allowedTypes: ['.pdf', '.doc', '.docx', '.xls', '.xlsx'],
    requiresApproval: true,
    maxFileSize: 50 * 1024 * 1024, // 50MB
    description: 'Technical specifications and requirements',
  },

  // Construction
  photos: {
    label: 'Progress Photos',
    folder: '08 - Progress Documentation/Photos',
    icon: 'pi pi-camera',
    color: '#ea580c',
    allowedTypes: ['.jpg', '.jpeg', '.png', '.heic'],
    requiresApproval: false,
    maxFileSize: 15 * 1024 * 1024, // 15MB
    description: 'Construction progress and site photos',
  },

  reports: {
    label: 'Daily/Weekly Reports',
    folder: '08 - Progress Documentation/Reports',
    icon: 'pi pi-chart-line',
    color: '#0891b2',
    allowedTypes: ['.pdf', '.doc', '.docx', '.xls', '.xlsx'],
    requiresApproval: false,
    maxFileSize: 25 * 1024 * 1024, // 25MB
    description: 'Progress reports, daily logs, and status updates',
  },

  inspections: {
    label: 'Inspection Reports',
    folder: '09 - Inspections',
    icon: 'pi pi-search',
    color: '#dc2626',
    allowedTypes: ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'],
    requiresApproval: false,
    maxFileSize: 25 * 1024 * 1024, // 25MB
    description: 'Inspection reports and compliance documentation',
  },

  submittals: {
    label: 'Submittals',
    folder: '05 - Submittals',
    icon: 'pi pi-send',
    color: '#059669',
    allowedTypes: ['.pdf', '.doc', '.docx', '.xls', '.xlsx'],
    requiresApproval: true,
    maxFileSize: 50 * 1024 * 1024, // 50MB
    description: 'Material and equipment submittals',
  },

  // Administrative
  correspondence: {
    label: 'Correspondence',
    folder: '10 - Correspondence',
    icon: 'pi pi-envelope',
    color: '#6b7280',
    allowedTypes: ['.pdf', '.doc', '.docx', '.msg', '.eml'],
    requiresApproval: false,
    maxFileSize: 25 * 1024 * 1024, // 25MB
    description: 'Email correspondence and communications',
  },

  invoices: {
    label: 'Invoices & Billing',
    folder: 'Financial',
    icon: 'pi pi-dollar',
    color: '#059669',
    allowedTypes: ['.pdf', '.xls', '.xlsx', '.csv'],
    requiresApproval: true,
    maxFileSize: 25 * 1024 * 1024, // 25MB
    description: 'Invoices, billing, and financial documents',
  },

  insurance: {
    label: 'Insurance Documents',
    folder: 'Insurance',
    icon: 'pi pi-shield',
    color: '#7c3aed',
    allowedTypes: ['.pdf', '.doc', '.docx'],
    requiresApproval: false,
    maxFileSize: 25 * 1024 * 1024, // 25MB
    description: 'Insurance certificates and policies',
  },

  safety: {
    label: 'Safety Documents',
    folder: 'Safety',
    icon: 'pi pi-exclamation-triangle',
    color: '#dc2626',
    allowedTypes: ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'],
    requiresApproval: false,
    maxFileSize: 25 * 1024 * 1024, // 25MB
    description: 'Safety plans, incidents, and compliance documents',
  },

  // Quality Control
  rfis: {
    label: 'RFI Documentation',
    folder: '06 - RFIs',
    icon: 'pi pi-question-circle',
    color: '#ea580c',
    allowedTypes: ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'],
    requiresApproval: false,
    maxFileSize: 25 * 1024 * 1024, // 25MB
    description: 'Request for Information documents and responses',
  },

  changeOrders: {
    label: 'Change Order Documents',
    folder: '07 - Change Orders',
    icon: 'pi pi-file-edit',
    color: '#eab308',
    allowedTypes: ['.pdf', '.doc', '.docx', '.xls', '.xlsx'],
    requiresApproval: true,
    maxFileSize: 25 * 1024 * 1024, // 25MB
    description: 'Change order requests and approvals',
  },

  warranties: {
    label: 'Warranties',
    folder: '11 - Project Closeout',
    icon: 'pi pi-bookmark',
    color: '#059669',
    allowedTypes: ['.pdf', '.doc', '.docx'],
    requiresApproval: false,
    maxFileSize: 25 * 1024 * 1024, // 25MB
    description: 'Equipment and material warranties',
  },

  closeout: {
    label: 'Project Closeout',
    folder: '11 - Project Closeout',
    icon: 'pi pi-check-circle',
    color: '#059669',
    allowedTypes: ['.pdf', '.doc', '.docx', '.xls', '.xlsx'],
    requiresApproval: true,
    maxFileSize: 50 * 1024 * 1024, // 50MB
    description: 'Project closeout documents and final deliverables',
  },
}

// Document status options
export const DOCUMENT_STATUS = {
  draft: {
    label: 'Draft',
    color: '#6b7280',
    icon: 'pi pi-file',
  },
  pending: {
    label: 'Pending Review',
    color: '#eab308',
    icon: 'pi pi-clock',
  },
  review: {
    label: 'Under Review',
    color: '#3b82f6',
    icon: 'pi pi-eye',
  },
  approved: {
    label: 'Approved',
    color: '#059669',
    icon: 'pi pi-check',
  },
  rejected: {
    label: 'Rejected',
    color: '#dc2626',
    icon: 'pi pi-times',
  },
  superseded: {
    label: 'Superseded',
    color: '#6b7280',
    icon: 'pi pi-history',
  },
}

// Document permission levels
export const DOCUMENT_PERMISSIONS = {
  view: {
    label: 'View Only',
    description: 'Can view and download documents',
  },
  edit: {
    label: 'Edit',
    description: 'Can upload new versions and edit metadata',
  },
  admin: {
    label: 'Admin',
    description: 'Full control including delete and permissions',
  },
}

// Helper functions
export const getCategoryConfig = (category) => {
  return DOCUMENT_CATEGORIES[category] || null
}

export const getValidFileTypes = (category) => {
  const config = getCategoryConfig(category)
  return config ? config.allowedTypes : []
}

export const getMaxFileSize = (category) => {
  const config = getCategoryConfig(category)
  return config ? config.maxFileSize : 25 * 1024 * 1024 // Default 25MB
}

export const isValidFileType = (filename, category) => {
  const validTypes = getValidFileTypes(category)
  if (validTypes.length === 0) return true // No restrictions

  const extension = '.' + filename.split('.').pop().toLowerCase()
  return validTypes.includes(extension)
}

export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export const getDocumentIcon = (filename, category = null) => {
  const extension = filename.split('.').pop().toLowerCase()

  // Use category icon if available
  if (category) {
    const config = getCategoryConfig(category)
    if (config) return config.icon
  }

  // Default icons by file type
  const iconMap = {
    pdf: 'pi pi-file-pdf',
    doc: 'pi pi-file-word',
    docx: 'pi pi-file-word',
    xls: 'pi pi-file-excel',
    xlsx: 'pi pi-file-excel',
    jpg: 'pi pi-image',
    jpeg: 'pi pi-image',
    png: 'pi pi-image',
    gif: 'pi pi-image',
    dwg: 'pi pi-map',
    txt: 'pi pi-file',
    csv: 'pi pi-table',
  }

  return iconMap[extension] || 'pi pi-file'
}
