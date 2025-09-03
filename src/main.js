import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { pinia } from './stores'
import { useAuthStore } from './stores'
import './assets/main.css'
import PrimeVue from 'primevue/config'
import Aura from '@primeuix/themes/aura'
import { Tooltip, ToastService } from 'primevue'

const app = createApp(App)

app.use(router)
app.use(pinia)
app.use(ToastService)
app.use(PrimeVue, {
  theme: {
    preset: Aura,
  },
})

app.directive('tooltip', Tooltip)

try {
  const authStore = useAuthStore()
  await authStore.initAuth()
  app.mount('#app')
} catch (error) {
  console.error('App initialization error', error)
  throw new Error(`Failed to initialize app: ${error.message}`)
}
