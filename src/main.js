// src/main.js

import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import { pinia } from './stores';
import { useAuthStore } from './stores';
import './assets/main.css';
import PrimeVue from 'primevue/config';
import Aura from '@primeuix/themes/aura';
import Tooltip from 'primevue/tooltip';
import ToastService from 'primevue/toastservice';
import { handleError } from './utils/errorHandler';
const app = createApp(App);

app.use(router);
app.use(pinia);
app.use(ToastService);
app.use(PrimeVue, {
  theme: {
    preset: Aura,
  },
});

app.directive('tooltip', Tooltip);

// Global error handler for bubbled errors
//app.config.errorHandler = (err, instance, info) => {
//handleError(err, `Global Vue error: ${info}`, { silent: false }); // Use handleError for standardized logging/notifications
// Optional: Custom actions, e.g., uiStore.addNotification({ type: 'error', message: err.message });
//};

// Synchronous initialization with async handling via .then/catch
const authStore = useAuthStore();
authStore
  .initAuth()
  .then(() => {
    app.mount('#app');
  })
  .catch((error) => {
    handleError(error, 'App initialization');
    // Optional: Mount anyway or show error UI; throw if halting
    throw new Error(`Failed to initialize app: ${error.message}`);
  });
