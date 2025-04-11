<template>
  <div class="app-container" :class="{ 'dragging-over-app': isDraggingOverApp }">
    <TitleBar />
    <div class="main-content">
      <div class="sidebar" :class="{ 'sidebar-collapsed': isSidebarCollapsed }">
        <div class="logo">
          <img src="./assets/VJToolsRounded.ico" alt="VJ.Tools Logo" />
        </div>
        <nav class="navigation">
          <button
            v-for="module in availableModules"
            :key="module.id"
            class="nav-button"
            :class="{ active: currentModule === module.id }"
            @click="selectModule(module.id)"
            :title="module.name"
          >
            <font-awesome-icon :icon="module.icon" />
            <span class="nav-text">{{ module.name }}</span>
          </button>
        </nav>
        <button class="collapse-button" @click="toggleSidebar">
          <font-awesome-icon :icon="['fa-solid', isSidebarCollapsed ? 'fa-chevron-right' : 'fa-chevron-left']" />
        </button>
      </div>
      <div class="content">
        <div v-if="error" class="error-message">
          <font-awesome-icon icon="fa-solid fa-exclamation-circle" />
          <span>{{ error.message }}</span>
        </div>
        <div v-else>
          <component :is="currentModuleComponent" />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, shallowRef, onUnmounted } from 'vue';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/tauri';
import FileExplorer from './components/FileExplorer.vue';
import TitleBar from './components/TitleBar.vue';
import { useModuleManager } from './services/ModuleManager';

export default {
  name: 'App',
  components: {
    FileExplorer,
    TitleBar
  },
  setup() {
    const moduleManager = useModuleManager();
    const currentModule = ref('nowPlaying');
    const selectedArtist = ref(null);
    const activeTab = ref('gallery');
    const error = ref(null);
    const isSidebarCollapsed = ref(false);
    const searchQuery = ref('');
    const artists = ref([]);
    const logos = ref([]);
    const showFilterPanel = ref(false);
    const isDraggingOverApp = ref(false);
    
    let unlistenDropApp = null;
    let unlistenHoverApp = null;
    let unlistenCancelApp = null;

    const appAddLogos = async (paths) => {
      console.log('[App.vue] Received file paths:', paths);
      const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'];
      const validImagePaths = paths.filter(path => 
         imageExtensions.some(ext => path.toLowerCase().endsWith(ext))
      );
      
      if (validImagePaths.length === 0) {
          console.log("[App.vue] No valid image files found in dropped items.");
          return;
      }
      
      console.log("[App.vue] Adding valid logos from paths:", validImagePaths);
      try {
        for (const path of validImagePaths) {
           console.log(`[App.vue] Invoking add_logo (needs backend): ${path}`);
        }
        console.warn("[App.vue] Need to implement logo list refresh after adding.");

      } catch (err) {
        console.error('[App.vue] Error adding logo(s):', err);
      }
    };

    const filteredLogos = computed(() => {
      return logos.value.filter(logo => {
        const matchesSearch = searchQuery.value === '' || 
          logo.name.toLowerCase().includes(searchQuery.value.toLowerCase());
        const matchesArtist = !selectedArtist.value || 
          logo.linked_djs.includes(selectedArtist.value);
        return matchesSearch && matchesArtist;
      });
    });

    const toggleFilterPanel = () => {
      showFilterPanel.value = !showFilterPanel.value;
    };

    const availableModules = computed(() => {
      return moduleManager.modules.value.filter(module => module.enabled || module.required);
    });

    const currentModuleComponent = computed(() => {
      const module = moduleManager.modules.value.find(m => m.id === currentModule.value);
      const component = module ? module.component : null;
      console.log(`[App.vue] currentModuleComponent computed: ID=${currentModule.value}, Component=${component ? component.name || component.__name || '(Unknown Component Name)' : 'null'}`);
      return component;
    });

    const selectModule = (moduleId) => {
      console.log(`[App.vue] selectModule called with ID: ${moduleId}`);
      try {
        const targetModule = moduleManager.modules.value.find(m => m.id === moduleId);
        if (!targetModule) {
          console.error(`[App.vue] Module ${moduleId} not found`);
          return;
        }
        if (!targetModule.enabled && !targetModule.required) {
          console.error(`[App.vue] Module ${moduleId} is disabled`);
          return;
        }
        currentModule.value = moduleId;
        console.log(`[App.vue] currentModule ref updated to: ${currentModule.value}`);
      } catch (err) {
        console.error(`[App.vue] Error switching to module ${moduleId}:`, err);
      }
    };

    const toggleSidebar = () => {
      isSidebarCollapsed.value = !isSidebarCollapsed.value;
    };

    onMounted(async () => {
      console.log('App.vue: Mounting component...');
      try {
        await moduleManager.init();
        console.log('App.vue: Module manager initialized.');
        
        const defaultModuleExists = availableModules.value.some(m => m.id === currentModule.value);
        if (!defaultModuleExists) {
            const firstAvailable = availableModules.value[0];
            if (firstAvailable) {
                currentModule.value = firstAvailable.id;
            }
        }
        
        console.log('App.vue: Available modules:', availableModules.value);
        console.log('App.vue: Current module ID:', currentModule.value);
        console.log('App.vue: Current module component:', currentModuleComponent.value);

        try {
          unlistenHoverApp = await listen('tauri://file-drop-hover', (event) => {
            console.log('[App.vue] File drop hover detected');
            isDraggingOverApp.value = true;
          });
          unlistenDropApp = await listen('tauri://file-drop', (event) => {
            console.log('[App.vue] File drop detected', event.payload);
            if (Array.isArray(event.payload)) { 
               appAddLogos(event.payload);
            } else {
               console.warn('[App.vue] Received non-array payload for file drop');
            }
            isDraggingOverApp.value = false;
          });
          unlistenCancelApp = await listen('tauri://file-drop-cancelled', (event) => {
              console.log('[App.vue] File drop cancelled');
              isDraggingOverApp.value = false;
          });
          console.log('[App.vue] Tauri file drop listeners attached.');
        } catch (listenerError) {
          console.error('[App.vue] Failed to attach Tauri file drop listeners:', listenerError);
        }

      } catch (mountError) {
        console.error('App.vue: Error during mount:', mountError);
        error.value = mountError;
      }
    });

    onUnmounted(() => {
      if (unlistenHoverApp) unlistenHoverApp();
      if (unlistenDropApp) unlistenDropApp();
      if (unlistenCancelApp) unlistenCancelApp();
      console.log('[App.vue] App component unmounted, listeners detached.');
    });

    return {
      currentModule,
      availableModules,
      currentModuleComponent,
      selectModule,
      error,
      isSidebarCollapsed,
      toggleSidebar,
      // Logo gallery state
      activeTab,
      selectedArtist,
      searchQuery,
      artists,
      logos,
      filteredLogos,
      toggleFilterPanel,
      showFilterPanel
    };
  }
};
</script>

<style>
:root {
  --primary-color: #2196f3;
  --secondary-color: #1a1a1a;
  --background-color: #121212;
  --text-color: #ffffff;
  --text-color-muted: rgba(255, 255, 255, 0.6);
  --border-color: rgba(255, 255, 255, 0.1);
  --error-color: #e81123;
  --success-color: #4caf50;
  --warning-color: #ff9800;
  --button-bg: rgba(255, 255, 255, 0.05);
  --button-hover-bg: rgba(255, 255, 255, 0.1);
  --border-radius: 8px;
  --transition-speed: 0.2s;
  --sidebar-width: 240px;
  --sidebar-collapsed-width: 64px;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  background-color: var(--background-color);
  color: var(--text-color);
  line-height: 1.5;
  overflow: hidden;
}

.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.main-content {
  display: flex;
  flex: 1;
  overflow: hidden;
  position: relative;
}

.sidebar {
  width: var(--sidebar-width);
  background-color: var(--secondary-color);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  transition: width var(--transition-speed);
  position: relative;
}

.sidebar-collapsed {
  width: var(--sidebar-collapsed-width);
}

.logo {
  padding: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-bottom: 1px solid var(--border-color);
}

.logo img {
  width: 48px;
  height: 48px;
  object-fit: contain;
  transition: transform var(--transition-speed);
}

.sidebar-collapsed .logo img {
  width: 32px;
  height: 32px;
}

.navigation {
  padding: 20px 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  overflow-y: auto;
}

.nav-button {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  background: transparent;
  border: none;
  color: var(--text-color);
  cursor: pointer;
  transition: all var(--transition-speed);
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
}

.nav-button:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.nav-button.active {
  background-color: var(--primary-color);
  color: white;
}

.nav-button i {
  width: 20px;
  text-align: center;
  font-size: 16px;
}

.collapse-button {
  position: absolute;
  bottom: 20px;
  right: 20px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--primary-color);
  border: none;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-speed);
}

.collapse-button:hover {
  transform: scale(1.1);
}

.content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.logo-section {
  background: var(--secondary-color);
  border-radius: var(--border-radius);
  border: 1px solid var(--border-color);
  overflow: hidden;
}

.section-header {
  display: flex;
  align-items: center;
  padding: 8px;
  background: var(--secondary-color);
  border-bottom: 1px solid var(--border-color);
  gap: 8px;
}

.drag-handle {
  cursor: move;
  padding: 4px;
  color: var(--text-color-muted);
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.section-controls {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
}

.tab-controls {
  display: flex;
  gap: 4px;
}

.tab-button {
  padding: 6px;
  min-width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--button-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  color: var(--text-color);
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab-button:hover {
  background: var(--button-hover-bg);
}

.tab-button.active {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.control-button {
  padding: 6px;
  min-width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--button-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  color: var(--text-color);
  cursor: pointer;
  transition: all 0.2s ease;
}

.control-button:hover {
  background: var(--button-hover-bg);
}

.artist-filter {
  padding: 6px 8px;
  height: 32px;
  background: var(--button-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  color: var(--text-color);
  cursor: pointer;
}

.search-container {
  display: flex;
  gap: 4px;
}

.search-filter-dynamic {
  padding: 6px 8px;
  height: 32px;
  background: var(--button-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  color: var(--text-color);
  width: 200px;
  transition: all 0.2s ease;
}

.section-content {
  padding: 16px;
}

.logo-gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 16px;
  padding: 16px;
}

.logo-item {
  background: var(--background-color);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s ease;
}

.logo-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.logo-preview {
  aspect-ratio: 16/9;
  overflow: hidden;
  background: var(--secondary-color);
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-preview img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.logo-info {
  padding: 8px;
}

.logo-name {
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-explorer-container {
  height: 500px;
}

.module-content {
  background-color: var(--secondary-color);
  border-radius: var(--border-radius);
  padding: 20px;
  height: 100%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  height: 100%;
  color: var(--text-color);
  opacity: 0.7;
}

.loading-spinner {
  font-size: 32px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.error-message {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px;
  background-color: var(--error-color);
  color: white;
  border-radius: var(--border-radius);
  margin-bottom: 20px;
}

.error-message i {
  font-size: 20px;
}

@media (max-width: 768px) {
  .sidebar {
    width: var(--sidebar-collapsed-width);
  }

  .nav-text {
    display: none;
  }

  .logo {
    padding: 12px;
  }

  .logo img {
    width: 32px;
    height: 32px;
  }

  .nav-button {
    padding: 12px;
    justify-content: center;
  }

  .nav-button i {
    margin: 0;
  }

  .collapse-button {
    display: none;
  }
}
</style> 