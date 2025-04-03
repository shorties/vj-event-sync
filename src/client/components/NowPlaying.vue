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
      <button :class="{ active: activeDrawerTab === 'Cycles' }" @click="toggleDrawer('Cycles')">CYCLE GROUPS</button>
      <button :class="{ active: activeDrawerTab === 'EditAdd' }" @click="toggleDrawer('EditAdd')">ADD/EDIT</button>
      <button :class="{ active: activeDrawerTab === 'Schedule' }" @click="toggleDrawer('Schedule')">LOGO SCHEDULE</button> 
      <button :class="{ active: activeDrawerTab === 'Files' }" @click="toggleDrawer('Files')">FILE BROWSER</button>
    </div>

    <!-- V. Contextual Drawer Panel -->
    <div v-if="activeDrawerTab" class="contextual-drawer-panel">
        <div class="drawer-header">
            <h4>{{ activeDrawerTab }} Panel</h4>
            <button @click="activeDrawerTab = null" class="close-drawer-btn">✕</button>
        </div>
        <div class="drawer-content">
            <!-- Content based on active tab -->
            <div v-if="activeDrawerTab === 'Cycles'" class="drawer-tab-content">
                <h5>Configure Cycle Order</h5>
                <p>Drag items to reorder the default playback cycle.</p>
                <div v-if="loading.cycle">Loading cycle...</div>
                <div v-else-if="errors.cycle" class="error">{{ errors.cycle }}</div>
                <draggable 
                    v-else
                    v-model="cycleItems" 
                    tag="ul" 
                    item-key="id" 
                    class="cycle-config-list"
                    handle=".drag-handle"
                    ghost-class="ghost"
                    :animation="200">
                    <template #item="{element}"> <!-- Use element alias -->
                        <li class="cycle-config-item">
                           <span class="drag-handle">⠿</span>
                           <span class="item-name">{{ element.name }} (ID: {{ element.logo_id }})</span>
                           <!-- Add remove button? -->
                           <button @click="removeCycleItem(element.id)" class="remove-btn">×</button>
                        </li>
                    </template>
                </draggable>
                 <div class="drawer-actions">
                    <button @click="handleSaveCycleOrder" :disabled="loading.cycle || !!errors.cycle">Save Current Order</button>
                    <p v-if="saveCycleStatus" :class="{ error: saveCycleError }">{{ saveCycleStatus }}</p>
                 </div>
                <hr>
                <p>Save/Load Named Groups - To be implemented</p>
                 <button @click="saveCurrentCycle">Save Current Cycle As...</button>
            </div>

            <div v-else-if="activeDrawerTab === 'EditAdd'" class="drawer-tab-content">
                <div class="add-edit-forms">
                    <!-- Add Logo Form -->
                    <form @submit.prevent="handleAddNewLogo" class="add-form">
                        <h5>Add New Logo</h5>
                        <div class="form-group">
                            <label for="logo-name">Name:</label>
                            <input id="logo-name" v-model="newLogo.name" type="text" required />
                        </div>
                        <div class="form-group">
                            <label for="logo-path">File Path:</label>
                            <input id="logo-path" v-model="newLogo.filePath" type="text" required />
                             <!-- TODO: Add file picker button -->
                        </div>
                         <div class="form-group">
                            <label for="logo-thumb">Thumbnail Path (Optional):</label>
                            <input id="logo-thumb" v-model="newLogo.thumbnailPath" type="text" />
                        </div>
                        <button type="submit">Add Logo</button>
                        <p v-if="addLogoStatus" :class="{ error: addLogoError }">{{ addLogoStatus }}</p>
                    </form>

                    <!-- Add Schedule Event Form -->
                    <form @submit.prevent="handleAddNewScheduleEvent" class="add-form">
                        <h5>Add Schedule Event</h5>
                        <div class="form-group">
                            <label for="event-time">Time (HH:MM):</label>
                            <input id="event-time" v-model="newEvent.time" type="time" required />
                        </div>
                        <div class="form-group">
                            <label for="event-name">Name / DJ:</label>
                            <input id="event-name" v-model="newEvent.name" type="text" required />
                        </div>
                         <div class="form-group">
                            <label for="event-type">Type:</label>
                            <select id="event-type" v-model="newEvent.type" required>
                                <option value="dj_set">DJ Set</option>
                                <option value="sponsor_slot">Sponsor Slot</option>
                                <option value="special_visual">Special Visual</option>
                                <option value="intermission">Intermission</option>
                                <option value="manual_trigger">Manual Trigger Point</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="event-duration">Duration (seconds, 0 or empty for indefinite):</label>
                            <input id="event-duration" v-model.number="newEvent.duration" type="number" min="0" />
                        </div>
                         <div class="form-group">
                            <label for="event-logo">Link Logo (Optional):</label>
                             <select id="event-logo" v-model="newEvent.linkedLogoId">
                                <option value="">-- None --</option>
                                <option v-for="logo in galleryItems" :key="logo.id" :value="logo.id">
                                    {{ logo.name }}
                                </option>
                            </select>
                        </div>
                        <button type="submit">Add Event</button>
                        <p v-if="addEventStatus" :class="{ error: addEventError }">{{ addEventStatus }}</p>
                    </form>
                </div>
            </div>

            <div v-else-if="activeDrawerTab === 'Schedule'" class="drawer-tab-content">
                <p>Full Logo Schedule Editor / Timeline View - To be implemented</p>
                <!-- Could show a more detailed list, allow reordering/editing -->
            </div>

            <div v-else-if="activeDrawerTab === 'Files'" class="drawer-tab-content">
                <p>Local/Network File Browser - To be implemented</p>
                <!-- Could use Tauri FS API to list files -->
            </div>
        </div>
    </div>

  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import { invoke } from '@tauri-apps/api/tauri';
import { listen } from '@tauri-apps/api/event'; // Import listen for menu events
import 'gridstack/dist/gridstack.min.css'; // Import Gridstack CSS
import { GridStack } from 'gridstack'; // Import Gridstack JS
import { appWindow } from '@tauri-apps/api/window'; // Import appWindow
import draggable from 'vuedraggable'; // Import vuedraggable

// --- Gridstack State --- 
const grid = ref(null); // Holds the Gridstack instance
const gridLayoutKey = 'vjtools-grid-layout'; // Key for localStorage
const isLayoutLocked = ref(false); // State for layout lock

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

// Form models
const newLogo = reactive({ name: '', filePath: '', thumbnailPath: '' });
const newEvent = reactive({ time: '', name: '', type: 'dj_set', duration: null, linkedLogoId: '' });

// Add status messages
const addLogoStatus = ref("");
const addLogoError = ref(false);
const addEventStatus = ref("");
const addEventError = ref(false);

// --- Cycle Management (Drawer) ---
const saveCycleStatus = ref("");
const saveCycleError = ref(false);

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
    // Initial lock state
    disableResize: isLayoutLocked.value,
    disableDrag: isLayoutLocked.value,
    // acceptWidgets: '.new-widget' // If adding new widgets later
  });

  loadLayout(); // Load saved layout after init

  grid.value.on('change', (event, items) => {
      if (!isLayoutLocked.value) { // Only save if not locked
        console.log('Grid changed: Saving layout');
        saveLayout();
      }
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

function toggleLayoutLock(lockState) {
    if (!grid.value) return;
    isLayoutLocked.value = lockState; // Update the ref
    if (isLayoutLocked.value) {
        grid.value.disable(); // Disables drag & resize
        console.log("Layout LOCKED");
    } else {
        grid.value.enable(); // Enables drag & resize
        console.log("Layout UNLOCKED");
    }
    // Update the menu item checked state
    appWindow.menuItems()['toggle-layout-lock'].then(item => {
        item?.setChecked(isLayoutLocked.value);
    }).catch(e => console.error("Failed to update menu check state:", e));
}

// --- Menu Event Listeners --- 
async function setupMenuListeners() {
    // Initial sync of lock state with menu (in case saved state differs)
    // We might need a way to store the lock state persistently too
    appWindow.menuItems()['toggle-layout-lock'].then(item => {
        item?.isChecked().then(checked => {
            isLayoutLocked.value = checked;
            // Apply initial lock state to grid if already initialized
            if (grid.value) {
                if (isLayoutLocked.value) grid.value.disable();
                else grid.value.enable();
            }
        })
    }).catch(e => console.error("Failed to get initial menu check state:", e));

    // Listen for clicks
    await listen('tauri://menu', (event) => {
        console.log('Menu item clicked:', event.payload);
        const menuItemId = event.payload; // Payload is the item ID for non-checkbox items
        switch (menuItemId) {
            case 'save-layout':
                saveLayout();
                break;
            case 'reset-layout':
                resetLayout();
                break;
            case 'toggle-layout-lock':
                // Checkbox events don't include the ID in payload directly
                // We need to get the state from the menu item itself
                 appWindow.menuItems()['toggle-layout-lock'].then(item => {
                    item?.isChecked().then(checked => {
                       toggleLayoutLock(checked); // Call our function with the new state
                    });
                 }).catch(e => console.error("Failed to handle toggle-layout-lock:", e));
                break;
            case 'learn-more':
                invoke('open', { uri: 'https://github.com/gridstack/gridstack.js' });
                break;
        }
    });
}

// --- Drawer Toggle ---
function toggleDrawer(tabName) {
    if (activeDrawerTab.value === tabName) {
        activeDrawerTab.value = null; // Close if clicking active tab
    } else {
        activeDrawerTab.value = tabName;
    }
}

// --- Add/Edit Handlers ---
async function handleAddNewLogo() {
    addLogoStatus.value = "Adding...";
    addLogoError.value = false;
    try {
        const newId = await invoke('add_logo', { 
            name: newLogo.name, 
            filePath: newLogo.filePath, 
            thumbnailPath: newLogo.thumbnailPath || null 
        });
        addLogoStatus.value = `Logo added successfully (ID: ${newId})!`;
        // Clear form
        newLogo.name = '';
        newLogo.filePath = '';
        newLogo.thumbnailPath = '';
        // Refresh gallery data
        await fetchData(); // Re-fetch all data for simplicity
    } catch (err) {
        addLogoError.value = true;
        addLogoStatus.value = `Error: ${err.message || String(err)}`;
        console.error("Failed to add logo:", err);
    } 
}

async function handleAddNewScheduleEvent() {
    addEventStatus.value = "Adding...";
    addEventError.value = false;
    try {
        const duration = newEvent.duration === null || newEvent.duration === '' ? null : Number(newEvent.duration);
        const logoId = newEvent.linkedLogoId === '' ? null : newEvent.linkedLogoId;

        const newId = await invoke('add_schedule_event', { 
            eventTime: newEvent.time, // Already string in HH:MM format
            name: newEvent.name,
            eventType: newEvent.type,
            durationSeconds: duration, 
            linkedLogoId: logoId
        });
        addEventStatus.value = `Event added successfully (ID: ${newId})!`;
        // Clear form
        newEvent.time = '';
        newEvent.name = '';
        newEvent.type = 'dj_set';
        newEvent.duration = null;
        newEvent.linkedLogoId = '';
        // Refresh schedule data
        await fetchData(); // Re-fetch all data
    } catch (err) {
        addEventError.value = true;
        addEventStatus.value = `Error: ${err.message || String(err)}`;
        console.error("Failed to add schedule event:", err);
    }
}

// Placeholder for saving cycle
function saveCurrentCycle() {
    alert("Save Cycle Group - Not implemented yet.");
    // TODO: Get current cycle order (needs way to represent it) 
    // and invoke backend command to save it with a name.
}

// --- Cycle Management (Drawer) ---
function removeCycleItem(itemIdToRemove) {
    const index = cycleItems.findIndex(item => item.id === itemIdToRemove);
    if (index > -1) {
        cycleItems.splice(index, 1);
        // Note: This only removes from the *local* list. 
        // User needs to click 'Save Current Order' to persist.
    }
}

async function handleSaveCycleOrder() {
    saveCycleStatus.value = "Saving...";
    saveCycleError.value = false;
    try {
        const logoIds = cycleItems.map(item => item.logo_id);
        await invoke('set_cycle_config', { payload: { logoIds } });
        saveCycleStatus.value = "Cycle order saved successfully!";
        // Optionally refetch data to confirm, though local state should match
        await fetchData(); 
    } catch (err) {
        saveCycleError.value = true;
        saveCycleStatus.value = `Error saving cycle: ${err.message || String(err)}`;
        console.error("Failed to save cycle order:", err);
    } finally {
        // Optionally clear status after a delay
        setTimeout(() => { saveCycleStatus.value = ""; }, 3000);
    }
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

/* --- Drawer Panel Styles --- */
.contextual-drawer-panel {
    background-color: #2a2a2a; /* Slightly lighter than main bg */
    border-top: 1px solid #444;
    padding: 0; /* Handle padding inside header/content */
    position: absolute; 
    bottom: 36px; /* Align with bottom bar height */
    left: 0;
    right: 0;
    max-height: 40%; /* Limit height */
    overflow: hidden; /* Prevent content spill before animation */
    box-shadow: 0 -6px 12px rgba(0,0,0,0.3);
    z-index: 20; 
    display: flex;
    flex-direction: column;
    /* Add animation */
    transition: transform 0.3s ease-out;
    transform: translateY(100%); /* Start hidden below */
}

/* Add visible state */
.live-control-container > .contextual-drawer-panel[style*="display: block"],
.live-control-container > .contextual-drawer-panel[style*="display: flex"] /* Add this if v-if changes display */
.live-control-container > .contextual-drawer-panel:not([style*="display: none"]) /* Fallback if v-if doesn't use display */ {
    transform: translateY(0%); /* Slide in */
}

.drawer-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 15px;
    background-color: #333;
    flex-shrink: 0;
}
.drawer-header h4 {
    margin: 0;
    color: var(--primary-color, #2196F3);
    font-size: 1em;
}
.close-drawer-btn {
    background: none;
    border: none;
    color: #aaa;
    font-size: 1.2em;
    cursor: pointer;
    padding: 0 5px;
}
.close-drawer-btn:hover {
    color: #fff;
}

.drawer-content {
    padding: 15px;
    overflow-y: auto; /* Allow content to scroll */
    flex-grow: 1;
}

/* ADD/EDIT Form Styling */
.add-edit-forms {
    display: flex;
    gap: 20px;
    flex-wrap: wrap; /* Allow forms to wrap on smaller screens */
}

.add-form {
    background-color: #3a3a3a;
    padding: 15px;
    border-radius: 4px;
    border: 1px solid #555;
    flex: 1; /* Allow forms to share space */
    min-width: 280px; /* Minimum width before wrapping */
}

.add-form h5 {
    margin-top: 0;
    margin-bottom: 15px;
    color: #eee;
}

.form-group {
    margin-bottom: 12px;
}

.form-group label {
    display: block;
    margin-bottom: 4px;
    font-size: 0.9em;
    color: #ccc;
}

.form-group input[type="text"],
.form-group input[type="time"],
.form-group input[type="number"],
.form-group select {
    width: 100%;
    padding: 6px 8px;
    background-color: #2a2a2a;
    border: 1px solid #555;
    border-radius: 3px;
    color: #eee;
    font-size: 0.9em;
}

.add-form button[type="submit"] {
    padding: 6px 12px;
    background-color: var(--primary-color, #2196F3);
    border: none;
    color: white;
    border-radius: 3px;
    cursor: pointer;
    font-size: 0.9em;
    margin-top: 5px;
}
.add-form button[type="submit"]:hover {
    opacity: 0.9;
}

.add-form p {
    margin-top: 10px;
    font-size: 0.9em;
}
.add-form p.error {
    color: red;
}

/* Cycle Config List Styles */
.cycle-config-list {
    list-style: none;
    padding: 0;
    margin: 10px 0;
    border: 1px solid #444;
    border-radius: 4px;
    max-height: 200px; /* Limit height in drawer */
    overflow-y: auto;
}

.cycle-config-item {
    display: flex;
    align-items: center;
    padding: 8px 10px;
    background-color: #3a3a3a;
    border-bottom: 1px solid #4a4a4a;
    cursor: grab; /* Indicate draggable */
}
.cycle-config-item:last-child {
    border-bottom: none;
}

.drag-handle {
    cursor: grab;
    color: #888;
    margin-right: 10px;
    font-size: 1.2em;
    line-height: 1;
}

.item-name {
    flex-grow: 1;
    font-size: 0.9em;
}

.remove-btn {
    background: none;
    border: none;
    color: #aaa;
    font-size: 1.1em;
    cursor: pointer;
    padding: 0 5px;
}
.remove-btn:hover {
    color: red;
}

/* Styling for vuedraggable ghost item */
.ghost {
    opacity: 0.5;
    background: #4a4a7a;
}

/* Actions below list */
.drawer-actions {
    margin-top: 15px;
}
.drawer-actions button {
    padding: 5px 10px;
    background-color: var(--primary-color, #2196F3);
    border: none;
    color: white;
    border-radius: 3px;
    cursor: pointer;
    font-size: 0.9em;
    margin-right: 10px;
}
.drawer-actions button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}
.drawer-actions p {
    display: inline-block;
    margin: 0;
    font-size: 0.9em;
}
.drawer-actions p.error {
    color: red;
}

/* Drawer Tab Content Styles */
.drawer-tab-content { /* Add class to specific tab content divs */
    /* Styles common to drawer tabs if needed */
}

</style>