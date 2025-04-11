<template>
  <div class="app-container" :class="{ 'dragging-over-app': isDraggingOverApp }">
    <TitleBar @select-module="selectModule" />
    <div class="main-content-single-column"> 
      <div class="sidebar" :class="{ 'sidebar-collapsed': isSidebarCollapsed }">
        <nav class="sidebar-nav">
          <router-link to="/" class="nav-link" active-class="active">
            <font-awesome-icon icon="fa-solid fa-play-circle" />
            <span>Live View</span>
          </router-link>
          <router-link to="/library" class="nav-link" active-class="active">
            <font-awesome-icon icon="fa-solid fa-images" />
            <span>Logo Library</span>
          </router-link>
        </nav>
        <div class="logo">
          <img src="./assets/VJToolsRounded.ico" alt="VJ.Tools Logo" />
        </div>
        <nav class="navigation">
          <div v-for="(modulesInGroup, groupName) in groupedModules" :key="groupName" class="nav-group">
            <h3 class="nav-group-header" v-if="!isSidebarCollapsed">{{ groupName }}</h3>
            <button
              v-for="module in modulesInGroup"
              :key="module.id"
              class="nav-button"
              :class="{ active: false }" 
              @click="handleSidebarClick(module.id)" 
              :title="module.name"
            >
              <font-awesome-icon :icon="module.icon" />
              <span v-if="!isSidebarCollapsed" class="nav-text">{{ module.name }}</span>
            </button>
          </div>
        </nav>
        <button class="collapse-button" @click="toggleSidebar">
          <font-awesome-icon :icon="['fa-solid', isSidebarCollapsed ? 'fa-chevron-right' : 'fa-chevron-left']" />
        </button>
      </div>
      <div class="content-main"> 
        <!-- Router view will render components based on the current route -->
        <router-view />
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, shallowRef, onUnmounted, watch } from 'vue';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/tauri';
import TitleBar from './components/TitleBar.vue';
import { useModuleManager } from './services/ModuleManager';

export default {
  name: 'App',
  components: {
    TitleBar,
  },
  setup() {
    const moduleManager = useModuleManager();
    const selectedArtist = ref(null);
    const activeTab = ref('gallery'); 
    const isSidebarCollapsed = ref(false);
    const searchQuery = ref('');
    const artists = ref([]);
    const logos = ref([]);
    const showFilterPanel = ref(false);
    const isDraggingOverApp = ref(false);

    const { availableModules, getModuleComponent } = moduleManager;

    const groupedModules = computed(() => {
      const groups = {};
      availableModules.value.forEach(module => {
        if (!module.required) { 
          const group = module.group || 'General';
          if (!groups[group]) {
            groups[group] = [];
          }
          groups[group].push(module);
        }
      });
      return groups;
    });

    const toggleSidebar = () => {
      isSidebarCollapsed.value = !isSidebarCollapsed.value;
    };

    const handleSidebarClick = (moduleId) => {
      console.log(`Sidebar module clicked: ${moduleId}. Implement desired behavior.`);
    };

    onMounted(async () => {
      await moduleManager.init(); 

      let unlistenServerStarted = await listen('server-started', () => {
        console.log('Server started event received in App.vue');
      });
      let unlistenServerStopped = await listen('server-stopped', () => {
        console.log('Server stopped event received in App.vue');
      });

      document.addEventListener('dragover', handleDragOverApp);
      document.addEventListener('dragleave', handleDragLeaveApp);
      document.addEventListener('drop', handleDropApp);
    });

    onUnmounted(() => {
      if (unlistenServerStarted) unlistenServerStarted();
      if (unlistenServerStopped) unlistenServerStopped();
      document.removeEventListener('dragover', handleDragOverApp);
      document.removeEventListener('dragleave', handleDragLeaveApp);
      document.removeEventListener('drop', handleDropApp);
    });

    const handleDragOverApp = (event) => {
      event.preventDefault();
      isDraggingOverApp.value = true;
    };

    const handleDragLeaveApp = (event) => {
      if (event.relatedTarget === null || !event.currentTarget.contains(event.relatedTarget)) {
          isDraggingOverApp.value = false;
      }
    };

    const handleDropApp = async (event) => {
      event.preventDefault();
      isDraggingOverApp.value = false;
      const files = event.dataTransfer.files;
      if (files.length > 0) {
        console.log('Files dropped on app:', files);
        try {
          const filePaths = Array.from(files).map(f => f.path);
          await invoke('handle_file_drop', { paths: filePaths });
          console.log('File drop handled by Tauri backend.');
        } catch (error) {
          console.error('Error handling file drop:', error);
        }
      }
    };

    return {
      isSidebarCollapsed,
      toggleSidebar,
      groupedModules,
      handleSidebarClick, 
      isDraggingOverApp,
    };
  }
};
</script>

<style>
:root {
  --primary-bg: #1a1a1a;
  --secondary-bg: #2a2a2a;
  --tertiary-bg: #3a3a3a;
  --text-color: #e0e0e0;
  --text-muted: #a0a0a0;
  --accent-color: #4a90e2;
  --error-color: #e74c3c;
  --success-color: #2ecc71;
  --warning-color: #f39c12;

  --titlebar-height: 35px;
  --sidebar-width: 220px;
  --sidebar-collapsed-width: 60px;
  --panel-padding: 15px;
  --border-radius: 4px;
  --transition-speed: 0.3s;

  --font-main: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

body {
  margin: 0;
  font-family: var(--font-main);
  background-color: var(--primary-bg);
  color: var(--text-color);
  overflow: hidden; 
}

.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
}

.main-content-single-column {
  display: flex;
  flex-grow: 1;
  overflow: hidden; 
}

.sidebar {
  width: var(--sidebar-width);
  background-color: var(--secondary-bg);
  display: flex;
  flex-direction: column;
  transition: width var(--transition-speed) ease;
  flex-shrink: 0; 
  position: relative; 
  padding: 1rem 0;
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
  border-right: 1px solid var(--border-color);
}

.sidebar-collapsed {
  width: var(--sidebar-collapsed-width);
}

.sidebar .logo {
  padding: 10px;
  text-align: center;
  margin-bottom: 10px;
}

.sidebar .logo img {
  max-width: 80%;
  height: auto;
}

.sidebar-collapsed .logo img {
   max-width: 40px; 
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0 1rem;
  margin-bottom: auto;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: var(--border-radius);
  color: var(--text-color-secondary);
  text-decoration: none;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.nav-link:hover {
  background-color: var(--surface-hover);
  color: var(--text-color);
}

.nav-link.active {
  background-color: var(--primary-color-muted);
  color: var(--primary-color-text);
  font-weight: 500;
}

.nav-link .fa-icon {
  width: 1.2em;
  text-align: center;
}

.navigation {
  flex-grow: 1;
  overflow-y: auto;
  padding: 0 10px;
}

.nav-group {
  margin-bottom: 15px;
}

.nav-group-header {
  font-size: 0.8em;
  color: var(--text-muted);
  text-transform: uppercase;
  margin: 15px 0 5px 5px;
  font-weight: bold;
}

.sidebar-collapsed .nav-group-header {
  display: none;
}

.nav-button {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 10px;
  background: none;
  border: none;
  color: var(--text-muted);
  text-align: left;
  cursor: pointer;
  border-radius: var(--border-radius);
  margin-bottom: 5px;
  transition: background-color var(--transition-speed), color var(--transition-speed);
}

.sidebar-collapsed .nav-button {
  justify-content: center;
  padding: 10px 0;
}

.nav-button .svg-inline--fa {
  margin-right: 10px;
  width: 1.2em; 
  text-align: center;
}

.sidebar-collapsed .nav-button .svg-inline--fa {
  margin-right: 0;
  font-size: 1.4em; 
}

.sidebar-collapsed .nav-text {
  display: none;
}

.nav-button:hover {
  background-color: var(--tertiary-bg);
  color: var(--text-color);
}

.nav-button.active {
  background-color: var(--accent-color);
  color: white;
  font-weight: bold;
}

.collapse-button {
  position: absolute;
  bottom: 10px;
  right: 10px;
  background: var(--tertiary-bg);
  border: none;
  color: var(--text-muted);
  padding: 8px;
  border-radius: 50%;
  cursor: pointer;
  transition: background-color var(--transition-speed), color var(--transition-speed);
}

.sidebar-collapsed .collapse-button {
  right: 50%;
  transform: translateX(50%);
}

.collapse-button:hover {
  background-color: var(--accent-color);
  color: white;
}

.content-main {
  flex-grow: 1;
  background-color: var(--primary-bg);
  padding: var(--panel-padding);
  overflow: hidden; 
  display: flex; 
}

.content-main > * {
  flex-grow: 1;
}

.module-container {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
}

.loading-indicator, .error-message {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-muted);
  font-size: 1.2em;
}

.error-message {
  color: var(--error-color);
}

.loading-indicator .svg-inline--fa,
.error-message .svg-inline--fa {
  margin-right: 10px;
}

.app-container.dragging-over-app {
  outline: 3px dashed var(--accent-color);
  outline-offset: -5px;
}
</style>