// src/services/api/googleDriveService.ts - Converted to TypeScript

interface GoogleDriveFileMetadata {
  name?: string;
  description?: string;
  parents?: string[];
}

interface UploadMetadata {
  name?: string;
  description?: string;
}

interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  webViewLink?: string;
  webContentLink?: string;
}

interface GoogleDriveUser {
  displayName: string;
  emailAddress: string;
  photoLink?: string;
}

interface StorageQuota {
  limit?: string;
  usage?: string;
  usageInDrive?: string;
}

interface ConnectionTestResult {
  success: boolean;
  user?: GoogleDriveUser;
  quota?: StorageQuota;
  error?: string;
}

interface TokenResponse {
  access_token?: string;
  error?: string;
}

declare global {
  interface Window {
    gapi: {
      load: (
        libraries: string | string[],
        options: { callback: () => void; onerror: (error: unknown) => void }
      ) => void;
      client: {
        init: (config: { apiKey?: string; discoveryDocs?: string[] }) => Promise<void>;
        setToken: (token: { access_token: string } | null) => void;
        drive: {
          permissions: {
            create: (options: {
              fileId: string;
              resource: { role: string; type: string };
            }) => Promise<{ result: unknown }>;
          };
          about: {
            get: (options: {
              fields: string;
            }) => Promise<{ result: { user: GoogleDriveUser; storageQuota: StorageQuota } }>;
          };
        };
      };
    };
    google: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            ux_mode?: string;
            redirect_uri?: string;
            callback?: (response: TokenResponse) => void;
          }) => {
            callback: ((response: TokenResponse) => void) | null;
            requestAccessToken: (options?: { prompt?: string; hint?: string }) => void;
          };
          revoke: (token: string, callback: () => void) => void;
        };
      };
    };
  }
}

class GoogleDriveService {
  private isInitialized: boolean = false;
  private gapi: Window['gapi'] | null = null;
  private tokenClient: ReturnType<typeof window.google.accounts.oauth2.initTokenClient> | null =
    null;
  private accessToken: string | null = null;

  // Load Google API and Google Identity Services scripts
  async loadGoogleAPIs(): Promise<void> {
    await Promise.all([
      this.loadScript('https://apis.google.com/js/api.js', 'gapi'),
      this.loadScript('https://accounts.google.com/gsi/client', 'google'),
    ]);
  }

  // Helper to load individual scripts
  private loadScript(src: string, globalName: string): Promise<unknown> {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if ((window as Window & typeof globalThis)[globalName]) {
        console.log(`${globalName} already loaded`);
        resolve((window as Window & typeof globalThis)[globalName]);
        return;
      }

      console.log(`Loading ${globalName} from ${src}...`);
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.defer = true;

      script.onload = () => {
        console.log(`${globalName} loaded successfully`);
        resolve((window as Window & typeof globalThis)[globalName]);
      };

      script.onerror = (error: Event | string) => {
        console.error(`Failed to load ${globalName}:`, error);
        reject(new Error(`Failed to load ${globalName}`));
      };

      document.head.appendChild(script);
    });
  }

  // Initialize Google Drive API with new Google Identity Services
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('Starting Google Drive API initialization with GIS...');

      // Load both APIs
      await this.loadGoogleAPIs();
      this.gapi = window.gapi;

      console.log('Google APIs loaded, initializing client...');

      // Initialize GAPI client
      await new Promise<void>((resolve, reject) => {
        this.gapi.load('client', {
          callback: async () => {
            try {
              await this.gapi.client.init({
                apiKey: import.meta.env.VITE_GOOGLE_API_KEY,
                discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
              });

              console.log('GAPI client initialized');
              resolve();
            } catch (initError) {
              console.error('Error initializing GAPI client:', initError);
              reject(initError);
            }
          },
          onerror: (error: unknown) => {
            console.error('Error loading GAPI client:', error);
            reject(error);
          },
        });
      });

      // Initialize Google Identity Services token client
      this.tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/drive.file',
        ux_mode: 'popup',
        redirect_uri: window.location.origin,
        callback: (response: TokenResponse) => {
          console.log('Token received:', response);
          if (response.access_token) {
            this.accessToken = response.access_token;
            this.gapi.client.setToken({ access_token: response.access_token });
          }
        },
      });

      this.isInitialized = true;
      console.log('Google Drive API fully initialized with GIS');
    } catch (error) {
      console.error('Failed to initialize Google Drive API:', error);
      throw error;
    }
  }

  // Sign in using Google Identity Services
  async signIn(): Promise<TokenResponse> {
    console.log('Attempting to sign in to Google Drive...');
    await this.initialize();
    this.checkInitialization();

    return new Promise((resolve, reject) => {
      try {
        // Set up the callback for this specific sign-in
        this.tokenClient.callback = (response: TokenResponse) => {
          if (response.error) {
            console.error('Sign in error:', response.error);
            reject(new Error(response.error));
            return;
          }

          console.log('Successfully signed in to Google Drive');
          this.accessToken = response.access_token!;
          this.gapi.client.setToken({ access_token: response.access_token });
          resolve(response);
        };

        // Request access token
        if (this.tokenClient.requestAccessToken) {
          this.tokenClient.requestAccessToken({
            prompt: 'consent',
            hint: 'Select or enter an email address',
          });
        } else {
          // Fallback for older implementations
          this.tokenClient.requestAccessToken();
        }
      } catch (error: unknown) {
        console.error('Error during sign in:', error);
        reject(error);
      }
    });
  }

  async checkAndRefreshToken(): Promise<boolean> {
    if (!this.accessToken) {
      console.log('No access token, need to sign in');
      return false;
    }

    // Test if current token is still valid
    try {
      const response = await fetch('https://www.googleapis.com/drive/v3/about?fields=user', {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

      if (response.ok) {
        console.log('Token is still valid');
        return true;
      } else if (response.status === 401) {
        console.log('Token expired, attempting to refresh...');
        // Clear the expired token
        this.accessToken = null;
        this.gapi.client.setToken(null);

        // Force re-authentication
        await this.signIn();
        return true;
      }

      return false;
    } catch (error: unknown) {
      console.error('Error checking token:', error);
      return false;
    }
  }

  // Error handling wrapper
  private async safeApiCall<T>(apiCall: () => Promise<T>, errorMessage: string): Promise<T> {
    try {
      return await apiCall();
    } catch (error: unknown) {
      console.error(errorMessage, error);

      // Check if it's an auth error and try to refresh
      if (
        error &&
        typeof error === 'object' &&
        'status' in error &&
        (error.status === 401 || error.status === 403)
      ) {
        console.log('Auth error detected, checking token...');
        try {
          const tokenValid = await this.checkAndRefreshToken();
          if (tokenValid) {
            return await apiCall(); // Retry once
          }
        } catch (reAuthError: unknown) {
          console.error('Re-authentication failed:', reAuthError);
          throw new Error(`${errorMessage}: Authentication failed`);
        }
      }

      throw new Error(`${errorMessage}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Upload document to Google Drive
  async uploadDocument(
    file: File,
    folderId: string | null = null,
    metadata: UploadMetadata = {}
  ): Promise<GoogleDriveFile> {
    this.checkInitialization();

    if (!this.isSignedIn()) {
      console.log('Not signed in, attempting to sign in...');
      await this.signIn();
    }

    return this.safeApiCall(async () => {
      console.log(`Uploading document: ${file.name} (${file.size} bytes)`);

      const fileMetadata: GoogleDriveFileMetadata = {
        name: metadata.name || file.name,
        description: metadata.description || '',
      };

      if (folderId) {
        fileMetadata.parents = [folderId];
      }

      // Create form data for file upload
      const form = new FormData();
      form.append(
        'metadata',
        new Blob([JSON.stringify(fileMetadata)], { type: 'application/json' })
      );
      form.append('file', file);

      const response = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        {
          method: 'POST',
          headers: new Headers({
            Authorization: `Bearer ${this.getAccessToken()}`,
          }),
          body: form,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result: GoogleDriveFile = await response.json();
      console.log('Document uploaded successfully:', result.id);

      // Set file permissions to be viewable by anyone with the link
      await this.setFilePermissions(result.id, 'reader', 'anyone');

      return result;
    }, 'Error uploading document');
  }

  // Check if API is properly initialized
  private checkInitialization(): void {
    if (!this.isInitialized) {
      throw new Error('Google Drive API not initialized. Call initialize() first.');
    }
    if (!this.gapi || !this.tokenClient) {
      throw new Error('Google Drive API components not available');
    }
  }

  // Sign out
  async signOut(): Promise<void> {
    this.checkInitialization();

    try {
      if (this.accessToken) {
        // Revoke the token
        window.google.accounts.oauth2.revoke(this.accessToken, () => {
          console.log('Token revoked');
        });

        // Clear local state
        this.accessToken = null;
        this.gapi.client.setToken(null);
      }

      console.log('Successfully signed out from Google Drive');
    } catch (error) {
      console.error('Error signing out from Google Drive:', error);
      throw error;
    }
  }

  // Check if user is signed in
  isSignedIn(): boolean {
    return !!this.accessToken;
  }

  // Get access token
  getAccessToken(): string {
    if (!this.accessToken) {
      throw new Error('No access token available');
    }
    return this.accessToken;
  }

  // Get shareable link for file
  getShareableLink(fileId: string, permission: string = 'view'): string {
    return `https://drive.google.com/file/d/${fileId}/${permission}`;
  }

  // Set file permissions
  async setFilePermissions(
    fileId: string,
    role: string = 'reader',
    type: string = 'anyone'
  ): Promise<unknown> {
    this.checkInitialization();

    try {
      const permission = {
        role: role,
        type: type,
      };

      const response = await this.gapi.client.drive.permissions.create({
        fileId: fileId,
        resource: permission,
      });

      console.log('File permissions set successfully');
      return response;
    } catch (error: unknown) {
      console.error('Error setting file permissions:', error);
      // Don't throw here as this is not critical for basic functionality
      console.warn('Continuing without setting permissions');
    }
  }

  // Test connection and permissions
  async testConnection(): Promise<ConnectionTestResult> {
    try {
      await this.initialize();

      if (!this.isSignedIn()) {
        console.log('Not signed in, attempting to sign in...');
        await this.signIn();
      }

      // Test by getting user info
      const response = await this.gapi.client.drive.about.get({
        fields: 'user,storageQuota',
      });

      console.log('Google Drive connection test successful!');
      console.log('User:', response.result.user.displayName);
      console.log('Email:', response.result.user.emailAddress);

      return {
        success: true,
        user: response.result.user,
        quota: response.result.storageQuota,
      };
    } catch (error: unknown) {
      console.error('Google Drive connection test failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

export default new GoogleDriveService();
