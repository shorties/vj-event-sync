<template>
  <div class="logo-manager-container">
    <h2>Logo Management</h2>
    <div class="logo-manager-content">
      <!-- Left Column: Logo Grid & Actions -->
      <div class="logo-grid-section" :class="{ 'dragging-over': isDraggingOver }">
        <div class="grid-toolbar">
          <input 
            type="text" 
            v-model="searchQuery"
            placeholder="Search logos..."
            class="search-input"
          />
          <label class="show-archived-toggle">
             <input type="checkbox" v-model="showArchived" />
             Show Archived
          </label>
          <button class="btn-primary add-button" @click="triggerAddLogo">
            <i class="fas fa-plus"></i> Add Logos
          </button>
        </div>
        <div v-if="isLoading" class="loading-indicator">Loading logos...</div>
        <div v-else-if="error" class="error-message">Error loading logos: {{ error }}</div>
        <ul v-else-if="filteredLogos.length > 0" class="logo-grid">
          <li 
            v-for="logo in filteredLogos" 
            :key="logo.id"
            class="logo-grid-item"
            :class="{ 
                selected: selectedLogo && selectedLogo.id === logo.id,
                archived: logo.isArchived 
             }"
            @click="selectLogoForPreview(logo)"
          >
            <img :src="logo.thumbnailUrl" :alt="logo.name" class="logo-thumbnail" />
            <span class="logo-name">{{ logo.name }}</span>
            <span v-if="logo.isArchived" class="archived-badge"><i class="fas fa-archive"></i></span>
          </li>
        </ul>
        <div v-else class="empty-state">No {{ showArchived ? '' : 'active' }} logos found.</div>
      </div>
      
      <!-- Right Column: Preview & Details -->
      <div class="logo-preview-section">
        <div v-if="selectedLogo" class="preview-content">
          <h3>Logo Details</h3>
          <div class="preview-image-container">
             <span v-if="selectedLogo.isArchived" class="archived-overlay-badge">ARCHIVED</span>
            <img :src="selectedLogo.fullUrl" :alt="selectedLogo.name" class="preview-image" :class="{ archived: selectedLogo.isArchived }" />
          </div>
          <div class="preview-info">
            <input 
              type="text" 
              v-model="selectedLogo.name" 
              class="preview-name-input" 
              @change="updateLogoName(selectedLogo)" 
              :disabled="selectedLogo.isArchived"
            />
            <p class="preview-filename">Filename: {{ selectedLogo.fileName }}</p>
            <p v-if="selectedLogo.isArchived" class="archived-status-text">Status: Archived</p>
          </div>
          <div class="preview-actions">
             <button 
                v-if="!selectedLogo.isArchived"
                class="btn-secondary archive-button" 
                @click="archiveLogo(selectedLogo.id)"
              >
               <i class="fas fa-archive"></i> Archive
             </button>
             <button 
                v-if="selectedLogo.isArchived"
                class="btn-secondary unarchive-button" 
                @click="unarchiveLogo(selectedLogo.id)"
             >
               <i class="fas fa-box-open"></i> Unarchive
             </button>
             <button 
                class="btn-danger delete-button" 
                @click="confirmDeleteLogo(selectedLogo)"
                :title="selectedLogo.isArchived ? 'Delete Permanently' : 'Delete'"
              >
               <i class="fas fa-trash"></i> {{ selectedLogo.isArchived ? 'Delete Permanently' : 'Delete' }}
             </button>
          </div>
        </div>
        <div v-else class="no-selection-state">
          <p>Select a logo from the grid to see details and preview.</p>
        </div>
      </div>
    </div>
    
    <!-- Hidden File Input (kept for reference, using Tauri dialog) -->
    <input 
        type="file" 
        ref="fileInputRef" 
        @change="handleFilesSelected" 
        multiple 
        accept="image/png, image/jpeg, image/gif, image/svg+xml, image/webp" 
        style="display: none;"
      />
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { invoke } from '@tauri-apps/api/tauri';
import { open } from '@tauri-apps/api/dialog';
import { confirm } from '@tauri-apps/api/dialog';
import { listen } from '@tauri-apps/api/event';
import { type } from '@tauri-apps/api/os';

export default {
  name: 'Logos',
  setup() {
    const allLogos = ref([]);
    const searchQuery = ref('');
    const selectedLogo = ref(null);
    const isLoading = ref(false);
    const error = ref(null);
    const fileInputRef = ref(null); 
    const showArchived = ref(false);
    const isDraggingOver = ref(false);

    let unlistenDrop = null;
    let unlistenHover = null;
    let unlistenCancel = null;

    // --- Data Fetching ---
    const fetchLogos = async () => {
      isLoading.value = true;
      error.value = null;
      selectedLogo.value = null; 
      try {
        // *** TODO: Replace with actual Tauri command ***
        // const logosFromBackend = await invoke('fetch_logos', { includeArchived: true }); // Fetch all
        // allLogos.value = logosFromBackend;
        
        // Dummy data for now
        allLogos.value = [
          { id: 'l1', name: 'Main Event Logo', fileName: 'event_logo.png', thumbnailUrl: './assets/VJToolsRounded.ico', fullUrl: './assets/VJToolsRounded.ico', isArchived: false },
          { id: 'l2', name: 'Sponsor 1', fileName: 'sponsor_a.svg', thumbnailUrl: './assets/VJToolsRounded.ico', fullUrl: './assets/VJToolsRounded.ico', isArchived: false },
          { id: 'l3', name: 'Sponsor 2 Wide (Old)', fileName: 'sponsor_b_wide_old.png', thumbnailUrl: './assets/VJToolsRounded.ico', fullUrl: './assets/VJToolsRounded.ico', isArchived: true }, // Archived example
          { id: 'l4', name: 'Artist Logo', fileName: 'artist.png', thumbnailUrl: './assets/VJToolsRounded.ico', fullUrl: './assets/VJToolsRounded.ico', isArchived: false },
          { id: 'l5', name: 'Outdated Branding', fileName: 'old_brand.svg', thumbnailUrl: './assets/VJToolsRounded.ico', fullUrl: './assets/VJToolsRounded.ico', isArchived: true }, // Archived example
        ];
        console.log('Fetched logos (dummy):', allLogos.value);

      } catch (err) {
        console.error('Error fetching logos:', err);
        error.value = err.message || 'Failed to load logos.';
      } finally {
        isLoading.value = false;
      }
    };

    onMounted(fetchLogos);

    // --- Filtering & Selection ---
    const filteredLogos = computed(() => {
      let logos = allLogos.value;
      
      // Filter by archive status
      if (!showArchived.value) {
          logos = logos.filter(logo => !logo.isArchived);
      }
      
      // Filter by search query
      if (searchQuery.value) {
        const lowerQuery = searchQuery.value.toLowerCase();
        logos = logos.filter(logo => 
          logo.name.toLowerCase().includes(lowerQuery) ||
          logo.fileName.toLowerCase().includes(lowerQuery)
        );
      }
      return logos;
    });

    const selectLogoForPreview = (logo) => {
      selectedLogo.value = { ...logo }; // Clone 
      console.log('Selected logo:', selectedLogo.value)
    };

    // --- Logo Actions ---
    const triggerAddLogo = () => {
       open({
         multiple: true,
         filters: [{
           name: 'Images',
           extensions: ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp']
         }]
       }).then(selectedPaths => {
         if (selectedPaths && selectedPaths.length > 0) {
           addLogos(selectedPaths);
         }
       }).catch(err => {
         console.error("Error opening file dialog:", err);
       });
    };
    
    const addLogos = async (paths) => {
      const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'];
      const validImagePaths = paths.filter(path => 
         imageExtensions.some(ext => path.toLowerCase().endsWith(ext))
      );
      
      if (validImagePaths.length === 0) {
          console.log("No valid image files found in dropped/selected items.");
          return;
      }
      
      isLoading.value = true; 
      error.value = null;
      console.log("Adding valid logos from paths:", validImagePaths);
      try {
        // *** TODO: Implement Tauri 'add_logo' command ***
        for (const path of validImagePaths) {
           console.log(`Invoking add_logo for: ${path}`);
           // const newLogo = await invoke('add_logo', { filePath: path });
           // allLogos.value.push(newLogo);
           
           // Dummy addition
           const dummyId = `new_${Date.now()}_${Math.random().toString(16).slice(2)}`;
           const dummyName = path.split(/[\\/]/).pop() || 'New Logo'; 
           allLogos.value.push({
             id: dummyId,
             name: dummyName,
             fileName: dummyName,
             thumbnailUrl: './assets/VJToolsRounded.ico', 
             fullUrl: './assets/VJToolsRounded.ico', 
             isArchived: false 
           });
        }
        // await fetchLogos(); // Re-fetch if backend updated centrally

      } catch (err) {
        console.error('Error adding logo(s):', err);
        error.value = err.message || 'Failed to add logo(s).';
      } finally {
         isLoading.value = false;
      }
    };
    
    const updateLogoName = async (logoToUpdate) => {
        if (logoToUpdate.isArchived) return; 
        console.log("Attempting to update name for logo:", logoToUpdate.id, "New name:", logoToUpdate.name);
         // *** TODO: Implement Tauri 'update_logo_metadata' command ***
         try {
            // await invoke('update_logo_metadata', { logoId: logoToUpdate.id, updates: { name: logoToUpdate.name } });
            const index = allLogos.value.findIndex(logo => logo.id === logoToUpdate.id);
            if (index !== -1) {
                allLogos.value[index].name = logoToUpdate.name;
            }
         } catch (err) {
             console.error('Error updating logo name:', err);
             error.value = "Failed to update logo name.";
             const index = allLogos.value.findIndex(logo => logo.id === logoToUpdate.id);
             if (index !== -1 && selectedLogo.value) selectedLogo.value.name = allLogos.value[index].name; // Revert UI
         }
    };

    const archiveLogo = async (logoId) => {
      console.log(`Archiving logo: ${logoId}`);
       // *** TODO: Implement Tauri 'update_logo_status' command ***
       try {
          // await invoke('update_logo_status', { logoId: logoId, status: 'archived' });
          const index = allLogos.value.findIndex(logo => logo.id === logoId);
          if (index !== -1) {
              allLogos.value[index].isArchived = true;
              if (selectedLogo.value && selectedLogo.value.id === logoId) {
                  selectedLogo.value.isArchived = true;
              }
          }
       } catch (err) {
          console.error('Error archiving logo:', err);
          error.value = "Failed to archive logo.";
       }
    };
    
    const unarchiveLogo = async (logoId) => {
       console.log(`Unarchiving logo: ${logoId}`);
       // *** TODO: Implement Tauri 'update_logo_status' command ***
       try {
          // await invoke('update_logo_status', { logoId: logoId, status: 'active' });
          const index = allLogos.value.findIndex(logo => logo.id === logoId);
          if (index !== -1) {
              allLogos.value[index].isArchived = false;
              if (selectedLogo.value && selectedLogo.value.id === logoId) {
                  selectedLogo.value.isArchived = false;
              }
          }
       } catch (err) {
          console.error('Error unarchiving logo:', err);
          error.value = "Failed to unarchive logo.";
       }
    };

    const confirmDeleteLogo = async (logoToDelete) => {
      if (!logoToDelete) return;
      const isPermanent = logoToDelete.isArchived;
      const message = isPermanent 
          ? `Permanently delete the archived logo "${logoToDelete.name}"? This cannot be undone.`
          : `Delete the logo "${logoToDelete.name}"? It will be moved to the archive.`;
      const confirmationTitle = isPermanent ? 'Confirm Permanent Deletion' : 'Confirm Deletion';
      
      const yes = await confirm(message, { title: confirmationTitle, type: 'warning' });
         
      if (yes) {
        if (isPermanent) {
          deleteLogoPermanently(logoToDelete.id);
        } else {
          archiveLogo(logoToDelete.id);
        }
      }
    };

    const deleteLogoPermanently = async (logoId) => {
      isLoading.value = true;
      error.value = null;
      try {
        // *** TODO: Implement Tauri 'delete_logo_permanently' command ***
        console.log(`Permanently deleting logo with ID: ${logoId}`);
        allLogos.value = allLogos.value.filter(logo => logo.id !== logoId);
        if (selectedLogo.value && selectedLogo.value.id === logoId) {
            selectedLogo.value = null; 
        }
      } catch (err) {
        console.error('Error permanently deleting logo:', err);
        error.value = err.message || 'Failed to permanently delete logo.';
      } finally {
        isLoading.value = false;
      }
    };

    // --- Lifecycle Hooks for Drag & Drop Listener ---
    onMounted(async () => {
      await fetchLogos(); // Fetch initial data
      
      console.log("Setting up file drop listeners...");
      try {
        // Listen for files being dropped onto the window
        unlistenDrop = await listen('tauri://file-drop', event => {
          console.log('File(s) dropped:', event.payload);
          isDraggingOver.value = false; // Ensure drag indicator is turned off
          addLogos(event.payload); // Pass the array of paths
        });
        
        // Listen for hover events for UI feedback
        unlistenHover = await listen('tauri://file-drop-hover', () => {
            console.log("File drag hover START");
            isDraggingOver.value = true;
        });
        
        // Listen for drag cancelled or end (leaving window)
        unlistenCancel = await listen('tauri://file-drop-cancelled', () => {
            console.log("File drag hover END");
            isDraggingOver.value = false;
        });

      } catch(e) {
          console.error("Failed to set up file drop listeners:", e);
          error.value = "Could not initialize file drag and drop.";
      }
    });

    onUnmounted(() => {
        console.log("Cleaning up file drop listeners...");
      // Cleanup the listeners when the component is unmounted
      if (unlistenDrop) unlistenDrop();
      if (unlistenHover) unlistenHover();
      if (unlistenCancel) unlistenCancel();
    });

    // --- Keep handleFilesSelected if needed for fallback/other purposes ---
    const handleFilesSelected = (event) => {
        console.warn("handleFilesSelected called, but OS drag-and-drop or Tauri dialog are preferred.");
        const files = event.target.files;
        if (files && files.length > 0) {
            // If you need to handle File objects instead of paths:
            // 1. You might need to read them using FileReader
            // 2. Or pass the FileList to a backend function that can handle them.
            // For now, this function does nothing practical with OS D&D setup.
            console.log("Files selected via input:", files);
        }
        if (fileInputRef.value) fileInputRef.value.value = null;
    };

    return {
      allLogos,
      searchQuery,
      filteredLogos,
      selectedLogo,
      selectLogoForPreview,
      isLoading,
      error,
      triggerAddLogo,
      handleFilesSelected, 
      fileInputRef,
      confirmDeleteLogo,
      updateLogoName,
      showArchived, 
      archiveLogo, 
      unarchiveLogo,
      isDraggingOver
    };
  }
};
</script>

<style scoped>
/* Keep previous styles and add/modify these */

.grid-toolbar {
  /* Adjust layout for checkbox */
  display: flex;
  flex-wrap: wrap; /* Allow wrapping on smaller screens */
  align-items: center;
  gap: 10px;
  margin-bottom: 1rem;
  flex-shrink: 0;
}

.show-archived-toggle {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-left: auto; /* Push to the right */
  white-space: nowrap;
  cursor: pointer;
}

.add-button {
  margin-left: 10px; /* Add space if not wrapping */
}

.logo-grid-item {
  position: relative; /* For badge positioning */
  /* ... keep existing styles ... */
}

.logo-grid-item.archived {
  opacity: 0.6;
  /* filter: grayscale(80%); */ /* Optional: make it grayscale */
}

.logo-grid-item.archived:hover {
  opacity: 0.8;
  /* filter: grayscale(0%); */
}

.archived-badge {
  position: absolute;
  top: 5px;
  right: 5px;
  background-color: rgba(0, 0, 0, 0.6);
  color: #ccc;
  padding: 2px 5px;
  border-radius: 3px;
  font-size: 0.7rem;
}

.preview-image-container {
  position: relative; /* For overlay badge */
  /* ... keep existing styles ... */
}

.archived-overlay-badge {
  position: absolute;
  top: 10px;
  left: 10px;
  background-color: var(--error-color);
  color: white;
  padding: 3px 8px;
  font-size: 0.8rem;
  font-weight: bold;
  border-radius: 4px;
  z-index: 1;
}

.preview-image.archived {
   opacity: 0.7;
}

.preview-info {
  /* ... keep existing styles ... */
}

.preview-name-input:disabled {
  background-color: transparent;
  border-color: transparent;
  color: rgba(var(--text-color-rgb), 0.8); /* Slightly dimmer */
  cursor: not-allowed;
}

.archived-status-text {
  color: var(--error-color); /* Or a warning color */
  font-size: 0.9rem;
  font-weight: bold;
  text-align: center;
  margin-top: 0.5rem;
}

.preview-actions {
  /* ... keep existing styles ... */
  justify-content: space-between; /* Space out buttons */
}

.delete-button {
  /* Already styled as btn-danger */
}

.archive-button,
.unarchive-button {
  /* Already styled as btn-secondary */
}


/* Responsive Adjustments */
@media (max-width: 600px) {
   /* ... keep previous 600px styles ... */
   .grid-toolbar {
       flex-direction: column;
       align-items: stretch;
   }
   .show-archived-toggle {
       margin-left: 0; /* Align left when stacked */
       justify-content: center;
       padding: 5px 0;
   }
   .add-button {
      margin-left: 0;
   }
}

/* Left Column */
.logo-grid-section {
  flex: 1; /* Allow grid to take available space */
  display: flex;
  flex-direction: column;
  overflow: hidden; /* Contain grid */
  min-width: 300px; /* Minimum width */
  border: 2px dashed transparent; /* Add base for drag-over style */
  transition: border-color 0.3s ease, background-color 0.3s ease; /* Animate feedback */
}

.logo-grid-section.dragging-over {
  border-color: var(--primary-color); /* Highlight border */
  background-color: rgba(var(--primary-color-rgb), 0.1); /* Highlight background */
}

.grid-toolbar {
  display: flex;
  flex-wrap: wrap; /* Allow wrapping on smaller screens */
  align-items: center;
  gap: 10px;
  margin-bottom: 1rem;
  flex-shrink: 0;
}

</style> 