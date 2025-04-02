<template>
  <div id="app">
    <TitleBar />
    <div class="app-container">
      <aside class="sidebar" :class="{ collapsed: isSidebarCollapsed }">
        <div class="logo">
          <img src="./assets/VJtools.ico" alt="VJ.Tools Logo" />
          <span class="logo-text">VJ.Tools</span>
        </div>
        <nav class="nav-buttons">
          <button
            v-for="module in availableModules"
            :key="module.id"
            class="nav-button"
            :class="{
              active: currentModule === module.id,
              disabled: !module.enabled && !module.required,
              required: module.required
            }"
            @click="selectModule(module.id)"
            :disabled="!module.enabled && !module.required"
          >
            <i :class="module.icon"></i>
            <span>{{ module.name }}</span>
          </button>
        </nav>
        <button class="settings-button" @click="showSettings = true">
          <i class="fas fa-cog"></i>
          <span>Settings</span>
        </button>
      </aside>
      <main class="main-content">
        <component
          v-if="currentModuleComponent"
          :is="currentModuleComponent"
          @error="handleError"
        />
        <div v-else class="module-placeholder">
          <h2>Select a Module</h2>
          <p>Choose a module from the sidebar to get started.</p>
        </div>
      </main>
    </div>
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
import Settings from './components/Settings.vue';
import Logos from './components/Logos.vue';
import OSC from './components/OSC.vue';
import NDI from './components/NDI.vue';
import Events from './components/Events.vue';
import Messaging from './components/Messaging.vue';
import { useModuleManager } from './services/ModuleManager';

export default {
  name: 'App',
  components: {
    TitleBar,
    Settings,
    Logos,
    OSC,
    NDI,
    Events,
    Messaging
  },
  setup() {
    const moduleManager = useModuleManager();
    const currentModule = ref(null);
    const showSettings = ref(false);
    const isSidebarCollapsed = ref(false);
    const error = ref(null);

    const availableModules = computed(() => moduleManager.getAvailableModules());

    const currentModuleComponent = computed(() => {
      if (!currentModule.value) return null;
      const module = availableModules.value.find(m => m.id === currentModule.value);
      return module ? module.component : null;
    });

    const selectModule = (moduleId) => {
      const module = availableModules.value.find(m => m.id === moduleId);
      if (module && (module.enabled || module.required)) {
        currentModule.value = moduleId;
      }
    };

    const handleError = (err) => {
      error.value = err;
      console.error('Module error:', err);
    };

    onMounted(async () => {
      try {
        await moduleManager.init();
        // Select the first enabled module by default
        const firstEnabledModule = availableModules.value.find(m => m.enabled || m.required);
        if (firstEnabledModule) {
          currentModule.value = firstEnabledModule.id;
        }
      } catch (err) {
        handleError(err);
      }
    });

    return {
      currentModule,
      showSettings,
      isSidebarCollapsed,
      availableModules,
      currentModuleComponent,
      selectModule,
      handleError
    };
  }
};
</script>

<style>
:root {
  --primary-color: #4a90e2;
  --secondary-color: #2c3e50;
  --background-color: #1a1a1a;
  --text-color: #ffffff;
  --border-color: #333333;
  --hover-color: #2c3e50;
  --active-color: #4a90e2;
  --error-color: #e74c3c;
  --success-color: #2ecc71;
  --warning-color: #f1c40f;
  --info-color: #3498db;
  --border-radius: 12px;
  --transition-speed: 0.3s;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background-color: var(--background-color);
  color: var(--text-color);
  line-height: 1.6;
  overflow: hidden;
}

#app {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--background-color);
  border-radius: var(--border-radius);
  overflow: hidden;
}

.app-container {
  display: flex;
  flex: 1;
  overflow: hidden;
  border-radius: var(--border-radius);
  background-color: var(--background-color);
}

.sidebar {
  width: 250px;
  min-width: 250px;
  height: 100%;
  background-color: var(--secondary-color);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  border-right: 1px solid var(--border-color);
  transition: width var(--transition-speed);
}

.sidebar.collapsed {
  width: 60px;
  min-width: 60px;
  padding: 1rem 0.5rem;
}

.logo {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border-bottom: 1px solid var(--border-color);
  background-color: var(--background-color);
}

.logo img {
  width: 32px;
  height: 32px;
  object-fit: contain;
}

.logo-text {
  font-size: 1.5rem;
  font-weight: bold;
  color: var(--text-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nav-buttons {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
}

.nav-button {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  border: none;
  border-radius: var(--border-radius);
  background-color: transparent;
  color: var(--text-color);
  cursor: pointer;
  transition: background-color var(--transition-speed);
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nav-button:hover {
  background-color: var(--hover-color);
}

.nav-button.active {
  background-color: var(--active-color);
}

.nav-button.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.nav-button.required {
  opacity: 1;
  cursor: not-allowed;
}

.main-content {
  flex: 1;
  padding: 2rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.settings-button {
  padding: 0.75rem 1rem;
  border: none;
  border-radius: var(--border-radius);
  background-color: var(--secondary-color);
  color: var(--text-color);
  cursor: pointer;
  transition: background-color var(--transition-speed);
}

.settings-button:hover {
  background-color: var(--hover-color);
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: var(--background-color);
  padding: 2rem;
  border-radius: var(--border-radius);
  max-width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  border: 1px solid var(--border-color);
}

/* Responsive Design */
@media (max-width: 768px) {
  .sidebar {
    width: 60px;
    min-width: 60px;
    padding: 1rem 0.5rem;
  }

  .logo-text {
    display: none;
  }

  .nav-button span {
    display: none;
  }

  .main-content {
    padding: 1rem;
  }
}

@media (max-width: 480px) {
  .modal-content {
    width: 95%;
    padding: 1rem;
  }
}

/* Scrollbar Styling */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: var(--background-color);
}

::-webkit-scrollbar-thumb {
  background: var(--secondary-color);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--hover-color);
}
</style> 