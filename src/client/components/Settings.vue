<template>
  <div class="settings-container">
    <div class="settings-section">
      <h3>Logo Library</h3>
      <div class="setting-item">
        <label>Library Location:</label>
        <div class="path-input">
          <input 
            type="text" 
            v-model="libraryPath" 
            readonly 
            placeholder="Click button to select folder"
          >
          <button @click="selectLibraryPath" class="browse-button" title="Browse for existing folder">
            <font-awesome-icon icon="fa-solid fa-folder-open" />
          </button>
          <button @click="createLibrary" class="create-button" title="Create new library folder">
            <font-awesome-icon icon="fa-solid fa-plus" />
          </button>
        </div>
        <p class="setting-description">
          Location where logo files will be stored and organized.
          Changes will take effect after restart.
        </p>
      </div>
    </div>
    <h2>Settings</h2>
    
    <div class="settings-section">
      <h3>Module Management</h3>
      <p class="section-description">Enable or disable features to optimize application performance.</p>
      
      <div class="modules-list">
        <div v-for="module in availableModules" :key="module.id" class="module-item">
          <div class="module-info">
            <div class="module-header">
              <h4>{{ module.name }}</h4>
              <span v-if="module.required" class="required-badge">Required</span>
            </div>
            <p class="module-description">{{ module.description }}</p>
          </div>
          <div class="module-toggle">
            <label class="toggle-switch">
              <input 
                type="checkbox" 
                :checked="module.enabled" 
                @change="toggleModule(module.id)"  
                :disabled="module.required"
              >
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>
    </div>
    
    <div class="settings-section">
      <h3>Application Settings</h3>
      <p class="section-description">Configure general application settings.</p>
      
      <div class="settings-form">
        <div class="form-group">
          <label for="theme">Theme</label>
          <select id="theme" v-model="appSettings.theme" @change="updateSetting('theme', $event.target.value)">
            <option value="dark">Dark</option>
            <option value="light">Light</option> 
            <option value="system">System Default</option>
          </select>
        </div>
        
        <div class="form-group">
          <label for="language">Language</label>
          <select id="language" v-model="appSettings.language" @change="updateSetting('language', $event.target.value)">
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
          </select>
        </div>
        
        <div class="form-group">
          <label for="startup">Startup Behavior</label>
          <select id="startup" v-model="appSettings.startup" @change="updateSetting('startup', $event.target.value)">
            <option value="normal">Normal</option>
            <option value="minimized">Start Minimized</option>
            <option value="maximized">Start Maximized</option>
          </select>
        </div>
      </div>
    </div>
    
    <div class="settings-actions">
      <button class="btn-secondary" @click="resetSettings">Reset to Defaults</button>
      <button class="btn-primary" @click="saveSettings">Save Settings</button>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { useModuleManager } from '../services/ModuleManager';

import { useSettingsStore } from '../stores/settings';
import { open } from '@tauri-apps/api/dialog';
import { homeDir } from '@tauri-apps/api/path';

export default {
  name: 'Settings',
  setup() {
    const settings = useSettingsStore();
    const moduleManager = useModuleManager();
    
    const availableModules = moduleManager.modules;
    const libraryPath = ref('');
    const appSettings = ref({
      theme: 'dark',
      language: 'en',
      startup: 'normal'
    });

    const toggleModule = async (moduleId) => {
      const module = availableModules.value.find(m => m.id === moduleId);
      if (module) {
        await moduleManager.toggleModule(moduleId);
      }
    };

    const updateSetting = (key, value) => {
      appSettings.value[key] = value;
      if (key === 'theme') {
        document.documentElement.setAttribute('data-theme', value);
      }
    };

    const createLibrary = async () => {
      try {
        // First, let user select parent directory
        const parentDir = await open({
          directory: true,
          multiple: false,
          defaultPath: await homeDir(),
          title: 'Select where to create the LogoLibrary folder'
        });

        if (parentDir) {
          const newPath = `${parentDir}/LogoLibrary`;
          await settings.setLibraryPath(newPath);
          libraryPath.value = newPath;
        }
      } catch (error) {
        console.error('Failed to create library:', error);
      }
    };

    const selectLibraryPath = async () => {
      try {
        const selected = await open({
          directory: true,
          multiple: false,
          defaultPath: libraryPath.value
        });

        if (selected) {
          await settings.setLibraryPath(selected);
          libraryPath.value = selected;
        }
      } catch (error) {
        console.error('Failed to select library path:', error);
      }
    };

    const saveSettings = async () => {
      try {
        console.log('Saving settings:', appSettings.value);
        document.documentElement.setAttribute('data-theme', appSettings.value.theme);
      } catch (err) {
        console.error('Error saving settings:', err);
      }
    };

    const resetSettings = () => {
      appSettings.value = {
        theme: 'dark',
        language: 'en',
        startup: 'normal'
      };
      document.documentElement.setAttribute('data-theme', appSettings.value.theme);
    };

    onMounted(async () => {
      try {
        await settings.initialize();
        libraryPath.value = settings.libraryPath;
        await moduleManager.init();
        document.documentElement.setAttribute('data-theme', appSettings.value.theme);
      } catch (error) {
        console.error('Failed to initialize settings:', error);
      }
    });

    return {
      libraryPath,
      availableModules,
      appSettings,
      toggleModule,
      updateSetting,
      selectLibraryPath,
      createLibrary,
      saveSettings,
      resetSettings
    };
  }
};
</script>

<style scoped>
.settings-container {
  padding: 20px;
  color: var(--text-color);
}

h2 {
  margin-bottom: 1.5rem;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 0.5rem;
}

.setting-item {
  margin-bottom: 1rem;
}

.setting-item label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.path-input {
  display: flex;
  gap: 8px;
  align-items: center;
}

.path-input input {
  flex: 1;
  padding: 8px;
  background-color: var(--background-color);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  color: var(--text-color);
}

.path-input button {
  padding: 8px;
  min-width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--button-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  color: var(--text-color);
  cursor: pointer;
  transition: all 0.2s ease;
}

.path-input button:hover {
  background-color: var(--button-hover-bg);
}

.path-input .create-button {
  background-color: var(--primary-color);
  color: white;
}

.path-input .create-button:hover {
  background-color: var(--primary-hover-color);
}

.setting-description {
  margin-top: 0.5rem;
  font-size: 0.85rem;
  color: rgba(var(--text-color-rgb), 0.7);
}

.settings-section {
  margin-bottom: 2rem;
  background-color: var(--secondary-color);
  border-radius: var(--border-radius);
  padding: 1.5rem;
  border: 1px solid var(--border-color);
}

h3 {
  margin-bottom: 0.5rem;
}

.section-description {
  color: rgba(var(--text-color-rgb), 0.7);
  margin-bottom: 1.5rem;
  font-size: 0.9rem;
}

.modules-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.module-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background-color: var(--background-color);
  border-radius: 6px;
  border: 1px solid var(--border-color);
}

.module-info {
  flex: 1;
}

.module-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.module-header h4 {
  margin: 0;
  font-size: 1rem;
}

.required-badge {
  font-size: 0.7rem;
  background-color: var(--primary-color);
  color: white;
  padding: 0.1rem 0.4rem;
  border-radius: 3px;
}

.module-description {
  font-size: 0.9rem;
  color: rgba(var(--text-color-rgb), 0.7);
  margin: 0;
}

/* Toggle Switch */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 24px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(var(--text-color-rgb), 0.3);
  transition: .4s;
  border-radius: 24px;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 4px;
  bottom: 4px;
  background-color: var(--text-color);
  transition: .4s;
  border-radius: 50%;
}

input:checked + .toggle-slider {
  background-color: var(--primary-color);
}

input:disabled + .toggle-slider {
  opacity: 0.5;
  cursor: not-allowed;
}

input:checked + .toggle-slider:before {
  transform: translateX(26px);
}

/* Form Styles */
.settings-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-weight: 500;
}

.form-group select {
  padding: 0.75rem;
  border-radius: var(--border-radius);
  border: 1px solid var(--border-color);
  background-color: var(--background-color);
  color: var(--text-color);
  font-size: 1rem;
}

/* Action Buttons */
.settings-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border-color);
}

.btn-primary, .btn-secondary {
  padding: 0.75rem 1.5rem;
  border-radius: var(--border-radius);
  border: none;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s, opacity 0.2s;
}

.btn-primary {
  background-color: var(--primary-color);
  color: white;
}

.btn-primary:hover {
  opacity: 0.9;
}

.btn-secondary {
  background-color: var(--secondary-color);
  color: var(--text-color);
  border: 1px solid var(--border-color);
}

.btn-secondary:hover {
  background-color: rgba(var(--text-color-rgb), 0.1);
}
</style> 