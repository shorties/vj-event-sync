<template>
  <div id="app">
    <TitleBar />
    <div class="app-container">
      <nav class="sidebar">
        <div class="logo">
          <img src="./assets/VJToolsRounded.ico" alt="VJ.Tools Logo" />
          <h1>VJ.Tools</h1>
        </div>
        
        <div class="nav-links">
          <button 
            v-for="module in availableModules" 
            :key="module.id"
            class="nav-button"
            :class="{ 
              'active': currentModule === module.id,
              'disabled': !module.enabled && !module.required
            }"
            @click="selectModule(module.id)"
            :disabled="!module.enabled && !module.required"
          >
            <span class="module-name">{{ module.name }}</span>
            <span v-if="module.required" class="required-badge">Required</span>
          </button>
        </div>
        
        <div class="nav-footer">
          <button class="settings-button" @click="showSettings = true">
            <span class="icon">⚙️</span>
            Settings
          </button>
        </div>
      </nav>
      
      <main class="main-content">
        <div class="content-header">
          <h1>{{ currentModuleName }}</h1>
          <div class="connection-status">
            <span class="status-indicator" :class="{ 'online': !isOffline }"></span>
            <span class="status-text">{{ isOffline ? 'Offline' : 'Online' }}</span>
          </div>
        </div>

        <div class="content-body">
          <!-- Dynamically load components based on enabled modules -->
          <component 
            v-if="currentModule && isModuleEnabled(currentModule)"
            :is="currentModuleComponent"
            @error="handleModuleError"
          />
          <div v-else-if="currentModule && !isModuleEnabled(currentModule)" class="module-placeholder">
            <h2>Module Disabled</h2>
            <p>The selected module is currently disabled. Enable it in the settings.</p>
          </div>
          <div v-else class="module-placeholder">
            <h2>Select a Module</h2>
            <p>Choose a module from the sidebar to get started.</p>
          </div>
        </div>
      </main>
    </div>
    
    <!-- Settings Modal -->
    <div v-if="showSettings" class="modal-overlay" @click="showSettings = false">
      <div class="modal-content" @click.stop>
        <Settings @close="showSettings = false" />
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import TitleBar from './components/TitleBar.vue';
import Events from './components/Events.vue';
import Messaging from './components/Messaging.vue';
import Settings from './components/Settings.vue';
import Logos from './components/Logos.vue';
import OSC from './components/OSC.vue';
import NDI from './components/NDI.vue';
import TestComponent from './components/TestComponent.vue';
import ModuleManager from './services/ModuleManager';

export default {
  name: 'App',
  components: {
    TitleBar,
    Events,
    Messaging,
    Settings,
    Logos,
    OSC,
    NDI,
    TestComponent
  },
  setup() {
    const currentModule = ref(null);
    const showSettings = ref(false);
    const isOffline = ref(false);
    const moduleError = ref(null);
    const availableModules = ref({});
    
    // Initialize module manager
    onMounted(async () => {
      console.log('App component mounted. Bypassing ModuleManager init for debugging.');
      // try {
      //   await ModuleManager.init();
      //   availableModules.value = ModuleManager.getAvailableModules();
      //   // Set initial module
      //   currentModule.value = 'logos';
      //   console.log('Module manager initialized, current module:', currentModule.value);
      //   console.log('Available modules:', availableModules.value);
      // } catch (error) {
      //   console.error('Error initializing module manager:', error);
      // }
    });
    
    // Computed property for current module component
    const currentModuleComponent = computed(() => {
      if (!currentModule.value) return null;
      
      // Map module ID to component name
      const componentMap = {
        'events': 'Events',
        'messaging': 'Messaging',
        'settings': 'Settings',
        'logos': 'Logos',
        'osc': 'OSC',
        'ndi': 'NDI'
      };
      
      return componentMap[currentModule.value] || null;
    });
    
    // Get current module name
    const currentModuleName = computed(() => {
      const module = availableModules.value[currentModule.value];
      return module ? module.name : '';
    });
    
    // Module selection handler
    const selectModule = (moduleId) => {
      if (ModuleManager.isModuleEnabled(moduleId) || ModuleManager.getAvailableModules()[moduleId].required) {
        currentModule.value = moduleId;
      }
    };
    
    // Enable a module
    const enableModule = async (moduleId) => {
      await ModuleManager.toggleModule(moduleId, true);
    };
    
    // Module error handler
    const handleModuleError = (error) => {
      moduleError.value = error;
      console.error('Module error:', error);
    };
    
    // Check if module is enabled
    const isModuleEnabled = (moduleId) => {
      return ModuleManager.isModuleEnabled(moduleId);
    };
    
    return {
      currentModule,
      showSettings,
      isOffline,
      moduleError,
      availableModules,
      currentModuleComponent,
      currentModuleName,
      selectModule,
      enableModule,
      handleModuleError,
      isModuleEnabled
    };
  }
};
</script>

<style>
:root {
  --primary-color: #2196F3;
  --secondary-color: #1976D2;
  --background-color: #f5f5f5;
  --text-color: #333;
  --text-light: #666;
  --border-color: #ddd;
  --error-color: #f44336;
  --success-color: #4caf50;
}

[data-theme="dark"] {
  --background-color: #1a1a1a;
  --text-color: #fff;
  --text-light: #aaa;
  --border-color: #333;
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
}

.app-container {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.sidebar {
  width: 250px;
  background-color: white;
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  padding: 1rem;
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid var(--border-color);
  background-color: var(--background-color);
}

.logo img {
  width: 32px;
  height: 32px;
  object-fit: contain;
}

.logo h1 {
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--text-color);
  margin: 0;
}

.nav-links {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.nav-button {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 6px;
  background: none;
  color: var(--text-color);
  cursor: pointer;
  transition: all 0.2s;
}

.nav-button:hover:not(:disabled) {
  background-color: var(--background-color);
}

.nav-button.active {
  background-color: var(--primary-color);
  color: white;
}

.nav-button.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.required-badge {
  font-size: 0.7rem;
  background-color: var(--primary-color);
  color: white;
  padding: 0.1rem 0.3rem;
  border-radius: 3px;
}

.nav-footer {
  margin-top: auto;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
}

.settings-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 6px;
  background: none;
  color: var(--text-color);
  cursor: pointer;
  transition: all 0.2s;
}

.settings-button:hover {
  background-color: var(--background-color);
}

.main-content {
  flex: 1;
  padding: 2rem;
  overflow-y: auto;
}

.content-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background-color: white;
  border-bottom: 1px solid var(--border-color);
}

.content-header h1 {
  font-size: 1.5rem;
  font-weight: 500;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: var(--error-color);
}

.status-indicator.online {
  background-color: var(--success-color);
}

.status-text {
  font-size: 0.9rem;
  color: var(--text-light);
}

.content-body {
  flex: 1;
  overflow-y: auto;
  padding: 2rem;
}

.module-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-light);
  text-align: center;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
}
</style> 