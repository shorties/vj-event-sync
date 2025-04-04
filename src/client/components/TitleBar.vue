<template>
  <div class="title-bar">
    <div class="title-bar-drag-area">
      <div class="app-title">
        <img src="../assets/VJToolsRounded.ico" alt="VJ.Tools Logo" class="title-logo" />
        <span>VJ Event Sync</span>
      </div>
    </div>
    <div class="window-controls">
      <button class="window-control minimize" @click="minimizeWindow" title="Minimize">
        <font-awesome-icon icon="fa-solid fa-minus" />
      </button>
      <button class="window-control maximize" @click="maximizeWindow" :title="isMaximized ? 'Restore' : 'Maximize'">
        <font-awesome-icon :icon="isMaximized ? 'fa-solid fa-clone' : 'fa-solid fa-square'" />
      </button>
      <button class="window-control close" @click="closeWindow" title="Close">
        <font-awesome-icon icon="fa-solid fa-times" />
      </button>
    </div>
  </div>
</template>

<script>
import { appWindow } from '@tauri-apps/api/window';
import { ref, onMounted } from 'vue';

export default {
  name: 'TitleBar',
  setup() {
    const isMaximized = ref(false);

    const minimizeWindow = async () => {
      await appWindow.minimize();
    };

    const maximizeWindow = async () => {
      isMaximized.value = await appWindow.isMaximized();
      if (isMaximized.value) {
        await appWindow.unmaximize();
      } else {
        await appWindow.maximize();
      }
      isMaximized.value = !isMaximized.value;
    };

    const closeWindow = async () => {
      await appWindow.close();
    };

    onMounted(async () => {
      isMaximized.value = await appWindow.isMaximized();
    });

    return {
      minimizeWindow,
      maximizeWindow,
      closeWindow,
      isMaximized
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
  position: relative;
  z-index: 1000;
}

.title-bar-drag-area {
  flex: 1;
  display: flex;
  align-items: center;
  height: 100%;
}

.app-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  margin-left: 10px;
}

.title-logo {
  width: 20px;
  height: 20px;
  object-fit: contain;
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

.window-control svg {
  font-size: 12px;
}

@media (max-width: 768px) {
  .app-title span {
    display: none;
  }
  
  .window-control {
    width: 32px;
    height: 32px;
  }
}
</style>