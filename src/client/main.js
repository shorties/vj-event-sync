import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { listen } from '@tauri-apps/api/event';
import './styles.css'; // Import global styles
import router from './router'; // Import the router

/* import the fontawesome core */
import { library } from '@fortawesome/fontawesome-svg-core';

/* import font awesome icon component */
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';

/* import specific icons */
import {
  faLockOpen, faLock, faMinus, faTimes, faPlayCircle, faClock, faGlobe, 
  faCog, faEllipsisH, faSync, faExpandAlt, faSpinner, faExclamationCircle, 
  faInbox, faThLarge, faFilter, faSearch, faPaintBrush, faTags, 
  faLink, faFile, faPlusCircle, faCalendarAlt, faUndo, faSave, 
  faGripVertical, faTrash, faFolderOpen, faFolder, faPlus, faArchive, 
  faBoxOpen, faChevronRight, faChevronLeft, faUsers, faArrowUp,
  faNetworkWired, faBroadcastTower, faComments, faCircleNotch, 
  faBars, faXmark, faShareNodes, faQrcode, faCopy, faCheck, faExpand, faEye,
  faSyncAlt
} from '@fortawesome/free-solid-svg-icons';

// Add missing icons
import { faPlay, faSquare, faVideo } from '@fortawesome/free-solid-svg-icons';

/* add icons to the library */
library.add(
  faLockOpen, faLock, faMinus, faTimes, faPlayCircle, faClock, faGlobe, 
  faCog, faEllipsisH, faSync, faExpandAlt, faSpinner, faExclamationCircle, 
  faInbox, faThLarge, faFilter, faSearch, faPaintBrush, faTags, 
  faLink, faFile, faPlusCircle, faCalendarAlt, faUndo, faSave, 
  faGripVertical, faTrash, faFolderOpen, faFolder, faPlus, faArchive, 
  faBoxOpen, faChevronRight, faChevronLeft, faUsers, faArrowUp,
  faNetworkWired, faBroadcastTower, faComments, faCircleNotch, 
  faBars, faXmark, faShareNodes, faQrcode, faCopy, faCheck, faExpand, faEye,
  faSyncAlt,
  // Added icons:
  faPlay,
  faSquare,
  faVideo
);

// Create Vue app
const app = createApp(App);

// Create Pinia instance
const pinia = createPinia();

// Use Pinia for state management
app.use(pinia);

// Use the router
app.use(router);

// Register FontAwesome component globally
app.component('font-awesome-icon', FontAwesomeIcon);

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