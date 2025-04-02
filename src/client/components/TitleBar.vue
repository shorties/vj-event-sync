<template>
  <div class="titlebar">
    <div class="titlebar-drag">
      <div class="app-title">VJ Event Sync</div>
    </div>
    <div class="titlebar-controls">
      <button class="titlebar-button" @click="minimize">
        <svg width="12" height="12" viewBox="0 0 12 12">
          <rect width="10" height="1" x="1" y="6" fill="currentColor" />
        </svg>
      </button>
      <button class="titlebar-button" @click="maximize">
        <svg width="12" height="12" viewBox="0 0 12 12">
          <rect width="9" height="9" x="1.5" y="1.5" fill="none" stroke="currentColor" stroke-width="1" />
        </svg>
      </button>
      <button class="titlebar-button close" @click="close">
        <svg width="12" height="12" viewBox="0 0 12 12">
          <path d="M3,3 L9,9 M9,3 L3,9" stroke="currentColor" stroke-width="1.1" fill="none" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script>
import { invoke } from '@tauri-apps/api/tauri';

export default {
  name: 'TitleBar',
  methods: {
    async minimize() {
      try {
        await invoke('minimize_window');
      } catch (error) {
        console.error('Failed to minimize window:', error);
      }
    },
    async maximize() {
      try {
        await invoke('maximize_window');
      } catch (error) {
        console.error('Failed to maximize window:', error);
      }
    },
    async close() {
      try {
        await invoke('close_window');
      } catch (error) {
        console.error('Failed to close window:', error);
      }
    }
  }
};
</script>

<style scoped>
.titlebar {
  height: 32px;
  background: #1a1a1a;
  display: flex;
  justify-content: space-between;
  align-items: center;
  -webkit-app-region: drag;
  user-select: none;
  padding: 0 8px;
}

.titlebar-drag {
  flex: 1;
  display: flex;
  align-items: center;
}

.app-title {
  color: #ffffff;
  font-size: 12px;
  font-weight: 500;
  opacity: 0.8;
}

.titlebar-controls {
  display: flex;
  -webkit-app-region: no-drag;
}

.titlebar-button {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background-color 0.2s;
}

.titlebar-button:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.titlebar-button.close:hover {
  background-color: #e81123;
}

.titlebar-button svg {
  opacity: 0.8;
}

.titlebar-button:hover svg {
  opacity: 1;
}
</style> 