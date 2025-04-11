<template>
  <div class="logo-gallery-container">
    <div v-if="loading" class="loading-indicator">
      <font-awesome-icon icon="fa-solid fa-circle-notch" spin />
      <span>Loading logos...</span>
    </div>
    <div v-else-if="logos.length === 0" class="empty-state">
      <font-awesome-icon icon="fa-solid fa-image" class="empty-state-icon" />
      <h3>Logo Gallery is Empty</h3>
      <p>Add logos to the library folder or share the upload link.</p>
      <!-- Add Share link button here? -->
    </div>
    <div v-else class="gallery-grid">
      <div
        v-for="logo in logos"
        :key="logo.path"
        class="gallery-item"
        draggable="true"
        @dragstart="handleDragStart($event, logo)"
      >
        <div class="thumbnail-container">
          <img v-if="isImage(logo.path)" :src="getAssetUrl(logo.path)" :alt="logo.name" class="thumbnail" />
          <video v-else :src="getAssetUrl(logo.path)" class="thumbnail" muted playsinline></video>
          <div class="hover-preview">
            <font-awesome-icon icon="fa-solid fa-eye" /> Preview
          </div>
        </div>
        <div class="logo-info">
          <span class="logo-name" :title="logo.name">{{ logo.name }}</span>
          <span class="artist-label">{{ logo.artist || 'Unknown Artist' }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { invoke } from '@tauri-apps/api/tauri';
import { convertFileSrc } from '@tauri-apps/api/tauri';

export default {
  name: 'LogoGallery',
  setup() {
    const logos = ref([]);
    const loading = ref(true);

    const fetchLogos = async () => {
      loading.value = true;
      try {
        // Placeholder: Replace with actual call to get logos from library
        // This might involve reading a directory specified in settings
        // For now, let's assume an invoke command `list_logo_library` exists
        const logoData = await invoke('list_logo_library');
        logos.value = logoData;
      } catch (err) {
        console.error('Failed to fetch logos:', err);
        // Add error handling UI
      } finally {
        loading.value = false;
      }
    };

    const getAssetUrl = (path) => {
      // Use Tauri's API to convert the file path to a usable URL
      return convertFileSrc(path);
    };

    const isImage = (filePath) => {
      const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];
      const extension = filePath.substring(filePath.lastIndexOf('.')).toLowerCase();
      return imageExtensions.includes(extension);
    };

    const handleDragStart = (event, logo) => {
      console.log('Drag started:', logo);
      event.dataTransfer.setData('application/json', JSON.stringify(logo));
      event.dataTransfer.effectAllowed = 'copy';
      // Optional: Set a drag image
      // const dragImage = event.target.querySelector('.thumbnail');
      // if (dragImage) {
      //   event.dataTransfer.setDragImage(dragImage, 10, 10);
      // }
    };

    onMounted(() => {
      fetchLogos();
      // TODO: Listen for library updates
    });

    return {
      logos,
      loading,
      getAssetUrl,
      isImage,
      handleDragStart,
    };
  }
};
</script>

<style scoped>
.logo-gallery-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: var(--section-spacing);
  padding: var(--content-padding);
}

.gallery-item {
  background: var(--panel-header-bg);
  border-radius: var(--border-radius);
  border: 1px solid var(--border-color);
  overflow: hidden;
  cursor: grab;
  transition: all var(--transition-speed) ease;
  display: flex;
  flex-direction: column;
}

.gallery-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2), 0 0 15px var(--primary-glow);
  border-color: var(--primary-color);
}

.thumbnail-container {
  position: relative;
  aspect-ratio: 16 / 9;
  background-color: #000;
}

.thumbnail {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.hover-preview {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity var(--transition-speed) ease;
  font-size: 0.9rem;
  gap: 4px;
}

.gallery-item:hover .hover-preview {
  opacity: 1;
}

.logo-info {
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.logo-name {
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--text-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.artist-label {
  font-size: 0.7rem;
  color: var(--text-color-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.empty-state, .loading-indicator {
  /* Styles copied from ShareUploadLink, consider making a reusable component */
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  color: var(--text-color-muted);
  text-align: center;
  padding: 40px;
}

.empty-state-icon {
  font-size: 3.5rem;
  color: var(--primary-color);
  margin-bottom: 12px;
}

.loading-indicator svg {
  font-size: 2.5rem;
  color: var(--primary-color);
}

</style>
