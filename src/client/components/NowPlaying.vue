<template>
  <div class="live-control-container">
    <!-- I. Top Bar: Now Showing + Time -->
    <div class="top-bar">
      <div class="now-showing-title">NOW SHOWING</div>
      <div class="now-showing-preview">
        <!-- Placeholder for large preview -->
        <div class="preview-content">
           {{ currentlyShowing?.name || '...' }}
        </div>
        <div class="progress-bar-container">
          <div class="progress-bar" :style="{ width: currentlyShowing?.progress + '%' || '0%' }"></div>
        </div>
      </div>
      <div :class="['system-time', timeUrgencyClass]">
        {{ currentTime }}
      </div>
    </div>

    <!-- II. Main Content: GRIDSTACK LAYOUT -->
    <div class="grid-stack main-content-grid">
      <!-- Gridstack items wrap the sections -->
      <!-- NOTE: Initial gs-x, gs-y, gs-w, gs-h define the default layout -->

      <div class="grid-stack-item" gs-id="cycle" gs-x="0" gs-y="0" gs-w="8" gs-h="3">
        <div class="grid-stack-item-content section cycle-section">
          <h4 class="section-title">CYCLE</h4>
          <div class="item-container horizontal-scroll">
            <div v-if="loading.cycle">Loading...</div>
            <div v-else-if="errors.cycle" class="error">{{ errors.cycle }}</div>
            <div v-else-if="!cycleItems.length" class="empty">Empty Cycle</div>
            <div v-else v-for="item in cycleItems" 
                 :key="item.id" 
                 :class="['item-box cycle-item', item.status, { 
                     active: currentlyShowing?.id === item.id && currentlyShowing?.type === 'cycle', 
                     selected: selectedItem?.id === item.id,
                     expanded: selectedItem?.id === item.id
                 }]" 
                 @click="toggleSelectItem(item)">
              <div class="item-content">
                  <span v-if="item.status === 'scheduled'" class="icon lock-icon">🔒</span>
                  {{ item.name }}
              </div>
               <div class="progress-bar-container" v-if="item.status === 'cycle'"> 
                  <div class="progress-bar" :style="{ width: (currentlyShowing?.id === item.id ? currentlyShowing?.progress : 0) + '%' }"></div>
               </div>
               <!-- Expanded Details -->
               <div class="item-details" v-if="selectedItem?.id === item.id">
                   <h5>Settings for {{ item.name }}</h5>
                   <p>Placeholder for transition, timing, etc.</p>
                   <button @click.stop="actionPlaceholder(item)">Action</button> 
               </div>
            </div>
          </div>
        </div>
      </div>

      <div class="grid-stack-item" gs-id="gallery" gs-x="0" gs-y="3" gs-w="8" gs-h="9">
        <div class="grid-stack-item-content section gallery-section">
          <h4 class="section-title">LOGO GALLERY <span v-if="galleryFilter">({{ galleryFilter }})</span></h4>
          <div class="item-container gallery-grid">
             <div v-if="loading.gallery">Loading...</div>
             <div v-else-if="errors.gallery" class="error">{{ errors.gallery }}</div>
             <div v-else-if="!filteredGalleryItems.length" class="empty">Empty Gallery</div>
             <div v-else v-for="logo in filteredGalleryItems" 
                  :key="logo.id" 
                  :class="['item-box gallery-item', getGalleryItemStatusClass(logo), { 
                      selected: selectedItem?.id === logo.id,
                      expanded: selectedItem?.id === logo.id
                  }]" 
                  @click="toggleSelectItem(logo)">
               <div class="item-content">{{ logo.name }}</div>
               <!-- Add progress bar if logo is active in cycle -->
               <div class="progress-bar-container" v-if="isLogoActiveInCycle(logo.id)">
                 <div class="progress-bar" :style="{ width: (currentlyShowing?.id === logo.id && currentlyShowing?.type === 'cycle' ? currentlyShowing?.progress : 0) + '%' }"></div>
               </div>
               <!-- Expanded Details -->
               <div class="item-details" v-if="selectedItem?.id === logo.id">
                   <h5>Settings for {{ logo.name }}</h5>
                   <p>Link to DJs: {{ logo.linked_djs?.join(', ') || 'None' }}</p>
                   <p>File: {{ logo.file_path }}</p>
                   <button @click.stop="actionPlaceholder(logo)">Action</button> 
               </div>
             </div>
          </div>
        </div>
      </div>
      
      <div class="grid-stack-item" gs-id="schedule" gs-x="8" gs-y="0" gs-w="4" gs-h="12">
        <div class="grid-stack-item-content section schedule-section">
           <h4 class="section-title">SCHEDULE</h4>
           <div class="schedule-list-container">
              <div v-if="loading.schedule">Loading...</div>
              <div v-else-if="errors.schedule" class="error">{{ errors.schedule }}</div>
              <div v-else-if="!scheduleItems.length" class="empty">No Schedule</div>
              <ul v-else class="schedule-list">
                <li v-for="event in scheduleItems" 
                    :key="event.id" 
                    :class="{ selected: selectedItem?.id === event.id }" 
                    @click="toggleSelectItem(event)">
                  <span class="time">{{ formatScheduleTime(event.time) }}</span> 
                  <span class="name">{{ event.name }}</span>
                </li>
              </ul>
           </div>
        </div>
      </div>

    </div> <!-- End grid-stack -->

    <!-- III. Bottom Bar: Tabs -->
    <div class="bottom-bar">
      <button :class="{ active: activeDrawerTab === 'Cycles' }" @click="activeDrawerTab = 'Cycles'">CYCLE GROUPS</button>
      <button :class="{ active: activeDrawerTab === 'EditAdd' }" @click="activeDrawerTab = 'EditAdd'">ADD/EDIT</button>
      <button :class="{ active: activeDrawerTab === 'Schedule' }" @click="activeDrawerTab = 'Schedule'">LOGO SCHEDULE</button> <!-- Renamed -->
      <button :class="{ active: activeDrawerTab === 'Files' }" @click="activeDrawerTab = 'Files'">FILE BROWSER</button>
    </div>

    <!-- Contextual Drawer Placeholder (can be implemented later if needed) -->
    <!-- <div v-if="activeDrawerTab" class="contextual-drawer-panel">...</div> -->

  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import { invoke } from '@tauri-apps/api/tauri';
import { listen } from '@tauri-apps/api/event'; // Import listen for menu events
import 'gridstack/dist/gridstack.min.css'; // Import Gridstack CSS
import { GridStack } from 'gridstack'; // Import Gridstack JS

// --- Gridstack State --- 
const grid = ref(null); // Holds the Gridstack instance
const gridLayoutKey = 'vjtools-grid-layout'; // Key for localStorage

// --- Other State --- 
const currentTime = ref(formatTime(new Date()));
const currentDj = ref('None'); // This might not be displayed directly anymore
const currentlyShowing = ref(null); // { id, name, type ('cycle' or 'schedule'), progress (0-100), ... }
const selectedItem = ref(null); 
const activeDrawerTab = ref(null); // Still useful for potential future drawers

const cycleItems = reactive([]);
const galleryItems = reactive([]);
const scheduleItems = reactive([]); 

const loading = reactive({ cycle: false, gallery: false, schedule: false });
const errors = reactive({ cycle: null, gallery: null, schedule: null });
const galleryFilter = ref(null); 

// Add state to track the current cycle index and item start time
const currentCycleIndex = ref(0);
const currentItemStartTime = ref(null); // Date object
const defaultCycleDuration = ref(10); // Default duration for cycle items in seconds

// --- Computed --- 
const timeUrgencyClass = computed(() => {
  const now = new Date();
  let nextEventTime = null;
  for (const event of scheduleItems) {
      try {
        const [hours, minutes] = event.time.split(':').map(Number);
        const eventDate = new Date();
        eventDate.setHours(hours, minutes, 0, 0);
        if (eventDate > now && (!nextEventTime || eventDate < nextEventTime)) {
            nextEventTime = eventDate;
        }
      } catch (e) { console.error("Error parsing schedule time:", event.time, e); }
  }
  if (nextEventTime) {
      const diffSeconds = (nextEventTime - now) / 1000;
      if (diffSeconds < 30) return 'time-urgent';
      if (diffSeconds < 120) return 'time-warning';
  }
  return 'time-normal'; 
});

const filteredGalleryItems = computed(() => {
  if (!galleryFilter.value) return galleryItems;
  return galleryItems.filter(logo => Array.isArray(logo.linked_djs) && logo.linked_djs.includes(galleryFilter.value));
});

// --- Methods --- 

function formatTime(date) {
    // Simple HH:MM:SS format
    return date.toLocaleTimeString('en-US', { hour12: false });
}

function formatScheduleTime(timeStr) {
    // Convert HH:MM to locale time format (e.g., 10:00 PM)
    try {
        const [hours, minutes] = timeStr.split(':').map(Number);
        const date = new Date();
        date.setHours(hours, minutes, 0, 0);
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); // Adjust locale/options as needed
    } catch (e) {
        return timeStr; // Fallback
    }
}

async function fetchData() {
    // Use Promise.allSettled to fetch concurrently
    const results = await Promise.allSettled([
        invoke('get_cycle_items'),
        invoke('get_logos'),
        invoke('get_schedule_items'),
    ]);

    // Process Cycle Items
    loading.cycle = true; errors.cycle = null;
    if (results[0].status === 'fulfilled') {
        cycleItems.splice(0, cycleItems.length, ...results[0].value);
    } else { errors.cycle = results[0].reason?.message || String(results[0].reason); console.error("Cycle fetch error:", errors.cycle); }
    loading.cycle = false;

    // Process Gallery Items
    loading.gallery = true; errors.gallery = null;
    if (results[1].status === 'fulfilled') {
        galleryItems.splice(0, galleryItems.length, ...results[1].value);
        console.log("Fetched Gallery Items:", galleryItems);
    } else { errors.gallery = results[1].reason?.message || String(results[1].reason); console.error("Gallery fetch error:", errors.gallery); }
    loading.gallery = false;

    // Process Schedule Items
    loading.schedule = true; errors.schedule = null;
    if (results[2].status === 'fulfilled') {
        const items = results[2].value;
        items.sort((a, b) => a.time.localeCompare(b.time));
        scheduleItems.splice(0, scheduleItems.length, ...items);
    } else { errors.schedule = results[2].reason?.message || String(results[2].reason); console.error("Schedule fetch error:", errors.schedule); }
    loading.schedule = false;
    
    // Reset cycle index on fetch
    currentCycleIndex.value = 0;
    currentItemStartTime.value = null; 
    updateCurrentState(); // Initial state update after fetch
}

function updateCurrentState() {
    const now = new Date();
    const nowMs = now.getTime();
    const nowStrHHMM = formatTime(now).substring(0, 5);

    let activeScheduleItem = null;
    let latestPastDj = 'None';
    let nextScheduleTime = null;

    // --- 1. Check for Active Schedule Item --- 
    for (const item of scheduleItems) {
        if (item.time <= nowStrHHMM) {
            if (item.event_type === 'dj_set') {
                latestPastDj = item.name; 
            }
            // Duration check: Does this event cover the current time?
            const [startH, startM] = item.time.split(':').map(Number);
            const startTime = new Date(now); // Use today's date
            startTime.setHours(startH, startM, 0, 0);
            const startTimeMs = startTime.getTime();

            if (startTimeMs <= nowMs) { // Event has started
                const durationMs = (item.duration_seconds || 0) * 1000;
                if (durationMs === 0 || (startTimeMs + durationMs) > nowMs) { // Active if no duration or current time is within duration
                     // Is this the latest starting active event?
                     if (!activeScheduleItem || startTimeMs >= activeScheduleItem.startTimeMs) {                        
                        activeScheduleItem = { ...item, startTimeMs }; 
                     }
                }
            }
        } else {
             // Track the earliest upcoming event time
             const [h, m] = item.time.split(':').map(Number);
             const eventDate = new Date(now); eventDate.setHours(h, m, 0, 0);
             if (!nextScheduleTime || eventDate.getTime() < nextScheduleTime) {
                 nextScheduleTime = eventDate.getTime();
             }
        }
    }
    currentDj.value = latestPastDj; 

    // --- 2. Determine Currently Showing & Progress --- 
    let newCurrentlyShowing = null;
    let newItemStartTimeMs = null;

    if (activeScheduleItem) {
        // --- Schedule Override --- 
        const linkedLogo = galleryItems.find(logo => logo.id === activeScheduleItem.linked_logo_id);
        const durationS = activeScheduleItem.duration_seconds;
        let progress = 0;
        if (durationS && durationS > 0) {
            const elapsedMs = nowMs - activeScheduleItem.startTimeMs;
            progress = Math.min(100, (elapsedMs / (durationS * 1000)) * 100);
        }

        newCurrentlyShowing = {
            id: activeScheduleItem.id,
            name: linkedLogo ? linkedLogo.name : activeScheduleItem.name,
            type: 'schedule',
            progress: progress,
            status: 'scheduled',
            logo: linkedLogo,
            event: activeScheduleItem,
        };
        newItemStartTimeMs = activeScheduleItem.startTimeMs;

    } else if (cycleItems.length > 0) {
        // --- Cycle Logic --- 
        let cycleNeedsUpdate = false;
        if (currentItemStartTime.value === null) {
             // First time running or schedule ended, start the cycle
             cycleNeedsUpdate = true;
             currentCycleIndex.value = 0; // Start from the beginning
        } else {
            // Check if current cycle item duration has passed
            const currentCycleItem = cycleItems[currentCycleIndex.value];
            // TODO: Get duration from cycle item itself if defined, else use default
            const currentDurationS = defaultCycleDuration.value; 
            const currentDurationMs = currentDurationS * 1000;
            const elapsedMs = nowMs - currentItemStartTime.value.getTime();
            
            if (elapsedMs >= currentDurationMs) {
                // Time to advance cycle
                cycleNeedsUpdate = true;
                currentCycleIndex.value = (currentCycleIndex.value + 1) % cycleItems.length;
                // Also check if next schedule item interrupts before next cycle item finishes?
                if (nextScheduleTime && (nowMs + currentDurationMs) > nextScheduleTime) {
                    // Schedule item might interrupt, calculation needs refinement
                }
            }
        }

        if (cycleNeedsUpdate) {
            currentItemStartTime.value = new Date(); // Reset start time for new item
        }

        // Ensure index is valid
        if (currentCycleIndex.value >= cycleItems.length) {
             currentCycleIndex.value = 0;
        }
        const activeCycleItem = cycleItems[currentCycleIndex.value];
        newItemStartTimeMs = currentItemStartTime.value.getTime();
        
        if (activeCycleItem) {
            const linkedLogo = galleryItems.find(logo => logo.id === activeCycleItem.logo_id);
             // TODO: Use actual duration
             const durationS = defaultCycleDuration.value;
             const elapsedMs = nowMs - newItemStartTimeMs;
             const progress = durationS > 0 ? Math.min(100, (elapsedMs / (durationS * 1000)) * 100) : 0;

            newCurrentlyShowing = {
                id: activeCycleItem.id,
                name: linkedLogo ? linkedLogo.name : activeCycleItem.name,
                type: 'cycle',
                progress: progress,
                status: 'cycle',
                logo: linkedLogo,
                event: null,
            };
        } 
    }
    
    // Update reactive refs if changed
    if (JSON.stringify(currentlyShowing.value) !== JSON.stringify(newCurrentlyShowing)) {
         currentlyShowing.value = newCurrentlyShowing;
    }
    // Update start time ref if changed
    if (!currentItemStartTime.value || currentItemStartTime.value.getTime() !== newItemStartTimeMs) {
         currentItemStartTime.value = newItemStartTimeMs ? new Date(newItemStartTimeMs) : null;
    }
}

function toggleSelectItem(item) {
  if (selectedItem.value?.id === item?.id) {
      selectedItem.value = null; // Deselect if clicking the same item
      galleryFilter.value = null; // Also clear filter when deselecting
  } else {
      selectedItem.value = item;
      console.log('Selected:', item);
      // Update gallery filter only if a DJ schedule item is selected
      if (item && item.event_type === 'dj_set' && item.name) {
          galleryFilter.value = item.name; 
      } else {
          galleryFilter.value = null; // Clear filter for non-DJ selections
      }
  }
}

// Placeholder for actions within expanded view
function actionPlaceholder(item) {
    console.log("Action triggered for:", item.name);
    alert(`Action for ${item.name}`);
}

// Helper to get status class for gallery items based on cycle/schedule
function getGalleryItemStatusClass(logo) {
    if (cycleItems.some(item => item.logo_id === logo.id && item.status === 'cycle')) return 'cycle';
    if (scheduleItems.some(event => event.linked_logo_id === logo.id)) return 'scheduled';
    return 'inactive';
}

// Helper to check if a logo is the currently active cycle item
function isLogoActiveInCycle(logoId) {
    return currentlyShowing.value?.type === 'cycle' && currentlyShowing.value?.logo?.id === logoId;
}

// --- Gridstack Methods --- 
function initializeGridstack() {
  grid.value = GridStack.init({
    float: false, // Items don't float up
    cellHeight: 'auto', // Use content height initially, but CSS might override
    margin: 10, // Margin between items
    disableResize: false,
    disableDrag: false,
    // acceptWidgets: '.new-widget' // If adding new widgets later
  });

  loadLayout(); // Load saved layout after init

  // Save layout whenever an item is dragged or resized
  grid.value.on('change', (event, items) => {
      console.log('Grid changed:', items);
      saveLayout();
  });
}

function saveLayout() {
  if (!grid.value) return;
  const layout = grid.value.save(true); // true = save content attribute (not needed here), false = save grid structure only
  console.log('Saving layout:', layout);
  try {
    localStorage.setItem(gridLayoutKey, JSON.stringify(layout));
  } catch (e) {
    console.error("Failed to save layout to localStorage:", e);
  }
}

function loadLayout() {
  if (!grid.value) return;
  try {
    const savedLayout = localStorage.getItem(gridLayoutKey);
    if (savedLayout) {
      const layoutData = JSON.parse(savedLayout);
      console.log('Loading layout:', layoutData);
      grid.value.load(layoutData);
    } else {
       console.log('No saved layout found, using default.');
       // Optionally force default if needed, Gridstack loads default from HTML attrs
       // resetLayout(); 
    }
  } catch (e) {
    console.error("Failed to load layout from localStorage:", e);
    // Fallback to default if loading fails
    resetLayout(); 
  }
}

function resetLayout() {
  if (!grid.value) return;
  console.log('Resetting layout to default');
  // Clear saved layout
  try { localStorage.removeItem(gridLayoutKey); } catch (e) {}
  
  // Gridstack doesn't have a simple 'reset to initial HTML' 
  // We need to manually define the default and load it
  const defaultLayout = [
      { id: 'cycle', x: 0, y: 0, w: 8, h: 3 },
      { id: 'gallery', x: 0, y: 3, w: 8, h: 9 },
      { id: 'schedule', x: 8, y: 0, w: 4, h: 12 },
  ];
  grid.value.load(defaultLayout); 
  // Optionally re-save the default after resetting
  // saveLayout();
}

// --- Menu Event Listeners --- 
async function setupMenuListeners() {
    await listen('tauri://menu', (event) => {
        console.log('Menu item clicked:', event.payload);
        switch (event.payload) {
            case 'save-layout':
                saveLayout();
                break;
            case 'reset-layout':
                resetLayout();
                break;
            case 'learn-more':
                // Example: Open a URL
                invoke('open', { uri: 'https://github.com/gridstack/gridstack.js' });
                break;
            // Handle other custom menu items if needed
        }
    });
}

// --- Lifecycle & Timer --- 
let timerInterval = null;
onMounted(() => {
  initializeGridstack(); // Initialize Gridstack
  fetchData(); // Fetch initial data
  setupMenuListeners(); // Listen for menu clicks

  timerInterval = setInterval(() => {
    currentTime.value = formatTime(new Date());
    updateCurrentState(); 
  }, 1000); 
});

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval);
  if (grid.value) {
    grid.value.destroy(false); // false = don't remove DOM elements
  }
  // TODO: Unlisten to menu events if necessary
});

</script>

<style>
/* Import Gridstack base CSS (adjust path if needed) */
/* @import 'node_modules/gridstack/dist/gridstack.min.css'; */

/* Optional: Gridstack extras for handles etc. */
/* @import 'node_modules/gridstack/dist/gridstack-extra.min.css'; */

.grid-stack {
    /* background: #404040; */ /* Optional background for grid area */
}

/* Style the grid items and their content wrapper */
.grid-stack-item > .grid-stack-item-content {
    background-color: #282828; /* Match section background */
    border-radius: 4px;
    border: 1px solid #444;
    overflow: hidden; /* Important for gridstack content */
    display: flex; /* Make content a flex container */
    flex-direction: column; /* Stack title and content */
}

/* Ensure sections inside grid items fill the space */
.grid-stack-item-content.section {
    padding: 0; /* Remove padding from section if content handles it */
    height: 100%;
    border: none; /* Remove border from section, item has it */
}

.grid-stack-item-content .section-title {
     padding: 10px 10px 0 10px; /* Add padding back to title */
     margin-bottom: 8px;
}
.grid-stack-item-content .item-container {
    padding: 0 10px 10px 10px; /* Add padding to item containers */
}
.grid-stack-item-content .schedule-list-container {
     padding: 0 10px 10px 10px; /* Add padding to schedule container */
     flex-grow: 1; /* Ensure it fills space */
}

/* Style the drag handles (optional, needs gridstack-extra.css) */
/*
.ui-resizable-handle {
    background: rgba(255, 255, 255, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.4);
    width: 10px;
    height: 10px;
}
*/

</style>

<style scoped>
/* Reset / Base */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.live-control-container {
  display: flex;
  flex-direction: column;
  height: 100vh; 
  background-color: #1a1a1a; 
  color: #e0e0e0; 
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  overflow: hidden; /* Prevent body scroll, grid handles internal */
}

/* --- Layout Sections --- */
.top-bar {
  display: flex;
  align-items: center;
  padding: 10px 20px;
  background-color: #222;
  border-bottom: 1px solid #444;
  flex-shrink: 0;
  z-index: 10; /* Ensure top bar is above grid */
}

.main-content-grid { /* Renamed from .main-content */
  flex-grow: 1;
  padding: 10px; /* Margin around the grid */
  margin: 0; 
  /* Removed display:flex, Gridstack handles layout */
  /* Removed gap */
}

/* Remove column wrappers */
/* .left-column, .right-column no longer needed */

.bottom-bar {
  display: flex;
  background-color: #222;
  border-top: 1px solid #444;
  padding: 5px 15px;
  flex-shrink: 0;
  z-index: 10; /* Ensure bottom bar is above grid */
}

/* --- Top Bar Elements --- */
.now-showing-title {
  font-size: 0.9em;
  color: #aaa;
  margin-right: 15px;
  white-space: nowrap;
}

.now-showing-preview {
  flex-grow: 1;
  min-height: 80px; 
  background-color: #0a3d62; 
  border-radius: 4px;
  position: relative;
  overflow: hidden; 
  border: 1px solid #1e6091;
  margin-right: 15px;
}

.preview-content {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-size: clamp(1.5em, 4vw, 2em); /* Responsive font size */
  font-weight: bold;
  color: #fff;
  padding: 5px;
}

.system-time {
  font-size: 1.2em;
  font-weight: bold;
  white-space: nowrap;
  color: #e0e0e0; /* Default */
}
.time-warning { color: orange; }
.time-urgent { color: red; }

/* --- General Section Styling (Applied via .grid-stack-item-content) --- */
/* Base styles moved to global <style> block */

/* Adjustments for content within grid items */
.cycle-section, .gallery-section, .schedule-section {
    height: 100%; /* Fill the grid item content area */
    display: flex;
    flex-direction: column;
}

.section-title { /* Already styled globally */ }

.item-container {
  align-items: start; 
}

.horizontal-scroll {
  display: flex;
  flex-wrap: wrap; 
  gap: 10px;
  align-items: start; 
  overflow-y: auto; /* Allow vertical scroll if needed for wrapped items */
  flex-shrink: 0; /* Prevent shrinking too much */
  max-height: 180px; /* Limit height of cycle wrap */
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); 
  gap: 10px;
  flex-grow: 1; 
  align-items: start; 
  overflow-y: auto; /* Allow gallery grid itself to scroll */
}

/* --- Item Box Styling --- */
/* ... Most existing styles are fine ... */
.item-box {
  /* ... */
  transition: min-height 0.3s ease-in-out, background-color 0.2s ease; /* Adjust transition */
  /* ... */
}

.item-box.expanded {
   min-height: 150px; /* Use min-height for expansion */
   /* ... */
}

/* --- Schedule Section --- */
.schedule-list-container {
    flex-grow: 1; 
    overflow-y: auto; /* Allow schedule list to scroll */
}
/* ... Schedule list item styles are fine ... */


/* --- Bottom Bar --- */
/* ... Existing styles are fine ... */

/* --- Utility/Error/Empty states --- */
/* ... Existing styles are fine ... */

/* --- Scrollbar styling --- */
/* ... Existing styles are fine ... */


</style>