<template>
  <div class="app-container">
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
            <i :class="module.icon"></i>
            <span class="nav-text">{{ module.name }}</span>
          </button>
        </nav>
        <button class="collapse-button" @click="toggleSidebar">
          <i :class="isSidebarCollapsed ? 'fas fa-chevron-right' : 'fas fa-chevron-left'"></i>
        </button>
      </div>
      <div class="content">
        <div v-if="error" class="error-message">
          <i class="fas fa-exclamation-circle"></i>
          <span>{{ error.message }}</span>
        </div>
        <component
          v-else-if="currentModuleComponent"
          :is="currentModuleComponent"
          class="module-content"
        />
        <div v-else class="loading">
          <div class="loading-spinner">
            <i class="fas fa-spinner fa-spin"></i>
          </div>
          <span>Loading module...</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import TitleBar from './components/TitleBar.vue';
import { useModuleManager } from './services/ModuleManager';

export default {
  name: 'App',
  components: {
    TitleBar
  },
  setup() {
    const moduleManager = useModuleManager();
    const currentModule = ref('nowPlaying');
    const error = ref(null);
    const isSidebarCollapsed = ref(false);

    const availableModules = computed(() => {
      return moduleManager.modules.value.filter(module => module.enabled || module.required);
    });

    const currentModuleComponent = computed(() => {
      const module = moduleManager.modules.value.find(m => m.id === currentModule.value);
      return module ? module.component : null;
    });

    const selectModule = (moduleId) => {
      currentModule.value = moduleId;
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
      } catch (err) {
        console.error('App.vue: Error during mount:', err);
        error.value = err;
      }
    });

    return {
      currentModule,
      availableModules,
      currentModuleComponent,
      selectModule,
      error,
      isSidebarCollapsed,
      toggleSidebar
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
  --border-color: rgba(255, 255, 255, 0.1);
  --error-color: #e81123;
  --success-color: #4caf50;
  --warning-color: #ff9800;
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
  background-color: var(--background-color);
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