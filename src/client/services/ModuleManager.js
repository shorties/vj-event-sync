import { ref } from 'vue';
import { invoke } from '@tauri-apps/api/tauri';
import NowPlaying from '../components/NowPlaying.vue';
import Logos from '../components/Logos.vue';
import OSC from '../components/OSC.vue';
import NDI from '../components/NDI.vue';
import Events from '../components/Events.vue';
import Messaging from '../components/Messaging.vue';
import Settings from '../components/Settings.vue';

// Module registry with icons
const moduleRegistry = [
  {
    id: 'nowPlaying',
    name: 'Now Playing',
    description: 'View and manage the current logo playlist',
    enabled: true,
    required: true,
    component: NowPlaying,
    icon: 'fas fa-play-circle'
  },
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
    description: 'Communication tools',
    enabled: true,
    required: true,
    component: Messaging,
    icon: 'fas fa-comments'
  },
  {
    id: 'logos',
    name: 'Logos',
    description: 'Logo management',
    enabled: true,
    required: false,
    component: Logos,
    icon: 'fas fa-image'
  },
  {
    id: 'osc',
    name: 'OSC',
    description: 'OSC control',
    enabled: true,
    required: false,
    component: OSC,
    icon: 'fas fa-network-wired'
  },
  {
    id: 'ndi',
    name: 'NDI',
    description: 'NDI streaming',
    enabled: true,
    required: false,
    component: NDI,
    icon: 'fas fa-broadcast-tower'
  },
  {
    id: 'settings',
    name: 'Settings',
    description: 'Application settings',
    enabled: true,
    required: true,
    component: Settings,
    icon: 'fas fa-cog'
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
      // Load saved module states from storage
      const savedStates = await window.__TAURI__.storage.get('moduleStates');
      if (savedStates) {
        state.modules.value = state.modules.value.map(module => ({
          ...module,
          enabled: module.required ? true : (savedStates[module.id] ?? module.enabled)
        }));
      }
    } catch (err) {
      console.error('Failed to load module states:', err);
      state.error.value = err;
    } finally {
      state.loading.value = false;
    }
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

  const getModule = (moduleId) => {
    return state.modules.value.find(m => m.id === moduleId);
  };

  return {
    modules: state.modules,
    loading: state.loading,
    error: state.error,
    init,
    toggleModule,
    isModuleEnabled,
    getModule
  };
} 