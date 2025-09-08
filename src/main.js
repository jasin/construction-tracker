// src/main.js - Updated PrimeVue directive and service imports to fix "app.directive is not a function"
// Context: The error "app.directive is not a function" occurs because the { Tooltip, ToastService } import from the root 'primevue' package is invalid—PrimeVue directives and services must be imported from their specific submodules (e.g., 'primevue/tooltip' for Tooltip directive). The root 'primevue' is only for the config plugin. This change uses ES modules exclusively, as per project patterns. No changes to async initialization or error handling, as the error is import-related. If PrimeVue version is <3.0, check compatibility, but assuming latest, this fixes it. Restart Vite after changes.

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { pinia } from './stores'
import { useAuthStore } from './stores'
import './assets/main.css'
import PrimeVue from 'primevue/config'
import Aura from '@primeuix/themes/aura'
import Tooltip from 'primevue/tooltip' // Correct submodule import for Tooltip directive
import ToastService from 'primevue/toastservice' // Correct submodule import for ToastService
import { handleError } from './utils/errorHandler' // For standardized async error handling

const app = createApp(App)

app.use(router)
app.use(pinia)
app.use(ToastService)
app.use(PrimeVue, {
  theme: {
    preset: Aura,
  },
})

// Debug log to check if Tooltip is imported correctly (remove after debugging)
console.log('Tooltip import:', Tooltip, typeof Tooltip === 'object' ? 'Valid object' : 'Invalid')

app.directive('tooltip', Tooltip)

// Synchronous initialization with async handling via .then/catch
const authStore = useAuthStore()
authStore
  .initAuth()
  .then(() => {
    app.mount('#app')
  })
  .catch((error) => {
    handleError(error, 'App initialization')
    // Optional: Mount anyway or show error UI; throw if halting
    throw new Error(`Failed to initialize app: ${error.message}`)
  })
