<template>
  <div class="app-container">
    <TitleBar />
    <div class="main-content">
      <div class="sidebar">
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
          >
            <i :class="module.icon"></i>
            <span class="nav-text">{{ module.name }}</span>
          </button>
        </nav>
      </div>
      <div class="content">
        <component
          v-if="currentModuleComponent"
          :is="currentModuleComponent"
          class="module-content"
        />
        <div v-else class="loading">
          <i class="fas fa-spinner fa-spin"></i>
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
      error
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
  --border-radius: 8px;
  --transition-speed: 0.2s;
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
}

.sidebar {
  width: 240px;
  background-color: var(--secondary-color);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  transition: width var(--transition-speed);
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
}

.navigation {
  padding: 20px 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
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
  transition: background-color var(--transition-speed);
  text-align: left;
}

.nav-button:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.nav-button.active {
  background-color: var(--primary-color);
}

.nav-button i {
  width: 20px;
  text-align: center;
}

.content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.module-content {
  background-color: var(--secondary-color);
  border-radius: var(--border-radius);
  padding: 20px;
  height: 100%;
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

.loading i {
  font-size: 24px;
}

@media (max-width: 768px) {
  .sidebar {
    width: 64px;
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
}
</style> 