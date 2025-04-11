<template>
  <div class="file-explorer">
    <!-- Error Display -->
    <div v-if="error" class="error-message">
      <font-awesome-icon icon="fa-solid fa-exclamation-circle" />
      <span>{{ error }}</span>
      <button @click="retryLastOperation" class="retry-button">
        <font-awesome-icon icon="fa-solid fa-sync" /> Retry
      </button>
    </div>

    <!-- Path Navigation -->
    <div class="path-navigation">
      <button 
        @click="navigateUp" 
        class="nav-button" 
        title="Go Up"
        :disabled="!currentPath || isLoading"
      >
        <font-awesome-icon icon="fa-solid fa-arrow-up" />
      </button>
      <div class="current-path">
        <span v-for="(part, index) in pathParts" :key="index" class="path-part">
          <span 
            class="path-segment" 
            @click="navigateToIndex(index)"
            :title="part"
          >{{ part }}</span>
          <font-awesome-icon 
            v-if="index < pathParts.length - 1" 
            icon="fa-solid fa-chevron-right" 
            class="path-separator"
          />
        </span>
      </div>
    </div>

    <!-- File List -->
    <div class="file-list" ref="fileList">
      <!-- Loading State -->
      <div v-if="isLoading" class="loading-state">
        <font-awesome-icon icon="fa-solid fa-spinner" spin />
        <span>Loading...</span>
      </div>
      
      <!-- Empty State -->
      <div v-else-if="items.length === 0" class="empty-state">
        <font-awesome-icon icon="fa-solid fa-folder-open" />
        <span>This folder is empty</span>
      </div>
      
      <!-- File Items -->
      <div 
        v-else
        v-for="item in sortedItems" 
        :key="item.path"
        class="file-item"
        :class="{ selected: selectedItem?.path === item.path }"
        @click="handleItemClick(item)"
        @dblclick="navigateToItem(item)"
      >
        <font-awesome-icon 
          :icon="item.type === 'directory' ? 'fa-solid fa-folder' : 'fa-solid fa-file'"
          :class="item.type"
        />
        <span class="item-name" :title="item.name">{{ item.name }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { invoke } from '@tauri-apps/api/tauri';
import { homeDir } from '@tauri-apps/api/path';

// State
const currentPath = ref('');
const items = ref([]);
const selectedItem = ref(null);
const isLoading = ref(false);
const error = ref(null);
let lastOperation = null;

// Computed
const pathParts = computed(() => {
  return currentPath.value.split(/[/\\]/).filter(Boolean);
});

const sortedItems = computed(() => {
  return [...items.value].sort((a, b) => {
    // Directories first
    if (a.type === 'directory' && b.type !== 'directory') return -1;
    if (a.type !== 'directory' && b.type === 'directory') return 1;
    // Then alphabetically
    return a.name.localeCompare(b.name);
  });
});

// Methods
const loadDirectory = async (path) => {
  try {
    console.log('Loading directory:', path);
    isLoading.value = true;
    error.value = null;
    lastOperation = path;
    
    const contents = await invoke('list_directory_contents', { path });
    console.log('Directory contents:', contents);
    items.value = contents;
    currentPath.value = path;
  } catch (err) {
    console.error('Failed to load directory:', err);
    error.value = err.toString();
  } finally {
    isLoading.value = false;
  }
};

const navigateUp = async () => {
  if (!currentPath.value || isLoading.value) return;
  
  const parentPath = currentPath.value.split(/[/\\]/).slice(0, -1).join('/');
  if (parentPath) {
    await loadDirectory(parentPath);
  }
};

const navigateToIndex = async (index) => {
  if (isLoading.value) return;
  const newPath = pathParts.value.slice(0, index + 1).join('/');
  if (newPath) {
    await loadDirectory(newPath);
  }
};

const navigateToItem = async (item) => {
  if (isLoading.value) return;
  if (item.type === 'directory') {
    await loadDirectory(item.path);
  }
};

const handleItemClick = (item) => {
  selectedItem.value = item;
  // Emit selected item for parent components
  emit('itemSelected', item);
};

const retryLastOperation = async () => {
  if (lastOperation) {
    await loadDirectory(lastOperation);
  }
};

// Lifecycle
onMounted(async () => {
  try {
    const home = await homeDir();
    console.log('Starting at home directory:', home);
    await loadDirectory(home);
  } catch (err) {
    console.error('Error during FileExplorer mount:', err);
    error.value = err.toString();
  }
});

// Emits
const emit = defineEmits(['itemSelected']);
</script>

<style scoped>
.file-explorer {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--background-color);
  color: var(--text-color);
}

.error-message {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(255, 0, 0, 0.1);
  color: #ff4444;
  border-bottom: 1px solid rgba(255, 0, 0, 0.2);
}

.retry-button {
  margin-left: auto;
  padding: 4px 8px;
  background: transparent;
  border: 1px solid currentColor;
  border-radius: 4px;
  color: inherit;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
}

.retry-button:hover {
  background: rgba(255, 0, 0, 0.1);
}

.path-navigation {
  display: flex;
  align-items: center;
  padding: 8px;
  background: var(--secondary-color);
  border-bottom: 1px solid var(--border-color);
  gap: 8px;
}

.nav-button {
  padding: 6px;
  min-width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--button-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  color: var(--text-color);
  cursor: pointer;
  transition: all 0.2s ease;
}

.nav-button:hover:not(:disabled) {
  background: var(--button-hover-bg);
}

.nav-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.current-path {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 4px;
  overflow-x: auto;
  white-space: nowrap;
  padding: 4px 8px;
  background: var(--background-color);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
}

.path-part {
  display: flex;
  align-items: center;
  gap: 4px;
}

.path-segment {
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;
  &:hover {
    background: var(--button-hover-bg);
  }
}

.path-separator {
  color: var(--text-color-muted);
  font-size: 0.8em;
}

.file-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 8px;
}

.loading-state, .empty-state {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 32px;
  color: var(--text-color-muted);
  font-size: 0.9em;
}

.file-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px;
  gap: 4px;
  cursor: pointer;
  border-radius: var(--border-radius);
  transition: background-color 0.2s ease;
  
  &:hover {
    background: var(--button-hover-bg);
  }
  
  &.selected {
    background: var(--primary-color);
    color: white;
  }
}

.file-item .directory {
  color: var(--primary-color);
}

.file-item .file {
  color: var(--text-color-muted);
}

.selected .directory,
.selected .file {
  color: white;
}

.item-name {
  font-size: 0.9em;
  text-align: center;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
