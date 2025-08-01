import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './assets/styles.css'
import PrimeVue from 'primevue/config'
import Aura from '@primeuix/themes/aura'
import Lara from '@primeuix/themes/lara'

const app = createApp(App)
app.use(PrimeVue, {
  theme: {
    preset: Lara,
  },
})
app.component('tree')
app.use(router)

app.mount('#app')
