<template>
  <div class="logo-manager-container">
    
    <!-- Toolbar for View Toggles -->
    <div class="logo-discovery-toolbar">
      <h4>View Panels:</h4>
      <button 
        class="btn-toggle" 
        :class="{ active: showArtistsPane }" 
        @click="showArtistsPane = !showArtistsPane"
        title="Toggle Artists Panel"
      >
        <font-awesome-icon icon="fa-solid fa-users" /> Artists
      </button>
      <button 
        class="btn-toggle" 
        :class="{ active: showGalleryPane }" 
        @click="showGalleryPane = !showGalleryPane"
        title="Toggle Logo Gallery Panel"
      >
        <font-awesome-icon icon="fa-solid fa-th-large" /> Gallery
      </button>
      <button 
        class="btn-toggle" 
        :class="{ active: showExplorerPane }" 
        @click="showExplorerPane = !showExplorerPane"
        title="Toggle File Explorer Panel"
      >
        <font-awesome-icon icon="fa-solid fa-folder-open" /> Explorer
      </button>
      <!-- Add Save/Load Layout buttons here later if needed -->
    </div>

    <!-- Gridstack Layout Area -->
    <div class="grid-stack logo-discovery-grid"> 
      
      <!-- Artists Pane -->
      <div v-show="showArtistsPane" class="grid-stack-item" gs-id="artists-pane" gs-x="0" gs-y="0" gs-w="3" gs-h="12">
        <div class="grid-stack-item-content section artists-section">
           <div class="section-header">
             <div class="drag-handle" title="Move Panel"><font-awesome-icon icon="fa-solid fa-ellipsis-h" /></div>
             <h4 class="section-title"><font-awesome-icon icon="fa-solid fa-users" /> Artists</h4>
             <div class="section-controls">
                <button class="control-button" @click="showArtistsPane = false" title="Hide Panel">
                  <font-awesome-icon icon="fa-solid fa-times" />
                </button>
             </div>
           </div>
           <div class="section-body">
             <!-- Placeholder for artist list -->
             <p>Artist list will go here.</p>
             <!-- TODO: Implement artist fetching and list rendering -->
             <!-- Clicking an artist should filter the gallery -->
           </div>
        </div>
      </div>

      <!-- Logo Gallery Pane -->
      <div v-show="showGalleryPane" class="grid-stack-item" gs-id="gallery-pane" gs-x="3" gs-y="0" gs-w="6" gs-h="12">
         <div class="grid-stack-item-content section logo-grid-section" :class="{ 'dragging-over': isDraggingOver }">
           <div class="section-header">
             <div class="drag-handle" title="Move Panel"><font-awesome-icon icon="fa-solid fa-ellipsis-h" /></div>
             <h4 class="section-title"><font-awesome-icon icon="fa-solid fa-th-large" /> Logo Gallery</h4>
             <div class="section-controls">
               <button class="control-button" @click="showGalleryPane = false" title="Hide Panel">
                 <font-awesome-icon icon="fa-solid fa-times" />
               </button>
             </div>
           </div>
           <div class="section-body">
             <div class="grid-toolbar">
               <input 
                 type="text" 
                 v-model="searchQuery"
                 placeholder="Search gallery..."
                 class="search-input"
               />
               <label class="show-archived-toggle">
                  <input type="checkbox" v-model="showArchived" />
                  Show Archived
               </label>
               <button class="btn-primary add-button" @click="triggerAddLogo" title="Add logos using file dialog">
                 <font-awesome-icon icon="fa-solid fa-plus" /> Add Via Dialog
               </button>
             </div>
             <div v-if="isLoading" class="loading-indicator">Loading logos...</div>
             <div v-else-if="error" class="error-message">Error loading logos: {{ error }}</div>
             <ul v-else-if="filteredLogos.length > 0" class="logo-grid">
               <li 
                 v-for="logo in filteredLogos" 
                 :key="logo.id"
                 class="logo-grid-item"
                 :class="{ archived: logo.isArchived }"
                 @click="selectLogoForPreview(logo)" 
                 draggable="true" 
                 @dragstart="handleLogoDragStart(logo, $event)"
               >
                 <img :src="logo.thumbnailUrl" :alt="logo.name" class="logo-thumbnail" />
                 <span class="logo-name">{{ logo.name }}</span>
                 <span v-if="logo.isArchived" class="archived-badge"><font-awesome-icon icon="fa-solid fa-archive" /></span>
               </li>
             </ul>
             <div v-else class="empty-state">Gallery is empty. Drag files here to add.</div>
             <!-- Preview/Details section removed from here for simplicity -->
           </div>
         </div>
      </div>

      <!-- File Explorer Pane -->
       <div v-show="showExplorerPane" class="grid-stack-item" gs-id="explorer-pane" gs-x="9" gs-y="0" gs-w="3" gs-h="12">
         <div class="grid-stack-item-content section explorer-section">
            <div class="section-header">
             <div class="drag-handle" title="Move Panel"><font-awesome-icon icon="fa-solid fa-ellipsis-h" /></div>
             <h4 class="section-title"><font-awesome-icon icon="fa-solid fa-folder-open" /> File Explorer</h4>
             <div class="section-controls">
               <button class="control-button" @click="showExplorerPane = false" title="Hide Panel">
                 <font-awesome-icon icon="fa-solid fa-times" />
               </button>
             </div>
           </div>
            <FileExplorer class="section-body" /> 
         </div>
       </div>

    </div> <!-- End Gridstack -->
    
    <!-- Hidden File Input -->
    <input type="file" ref="fileInputRef" @change="handleFilesSelected" multiple accept="image/png, image/jpeg, image/gif, image/svg+xml, image/webp" style="display: none;"/>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'; // Added nextTick
import { invoke } from '@tauri-apps/api/tauri';
import { open } from '@tauri-apps/api/dialog';
import { confirm } from '@tauri-apps/api/dialog';
import { listen } from '@tauri-apps/api/event';
import { type } from '@tauri-apps/api/os';
import FileExplorer from './FileExplorer.vue'; 

// Import Gridstack
import 'gridstack/dist/gridstack.min.css';
import { GridStack } from 'gridstack';

export default {
  name: 'Logos',
  components: { 
    FileExplorer 
  },
  setup() {
    // --- View State ---
    const showArtistsPane = ref(false);
    const showGalleryPane = ref(true); // Show gallery by default
    const showExplorerPane = ref(false);
    
    // --- Gridstack Ref ---
    const grid = ref(null);

    // --- Existing State ---
    const allLogos = ref([]);
    const searchQuery = ref('');
    const selectedLogo = ref(null); // Still needed for potential actions, even without preview pane
    const isLoading = ref(false);
    const error = ref(null);
    const fileInputRef = ref(null);
    const showArchived = ref(false);
    const isDraggingOver = ref(false); // For drop zone on gallery

    // --- Event Listener Cleanup Refs ---
    let unlistenDrop = null;
    let unlistenHover = null;
    let unlistenCancel = null;

    // --- Data Fetching & Filtering (Keep existing logic) ---
    const fetchLogos = async () => {
      console.log('Starting fetchLogos...');
      isLoading.value = true;
      error.value = null;
      selectedLogo.value = null; 
      try {
        // *** TODO: Replace with actual Tauri command ***
        // const logosFromBackend = await invoke('fetch_logos', { includeArchived: true }); // Fetch all
        // allLogos.value = logosFromBackend;
        
        // Dummy data for now
        allLogos.value = [
          { id: 'l1', name: 'Main Event Logo', fileName: 'event_logo.png', thumbnailUrl: 'http://localhost:3002/favicon.svg', fullUrl: 'http://localhost:3002/favicon.svg', isArchived: false },
          { id: 'l2', name: 'Sponsor 1', fileName: 'sponsor_a.svg', thumbnailUrl: 'http://localhost:3002/favicon.svg', fullUrl: 'http://localhost:3002/favicon.svg', isArchived: false },
          { id: 'l3', name: 'Sponsor 2 Wide (Old)', fileName: 'sponsor_b_wide_old.png', thumbnailUrl: 'http://localhost:3002/favicon.svg', fullUrl: 'http://localhost:3002/favicon.svg', isArchived: true }, // Archived example
          { id: 'l4', name: 'Artist Logo', fileName: 'artist.png', thumbnailUrl: 'http://localhost:3002/favicon.svg', fullUrl: 'http://localhost:3002/favicon.svg', isArchived: false },
          { id: 'l5', name: 'Outdated Branding', fileName: 'old_brand.svg', thumbnailUrl: 'http://localhost:3002/favicon.svg', fullUrl: 'http://localhost:3002/favicon.svg', isArchived: true }, // Archived example
        ];
        console.log('Fetched logos (dummy):', allLogos.value);
        console.log('Current showArchived state:', showArchived.value);
        console.log('Current searchQuery:', searchQuery.value);

      } catch (err) {
        console.error('Error fetching logos:', err);
        error.value = err.message || 'Failed to load logos.';
      } finally {
        isLoading.value = false;
        console.log('fetchLogos completed. isLoading:', isLoading.value);
      }
    };

    const filteredLogos = computed(() => {
      console.log('Computing filteredLogos...');
      console.log('allLogos length:', allLogos.value.length);
      console.log('showArchived:', showArchived.value);
      console.log('searchQuery:', searchQuery.value);
      
      let logos = allLogos.value;
      
      // Filter by archive status
      if (!showArchived.value) {
          logos = logos.filter(logo => !logo.isArchived);
          console.log('After archive filter:', logos.length);
      }
      
      // Filter by search query
      if (searchQuery.value) {
        const lowerQuery = searchQuery.value.toLowerCase();
        logos = logos.filter(logo => 
          logo.name.toLowerCase().includes(lowerQuery) ||
          logo.fileName.toLowerCase().includes(lowerQuery)
        );
        console.log('After search filter:', logos.length);
      }
      return logos;
    });

    // --- Logo Actions (Keep existing logic) ---
    // Preview selection logic might need adjustment later if we reintroduce preview
    const selectLogoForPreview = (logo) => { 
        console.log("Selected logo (no preview pane currently):", logo);
        selectedLogo.value = { ...logo }; 
    };
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
           const dummyName = path.split(/[\/]/).pop() || 'New Logo'; 
           allLogos.value.push({
             id: dummyId,
             name: dummyName,
             fileName: dummyName,
             thumbnailUrl: '/favicon.svg', 
             fullUrl: '/favicon.svg', 
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
    
    // --- Drag Handlers ---
    const handleLogoDragStart = (logo, event) => {
      const dataToTransfer = { 
        source: 'gallery',
        type: 'logo', 
        id: logo.id, 
        name: logo.name,
        filePath: logo.fullUrl // Ensure this is the correct property for the full path
      };
      console.log('[Logos.vue] Drag Start - Transferring Data:', dataToTransfer);
      event.dataTransfer.setData('application/json', JSON.stringify(dataToTransfer));
      event.dataTransfer.effectAllowed = 'copy';
    };

    // --- Initialize Gridstack ---
    const initGrid = () => {
       console.log('Initializing Gridstack...');
       try {
         grid.value = GridStack.init({
           cellHeight: 'auto', // Or a fixed height if preferred
           margin: 5,
           disableOneColumnMode: true,
           float: true, // Allow items to float
           removable: false, // Don't allow removing items via Gridstack UI
           draggable: { 
              handle: '.drag-handle', // Use the icon in the header
              scroll: false, // Prevent page scroll while dragging items
              appendTo: 'body', // Drag helper appended to body
           },
           resizable: {
              handles: 'e, se, s, sw, w' // Allow resizing on most edges/corners
           }
         });
         console.log('Gridstack initialized successfully:', grid.value);
         
         // Add change event listener
         grid.value.on('change', (event, items) => {
           console.log('Grid layout changed:', items);
         });
       } catch (error) {
         console.error('Error initializing Gridstack:', error);
       }
    };

    // --- Lifecycle Hooks --- 
    onMounted(async () => {
      console.log('Logos.vue: Mounting...');
      try {
        await fetchLogos(); // Explicitly await fetch
        console.log('Logos.vue: fetchLogos completed. allLogos count:', allLogos.value.length);
        console.log('Logos.vue: filteredLogos count:', filteredLogos.value.length);

        await nextTick(); // Ensure DOM is updated after fetch
        console.log('Logos.vue: DOM updated, initializing grid...');
        initGrid();
        console.log('Logos.vue: Grid initialized.');

      } catch (mountError) {
        console.error('Logos.vue: Error during mount:', mountError);
        error.value = 'Failed to initialize Logos component.';
      }
    });

    onUnmounted(() => {
      // Cleanup Gridstack
      if (grid.value) {
         grid.value.destroy();
      }
      console.log('Logos component unmounted, listeners detached.');
    });

    return {
      // View State
      showArtistsPane,
      showGalleryPane,
      showExplorerPane,
      // Existing State & Logic (filtered/trimmed)
      allLogos,
      searchQuery,
      filteredLogos,
      // selectedLogo, // Keep if needed for actions
      // selectLogoForPreview, // Keep if needed for actions
      isLoading,
      error,
      triggerAddLogo,
      handleFilesSelected: () => {}, // Dummy
      fileInputRef,
      // updateLogoName, // Re-add when actions are implemented
      // archiveLogo,
      // unarchiveLogo,
      // confirmDeleteLogo,
      showArchived,
      isDraggingOver, 
      handleLogoDragStart 
    };
  }
};
</script>

<style scoped>
/* Import base variables if not global */
/* @import '../styles/variables.css'; */

/* Add missing CSS variables */
:root {
  --background-color: #0d0d0d;
  --text-color: #ffffff;
  --text-color-muted: rgba(255, 255, 255, 0.7);
  --primary-color: #2196f3;
  --secondary-color: #1a1a1a;
  --border-color: #333333;
  --button-bg: #2a2a2a;
  --button-hover-bg: #333333;
  --border-radius: 4px;
  --transition-speed: 0.2s;
}

.logo-manager-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--background-color);
  color: var(--text-color);
}

.logo-discovery-toolbar {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  gap: 10px;
  background-color: var(--secondary-color);
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.logo-discovery-toolbar h4 {
  margin-right: 15px;
  font-size: 0.9em;
  opacity: 0.7;
}

.btn-toggle {
  padding: 5px 12px;
  background-color: var(--button-bg);
  color: var(--text-color-muted);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  cursor: pointer;
  transition: all var(--transition-speed) ease;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9em;
}

.btn-toggle:hover {
  background-color: var(--button-hover-bg);
  color: var(--text-color);
}

.btn-toggle.active {
  background-color: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

/* Gridstack Area */
.logo-discovery-grid {
  flex: 1; /* Take remaining space */
  overflow: hidden; /* Important for gridstack */
  background-color: #0d0d0d; /* Darker background for contrast */
}

/* Gridstack Item Content Styling */
.grid-stack-item-content {
  background-color: var(--secondary-color); /* Panel background */
  border-radius: var(--border-radius);
  overflow: hidden; /* Important for content within */
  display: flex;
  flex-direction: column;
  height: 100%;
  color: var(--text-color);
  position: relative; /* Needed for absolute positioning inside */
}

.section {
    /* Base styles from NowPlaying */
}
.section-header {
    display: flex;
    align-items: center;
    padding: 6px 10px; /* Slightly smaller padding */
    background-color: rgba(0, 0, 0, 0.2);
    border-bottom: 1px solid var(--border-color);
    flex-shrink: 0;
}
.section-title {
    flex-grow: 1;
    margin: 0;
    font-size: 0.9em; /* Smaller title */
    text-transform: uppercase;
    opacity: 0.9;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: flex;
    align-items: center;
    gap: 6px;
}
.drag-handle {
    /* Style copied/adapted from NowPlaying */
    cursor: move;
    color: var(--text-color-muted);
    padding: 0 8px 0 0; 
    margin-right: 8px; 
    opacity: 0.5; 
    transition: opacity var(--transition-speed);
    line-height: 1;
    font-size: 1.1em;
    z-index: 1;
}
.grid-stack-item-content:hover .drag-handle { opacity: 1; }

.section-controls {
    display: flex;
    gap: 5px;
}
.control-button {
    /* Basic control button style - adapt from NowPlaying if needed */
    padding: 2px 5px;
    background: transparent;
    border: none;
    color: var(--text-color-muted);
    cursor: pointer;
    border-radius: 3px;
    font-size: 0.9em;
}
.control-button:hover {
  background-color: var(--button-hover-bg);
  color: var(--text-color);
}

.section-body {
    flex-grow: 1;
    overflow-y: auto; /* Allow scrolling within panels */
    overflow-x: hidden;
    padding: 10px; /* Default padding */
}

/* Specific Pane Styles */
.artists-section .section-body {
   /* Specific styles for artist list */
}

.logo-grid-section .section-body {
   padding: 0; /* Toolbar and grid handle padding */
   display: flex;
   flex-direction: column;
}
.logo-grid-section .grid-toolbar {
   padding: 10px;
   border-bottom: 1px solid var(--border-color);
   /* Styles copied/adapted from before */
   display: flex;
   flex-wrap: wrap; 
   align-items: center;
   gap: 10px;
   flex-shrink: 0;
}
.logo-grid-section .search-input { /* Ensure it fits */ }
.logo-grid-section .show-archived-toggle { /* Styles */ }
.logo-grid-section .add-button { /* Styles */ }

.logo-grid {
  /* Styles copied/adapted from before */
  list-style: none;
  padding: 10px;
  margin: 0;
  flex-grow: 1;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); /* Increased min size */
  gap: 15px;
  background: #1a1a1a; /* Explicit dark background */
}
.logo-grid-item {
  /* Styles copied/adapted from before */
  background-color: #2a2a2a; /* Explicit background */
  border: 1px solid #333; /* Added border */
  border-radius: 6px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  cursor: grab;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}
.logo-grid-item:hover { 
  background-color: #333333;
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
}
.logo-thumbnail { 
  width: 100%; 
  height: 80px; /* Increased height */
  object-fit: contain; 
  margin-bottom: 8px;
  background: #222; /* Dark background for transparent images */
  padding: 8px;
  border-radius: 4px;
}
.logo-name { 
  font-size: 0.9em; /* Increased size */
  line-height: 1.3;
  width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #fff; /* Explicit text color */
}
.archived-badge { 
  position: absolute;
  top: 5px;
  right: 5px;
  font-size: 0.8em;
  opacity: 0.7;
  background: rgba(0,0,0,0.5);
  padding: 3px;
  border-radius: 3px;
}

/* Add explicit colors for the toolbar */
.grid-toolbar {
  background: #1a1a1a;
  border-bottom: 1px solid #333;
  padding: 12px;
}

.search-input {
  background: #2a2a2a;
  border: 1px solid #333;
  color: #fff;
  padding: 6px 12px;
  border-radius: 4px;
  min-width: 200px;
}

.show-archived-toggle {
  color: #fff;
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-primary {
  background: #2a2a2a;
  border: 1px solid #333;
  color: #fff;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary:hover {
  background: #333;
}

/* Make sure the section is visible */
.logo-grid-section {
  background: #1a1a1a !important;
  border: 1px solid #333;
}

.section-header {
  background: #2a2a2a !important;
  border-bottom: 1px solid #333;
}

.section-title {
  color: #fff !important;
}

/* Explorer Pane */
.explorer-section .section-body {
  padding: 0; /* FileExplorer handles its own padding */
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.file-explorer {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Gridstack handle styling (copied from NowPlaying.vue) */
/* --- COPY REVISED HANDLE STYLES HERE --- */
/* Base handle - transparent clickable area */
.grid-stack-item > .ui-resizable-handle { background: transparent; border: none; position: absolute; z-index: 20; width: 16px; height: 16px; }
/* Positioning */
.grid-stack-item > .ui-resizable-e { cursor: ew-resize; width: 10px; height: 100%; top: 0; right: -5px; }
.grid-stack-item > .ui-resizable-w { cursor: ew-resize; width: 10px; height: 100%; top: 0; left: -5px; }
.grid-stack-item > .ui-resizable-s { cursor: ns-resize; height: 10px; width: 100%; left: 0; bottom: 0; }
.grid-stack-item > .ui-resizable-n { cursor: ns-resize; height: 10px; width: 100%; left: 0; top: -5px; }
.grid-stack-item > .ui-resizable-se { cursor: nwse-resize; bottom: -5px; right: -5px; }
.grid-stack-item > .ui-resizable-sw { cursor: nesw-resize; bottom: -5px; left: -5px; }
.grid-stack-item > .ui-resizable-ne { cursor: nesw-resize; top: -5px; right: -5px; }
.grid-stack-item > .ui-resizable-nw { cursor: nwse-resize; top: -5px; left: -5px; }
/* Visual lines/corners using ::before and ::after */
.grid-stack-item > .ui-resizable-handle::before, .grid-stack-item > .ui-resizable-handle::after { content: ''; position: absolute; background-color: var(--text-color-muted); opacity: 0; transition: opacity 0.15s ease-in-out; border-radius: 1px; }
/* Show lines on handle hover */
.grid-stack-item > .ui-resizable-handle:hover::before, .grid-stack-item > .ui-resizable-handle:hover::after { opacity: 0.9; }
/* Edge Line Styles (100% length) */
.grid-stack-item > .ui-resizable-e::after, .grid-stack-item > .ui-resizable-w::after { top: 0; height: 100%; width: 3px; }
.grid-stack-item > .ui-resizable-e::after { right: 1px; } 
.grid-stack-item > .ui-resizable-w::after { left: 1px; } 
.grid-stack-item > .ui-resizable-s::after, .grid-stack-item > .ui-resizable-n::after { left: 0; width: 100%; height: 3px; }
.grid-stack-item > .ui-resizable-s::after { bottom: 0; }
.grid-stack-item > .ui-resizable-n::after { top: 1px; } 
/* Corner Styles (Keep existing logic if needed) */
/* ... */


</style> 