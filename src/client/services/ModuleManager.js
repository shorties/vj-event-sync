import { ref } from 'vue';
import { invoke } from '@tauri-apps/api/tauri';
import { moduleRegistry } from './moduleRegistry';

// Create a reactive state
const state = {
  modules: ref(moduleRegistry),
  loading: ref(false),
  error: ref(null)
};

// Module manager functions
const useModuleManager = () => {
  const init = async () => {
    state.loading.value = true;
    state.error.value = null;
    try {
      // Any initialization logic here
      state.loading.value = false;
    } catch (error) {
      state.error.value = error;
      state.loading.value = false;
    }
  };

  const getModuleComponent = async (moduleId) => {
    console.log(`[ModuleManager] Attempting to get component for moduleId: ${moduleId}`);
    const module = state.modules.value.find(m => m.id === moduleId);
    if (!module) {
      console.error(`[ModuleManager] Module not found for id: ${moduleId}`);
      return null;
    }
    
    console.log(`[ModuleManager] Found module definition:`, module);
    try {
      if (typeof module.component === 'function') {
        console.log(`[ModuleManager] Dynamically importing component for: ${moduleId}`);
        const component = await module.component();
        console.log(`[ModuleManager] Successfully imported component for: ${moduleId}`, component);
        return component;
      }
      console.log(`[ModuleManager] Returning pre-loaded component for: ${moduleId}`);
      return module.component;
    } catch (err) {
      console.error(`[ModuleManager] Error loading component for moduleId ${moduleId}:`, err);
      state.error.value = err;
      return null;
    }
  };

  const getModuleById = (moduleId) => {
    return state.modules.value.find(m => m.id === moduleId) || null;
  };

  const saveModuleStates = async () => {
    try {
      const states = state.modules.value.reduce((acc, module) => {
        if (!module.required) {
          acc[module.id] = module.enabled;
        }
        return acc;
      }, {});
      await window.__TAURI__.storage.set('moduleStates', states);
      console.log('[ModuleManager] Saved module states:', states);
    } catch (err) {
      console.error('Failed to save module states:', err);
      state.error.value = err;
    }
  };

  const toggleModule = async (moduleId) => {
    const module = state.modules.value.find(m => m.id === moduleId);
    if (module && !module.required) {
      module.enabled = !module.enabled;
      await saveModuleStates();
    }
  };

  const isModuleEnabled = (moduleId) => {
    const module = state.modules.value.find(m => m.id === moduleId);
    return module ? module.enabled : false;
  };

  return {
    availableModules: state.modules,
    loading: state.loading,
    error: state.error,
    init,
    getModuleComponent,
    getModuleById,
    toggleModule,
    isModuleEnabled
  };
};

export { useModuleManager };