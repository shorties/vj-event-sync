<template>
  <div class="title-bar">
    <div class="title-bar-drag-area">
      <div class="app-title">VJ Event Sync</div>
    </div>
    <div class="window-controls">
      <button class="window-control minimize" @click="minimizeWindow">
        <i class="fas fa-minus"></i>
      </button>
      <button class="window-control maximize" @click="maximizeWindow">
        <i class="fas fa-square"></i>
      </button>
      <button class="window-control close" @click="closeWindow">
        <i class="fas fa-times"></i>
      </button>
    </div>
  </div>
</template>

<script>
import { appWindow } from '@tauri-apps/api/window';

export default {
  name: 'TitleBar',
  setup() {
    const minimizeWindow = async () => {
      await appWindow.minimize();
    };

    const maximizeWindow = async () => {
      const isMaximized = await appWindow.isMaximized();
      if (isMaximized) {
        await appWindow.unmaximize();
      } else {
        await appWindow.maximize();
      }
    };

    const closeWindow = async () => {
      await appWindow.close();
    };

    return {
      minimizeWindow,
      maximizeWindow,
      closeWindow
    };
  }
};
</script>

<style scoped>
.title-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 40px;
  background-color: var(--secondary-color);
  color: var(--text-color);
  -webkit-app-region: drag;
  border-top-left-radius: var(--border-radius);
  border-top-right-radius: var(--border-radius);
  padding: 0 10px;
  user-select: none;
}

.title-bar-drag-area {
  flex: 1;
  display: flex;
  align-items: center;
  height: 100%;
}

.app-title {
  font-size: 14px;
  font-weight: 500;
  margin-left: 10px;
}

.window-controls {
  display: flex;
  -webkit-app-region: no-drag;
}

.window-control {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 40px;
  height: 40px;
  background: transparent;
  border: none;
  color: var(--text-color);
  cursor: pointer;
  transition: background-color 0.2s;
}

.window-control:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.window-control.close:hover {
  background-color: var(--error-color);
}

.window-control i {
  font-size: 14px;
}
</style> 