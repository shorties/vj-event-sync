&lt;template&gt;
  &lt;div class="file-explorer"&gt;
    &lt;div class="path-navigation"&gt;
      &lt;button @click="navigateUp" class="nav-button" title="Go Up"&gt;
        &lt;font-awesome-icon icon="fa-solid fa-arrow-up" /&gt;
      &lt;/button&gt;
      &lt;div class="current-path"&gt;
        &lt;span v-for="(part, index) in pathParts" :key="index" class="path-part"&gt;
          &lt;span 
            class="path-segment" 
            @click="navigateToIndex(index)"
            :title="part"
          &gt;{{ part }}&lt;/span&gt;
          &lt;font-awesome-icon 
            v-if="index < pathParts.length - 1" 
            icon="fa-solid fa-chevron-right" 
            class="path-separator"
          /&gt;
        &lt;/span&gt;
      &lt;/div&gt;
    &lt;/div&gt;

    &lt;div class="file-list" ref="fileList"&gt;
      &lt;div 
        v-for="item in sortedItems" 
        :key="item.path"
        class="file-item"
        @click="handleItemClick(item)"
        @dblclick="navigateToItem(item)"
      &gt;
        &lt;font-awesome-icon 
          :icon="item.type === 'directory' ? 'fa-solid fa-folder' : 'fa-solid fa-file'"
          :class="item.type"
        /&gt;
        &lt;span class="item-name" :title="item.name"&gt;{{ item.name }}&lt;/span&gt;
      &lt;/div&gt;
    &lt;/div&gt;
  &lt;/div&gt;
&lt;/template&gt;

&lt;script setup&gt;
import { ref, computed, onMounted } from 'vue';
import { invoke } from '@tauri-apps/api/tauri';
import { homeDir } from '@tauri-apps/api/path';

const currentPath = ref('');
const items = ref([]);
const selectedItem = ref(null);

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

const loadDirectory = async (path) => {
  try {
    const contents = await invoke('list_directory_contents', { path });
    items.value = contents;
    currentPath.value = path;
  } catch (error) {
    console.error('Failed to load directory:', error);
  }
};

const navigateUp = async () => {
  const parentPath = currentPath.value.split(/[/\\]/).slice(0, -1).join('/');
  if (parentPath) {
    await loadDirectory(parentPath);
  }
};

const navigateToIndex = async (index) => {
  const newPath = pathParts.value.slice(0, index + 1).join('/');
  await loadDirectory(newPath);
};

const navigateToItem = async (item) => {
  if (item.type === 'directory') {
    await loadDirectory(item.path);
  }
};

const handleItemClick = (item) => {
  selectedItem.value = item;
};

onMounted(async () => {
  const home = await homeDir();
  await loadDirectory(home);
});
&lt;/script&gt;

&lt;style scoped&gt;
.file-explorer {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--background-color);
  border-radius: var(--border-radius);
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

.nav-button:hover {
  background: var(--button-hover-bg);
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
}

.file-item .directory {
  color: var(--primary-color);
}

.file-item .file {
  color: var(--text-color-muted);
}

.item-name {
  font-size: 0.9em;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
  white-space: nowrap;
}
&lt;/style&gt;
