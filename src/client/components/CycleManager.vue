<template>
  <div
    class="cycle-manager-container"
    @dragover.prevent="handleDragOver"
    @dragleave.prevent="handleDragLeave"
    @drop.prevent="handleDrop"
    :class="{ 'is-dragging-over': isDraggingOver }"
  >
    <div class="section-header">
      <font-awesome-icon icon="fa-solid fa-sync-alt" />
      <span>Logo Cycle</span>
      <!-- Add Cycle Controls Here -->
    </div>
    <div v-if="cycleItems.length === 0" class="empty-state">
      <font-awesome-icon icon="fa-solid fa-inbox" class="empty-state-icon" />
      <h3>Empty Cycle</h3>
      <p>Drag logos from the gallery here to create a cycle.</p>
    </div>
    <div v-else class="cycle-list">
      <div v-for="(item, index) in cycleItems" :key="index" class="cycle-item">
        <img v-if="isImage(item.path)" :src="getAssetUrl(item.path)" class="thumbnail"/>
        <video v-else :src="getAssetUrl(item.path)" class="thumbnail" muted></video>
        <span class="item-name">{{ item.name }}</span>
      </div>
    </div>
    <div v-if="droppedItem" class="debug-drop">
      Dropped: {{ droppedItem.name }}
    </div>
  </div>
</template>

<script>
import { ref } from 'vue';
import { convertFileSrc } from '@tauri-apps/api/tauri';
import { library } from '@fortawesome/fontawesome-svg-core';
import { faSyncAlt, faInbox } from '@fortawesome/free-solid-svg-icons';

library.add(faSyncAlt, faInbox);

export default {
  name: 'CycleManager',
  setup() {
    const isDraggingOver = ref(false);
    const cycleItems = ref([]);
    const droppedItem = ref(null); // For debugging

    const handleDragOver = (event) => {
      isDraggingOver.value = true;
      event.dataTransfer.dropEffect = 'copy'; // Indicate it's a copy operation
    };

    const handleDragLeave = () => {
      isDraggingOver.value = false;
    };

    const handleDrop = (event) => {
      isDraggingOver.value = false;
      const data = event.dataTransfer.getData('application/json');
      if (data) {
        try {
          const logoData = JSON.parse(data);
          console.log('Dropped Logo Data:', logoData);
          cycleItems.value.push(logoData);
          droppedItem.value = logoData; // Update debug info
          // Clear debug info after a delay
          setTimeout(() => droppedItem.value = null, 3000);
        } catch (e) {
          console.error('Failed to parse dropped data:', e);
        }
      }
    };

    const getAssetUrl = (path) => {
      return convertFileSrc(path);
    };

    const isImage = (filePath) => {
      const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];
      const extension = filePath.substring(filePath.lastIndexOf('.')).toLowerCase();
      return imageExtensions.includes(extension);
    };

    return {
      isDraggingOver,
      cycleItems,
      droppedItem,
      handleDragOver,
      handleDragLeave,
      handleDrop,
      getAssetUrl,
      isImage,
    };
  }
};
</script>

<style scoped>
.cycle-manager-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--panel-bg);
  border: 2px dashed transparent;
  transition: border-color var(--transition-speed) ease, background-color var(--transition-speed) ease;
}

.cycle-manager-container.is-dragging-over {
  border-color: var(--primary-color);
  background-color: rgba(106, 255, 78, 0.05);
}

.section-header {
  display: flex;
  align-items: center;
  padding: 8px var(--content-padding);
  background: var(--panel-header-bg);
  border-bottom: 1px solid var(--border-color);
  gap: 12px;
  height: var(--header-height);
  font-size: 0.9rem;
  letter-spacing: 0.25px;
  font-weight: 500;
  color: var(--text-color);
  flex-shrink: 0;
}

.cycle-list {
  flex: 1;
  overflow-y: auto;
  padding: var(--content-padding);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cycle-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  background: var(--panel-header-bg);
  border-radius: var(--border-radius);
  border: 1px solid var(--border-color);
}

.thumbnail {
  width: 48px;
  height: 27px; /* 16:9 */
  object-fit: contain;
  background-color: #000;
  border-radius: calc(var(--border-radius) / 2);
}

.item-name {
  font-size: 0.9rem;
  color: var(--text-color);
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  color: var(--text-color-muted);
  text-align: center;
  padding: 40px;
  border: 2px dashed var(--border-color);
  margin: var(--content-padding);
  border-radius: var(--border-radius);
}

.empty-state-icon {
  font-size: 3rem;
  color: var(--text-color-muted);
}

.debug-drop {
  position: absolute;
  bottom: 10px;
  right: 10px;
  background: var(--primary-color);
  color: var(--background-color);
  padding: 5px 10px;
  border-radius: var(--border-radius);
  font-size: 0.8rem;
  z-index: 10;
}
</style>
