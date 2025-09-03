import { initializeApp } from 'firebase/app'
import { getDatabase, connectDatabaseEmulator } from 'firebase/database'
import { getAuth, connectAuthEmulator } from 'firebase/auth'

// Determine if we're in production based on hostname
const isDevelopment = import.meta.env.MODE === 'development'

let firebaseConfig

if (!isDevelopment) {
  firebaseConfig = {
    apiKey: import.meta.env.VITE_API_KEY,
    authDomain: import.meta.env.VITE_AUTH_DOMAIN,
    databaseURL: import.meta.env.VITE_DATABASE_URL, // HTTPS for production
    projectId: import.meta.env.VITE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_APP_ID,
  }
} else {
  firebaseConfig = {
    apiKey: 'fake-key',
    databaseURL: 'http://127.0.0.1:9000?ns=construction-tracker-fbdb-default-rtdb',
    projectId: 'construction-tracker-fbdb',
  }
}

// Check environment before displaying private information to the public
console.log('Initializing Firebase with config:', !isDevelopment ? {} : firebaseConfig)
console.log('Environment:', !isDevelopment ? 'production' : 'development')

let app // Added: Variable to hold the app instance for export
try {
  app = initializeApp(firebaseConfig)
} catch (error) {
  console.error('Firebase initialization error:', error) // Standardized error logging
  throw new Error(`Failed to initialize Firebase app: ${error.message}`) // Rethrow descriptive error
}
const database = getDatabase(app)
const auth = getAuth(app)

// Only connect to emulators in development
if (isDevelopment) {
  connectDatabaseEmulator(database, '127.0.0.1', 9000)
  connectAuthEmulator(auth, 'http://127.0.0.1:9099')
  console.log('Connected to Database and Auth Emulators')
}

export { app, database, auth }
