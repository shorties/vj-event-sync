import { createApp } from 'vue';
import App from './App.vue';
import { listen } from '@tauri-apps/api/event';

// Create Vue app
const app = createApp(App);

// // Listen for Tauri events (Temporarily disabled for debugging)
// listen('server-started', (event) => {
//   console.log('Server started:', event);
//   // You can emit a custom event to notify components
//   window.dispatchEvent(new CustomEvent('server-started'));
// });

// listen('server-stopped', (event) => {
//   console.log('Server stopped:', event);
//   window.dispatchEvent(new CustomEvent('server-stopped'));
// });

// listen('server-running', (event) => {
//   console.log('Server is running, cannot close window:', event);
//   // You can show a notification or dialog here
// });

// Mount the app
try {
  app.mount('#app');
  console.log('Vue app mounted successfully');
} catch (error) {
  console.error('Error mounting Vue app:', error);
  document.getElementById('app').innerHTML = `
    <div style="padding: 20px; color: red;">
      <h2>Error Loading Application</h2>
      <p>${error.message}</p>
      <button onclick="window.location.reload()">Reload</button>
    </div>
  `;
} 