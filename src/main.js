import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { pinia } from './stores'
import authService from './services/auth/authService'
import './assets/main.css'
import PrimeVue from 'primevue/config'
import Aura from '@primeuix/themes/aura'
import { Tooltip } from 'primevue'
//import Lara from '@primeuix/themes/lara'

authService.init()

const app = createApp(App)

app.use(router)
app.use(pinia)
app.use(PrimeVue, {
  theme: {
    preset: Aura,
  },
})

app.component('tree')
app.directive('tooltip', Tooltip)

app.mount('#app')
