import { defineStore } from 'pinia';
import { invoke } from '@tauri-apps/api/tauri';
import { appDataDir } from '@tauri-apps/api/path';

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    libraryPath: null,
    defaultLibraryName: 'LogoLibrary',
    isInitialized: false,
  }),

  actions: {
    async initialize() {
      if (this.isInitialized) return;
      
      try {
        // Get the default library path from app data directory
        const appData = await appDataDir();
        const defaultPath = `${appData}${this.defaultLibraryName}`;
        
        // Try to load saved library path from config
        const savedPath = await invoke('get_logo_library_path');
        this.libraryPath = savedPath || defaultPath;
        
        // Ensure library directory exists
        await invoke('ensure_logo_library_directory', { path: this.libraryPath });
        
        this.isInitialized = true;
      } catch (error) {
        console.error('Failed to initialize settings:', error);
        throw error;
      }
    },

    async setLibraryPath(newPath) {
      try {
        // Validate and create the directory if it doesn't exist
        await invoke('ensure_logo_library_directory', { path: newPath });
        
        // Save the new path to config
        await invoke('save_logo_library_path', { path: newPath });
        
        this.libraryPath = newPath;
      } catch (error) {
        console.error('Failed to set library path:', error);
        throw error;
      }
    }
  }
});
