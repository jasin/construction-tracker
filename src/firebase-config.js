import { initializeApp } from 'firebase/app'
import { getDatabase, connectDatabaseEmulator } from 'firebase/database'
import { getAuth, connectAuthEmulator } from 'firebase/auth'

// Determine if we're in production based on hostname
const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
let firebaseConfig = {}

if (isProduction) {
  firebaseConfig = {
    apiKey: process.env.api_key,
    authDomain: process.env.auth_domain,
    databaseURL: process.env.database_url,  // HTTPS for production
    projectId: process.env.project_id,
    storageBucket: process.env.storage_bucket,
    messagingSenderId: process.env.messenging_sender_id,
    appId: process.env.app_id,
  }
} else {
  firebaseConfig = {
    databaseURL: 'http://127.0.0.1:9000?ns=construction-tracker-fbdb-default-rtdb',
    projectId: 'construction-tracker-fbdb',
  }
}


console.log('Initializing Firebase with config:', firebaseConfig)
console.log('Environment:', isProduction ? 'production' : 'development')

const app = initializeApp(firebaseConfig)
const database = getDatabase(app)
const auth = getAuth(app)

// Only connect to emulators in development
if (!isProduction && window.location.hostname === 'localhost') {
  connectDatabaseEmulator(database, '127.0.0.1', 9000)
  connectAuthEmulator(auth, 'http://127.0.0.1:9099')
  console.log('Connected to Database and Auth Emulators')
}

export { database, auth }
