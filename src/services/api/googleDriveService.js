// services/googleDriveService.js

class GoogleDriveService {
  constructor() {
    this.isInitialized = false
    this.gapi = null
    this.tokenClient = null
    this.accessToken = null
  }

  // Load Google API and Google Identity Services scripts
  async loadGoogleAPIs() {
    return Promise.all([
      this.loadScript('https://apis.google.com/js/api.js', 'gapi'),
      this.loadScript('https://accounts.google.com/gsi/client', 'google'),
    ])
  }

  // Helper to load individual scripts
  loadScript(src, globalName) {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (window[globalName]) {
        console.log(`${globalName} already loaded`)
        resolve(window[globalName])
        return
      }

      console.log(`Loading ${globalName} from ${src}...`)
      const script = document.createElement('script')
      script.src = src
      script.async = true
      script.defer = true

      script.onload = () => {
        console.log(`${globalName} loaded successfully`)
        resolve(window[globalName])
      }

      script.onerror = (error) => {
        console.error(`Failed to load ${globalName}:`, error)
        reject(new Error(`Failed to load ${globalName}`))
      }

      document.head.appendChild(script)
    })
  }

  // Initialize Google Drive API with new Google Identity Services
  async initialize() {
    if (this.isInitialized) return

    try {
      console.log('Starting Google Drive API initialization with GIS...')

      // Load both APIs
      await this.loadGoogleAPIs()
      this.gapi = window.gapi

      console.log('Google APIs loaded, initializing client...')

      // Initialize GAPI client
      await new Promise((resolve, reject) => {
        this.gapi.load('client', {
          callback: async () => {
            try {
              await this.gapi.client.init({
                apiKey: import.meta.env.VITE_GOOGLE_API_KEY,
                discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
              })

              console.log('GAPI client initialized')
              resolve()
            } catch (initError) {
              console.error('Error initializing GAPI client:', initError)
              reject(initError)
            }
          },
          onerror: (error) => {
            console.error('Error loading GAPI client:', error)
            reject(error)
          },
        })
      })

      // Initialize Google Identity Services token client
      this.tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/drive.file',
        callback: (response) => {
          console.log('Token received:', response)
          if (response.access_token) {
            this.accessToken = response.access_token
            this.gapi.client.setToken({ access_token: response.access_token })
          }
        },
      })

      this.isInitialized = true
      console.log('Google Drive API fully initialized with GIS')
    } catch (error) {
      console.error('Failed to initialize Google Drive API:', error)
      throw error
    }
  }

  // Check if API is properly initialized
  checkInitialization() {
    if (!this.isInitialized) {
      throw new Error('Google Drive API not initialized. Call initialize() first.')
    }
    if (!this.gapi || !this.tokenClient) {
      throw new Error('Google Drive API components not available')
    }
  }

  // Sign in using Google Identity Services
  async signIn() {
    console.log('Attempting to sign in to Google Drive...')
    await this.initialize()
    this.checkInitialization()

    return new Promise((resolve, reject) => {
      try {
        // Set up the callback for this specific sign-in
        this.tokenClient.callback = (response) => {
          if (response.error) {
            console.error('Sign in error:', response.error)
            reject(new Error(response.error))
            return
          }

          console.log('Successfully signed in to Google Drive')
          this.accessToken = response.access_token
          this.gapi.client.setToken({ access_token: response.access_token })
          resolve(response)
        }

        // Request access token
        this.tokenClient.requestAccessToken({ prompt: 'consent' })
      } catch (error) {
        console.error('Error during sign in:', error)
        reject(error)
      }
    })
  }

  // Sign out
  async signOut() {
    this.checkInitialization()

    try {
      if (this.accessToken) {
        // Revoke the token
        window.google.accounts.oauth2.revoke(this.accessToken, () => {
          console.log('Token revoked')
        })

        // Clear local state
        this.accessToken = null
        this.gapi.client.setToken(null)
      }

      console.log('Successfully signed out from Google Drive')
    } catch (error) {
      console.error('Error signing out from Google Drive:', error)
      throw error
    }
  }

  // Check if user is signed in
  isSignedIn() {
    return !!this.accessToken
  }

  // Get access token
  getAccessToken() {
    return this.accessToken
  }

  // Create a single folder
  async createFolder(name, parentId = null) {
    this.checkInitialization()

    if (!this.isSignedIn()) {
      throw new Error('Must be signed in to create folders')
    }

    try {
      const fileMetadata = {
        name: name,
        mimeType: 'application/vnd.google-apps.folder',
      }

      if (parentId) {
        fileMetadata.parents = [parentId]
      }

      const response = await this.gapi.client.drive.files.create({
        resource: fileMetadata,
      })

      console.log(`Created folder: ${name} (${response.result.id})`)
      return response.result.id
    } catch (error) {
      console.error(`Error creating folder ${name}:`, error)
      throw error
    }
  }

  // Create project folder structure
  async createProjectFolders(projectName, jobNumber) {
    const folderStructure = {
      name: `${projectName} - ${jobNumber}`,
      children: [
        { name: '01 - Contracts & Agreements' },
        { name: '02 - Permits & Approvals' },
        {
          name: '03 - Plans & Drawings',
          children: [{ name: 'Architectural' }, { name: 'Structural' }, { name: 'MEP' }],
        },
        { name: '04 - Specifications' },
        { name: '05 - Submittals' },
        { name: '06 - RFIs' },
        { name: '07 - Change Orders' },
        {
          name: '08 - Progress Documentation',
          children: [{ name: 'Photos' }, { name: 'Reports' }],
        },
        { name: '09 - Inspections' },
        { name: '10 - Correspondence' },
        { name: '11 - Project Closeout' },
      ],
    }

    return await this.createFolderRecursive(folderStructure)
  }

  // Create folder recursively
  async createFolderRecursive(folderData, parentId = null) {
    const folderId = await this.createFolder(folderData.name, parentId)

    if (folderData.children) {
      const childFolders = {}
      for (const child of folderData.children) {
        const childId = await this.createFolderRecursive(child, folderId)
        childFolders[child.name] = childId
      }
      return { id: folderId, children: childFolders }
    }

    return folderId
  }

  // Upload document to Google Drive
  async uploadDocument(file, folderId = null, metadata = {}) {
    this.checkInitialization()

    if (!this.isSignedIn()) {
      throw new Error('Must be signed in to upload documents')
    }

    console.log(`Uploading document: ${file.name} (${file.size} bytes)`)

    const fileMetadata = {
      name: metadata.name || file.name,
      description: metadata.description || '',
    }

    if (folderId) {
      fileMetadata.parents = [folderId]
    }

    try {
      // Create form data for file upload
      const form = new FormData()
      form.append(
        'metadata',
        new Blob([JSON.stringify(fileMetadata)], { type: 'application/json' }),
      )
      form.append('file', file)

      const response = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        {
          method: 'POST',
          headers: new Headers({
            Authorization: `Bearer ${this.getAccessToken()}`,
          }),
          body: form,
        },
      )

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${errorText}`)
      }

      const result = await response.json()
      console.log('Document uploaded successfully:', result.id)

      // Set file permissions to be viewable by anyone with the link
      await this.setFilePermissions(result.id, 'reader', 'anyone')

      return result
    } catch (error) {
      console.error('Error uploading document:', error)
      throw error
    }
  }

  // Set file permissions
  async setFilePermissions(fileId, role = 'reader', type = 'anyone') {
    this.checkInitialization()

    try {
      const permission = {
        role: role,
        type: type,
      }

      const response = await this.gapi.client.drive.permissions.create({
        fileId: fileId,
        resource: permission,
      })

      console.log('File permissions set successfully')
      return response
    } catch (error) {
      console.error('Error setting file permissions:', error)
      // Don't throw here as this is not critical for basic functionality
      console.warn('Continuing without setting permissions')
    }
  }

  // Get shareable link for file
  getShareableLink(fileId, permission = 'view') {
    return `https://drive.google.com/file/d/${fileId}/${permission}`
  }

  // Get file metadata
  async getFileMetadata(fileId) {
    this.checkInitialization()

    try {
      const response = await this.gapi.client.drive.files.get({
        fileId: fileId,
        fields: 'id,name,mimeType,size,createdTime,modifiedTime,webViewLink,webContentLink,parents',
      })
      return response.result
    } catch (error) {
      console.error('Error getting file metadata:', error)
      throw error
    }
  }

  // Search documents within project scope
  async searchProjectDocuments(projectFolderId, query = '') {
    this.checkInitialization()

    try {
      let searchQuery = `'${projectFolderId}' in parents and trashed=false`

      if (query) {
        searchQuery += ` and name contains '${query}'`
      }

      const response = await this.gapi.client.drive.files.list({
        q: searchQuery,
        fields: 'files(id,name,mimeType,size,createdTime,modifiedTime,webViewLink,webContentLink)',
        orderBy: 'modifiedTime desc',
      })

      return response.result.files || []
    } catch (error) {
      console.error('Error searching documents:', error)
      throw error
    }
  }

  // Delete file
  async deleteFile(fileId) {
    this.checkInitialization()

    try {
      await this.gapi.client.drive.files.delete({
        fileId: fileId,
      })
      console.log(`Deleted file: ${fileId}`)
    } catch (error) {
      console.error('Error deleting file:', error)
      throw error
    }
  }

  // Test connection and permissions
  async testConnection() {
    try {
      await this.initialize()

      if (!this.isSignedIn()) {
        console.log('Not signed in, attempting to sign in...')
        await this.signIn()
      }

      // Test by getting user info
      const response = await this.gapi.client.drive.about.get({
        fields: 'user,storageQuota',
      })

      console.log('Google Drive connection test successful!')
      console.log('User:', response.result.user.displayName)
      console.log('Email:', response.result.user.emailAddress)

      return {
        success: true,
        user: response.result.user,
        quota: response.result.storageQuota,
      }
    } catch (error) {
      console.error('Google Drive connection test failed:', error)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  // Get storage quota information
  async getStorageInfo() {
    this.checkInitialization()

    try {
      const response = await this.gapi.client.drive.about.get({
        fields: 'storageQuota',
      })
      return response.result.storageQuota
    } catch (error) {
      console.error('Error getting storage info:', error)
      throw error
    }
  }
}

export default new GoogleDriveService()
