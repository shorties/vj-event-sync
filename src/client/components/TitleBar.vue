<template>
  <div class="title-bar">
    <div class="title-bar-drag-area">
      <div class="app-title">
        <img src="../assets/VJToolsRounded.ico" alt="VJ.Tools Logo" class="title-logo" />
        <span>VJ Event Sync</span>
      </div>
    </div>

    <!-- Global Controls Area -->
    <div class="global-controls">
      <button class="control-button" title="Start/Stop NDI Stream" @click="toggleNdi">
        <font-awesome-icon :icon="['fa-solid', isNdiActive ? 'fa-stop' : 'fa-play']" />
      </button>
      <button class="control-button" title="Start/Stop Cycle" @click="toggleCycle">
        <font-awesome-icon :icon="['fa-solid', isCyclePlaying ? 'fa-pause-circle' : 'fa-play-circle']" />
      </button>
      <button class="control-button" title="Settings" @click="goToSettings">
        <font-awesome-icon icon="fa-solid fa-cog" />
      </button>
    </div>

    <!-- Status Indicators Area -->
    <div class="status-indicators">
      <span class="status-item ndi-status" :class="{ active: isNdiActive }">
        NDI: {{ isNdiActive ? 'Online' : 'Offline' }}
      </span>
      <span class="status-item cycle-status" :class="{ playing: isCyclePlaying }">
        Cycle: {{ isCyclePlaying ? 'Playing' : 'Idle' }}
      </span>
      <span class="status-item current-time">{{ currentTime }}</span>
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
import { ref, onMounted, onUnmounted } from 'vue';

export default {
  name: 'TitleBar',
  emits: ['select-module', 'ndi-toggled', 'cycle-toggled'],
  setup(props, { emit }) {
    const isMaximized = ref(false);
    const currentTime = ref(new Date().toLocaleTimeString());
    const isNdiActive = ref(false);
    const isCyclePlaying = ref(false);
    let timeInterval = null;

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

    const goToSettings = () => {
      emit('select-module', 'settings');
    };

    const toggleNdi = () => {
      isNdiActive.value = !isNdiActive.value;
      emit('ndi-toggled', isNdiActive.value);
      console.log('NDI Toggled:', isNdiActive.value);
      // TODO: Add actual NDI start/stop logic call
    };

    const toggleCycle = () => {
      isCyclePlaying.value = !isCyclePlaying.value;
      emit('cycle-toggled', isCyclePlaying.value);
      console.log('Cycle Toggled:', isCyclePlaying.value);
      // TODO: Add actual Cycle start/stop logic call
    };

    onMounted(() => {
      isMaximized.value = appWindow.isMaximized();
      timeInterval = setInterval(() => {
        currentTime.value = new Date().toLocaleTimeString();
      }, 1000);
    });

    onUnmounted(() => {
      if (timeInterval) {
        clearInterval(timeInterval);
      }
    });

    return {
      minimizeWindow,
      maximizeWindow,
      closeWindow,
      isMaximized,
      currentTime,
      goToSettings,
      isNdiActive,
      isCyclePlaying,
      toggleNdi,
      toggleCycle
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

/* === Global Controls Styling === */
.global-controls {
  display: flex;
  align-items: center;
  gap: 6px; /* Spacing between buttons */
  margin: 0 15px; /* Spacing around the control group */
  -webkit-app-region: no-drag; /* Ensure buttons are clickable */
}

.control-button {
  display: flex; /* Use flex for centering icon */
  justify-content: center;
  align-items: center;
  width: auto; /* Allow button to size to content + padding */
  height: 28px; /* Slightly smaller height */
  padding: 0 8px; /* Horizontal padding */
  background: transparent;
  border: none;
  color: var(--text-color-muted); /* Muted color for inactive state */
  cursor: pointer;
  border-radius: var(--border-radius-small);
  font-size: 0.9rem; /* Adjust icon size */
  transition: background-color 0.2s ease, color 0.2s ease;
}

.control-button:hover {
  background-color: var(--primary-color-hover);
  color: var(--text-color);
}

.control-button:active {
  background-color: var(--primary-color-active);
}

/* === Status Indicators Styling === */
.status-indicators {
  display: flex;
  align-items: center;
  gap: 12px; /* Spacing between status items */
  font-size: 0.75rem; /* Smaller font size */
  color: var(--text-color-muted);
  margin-right: 15px; /* Spacing before window controls */
  -webkit-app-region: no-drag; /* Not draggable */
}

.status-item {
  white-space: nowrap; /* Prevent wrapping */
  padding: 2px 6px;
  border-radius: var(--border-radius-small);
}

/* Example active states - adjust colors as needed */
.ndi-status.active {
  color: #ffffff;
  background-color: #4CAF50; /* Green */
}

.cycle-status.playing {
  color: #000000;
  background-color: #FF9800; /* Orange */
}

/* === Window Controls (Existing) === */
.window-controls {
  display: flex;
  align-items: center; /* Align vertically */
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