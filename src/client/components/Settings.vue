<template>
  <div class="settings-container">
    <h2>Settings</h2>
    
    <div class="settings-section">
      <h3>Module Management</h3>
      <p class="section-description">Enable or disable features to optimize application performance.</p>
      
      <div class="modules-list">
        <div v-for="(module, id) in availableModules" :key="id" class="module-item">
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
                @change="toggleModule(id, $event.target.checked)"
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
            <option value="light">Light</option>
            <option value="dark">Dark</option>
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
import ModuleManager from '../services/ModuleManager';

export default {
  name: 'Settings',
  setup() {
    const availableModules = ref({});
    const settings = ref({
      theme: 'light',
      language: 'en',
      startup: 'normal'
    });
    
    // Load module settings
    onMounted(async () => {
      await ModuleManager.init();
      availableModules.value = ModuleManager.getAvailableModules();
    });
    
    // Toggle a module
    const toggleModule = async (moduleId, enabled) => {
      await ModuleManager.toggleModule(moduleId, enabled);
    };
    
    // Save application settings
    const saveSettings = async () => {
      try {
        // In a real app, this would save to storage
        console.log('Saving settings:', settings.value);
        // Apply theme
        document.documentElement.setAttribute('data-theme', settings.value.theme);
      } catch (err) {
        console.error('Error saving settings:', err);
      }
    };
    
    // Reset settings to defaults
    const resetSettings = () => {
      settings.value = {
        theme: 'light',
        language: 'en',
        startup: 'normal'
      };
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
}

.settings-section {
  margin-bottom: 2rem;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
}

.section-description {
  color: var(--text-light);
  margin-bottom: 1.5rem;
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
  background-color: #f9f9f9;
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
  padding: 0.1rem 0.3rem;
  border-radius: 3px;
}

.module-description {
  font-size: 0.9rem;
  color: var(--text-light);
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
  background-color: #ccc;
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
  background-color: white;
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
  gap: 1rem;
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
  padding: 0.5rem;
  border-radius: 4px;
  border: 1px solid var(--border-color);
  background-color: white;
}

/* Action Buttons */
.settings-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2rem;
}

.btn-primary, .btn-secondary {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
}

.btn-primary {
  background-color: var(--primary-color);
  color: white;
}

.btn-primary:hover {
  background-color: var(--secondary-color);
}

.btn-secondary {
  background-color: #e0e0e0;
  color: #333;
}

.btn-secondary:hover {
  background-color: #d0d0d0;
}
</style> 