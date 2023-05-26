import { createApp } from 'vue';
import PrimeVue from 'primevue/config';
import ToastService from 'primevue/toastservice';
import ConfirmationService from 'primevue/confirmationservice';
import Tooltip from 'primevue/tooltip';

import App from './App.vue';
import router from './router';
import emitter from './services/emitter.service';

// Create the Vue app instance
const app = createApp(App);

app.use(PrimeVue);
app.use(ToastService);
app.use(ConfirmationService);
app.directive('tooltip', Tooltip);

// Use Vue Router
app.use(router);
app.config.globalProperties.emitter = emitter;
app.mount('#app');
