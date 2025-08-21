import { initializeApp } from 'firebase/app'
import { getDatabase, connectDatabaseEmulator } from 'firebase/database'
import { getAuth, connectAuthEmulator } from 'firebase/auth'

// Determine if we're in production based on hostname
const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'

const firebaseConfig = {
  apiKey: 'AIzaSyAI_TiCoeNNQoR3IGOrnAGFZfXYadlrldg',
  authDomain: 'construction-tracker-fbdb.firebaseapp.com',
  // IMPORTANT: Use HTTPS for production!
  databaseURL: isProduction
    ? 'https://construction-tracker-fbdb-default-rtdb.firebaseio.com'  // HTTPS for production
    : 'http://127.0.0.1:9000?ns=construction-tracker-fbdb-default-rtdb', // HTTP for local emulator
  projectId: 'construction-tracker-fbdb',
  storageBucket: 'construction-tracker-fbdb.firebasestorage.app',
  messagingSenderId: '531430813912',
  appId: '1:531430813912:web:b758acf956b80b293ce7ad',
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
