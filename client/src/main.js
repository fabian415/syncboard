import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { router } from './router/index.js';
import './styles/tailwind.css';
import './styles/presentation.css';

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.mount('#app');
