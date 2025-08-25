const originalConsoleError = console.error
const originalConsoleWarn = console.warn

console.error = function (...args) {
  const message = args.join(' ')

  // Filter out known Google Drive viewer errors
  if (
    message.includes('clients6.google.com/drive/v2beta') ||
    (message.includes('accounts.google.com') && message.includes('403')) ||
    (message.includes('PUT') && message.includes('Unauthorized')) ||
    (message.includes('Failed to load resource') && message.includes('google.com'))
  ) {
    // These are expected Google Drive viewer errors, ignore them
    return
  }

  // Log all other errors normally
  originalConsoleError.apply(console, args)
}

console.warn = function (...args) {
  const message = args.join(' ')

  // Filter out Google Drive warnings
  if (
    (message.includes('google.com') && (message.includes('401') || message.includes('403'))) ||
    message.includes('Cross-Origin-Opener-Policy') ||
    message.includes('gapi.loaded')
  ) {
    return
  }

  originalConsoleWarn.apply(console, args)
}

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import authService from './services/auth/authService'
import './assets/main.css'
import PrimeVue from 'primevue/config'
import Aura from '@primeuix/themes/aura'
//import Lara from '@primeuix/themes/lara'

authService.init()

const app = createApp(App)
app.use(PrimeVue, {
  theme: {
    preset: Aura,
  },
})
app.component('tree')
app.use(router)

app.mount('#app')
