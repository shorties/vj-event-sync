<template>
  <div class="settings-container">
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
          <select id="theme" v-model="settings.theme">
            <option value="dark">Dark</option>
            <option value="light">Light</option> 
            <option value="system">System Default</option>
          </select>
        </div>
        
        <div class="form-group">
          <label for="language">Language</label>
          <select id="language" v-model="settings.language">
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
          </select>
        </div>
        
        <div class="form-group">
          <label for="startup">Startup Behavior</label>
          <select id="startup" v-model="settings.startup">
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

export default {
  name: 'Settings',
  setup() {
    const moduleManager = useModuleManager();
    
    const availableModules = moduleManager.modules;
    
    const settings = ref({
      theme: 'dark',
      language: 'en',
      startup: 'normal'
    });
    
    onMounted(async () => {
      await moduleManager.init();
      document.documentElement.setAttribute('data-theme', settings.value.theme);
      console.log('Settings.vue: Modules loaded:', availableModules.value);
    });
    
    const toggleModule = async (moduleId) => {
      const module = availableModules.value.find(m => m.id === moduleId);
      if (module) {
        await moduleManager.toggleModule(moduleId);
      }
    };
    
    const saveSettings = async () => {
      try {
        console.log('Saving settings:', settings.value);
        document.documentElement.setAttribute('data-theme', settings.value.theme);
      } catch (err) {
        console.error('Error saving settings:', err);
      }
    };
    
    const resetSettings = () => {
      settings.value = {
        theme: 'dark',
        language: 'en',
        startup: 'normal'
      };
      document.documentElement.setAttribute('data-theme', settings.value.theme);
    };
    
    return {
      availableModules,
      settings,
      toggleModule,
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