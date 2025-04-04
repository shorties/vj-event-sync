<template>
  <div class="live-control-container">
    <!-- I. Top Bar: Now Showing + Time -->
    <div class="top-bar">
      <div class="now-showing">
        <div class="now-showing-title">NOW SHOWING</div>
        <div class="now-showing-preview">
          <div class="preview-content">
            <font-awesome-icon icon="fa-solid fa-play-circle" />
            <span>{{ currentlyShowing?.name || 'No content playing' }}</span>
          </div>
          <div class="progress-bar-container">
            <div class="progress-bar" :style="{ width: currentlyShowing?.progress + '%' || '0%' }"></div>
          </div>
        </div>
      </div>
      <div class="time-display">
        <div :class="['system-time', timeUrgencyClass]">
          <font-awesome-icon icon="fa-solid fa-clock" />
          <span>{{ formatTime(currentTime) }}</span>
        </div>
        <div class="global-controls">
          <button 
            class="control-button" 
            @click="toggleTimeFormat"
            :title="is24HourFormat ? 'Switch to 12-Hour Format' : 'Switch to 24-Hour Format'"
          >
            <font-awesome-icon icon="fa-solid fa-clock" /> {{ is24HourFormat ? '24H' : '12H' }}
          </button>
          <button 
            class="control-button" 
            @click="toggleTimeZone"
            :title="currentTimeZone === 'local' ? 'Switch to UTC Time' : 'Switch to Local Time'"
          >
            <font-awesome-icon icon="fa-solid fa-globe" /> {{ currentTimeZone.toUpperCase() }}
          </button>
          <button class="control-button settings-button" title="App Settings">
            <font-awesome-icon icon="fa-solid fa-cog" />
          </button>
        </div>
      </div>
    </div>

    <!-- II. Main Content: GRIDSTACK LAYOUT -->
    <div class="main-content-grid">
      <div class="grid-stack">
        <!-- Gridstack items wrap the sections -->
        <div class="grid-stack-item" gs-id="cycle" gs-x="0" gs-y="0" gs-w="8" gs-h="3">
          <div :class="['grid-stack-item-content', 'section', 'cycle-section', { collapsed: sectionStates.cycle.collapsed }]" >
            <div class="section-header">
              <div class="drag-handle" title="Move Section">
                  <font-awesome-icon icon="fa-solid fa-ellipsis-h" />
              </div>
              <h4 class="section-title">
                <font-awesome-icon icon="fa-solid fa-sync" />
                CYCLE
              </h4>
              <div class="section-controls">
                <button 
                  class="control-button collapse-btn" 
                  @click="toggleCollapse('cycle')" 
                  :title="sectionStates.cycle.collapsed ? 'Expand Section' : 'Collapse Section'"
                >
                  <font-awesome-icon :icon="['fa-solid', sectionStates.cycle.collapsed ? 'fa-plus' : 'fa-minus']" />
                </button>
                <button 
                  class="control-button expand-btn" 
                  @click="expandSection('cycle')" 
                  title="Maximize Section (Not Implemented)"
                >
                  <font-awesome-icon icon="fa-solid fa-expand-alt" />
                </button>
                <button class="control-button" @click="toggleCycleLock" :title="isCycleLocked ? 'Unlock Cycle' : 'Lock Cycle'">
                  <font-awesome-icon :icon="isCycleLocked ? 'fa-solid fa-lock' : 'fa-solid fa-lock-open'" />
                </button>
                <button class="control-button" @click="refreshCycle" title="Refresh Cycle">
                  <font-awesome-icon icon="fa-solid fa-sync" />
                </button>
              </div>
            </div>
            <div class="section-body item-container horizontal-scroll" v-show="!sectionStates.cycle.collapsed">
              <div v-if="loading.cycle" class="loading-state">
                <font-awesome-icon icon="fa-solid fa-spinner" spin />
                <span>Loading cycle items...</span>
              </div>
              <div v-else-if="errors.cycle" class="error-state">
                <font-awesome-icon icon="fa-solid fa-exclamation-circle" />
                <span>{{ errors.cycle }}</span>
              </div>
              <div v-else-if="!cycleItems.length" class="empty-state">
                <font-awesome-icon icon="fa-solid fa-inbox" />
                <span>Empty Cycle</span>
              </div>
              <div v-else v-for="item in cycleItems" 
                   :key="item.id" 
                   :class="['item-box cycle-item', item.status, { 
                       active: currentlyShowing?.id === item.id && currentlyShowing?.type === 'cycle', 
                       selected: selectedItem?.id === item.id,
                       expanded: expandedItem.id === item.id
                   }]" 
                   @click="toggleSelectItem(item)">
                <div class="item-content">
                  <div class="item-header">
                    <span v-if="item.status === 'scheduled'" class="icon lock-icon">
                      <font-awesome-icon icon="fa-solid fa-lock" />
                    </span>
                    <span class="item-name">{{ item.name }}</span>
                  </div>
                  <div class="item-meta">
                    <span class="item-duration">{{ formatDuration(item.duration) }}</span>
                    <span class="item-type">{{ item.type }}</span>
                  </div>
                </div>
                <div class="progress-bar-container" v-if="item.status === 'cycle'"> 
                  <div class="progress-bar" :style="{ width: (currentlyShowing?.id === item.id ? currentlyShowing?.progress : 0) + '%' }"></div>
                </div>
                <div class="item-details" v-if="expandedItem.id === item.id && expandedItem.type === 'cycle'">
                  <h6>Cycle Item Details</h6>
                  <div class="detail-field">
                    <label>Duration (seconds):</label>
                    <input type="number" v-model.number="expandedItem.data.duration" min="1" placeholder="Default">
                  </div>
                  <button @click="saveExpandedItemDetails">Save Details</button> 
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="grid-stack-item" gs-id="gallery" gs-x="0" gs-y="3" gs-w="8" gs-h="9">
          <div :class="['grid-stack-item-content', 'section', 'gallery-section', { collapsed: sectionStates.gallery.collapsed }]" >
             <div class="section-header">
               <div class="drag-handle" title="Move Section">
                   <font-awesome-icon icon="fa-solid fa-ellipsis-h" />
               </div>
               <h4 class="section-title">
                 <font-awesome-icon icon="fa-solid fa-th-large" /> <!-- Added gallery icon -->
                 LOGO GALLERY <span v-if="galleryFilter">({{ galleryFilter }})</span>
               </h4>
               <div class="section-controls">
                  <button 
                    class="control-button collapse-btn" 
                    @click="toggleCollapse('gallery')" 
                    :title="sectionStates.gallery.collapsed ? 'Expand Section' : 'Collapse Section'"
                  >
                    <font-awesome-icon :icon="['fa-solid', sectionStates.gallery.collapsed ? 'fa-plus' : 'fa-minus']" />
                  </button>
                  <button 
                    class="control-button expand-btn" 
                    @click="expandSection('gallery')" 
                    title="Maximize Section (Not Implemented)"
                  >
                    <font-awesome-icon icon="fa-solid fa-expand-alt" />
                  </button>
                  <button class="control-button" @click="toggleGalleryFilter" :title="galleryFilter ? 'Clear Filter' : 'Filter Gallery'">
                    <font-awesome-icon icon="fa-solid fa-filter" />
                  </button>
                  <select v-model="gallerySelectedArtist" class="filter-select artist-filter" title="Filter by Artist">
                    <option :value="null">All Artists</option>
                    <option v-if="loading.artists" disabled value="">Loading...</option>
                    <option v-else-if="errors.artists" disabled value="">Error loading</option>
                    <template v-else>
                      <option v-for="artist in artists" :key="artist.id" :value="artist.id">
                        {{ artist.name }}
                      </option>
                    </template>
                  </select>
                  <!-- Dynamic Search Input Area -->
                  <div class="search-container" :class="{ active: isSearchActive }">
                     <button 
                       class="control-button search-toggle-btn" 
                       @click="activateSearch"
                       v-show="!isSearchActive" 
                       title="Search Logos"
                     >
                       <font-awesome-icon icon="fa-solid fa-search" />
                     </button>
                     <input 
                       ref="searchInputRef" 
                       type="text" 
                       v-model="gallerySearchTerm" 
                       placeholder="Search..." 
                       class="filter-input search-filter-dynamic" 
                       v-show="isSearchActive"
                       @blur="deactivateSearch"
                       @keyup.esc="cancelSearch"
                     />
                  </div>
                  <!-- End Dynamic Search -->
               </div>
             </div>
             <div class="section-body gallery-body" v-show="!sectionStates.gallery.collapsed">
                 <div v-if="loading.gallery">Loading...</div>
                 <div v-else-if="errors.gallery" class="error">{{ errors.gallery }}</div>
                 <div v-else-if="!filteredGalleryItems.length" class="empty">Empty Gallery</div>
                 <div v-else v-for="logo in filteredGalleryItems" 
                      :key="logo.id" 
                      :class="['grid-stack-item']" 
                      :gs-id="logo.id" 
                      :gs-w="2" :gs-h="1" :gs-min-w="1" :gs-min-h="1"
                 >
                   <div class="grid-stack-item-content gallery-item-content">
                       <!-- ... item-box for thumbnail view ... -->
                       <div 
                           :class="['item-box gallery-item', getGalleryItemStatusClass(logo), { expanded: expandedItem.id === logo.id }]" 
                           @click="toggleExpand(logo, 'gallery')" 
                           :style="{ backgroundImage: logo.thumbnail_path ? `url('${convertFileSrc(logo.thumbnail_path)}')` : 'none' }"
                           :title="logo.name">
                           <!-- ... item header and progress bar ... -->
                       </div>
                       
                       <!-- Gallery Item Expanded Details -->
                       <div v-if="expandedItem.id === logo.id && expandedItem.type === 'gallery'" class="item-details gallery-details">
                           <div class="details-preview">
                              <img 
                                v-if="logo.file_path" 
                                :src="convertFileSrc(logo.file_path)" 
                                :alt="logo.name + ' preview'" 
                                class="preview-image"
                              />
                              <div v-else class="no-preview">
                                 <font-awesome-icon icon="fa-solid fa-image" />
                                 <span>No Preview Available</span>
                              </div>
                           </div>
                           <div class="details-info">
                               <h6>{{ logo.name }}</h6>
                               <div class="detail-field">
                                   <label><font-awesome-icon icon="fa-solid fa-paint-brush" /> Artist:</label>
                                   <span>{{ getArtistName(logo.artist_id) || 'Unknown' }}</span>
                               </div>
                               <div class="detail-field">
                                   <label><font-awesome-icon icon="fa-solid fa-tags" /> Tags:</label>
                                   <span>{{ logo.tags || 'None' }}</span>
                               </div>
                                <div class="detail-field">
                                   <label><font-awesome-icon icon="fa-solid fa-link" /> Linked DJs:</label>
                                   <span>{{ logo.linked_djs?.join(', ') || 'None' }}</span>
                               </div>
                               <div class="detail-field path-field">
                                   <label><font-awesome-icon icon="fa-solid fa-file" /> Path:</label>
                                   <span :title="logo.file_path">{{ logo.file_path }}</span>
                               </div>
                               <div class="details-actions">
                                   <button 
                                     @click.stop="addToCycle(logo)" 
                                     class="action-button add-to-cycle-btn"
                                     :disabled="cycleItems.some(item => item.logo_id === logo.id)" 
                                     title="Add this logo to the end of the default cycle"
                                    >
                                     <font-awesome-icon icon="fa-solid fa-plus-circle" /> Add to Cycle
                                   </button>
                                   <!-- Add other actions like Edit, Delete? -->
                               </div>
                           </div>
                       </div>
                   </div>
                 </div>
             </div>
          </div>
        </div>
        
        <div class="grid-stack-item" gs-id="schedule" gs-x="8" gs-y="0" gs-w="4" gs-h="12">
          <div :class="['grid-stack-item-content', 'section', 'schedule-section', { collapsed: sectionStates.schedule.collapsed }]" >
             <div class="section-header">
                <div class="drag-handle" title="Move Section">
                    <font-awesome-icon icon="fa-solid fa-ellipsis-h" />
                </div>
                <h4 class="section-title">
                  <font-awesome-icon icon="fa-solid fa-calendar-alt" /> <!-- Added schedule icon -->
                  SCHEDULE
                </h4>
                <div class="section-controls">
                  <button 
                    class="control-button collapse-btn" 
                    @click="toggleCollapse('schedule')" 
                    :title="sectionStates.schedule.collapsed ? 'Expand Section' : 'Collapse Section'"
                  >
                    <font-awesome-icon :icon="['fa-solid', sectionStates.schedule.collapsed ? 'fa-plus' : 'fa-minus']" />
                  </button>
                  <button 
                    class="control-button expand-btn" 
                    @click="expandSection('schedule')" 
                    title="Maximize Section (Not Implemented)"
                  >
                    <font-awesome-icon icon="fa-solid fa-expand-alt" />
                  </button>
                  <button class="control-button" @click="toggleScheduleLock" :title="isScheduleLocked ? 'Unlock Schedule' : 'Lock Schedule'">
                    <font-awesome-icon :icon="isScheduleLocked ? 'fa-solid fa-lock' : 'fa-solid fa-lock-open'" />
                  </button>
                  <button class="control-button" @click="refreshSchedule" title="Refresh Schedule">
                    <font-awesome-icon icon="fa-solid fa-sync" />
                  </button>
                </div>
             </div>
             <div class="section-body schedule-list-container" v-show="!sectionStates.schedule.collapsed">
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
    </div> <!-- End main-content-grid -->

    <!-- III. Bottom Bar: Tabs -->
    <div class="bottom-bar">
      <div class="tab-group">
        <button 
          v-for="tab in drawerTabs" 
          :key="tab.id"
          :class="['tab-button', { active: activeDrawerTab === tab.id }]" 
          @click="toggleDrawer(tab.id)"
          :title="tab.title"
        >
          <font-awesome-icon :icon="tab.icon" />
          <span class="tab-label">{{ tab.label }}</span>
        </button>
      </div>
      <div class="layout-controls">
        <button 
          class="layout-button" 
          @click="toggleLayoutLock" 
          :title="isLayoutLocked ? 'Unlock Layout' : 'Lock Layout'"
        >
          <font-awesome-icon :icon="isLayoutLocked ? 'fa-solid fa-lock' : 'fa-solid fa-lock-open'" />
        </button>
        <button 
          class="layout-button" 
          @click="resetLayout" 
          title="Reset Layout"
        >
          <font-awesome-icon icon="fa-solid fa-undo" />
        </button>
        <button 
          class="layout-button" 
          @click="saveLayout" 
          title="Save Layout"
        >
          <font-awesome-icon icon="fa-solid fa-save" />
        </button>
      </div>
    </div>

    <!-- IV. Contextual Drawer Panel -->
    <div v-if="activeDrawerTab" class="contextual-drawer-panel">
      <div class="drawer-header">
        <div class="drawer-title">
          <font-awesome-icon :icon="getDrawerTabIcon(activeDrawerTab)" />
          <h4>{{ getDrawerTabLabel(activeDrawerTab) }}</h4>
        </div>
        <button @click="activeDrawerTab = null" class="close-drawer-btn">
          <font-awesome-icon icon="fa-solid fa-times" />
        </button>
      </div>
      <div class="drawer-content">
        <div v-if="activeDrawerTab === 'Cycles'" class="drawer-tab-content">
          <div class="tab-header">
            <h5>Configure Cycle Order</h5>
            <p>Drag items to reorder the default playback cycle.</p>
          </div>
          <div class="tab-body">
            <div v-if="loading.cycle" class="loading-state">
              <font-awesome-icon icon="fa-solid fa-spinner" spin />
              <span>Loading cycle...</span>
            </div>
            <div v-else-if="errors.cycle" class="error-state">
              <font-awesome-icon icon="fa-solid fa-exclamation-circle" />
              <span>{{ errors.cycle }}</span>
            </div>
            <draggable 
              v-else
              v-model="cycleItems" 
              tag="ul" 
              item-key="id" 
              class="cycle-config-list"
              handle=".drag-handle"
              ghost-class="ghost"
              :animation="200">
              <template #item="{element}">
                <li class="cycle-config-item">
                  <div class="drag-handle">
                    <font-awesome-icon icon="fa-solid fa-grip-vertical" />
                  </div>
                  <div class="item-info">
                    <span class="item-name">{{ element.name }}</span>
                    <span class="item-id">ID: {{ element.logo_id }}</span>
                  </div>
                  <button @click="removeCycleItem(element.id)" class="remove-btn">
                    <font-awesome-icon icon="fa-solid fa-trash" />
                  </button>
                </li>
              </template>
            </draggable>
          </div>
          <div class="tab-footer">
            <div class="footer-section">
                <!-- REMOVE status message P tag -->
                <!-- <div class="status-message" :class="{ error: saveCycleError }">{{ saveCycleStatus }}</div> -->
                <div class="action-buttons">
                  <button @click="handleSaveCycleOrder" :disabled="loading.cycle">...</button>
                </div>
            </div>
            <hr class="footer-divider">
            <div class="footer-section save-named-cycle">
               <h5>Save Current Order As:</h5>
               <div class="save-named-group">
                  <input type="text" v-model="newCycleGroupName" :disabled="loading.saveNamedCycle"/>
                  <button @click="handleSaveNamedCycle" :disabled="loading.saveNamedCycle">...</button>
               </div>
               <!-- REMOVE status message P tag -->
               <!-- <div class="status-message" :class="{ error: saveNamedCycleError }">{{ saveNamedCycleStatus }}</div> -->
            </div>
             <!-- TODO: Add section to load/manage saved cycles -->
          </div>
        </div>

        <div v-else-if="activeDrawerTab === 'EditAdd'" class="drawer-tab-content">
          <div class="add-edit-forms">
            <!-- Add New Logo Form -->
            <form @submit.prevent="handleAddLogo" class="add-form">
              <h5>Add New Logo</h5>
              <div class="form-group">
                <label for="logo-name">Name:</label>
                <input id="logo-name" type="text" v-model="newLogo.name" required>
              </div>
              <div class="form-group">
                <label for="logo-path">File Path:</label>
                <div class="file-input-group">
                  <input id="logo-path" type="text" v-model="newLogo.path" required readonly placeholder="Click button to select ->">
                  <!-- TODO: Add file picker button -->
                  <button type="button" @click="selectLogoFile" class="file-picker-btn" title="Select Logo Image File">
                    <font-awesome-icon icon="fa-solid fa-folder-open" />
                  </button>
                </div>
              </div>
              <div class="form-group">
                <label for="logo-artist">Artist:</label>
                <select id="logo-artist" v-model="newLogo.artist_id">
                  <option :value="null">Unknown</option>
                  <option v-for="artist in artists" :key="artist.id" :value="artist.id">
                    {{ artist.name }}
                  </option>
                </select>
              </div>
              <div class="form-group">
                <label for="logo-tags">Tags (comma-separated):</label>
                <input id="logo-tags" type="text" v-model="newLogo.tags">
              </div>
              <button type="submit" :disabled="loading.addLogo">Add Logo</button>
              <!-- REMOVE status message P tag -->
              <!-- <p v-if="addLogoStatus" :class="{ error: errors.addLogo }">{{ addLogoStatus }}</p> -->
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
              <!-- REMOVE status message P tag -->
              <!-- <p v-if="addEventStatus" :class="{ error: addEventError }">{{ addEventStatus }}</p> -->
            </form>
          </div>
        </div>

        <div v-else-if="activeDrawerTab === 'Schedule'" class="drawer-tab-content">
          <div class="tab-header">
            <h5>Logo Schedule Editor</h5>
            <p>Configure upcoming logo schedules and DJ sets.</p>
          </div>
          <div class="tab-body placeholder-content">
            <font-awesome-icon icon="fa-solid fa-calendar-alt" />
            <span>Schedule editing functionality coming soon!</span>
            <!-- Placeholder for schedule editor component or logic -->
          </div>
        </div>

        <div v-else-if="activeDrawerTab === 'Files'" class="drawer-tab-content">
          <div class="tab-header">
            <h5>File Browser</h5>
            <p>Browse and manage project-related files.</p>
          </div>
          <div class="tab-body placeholder-content">
            <font-awesome-icon icon="fa-solid fa-folder" />
            <span>File browsing functionality coming soon!</span>
            <!-- Placeholder for file browser component or logic -->
          </div>
        </div>
      </div>
    </div>

    <!-- Notification Area -->
    <div class="notifications-container">
        <transition-group name="notification-fade" tag="div">
            <div 
              v-for="notification in notifications" 
              :key="notification.id" 
              :class="['notification-toast', `notification-${notification.type}`]"
            >
              <div class="notification-content">
                 <font-awesome-icon :icon="getNotificationIcon(notification.type)" />
                 <span>{{ notification.message }}</span>
              </div>
              <button @click="closeNotification(notification.id)" class="close-notification-btn">
                <font-awesome-icon icon="fa-solid fa-times" />
              </button>
            </div>
        </transition-group>
    </div>

  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { invoke } from '@tauri-apps/api/tauri';
import { listen } from '@tauri-apps/api/event'; // Import listen for menu events
import 'gridstack/dist/gridstack.min.css'; // Import Gridstack CSS (Ensure uncommented)
import { GridStack } from 'gridstack'; // Import Gridstack JS
// import 'gridstack/dist/h5/gridstack-dd-native'; // Comment out potentially problematic import
import { appWindow } from '@tauri-apps/api/window'; // Import appWindow
import draggable from 'vuedraggable'; // Import vuedraggable
import { open } from '@tauri-apps/api/dialog'; // <-- Import dialog API
import { convertFileSrc } from '@tauri-apps/api/tauri';

// --- Gridstack State --- 
const grid = ref(null); // Holds the Gridstack instance
const gridLayoutKey = 'vjtools-grid-layout'; // Key for localStorage
const isLayoutLocked = ref(false); // State for layout lock

// --- Search State ---
const isSearchActive = ref(false);
const searchInputRef = ref(null); // Ref for the search input element

// --- Other State --- 
const currentTime = ref(new Date());
const is24HourFormat = ref(true); // Default to 24-hour format
const currentTimeZone = ref('local'); // 'local' or 'UTC'
const clockTimer = ref(null);
const currentDj = ref('None'); // This might not be displayed directly anymore
const currentlyShowing = ref(null); // { id, name, type ('cycle' or 'schedule'), progress (0-100), ... }
const selectedItem = ref(null); 
const activeDrawerTab = ref(null); // Still useful for potential future drawers

const cycleItems = reactive([]);
const galleryItems = reactive([]);
const scheduleItems = reactive([]);
const artists = reactive([]);
const loading = reactive({ 
  cycle: false, gallery: false, schedule: false, artists: false,
  addLogo: false, addArtist: false, saveNamedCycle: false, addEvent: false
});
const errors = reactive({ 
  cycle: null, gallery: null, schedule: null, artists: null
});
const galleryFilter = ref(null); 

// New state for explicit filters (DECLARE HERE)
const gallerySearchTerm = ref('');
const gallerySelectedArtist = ref(null); // null means 'All Artists'

// Add state to track the current cycle index and item start time
const currentCycleIndex = ref(0);
const currentItemStartTime = ref(null); // Date object
const defaultCycleDuration = ref(5); // Default duration in seconds
const currentItem = ref(null);
const currentItemProgress = ref(0);
const currentTimer = ref(null);
const expandedItem = reactive({ id: null, type: null, data: {} });

// Form models
const newLogo = reactive({ name: '', path: '', artist_id: null, tags: '' });
const newEvent = reactive({ time: '', name: '', type: 'dj_set', duration: null, linkedLogoId: '' });

// Add status messages
// const addLogoStatus = ref("");
// const addArtistStatus = ref("");
// const saveCycleStatus = ref("");
// const saveNamedCycleStatus = ref("");

// Add error messages
// const addLogoError = ref(false);
// const addArtistError = ref(false);
// const saveCycleError = ref(false);
// const saveNamedCycleError = ref(false);

// --- Cycle Management (Drawer) ---
// const saveCycleStatus = ref("");
// const saveNamedCycleStatus = ref("");

const newCycleGroupName = ref(''); // For saving named cycles
// const loadingSaveNamedCycle = ref(false);

// State for section collapse/expand
const sectionStates = reactive({
  cycle: { collapsed: false },
  gallery: { collapsed: false },
  schedule: { collapsed: false },
});

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
  let items = [...galleryItems]; // Work with a copy

  // 1. Apply explicit artist filter
  if (gallerySelectedArtist.value !== null) { // Check for null explicitly
    items = items.filter(logo => logo.artist_id === gallerySelectedArtist.value);
  }

  // 2. Apply search term filter (name or tags)
  if (gallerySearchTerm.value.trim()) {
    const searchTerm = gallerySearchTerm.value.trim().toLowerCase();
    items = items.filter(logo => 
      (logo.name && logo.name.toLowerCase().includes(searchTerm)) ||
      (logo.tags && logo.tags.toLowerCase().includes(searchTerm))
    );
  }
  
  // 3. Apply schedule-based filter if active (Example - adapt as needed)
  // This logic might need refinement based on how galleryFilter is set
  if (galleryFilter.value) {
     // Assuming galleryFilter.value holds a DJ name/ID to link via logo.linked_djs
     // items = items.filter(logo => logo.linked_djs?.includes(galleryFilter.value));
  }


  return items;
});

const getArtistName = (artistId) => {
  const artist = artists.find(a => a.id === artistId);
  return artist ? artist.name : 'Unknown';
};

// --- Methods --- 

function formatTime(date) {
  if (!(date instanceof Date)) {
    return '--:--'; // Return placeholder if date is invalid
  }
  const options = {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: !is24HourFormat.value,
    timeZone: currentTimeZone.value === 'UTC' ? 'UTC' : undefined // Use undefined for local
  };
  try {
    // Force locale to something neutral that respects options if browser default is weird
    return date.toLocaleTimeString('en-CA', options);
  } catch (e) {
    console.error("Error formatting time:", e);
    // Fallback to basic formatting if toLocaleTimeString fails
    const hours = (currentTimeZone.value === 'UTC' ? date.getUTCHours() : date.getHours()).toString().padStart(2, '0');
    const minutes = (currentTimeZone.value === 'UTC' ? date.getUTCMinutes() : date.getMinutes()).toString().padStart(2, '0');
    const seconds = (currentTimeZone.value === 'UTC' ? date.getUTCSeconds() : date.getSeconds()).toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }
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

// --- Notification System (Keep as is) --- //
let notificationIdCounter = 0;
function showNotification(message, type = 'info', duration = 4000) { /* ... */ }
function closeNotification(id) { /* ... */ }
function getNotificationIcon(type) { /* ... */ }

// --- Data Fetching (Keep specific fetch functions defined) --- //
async function fetchGallery() { /* ... */ }
async function fetchArtists() { /* ... */ }
async function fetchDefaultCycle() { /* ... */ }
async function fetchSchedule() { /* ... */ }
async function fetchData() { /* ... */ } // Combined fetch for initial load


// --- State Update Logic Helpers (NEW) --- //

function findActiveScheduleItem(now) {
  return scheduleItems.find(item => {
    try {
      const startTime = new Date(item.start_time);
      const endTime = new Date(startTime.getTime() + item.duration * 60 * 1000); 
      return now >= startTime && now < endTime;
    } catch (e) {
      console.error(`Error parsing schedule item times for ID ${item.id}:`, e);
      return false;
    }
  });
}

function determineDisplayFromSchedule(activeScheduleItem, now) {
  if (!activeScheduleItem) return null;
  const linkedLogo = galleryItems.find(logo => logo.id === activeScheduleItem.linked_logo_id);
  if (!linkedLogo) {
    console.warn(`Scheduled item ${activeScheduleItem.name} active, but linked logo ID ${activeScheduleItem.linked_logo_id} not found.`);
    return null; 
  }
  try {
    const startTime = new Date(activeScheduleItem.start_time);
    const endTime = new Date(startTime.getTime() + activeScheduleItem.duration * 60 * 1000);
    const totalDuration = endTime - startTime;
    const elapsed = now - startTime;
    const progress = totalDuration > 0 ? Math.min(100, (elapsed / totalDuration) * 100) : 0;
    const remainingMs = Math.max(0, endTime - now); 
    const displayItem = { ...linkedLogo, id: activeScheduleItem.id, type: 'schedule', scheduleDetails: activeScheduleItem, progress: progress };
    return { displayItem, durationMs: remainingMs };
  } catch (e) {
    console.error(`Error calculating schedule display for ID ${activeScheduleItem.id}:`, e);
    return null;
  }
}

function determineDisplayFromCycle() {
  if (cycleItems.length === 0) return null;
  const currentIndex = currentItem.value && currentItem.value.type === 'cycle' ? cycleItems.findIndex(item => item.id === currentItem.value.id) : -1;
  const nextIndex = (currentIndex + 1) % cycleItems.length;
  const nextCycleItem = cycleItems[nextIndex];
  if (!nextCycleItem) return null; 
  let durationMs = defaultCycleDuration.value * 1000;
  const itemDuration = nextCycleItem.duration; 
  if (itemDuration && typeof itemDuration === 'number' && itemDuration > 0) {
    durationMs = itemDuration * 1000;
    console.log(`Using specific duration for ${nextCycleItem.name}: ${itemDuration}s`);
  } else {
    console.log(`Using default duration for ${nextCycleItem.name}: ${defaultCycleDuration.value}s`);
  }
  const displayItem = { ...nextCycleItem, type: 'cycle', progress: 0 };
  return { displayItem, durationMs };
}

let cycleProgressInterval = null;
function startCycleProgressCalculation(durationMs) {
  clearInterval(cycleProgressInterval); 
  currentItemProgress.value = 0;
  if (durationMs <= 0) return;
  const intervalTime = 50; 
  const totalSteps = Math.max(1, durationMs / intervalTime);
  let currentStep = 0;
  cycleProgressInterval = setInterval(() => {
    currentStep++;
    const progress = (currentStep / totalSteps) * 100;
    currentItemProgress.value = Math.min(progress, 100);
    if (currentStep >= totalSteps) {
      clearInterval(cycleProgressInterval);
    }
  }, intervalTime);
}

// Refactored Main state update function (NEW)
function updateCurrentState_New() { // Temporary name
  clearTimeout(currentTimer.value); 
  clearInterval(cycleProgressInterval); 

  const now = new Date();
  let displayInfo = null;
  let nextCheckDelayMs = 5000; 

  const activeScheduleItem = findActiveScheduleItem(now);
  displayInfo = determineDisplayFromSchedule(activeScheduleItem, now);

  if (!displayInfo) {
    displayInfo = determineDisplayFromCycle();
  }

  if (displayInfo) {
    currentItem.value = displayInfo.displayItem;
    nextCheckDelayMs = displayInfo.durationMs;
    
    if (currentItem.value.type === 'schedule') {
      currentItemProgress.value = currentItem.value.progress;
    } else if (currentItem.value.type === 'cycle') {
      startCycleProgressCalculation(displayInfo.durationMs);
    }
    currentlyShowing.value = { ...currentItem.value }; // Update template ref
    console.log(`Showing: ${currentItem.value.name} (${currentItem.value.type}), next check in ${nextCheckDelayMs}ms`);
  } else {
    currentItem.value = null;
    currentlyShowing.value = null;
    currentItemProgress.value = 0; 
    console.log("Nothing to display, checking again in 5s");
    nextCheckDelayMs = 5000;
  }

  const clampedDelay = Math.max(100, nextCheckDelayMs); 
  currentTimer.value = setTimeout(updateCurrentState, clampedDelay); // Use final name here
}

// --- Existing updateCurrentState (TO BE COMMENTED OUT) --- //
/*
function updateCurrentState() {
  clearTimeout(currentTimer.value);
  currentItemProgress.value = 0;
        // Optionally clear status after a delay
        setTimeout(() => { saveCycleStatus.value = ""; }, 3000);
    }
}
*/

// --- Utility Functions (Keep as is) --- //
function toggleTimeFormat() { /* ... */ }
function toggleTimeZone() { /* ... */ }
function getGalleryItemStatusClass(logo) { /* ... */ }

// --- Gridstack Methods (Restore Implementations) --- //
function initializeGrid() {
  grid.value = GridStack.init({
    float: false, 
    cellHeight: 'auto',
    margin: 10, 
    handle: '.drag-handle',
    disableResize: isLayoutLocked.value,
    disableDrag: isLayoutLocked.value, 
    resizable: { handles: 'e, se, s, sw, w, nw, n, ne' }
  });

  loadLayout();
  grid.value.on('change', (event, items) => {
      if (!isLayoutLocked.value) { 
        console.log('Grid changed by user: Saving layout');
        saveLayout();
      }
  });
}

function saveLayout() {
  if (!grid.value) return;
  // Save only the layout structure (x, y, w, h, id), not content
  const layout = grid.value.save(false); 
  console.log('Saving layout:', layout);
  try {
    localStorage.setItem(gridLayoutKey, JSON.stringify(layout));
    showNotification("Layout saved.", "info", 2000); // Brief feedback
  } catch (e) {
    console.error("Failed to save layout to localStorage:", e);
    showNotification("Failed to save layout.", "error");
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
       console.log('No saved layout found, using default HTML layout.');
       // Gridstack uses attributes from HTML as default if nothing loaded
    }
  } catch (e) {
    console.error("Failed to load layout from localStorage:", e);
    showNotification("Failed to load saved layout.", "error");
    // Don't reset here, let it use HTML default
  }
}

function resetLayout() {
  if (!grid.value) return;
  console.log('Resetting layout to default');
  // Clear saved layout
  try { localStorage.removeItem(gridLayoutKey); } catch (e) {}
  
  // Define the default layout explicitly
  const defaultLayout = [
      { id: 'cycle', x: 0, y: 0, w: 8, h: 3 },
      { id: 'gallery', x: 0, y: 3, w: 8, h: 9 },
      { id: 'schedule', x: 8, y: 0, w: 4, h: 12 },
      // Add defaults for any other grid items if they exist
  ];
  // Programmatically update grid items to match default
  grid.value.batchUpdate(); // Improve performance for multiple updates
  grid.value.removeAll(false); // Remove existing widgets from layout without destroying DOM nodes
  // Re-add widgets with default attributes
  defaultLayout.forEach(item => {
      const element = document.querySelector(`.grid-stack-item[gs-id='${item.id}']`);
      if (element) {
          grid.value.addWidget(element, item);
      }
  });
  grid.value.commit(); // Apply updates

  showNotification("Layout reset to default.", "info");
  // No need to save default layout to localStorage, let it load from HTML next time
}

function toggleLayoutLock(lockState) {
    if (!grid.value) return;
    const shouldLock = typeof lockState === 'boolean' ? lockState : !isLayoutLocked.value;
    isLayoutLocked.value = shouldLock;

    // Gridstack's enable/disable should handle drag/resize together
    if (isLayoutLocked.value) {
        grid.value.disable(); 
        console.log("Layout LOCKED");
    } else {
        grid.value.enable(); 
        console.log("Layout UNLOCKED");
    }
    
    // Explicitly update resizable option (might be redundant but safer)
    grid.value.resizable('.grid-stack-item', !isLayoutLocked.value);

    try {
      appWindow.menuItems()['toggle-layout-lock'].then(item => {
          item?.setChecked(isLayoutLocked.value);
      });
    } catch (e) { console.error("Failed to update menu check state:", e); }
}


// --- Menu Event Listeners (Restore Implementation using correct IDs) --- //
async function setupMenuListeners() {
    // Initial sync of lock state with menu 
    try {
        const item = await appWindow.menuItems()['toggle-layout-lock'];
        if (item) {
            const checked = await item.isChecked();
            isLayoutLocked.value = checked;
            // Apply initial lock state to grid if already initialized
            if (grid.value) {
                if (isLayoutLocked.value) grid.value.disable();
                else grid.value.enable();
            }
        }
    } catch (e) { console.error("Failed to get initial menu check state:", e); }

    // Listen for clicks
    await listen('tauri://menu', (event) => {
        console.log('Menu item clicked:', event.payload);
        const menuItemId = event.payload?.id || event.payload; // Adapt based on payload structure
        
        switch (menuItemId) {
            case 'save-layout':
                saveLayout();
                break;
            case 'reset-layout':
                resetLayout();
                break;
            case 'toggle-layout-lock':
                 // Checkbox events might not include ID in payload, check state directly
                 appWindow.menuItems()['toggle-layout-lock'].then(item => {
                    item?.isChecked().then(checked => {
                       // IMPORTANT: The checked state *already reflects* the click
                       // So we call our function with this new state
                       toggleLayoutLock(checked); 
                    });
                 }).catch(e => console.error("Failed to handle toggle-layout-lock:", e));
                break;
            // Add other menu item cases if needed
            // case 'learn-more': ... break;
        }
    });
}

// --- Drawer Toggle (Keep as is) --- //
function toggleDrawer(tabName) { /* ... */ }

// --- File Picker (Keep as is) --- //
async function selectLogoFile() { /* ... */ }

// --- Expanded Item Logic (Keep as is) --- //
function toggleExpand(item, type) { /* ... */ }
async function saveExpandedItemDetails() { /* ... */ }

// --- Cycle Management (Keep as is) --- //
function removeCycleItem(itemId) { /* ... */ }
async function handleSaveCycleOrder() { /* ... */ }
async function handleSaveNamedCycle() { /* ... (Implementation using notifications) */ }
function addToCycle(logoItemToAdd) { /* ... */ }

// --- Add/Edit Handlers (Keep UNCHANGED for now) --- //
async function handleAddLogo() { /* ... uses old fetchData ... */ }
async function handleAddArtist() { /* ... uses old fetchData ... */ }
async function handleAddNewScheduleEvent() { /* ... uses old fetchData ... */ }

// --- Lifecycle & Timer (Keep as is, calls new fetchData) --- //
onMounted(async () => {
  clockTimer.value = setInterval(() => { currentTime.value = new Date(); }, 1000);
  initializeGrid();
  await fetchData(); // Calls the new combined fetch
  // The fetchData function should call the *final* updateCurrentState
  setupMenuListeners();
});

onUnmounted(() => {
  clearInterval(clockTimer.value);
  clearTimeout(currentTimer.value);
  clearInterval(cycleProgressInterval); // Ensure progress interval is cleared
  if (grid.value) { grid.value.destroy(false); }
});

// RENAME Function
function updateCurrentState() {
  updateCurrentState_New();
}

// Toggle Collapse State
function toggleCollapse(sectionId) {
  if (sectionStates[sectionId]) {
    sectionStates[sectionId].collapsed = !sectionStates[sectionId].collapsed;
    // Optional: Adjust grid item height using API if needed, 
    // but CSS approach with v-show is simpler initially.
    // nextTick(() => { adjustGridItemHeight(sectionId); });
  }
}

// Placeholder for Expand Functionality
function expandSection(sectionId) {
  console.log(`Expand section requested for: ${sectionId} (Not Implemented)`);
  showNotification(`Maximize functionality for ${sectionId} section is not yet implemented.`, 'info');
  // TODO: Implement logic to resize grid item, potentially hide others?
}

// Placeholder/Example functions for existing controls shown in template
function toggleCycleLock() { console.log("Toggle Cycle Lock"); }
function refreshCycle() { console.log("Refresh Cycle"); }
function toggleGalleryFilter() { console.log("Toggle Gallery Filter"); }
function toggleScheduleLock() { console.log("Toggle Schedule Lock"); }
function refreshSchedule() { console.log("Refresh Schedule"); }

// --- Search Activation/Deactivation ---
const activateSearch = async () => {
  isSearchActive.value = true;
  await nextTick(); // Wait for input to become visible
  searchInputRef.value?.focus();
};

const deactivateSearch = () => {
  // Deactivate only if the input is empty after losing focus
  // Use a small timeout to allow clicking potential clear buttons if added later
  setTimeout(() => {
      if (!gallerySearchTerm.value) {
         isSearchActive.value = false;
      }
  }, 150);
};

const cancelSearch = () => {
   gallerySearchTerm.value = '';
   isSearchActive.value = false;
   // Optionally blur the input if needed
   searchInputRef.value?.blur();
};

</script>

<style>
/* Import Gridstack base CSS */
@import 'gridstack/dist/gridstack.min.css';

/* Optional: Gridstack extras */
/* @import 'gridstack/dist/gridstack-extra.min.css'; */

/* --- Base Layout Styles (Restored) --- */
.live-control-container {
  display: flex;
  flex-direction: column;
  height: 100vh; 
  background-color: var(--background-color, #121212); 
  color: var(--text-color, #e0e0e0); 
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  overflow: hidden; /* Prevent body scroll, grid handles internal */
}

.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 20px;
  background-color: var(--secondary-color, #1e1e1e);
  border-bottom: 1px solid var(--border-color, #333);
  flex-shrink: 0; /* Prevent shrinking */
}

.main-content-grid { 
  flex-grow: 1;
  padding: 10px; /* Margin around the grid */
  margin: 0; 
}

.bottom-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 20px;
  background-color: var(--secondary-color, #1e1e1e);
  border-top: 1px solid var(--border-color, #333);
  flex-shrink: 0; /* Prevent shrinking */
  margin-top: auto; /* Push to bottom if content doesn't fill height */
}

/* --- Gridstack Integration --- */
.grid-stack {
    /* background: #404040; */ /* Optional background for grid area */
}

.grid-stack-item > .grid-stack-item-content {
    background-color: var(--item-bg-color, #2a2a2a); 
    border-radius: var(--border-radius, 4px);
    border: 1px solid var(--border-color, #333);
    overflow: hidden; 
    display: flex; 
    flex-direction: column; 
    color: var(--text-color, #e0e0e0);
}

.grid-stack-item-content.section {
    padding: 0; 
    height: 100%;
    border: none; 
}

/* Adjust padding for section content within grid items */
.grid-stack-item-content .section-header {
     padding: 10px 15px; /* Padding for header */
     margin-bottom: 0; /* Remove default margin if any */
     border-bottom: 1px solid var(--border-color, #333); /* Separator */
}
.grid-stack-item-content .section-body,
.grid-stack-item-content .item-container, 
.grid-stack-item-content .schedule-list-container {
    padding: 15px; /* Padding for main content */
    flex-grow: 1; /* Allow body to fill space */
    overflow-y: auto; /* Allow internal scroll */
}


/* --- Top Bar Content --- */
.now-showing {
  flex: 1;
  margin-right: 20px;
  min-width: 0; /* Prevent flex item from overflowing */
}

.now-showing-title {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--text-color-secondary, #aaa);
  margin-bottom: 4px;
}

.now-showing-preview {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.preview-content {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.preview-content i {
  color: var(--primary-color);
  flex-shrink: 0;
}

.progress-bar-container {
  height: 4px;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background-color: var(--primary-color);
  transition: width 0.3s ease;
}

.time-display {
  display: flex;
  align-items: center;
  gap: 15px;
}

.system-time {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 500;
  font-family: monospace;
}

.system-time i {
  font-size: 16px;
  opacity: 0.7;
}

/* Time Urgency Classes */
.time-normal { color: var(--text-color); }
.time-warning { color: var(--warning-color, orange); }
.time-urgent { color: var(--error-color, red); font-weight: bold; }


/* --- Shared Component Styles (Keep all previously added styles below) --- */

/* Section Styles */
.section {
    /* Base styles if needed, often handled by grid-item-content now */
}
.section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-left: 5px; /* Adjust if needed for handle */
    position: relative;
    /* Prevent selection on the whole header potentially */
    /* user-select: none; */ 
}
.section-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 1.1em;
    font-weight: 500;
    color: var(--text-color);
    flex-grow: 1;
    /* Prevent text selection on title */
    user-select: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
}
.section-title i {
    color: var(--primary-color);
    font-size: 1em;
}
.section-controls {
    display: flex;
    gap: 8px;
}
.section-body {
    /* Styles for the main content area of a section */
    /* Typically handles flex-grow, overflow */
}

/* Item Box Styles */
.item-box {
    background-color: rgba(255, 255, 255, 0.05);
    border-radius: var(--border-radius);
    padding: 12px;
    cursor: pointer;
    transition: all var(--transition-speed);
    border: 1px solid transparent; /* Start transparent */
    display: flex;
    flex-direction: column; /* Stack content and progress */
}
.item-box:hover {
    background-color: rgba(255, 255, 255, 0.1);
    transform: translateY(-1px);
}
.item-box.active {
    border-color: var(--primary-color);
    box-shadow: 0 0 0 1px var(--primary-color);
}
.item-box.selected {
    background-color: rgba(33, 150, 243, 0.15); /* Slightly more prominent selection */
    border-color: rgba(33, 150, 243, 0.5);
}
.item-content { flex-grow: 1; /* Allow content to push progress bar down */ }
.item-header { display: flex; align-items: center; gap: 8px; margin-bottom: 5px; }
.item-name { font-weight: 500; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.item-meta { display: flex; gap: 12px; font-size: 12px; opacity: 0.7; }
.lock-icon { color: var(--warning-color); }
.item-box .progress-bar-container { margin-top: 8px; /* Space above progress bar */ }

/* Cycle Section Specific */
.cycle-section .item-container { padding: 5px 15px 15px 15px; /* Adjust padding */ }
.horizontal-scroll { display: flex; gap: 12px; overflow-x: auto; padding-bottom: 8px; min-height: 80px; /* Ensure some height */ }
.cycle-item { min-width: 180px; flex-shrink: 0; }

/* Gallery Section Specific */
.gallery-section .section-body { padding: 0; /* Let container handle padding */ }
.gallery-grid-container { /* Grid layout defined previously */ }
.gallery-item-content { /* Handled by grid-stack-item-content */ }
.gallery-item { /* Item box styles apply */ height: 100px; /* Fixed height */ }

/* Schedule Section Specific */
.schedule-list-container { /* Base padding applied by grid context */ }
.schedule-list { list-style: none; padding: 0; margin: 0; }
.schedule-list li { display: flex; gap: 10px; padding: 8px 5px; border-bottom: 1px solid var(--border-color); cursor: pointer; transition: background-color var(--transition-speed); }
.schedule-list li:hover { background-color: rgba(255, 255, 255, 0.05); }
.schedule-list li.selected { background-color: rgba(33, 150, 243, 0.15); }
.schedule-list .time { font-weight: 500; width: 70px; text-align: right; flex-shrink: 0; }
.schedule-list .name { flex-grow: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* State Indicators */
.loading-state, .error-state, .empty-state { /* Styles defined previously */ }

/* Item Details Styles */
.item-details { /* Base styles defined previously */ }
.gallery-details { /* Gallery specific details styles defined previously */ }

/* Bottom Bar and Drawer Styles */
/* All styles for .bottom-bar, .tab-group, .tab-button, .layout-controls, .layout-button */
/* .contextual-drawer-panel, .drawer-header, .drawer-title, .close-drawer-btn, .drawer-content */
/* .tab-header, .tab-body, .cycle-config-list, .cycle-config-item, .drag-handle, .item-info */
/* .remove-btn, .tab-footer, .footer-section, .footer-divider, .save-named-cycle, .save-named-group */
/* .status-message, .action-buttons, .ghost (draggable placeholder) */
/* KEEP ALL THESE STYLES */

/* Add/Edit Form Styles */
/* Keep styles for .add-edit-forms, .add-form, .form-group, inputs, selects, buttons, .file-input-group, .file-picker-btn */

/* Gallery Filter Styles */
.filter-select,
.filter-input { /* Base style for original input, keep if needed elsewhere */
  padding: 4px 8px;
  border-radius: 4px;
  background-color: var(--background-color);
  border: 1px solid var(--border-color);
  color: var(--text-color);
  font-size: 13px;
  height: 28px; /* Match control buttons */
  box-sizing: border-box;
}

.filter-select {
  cursor: pointer;
}

/* Styles for Dynamic Search */
.search-container {
  display: flex;
  align-items: center;
}

.search-toggle-btn {
  /* Uses general .control-button styles */
}

.search-filter-dynamic {
  padding: 4px 8px;
  border-radius: 4px;
  background-color: var(--background-color);
  border: 1px solid var(--border-color);
  color: var(--text-color);
  font-size: 13px;
  height: 28px;
  box-sizing: border-box;
  width: 0;
  opacity: 0;
  padding-left: 0;
  padding-right: 0;
  border-color: transparent;
  transition: width 0.3s ease, opacity 0.3s ease, padding 0.3s ease, border-color 0.3s ease;
  overflow: hidden; /* Prevent text showing during transition */
}

.search-container.active .search-filter-dynamic {
  width: 150px; /* Adjust width as needed */
  opacity: 1;
  padding-left: 8px;
  padding-right: 8px;
  border-color: var(--border-color);
  margin-left: 5px; /* Space between button and input when active */
}

/* Ensure controls container adapts */
.section-controls {
    /* display: flex; */ /* Already set */
    /* gap: 8px; */ /* Already set */
    /* align-items: center; */ /* Ensure vertical alignment */
}


/* Notification Styles */
.notifications-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1000;
}

/* Gridstack Drag Handle Style Update */
.drag-handle {
    cursor: move;
    color: var(--text-color-secondary, #aaa);
    padding: 5px 8px 5px 5px; 
    margin-right: 5px; 
    opacity: 0.3; 
    transition: opacity var(--transition-speed);
    position: relative; 
    z-index: 2; /* Increased z-index from 1 to 2 */
    /* Prevent text selection on handle */
    user-select: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
}
/* ... drag handle hover styles ... */
.drag-handle i {
  font-size: 13px;
  font-family: 'Font Awesome 6 Free', 'Font Awesome 6 Brands' !important;
  font-weight: 900 !important; /* Solid icons */
  display: inline-block !important;
  font-style: normal !important;
  font-variant: normal !important;
  text-rendering: auto !important;
  -webkit-font-smoothing: antialiased !important;
  line-height: 1; /* Ensure consistent line height */
  vertical-align: middle; /* Align icon vertically */
}

/* Gridstack Resize Handle Styling - Revised */

/* Base handle - transparent clickable area */
.grid-stack-item > .ui-resizable-handle {
    background: transparent;
    border: none;
    position: absolute;
    z-index: 20; /* Above drag handle and content */
    width: 16px; /* Slightly larger area for easier hover */
    height: 16px;
}

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
.grid-stack-item > .ui-resizable-handle::before,
.grid-stack-item > .ui-resizable-handle::after {
    content: '';
    position: absolute;
    background-color: var(--text-color-secondary, #aaa); /* Grey color */
    opacity: 0; /* Invisible initially */
    transition: opacity 0.15s ease-in-out;
    border-radius: 1px;
}

/* Show lines on handle hover */
.grid-stack-item > .ui-resizable-handle:hover::before,
.grid-stack-item > .ui-resizable-handle:hover::after {
    opacity: 0.9;
}

/* Edge Line Styles (using ::after) */
.grid-stack-item > .ui-resizable-e::after, 
.grid-stack-item > .ui-resizable-w::after {
    top: 25%; height: 50%; width: 3px; 
}
.grid-stack-item > .ui-resizable-e::after { right: 4px; }
.grid-stack-item > .ui-resizable-w::after { left: 4px; }

.grid-stack-item > .ui-resizable-s::after, 
.grid-stack-item > .ui-resizable-n::after {
    left: 25%; width: 50%; height: 3px; 
}
.grid-stack-item > .ui-resizable-s::after { bottom: 0; }
.grid-stack-item > .ui-resizable-n::after { top: 4px; }

/* Corner Line Styles (using ::before and ::after) */
/* Vertical part */
.grid-stack-item > .ui-resizable-se::before,
.grid-stack-item > .ui-resizable-sw::before,
.grid-stack-item > .ui-resizable-ne::before,
.grid-stack-item > .ui-resizable-nw::before {
    width: 3px; height: 12px;
}
/* Horizontal part */
.grid-stack-item > .ui-resizable-se::after,
.grid-stack-item > .ui-resizable-sw::after,
.grid-stack-item > .ui-resizable-ne::after,
.grid-stack-item > .ui-resizable-nw::after {
    width: 12px; height: 3px;
}

/* Positioning the corner lines */
.grid-stack-item > .ui-resizable-se::before { bottom: 0; right: 4px; }
.grid-stack-item > .ui-resizable-se::after  { bottom: 4px; right: 0; }

.grid-stack-item > .ui-resizable-sw::before { bottom: 0; left: 4px; }
.grid-stack-item > .ui-resizable-sw::after  { bottom: 4px; left: 0; }

.grid-stack-item > .ui-resizable-ne::before { top: 0; right: 4px; }
.grid-stack-item > .ui-resizable-ne::after  { top: 4px; right: 0; }

.grid-stack-item > .ui-resizable-nw::before { top: 0; left: 4px; }
.grid-stack-item > .ui-resizable-nw::after  { top: 4px; left: 0; }


/* Hide handles when locked */
.grid-stack.grid-stack-locked > .grid-stack-item > .ui-resizable-handle {
    display: none !important;
}

/* Styles for Section Controls */
.section-controls {
    display: flex;
    gap: 5px; /* Slightly smaller gap */
    margin-left: auto; /* Push controls to the right */
}

.control-button {
  width: 28px; /* Slightly smaller buttons */
  height: 28px;
  border-radius: 4px;
  background: transparent;
  border: 1px solid transparent; /* Transparent border initially */
  color: var(--text-color-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-speed);
}

.control-button:hover {
  background-color: rgba(255, 255, 255, 0.1);
  border-color: var(--border-color);
  color: var(--text-color);
}

.control-button i {
  font-size: 13px;
  font-family: 'Font Awesome 6 Free', 'Font Awesome 6 Brands' !important;
  font-weight: 900 !important; /* Solid icons */
  display: inline-block !important;
  font-style: normal !important;
  font-variant: normal !important;
  text-rendering: auto !important;
  -webkit-font-smoothing: antialiased !important;
  line-height: 1; /* Ensure consistent line height */
  vertical-align: middle; /* Align icon vertically */
}

/* Styling for collapsed state */
.grid-stack-item-content.collapsed {
   /* Optional: Add visual indicator like reduced opacity or border */
   min-height: 40px; /* Ensure header is still visible */
   height: auto !important; /* Override potential fixed height from grid */
}

/* v-show handles hiding the body, no extra CSS needed for that */

</style>