import { ref } from 'vue';
import { invoke } from '@tauri-apps/api/tauri';

// Module registry with default settings
const moduleRegistry = {
  events: {
    name: 'Events',
    enabled: true,
    required: true, // Core module that can't be disabled
    description: 'Event management and scheduling',
    icon: 'M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM5 8V6h14v2H5zm2 4h10v2H7v-2zm0 4h7v2H7v-2z'
  },
  messaging: {
    name: 'Messaging',
    enabled: true,
    required: false,
    description: 'Real-time messaging and notifications',
    icon: 'M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z'
  },
  settings: {
    name: 'Settings',
    enabled: true,
    required: true, // Core module that can't be disabled
    description: 'Application configuration and preferences',
    icon: 'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.39-.29-.61-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.23-.08-.49 0-.61.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.39.29.61.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.23.08.49 0 .61-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.03-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z'
  },
  logos: {
    name: 'Logo Management',
    enabled: true,
    required: false,
    description: 'Logo creation and management tools',
    icon: 'M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z'
  },
  osc: {
    name: 'OSC Control',
    enabled: false,
    required: false,
    description: 'Open Sound Control integration',
    icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z'
  },
  ndi: {
    name: 'NDI Support',
    enabled: false,
    required: false,
    description: 'Network Device Interface integration',
    icon: 'M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zM5 10h9v2H5zm0-3h9v2H5z'
  }
};

// Reactive state
const enabledModules = ref(Object.keys(moduleRegistry).filter(key => moduleRegistry[key].enabled));
const isLoading = ref(false);
const error = ref(null);

// Load module settings from storage
const loadModuleSettings = async () => {
  try {
    isLoading.value = true;
    // Try to load from Tauri storage
    const savedSettings = await invoke('get_module_settings');
    
    if (savedSettings) {
      // Update module registry with saved settings
      Object.keys(savedSettings).forEach(key => {
        if (moduleRegistry[key]) {
          moduleRegistry[key].enabled = savedSettings[key];
        }
      });
      
      // Update enabled modules list
      enabledModules.value = Object.keys(moduleRegistry).filter(key => moduleRegistry[key].enabled);
    }
  } catch (err) {
    console.error('Error loading module settings:', err);
    error.value = err.message;
  } finally {
    isLoading.value = false;
  }
};

// Save module settings to storage
const saveModuleSettings = async () => {
  try {
    isLoading.value = true;
    
    // Create settings object
    const settings = {};
    Object.keys(moduleRegistry).forEach(key => {
      settings[key] = moduleRegistry[key].enabled;
    });
    
    // Save to Tauri storage
    await invoke('save_module_settings', { settings });
  } catch (err) {
    console.error('Error saving module settings:', err);
    error.value = err.message;
  } finally {
    isLoading.value = false;
  }
};

// Toggle a module on/off
const toggleModule = async (moduleId, enabled) => {
  // Don't allow disabling required modules
  if (moduleRegistry[moduleId].required && !enabled) {
    return false;
  }
  
  moduleRegistry[moduleId].enabled = enabled;
  
  // Update enabled modules list
  enabledModules.value = Object.keys(moduleRegistry).filter(key => moduleRegistry[key].enabled);
  
  // Save settings
  await saveModuleSettings();
  
  return true;
};

// Get all available modules
const getAvailableModules = () => {
  return moduleRegistry;
};

// Get enabled modules
const getEnabledModules = () => {
  return enabledModules.value;
};

// Check if a module is enabled
const isModuleEnabled = (moduleId) => {
  return moduleRegistry[moduleId]?.enabled || false;
};

// Initialize the module manager
const init = async () => {
  await loadModuleSettings();
};

export default {
  init,
  toggleModule,
  getAvailableModules,
  getEnabledModules,
  isModuleEnabled,
  isLoading,
  error
}; 