import { ref } from 'vue';
import { invoke } from '@tauri-apps/api/tauri';
import Logos from '../components/Logos.vue';
import OSC from '../components/OSC.vue';
import NDI from '../components/NDI.vue';
import Events from '../components/Events.vue';
import Messaging from '../components/Messaging.vue';
import Settings from '../components/Settings.vue';

// Module registry with icons
const moduleRegistry = [
  {
    id: 'events',
    name: 'Events',
    description: 'Manage and sync events',
    enabled: true,
    required: true,
    component: Events,
    icon: 'fas fa-calendar-alt'
  },
  {
    id: 'messaging',
    name: 'Messaging',
    description: 'Chat with other VJs',
    enabled: true,
    required: true,
    component: Messaging,
    icon: 'fas fa-comments'
  },
  {
    id: 'settings',
    name: 'Settings',
    description: 'Configure application settings',
    enabled: true,
    required: true,
    component: Settings,
    icon: 'fas fa-cog'
  },
  {
    id: 'logos',
    name: 'Logos',
    description: 'Manage and sync logos',
    enabled: true,
    required: false,
    component: Logos,
    icon: 'fas fa-image'
  },
  {
    id: 'osc',
    name: 'OSC',
    description: 'OSC control and monitoring',
    enabled: true,
    required: false,
    component: OSC,
    icon: 'fas fa-broadcast-tower'
  },
  {
    id: 'ndi',
    name: 'NDI',
    description: 'NDI video streaming',
    enabled: true,
    required: false,
    component: NDI,
    icon: 'fas fa-video'
  }
];

// Create a reactive state
const state = {
  modules: ref(moduleRegistry),
  loading: ref(false),
  error: ref(null)
};

export function useModuleManager() {
  const init = async () => {
    state.loading.value = true;
    state.error.value = null;
    try {
      // Load module settings from backend
      const settings = await invoke('get_module_settings');
      
      // Update module states based on loaded settings
      state.modules.value = state.modules.value.map(module => ({
        ...module,
        enabled: settings[module.id] ?? module.enabled
      }));
    } catch (error) {
      state.error.value = error;
      console.error('Failed to initialize module manager:', error);
    } finally {
      state.loading.value = false;
    }
  };

  const getAvailableModules = () => {
    return state.modules.value;
  };

  const toggleModule = async (moduleId, enabled) => {
    const module = state.modules.value.find(m => m.id === moduleId);
    if (!module) return;

    if (module.required) {
      console.warn(`Cannot toggle required module: ${moduleId}`);
      return;
    }

    try {
      // Update backend
      await invoke('save_module_settings', {
        settings: { [moduleId]: enabled }
      });

      // Update local state
      module.enabled = enabled;
    } catch (error) {
      console.error(`Failed to toggle module ${moduleId}:`, error);
      throw error;
    }
  };

  const isModuleEnabled = (moduleId) => {
    const module = state.modules.value.find(m => m.id === moduleId);
    return module ? module.enabled : false;
  };

  return {
    init,
    getAvailableModules,
    toggleModule,
    isModuleEnabled,
    loading: state.loading,
    error: state.error
  };
} 