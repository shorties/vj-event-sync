<template>
  <div class="live-control-container">
    <!-- I. Top Bar: Now Playing Info -->
    <div class="top-bar">
      <div class="now-playing" :class="{ 'is-collapsed': !isExpanded }">
        <div class="now-playing-header" @click="toggleExpand">
          <div class="header-left">
            <font-awesome-icon :icon="currentlyShowing?.icon || 'fa-solid fa-play-circle'" />
            <span class="header-title">NOW PLAYING</span>
            <!-- Source Indicator Icon -->
            <span v-if="currentlyShowing?.source" class="source-indicator" :title="`Source: ${currentlyShowing.source}`">
              <font-awesome-icon v-if="currentlyShowing.source === 'cycle'" icon="fa-solid fa-sync" />
              <font-awesome-icon v-else-if="currentlyShowing.source === 'schedule'" icon="fa-solid fa-calendar-alt" />
              <font-awesome-icon v-else-if="currentlyShowing.source === 'manual'" icon="fa-solid fa-hand-pointer" />
              <font-awesome-icon v-else-if="currentlyShowing.source === 'gallery'" icon="fa-solid fa-th-large" />
            </span>
            <span v-if="!isExpanded && currentlyShowing" class="current-info">: {{ currentlyShowing.name }}</span>
          </div>
          <div class="header-right">
            <div class="progress-pill" v-if="currentlyShowing">
              {{ Math.round(currentlyShowing.progress) }}%
            </div>
            <button class="expand-toggle">
              <font-awesome-icon :icon="isExpanded ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down'" />
            </button>
          </div>
        </div>

        <transition name="expand">
          <div v-show="isExpanded" class="now-playing-content"
            :class="{ 'dragging-over': isDraggingOverNowPlaying }"
            @dragover.prevent 
            @drop="handleDropOnNowPlaying"
            @dragenter.prevent="handleDragEnterNowPlaying"
            @dragleave.prevent="handleDragLeaveNowPlaying"
          >
            <div class="preview-content">
              <div class="preview-area">
                <!-- Add preview component here later -->
                <div class="preview-placeholder" v-if="currentlyShowing">
                  <img v-if="isImage(currentlyShowing.path)" :src="currentlyShowing.path" alt="Preview" />
                  <video v-else :src="currentlyShowing.path" muted></video>
                </div>
                <div v-else class="empty-preview">
                  <font-awesome-icon icon="fa-solid fa-inbox" />
                  <span>No content playing</span>
                </div>
              </div>
              <div class="progress-bar-container">
                <div class="progress-bar" :style="{ width: currentlyShowing?.progress + '%' || '0%' }"></div>
              </div>
            </div>
          </div>
        </transition>
      </div>
    </div>

    <!-- II. Main Content: Vertical Layout -->
    <div class="main-content-area">
      <!-- A. Cycle Queue Section -->
      <div :class="['section', 'cycle-section', { collapsed: sectionStates.cycle.collapsed }]">
        <div class="section-header">
          <div class="drag-handle" title="Move Section">
            <font-awesome-icon icon="fa-solid fa-ellipsis-h" />
          </div>
          <h4 class="section-title">
            <font-awesome-icon icon="fa-solid fa-sync" />
            CYCLE
          </h4>
          <div class="section-controls">
            <!-- Local Play/Pause Button -->
            <button 
              :class="['control-button', 'play-pause-btn', { 'active': isCyclePlaying }]" 
              @click="toggleCyclePlayback" 
              :title="isCyclePlaying ? 'Pause Cycle' : 'Play Cycle'"
            >
              <font-awesome-icon :icon="['fa-solid', isCyclePlaying ? 'fa-pause' : 'fa-play']" />
            </button>
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
        <div class="section-body item-container horizontal-scroll"
          :class="{ 'dragging-over': isDraggingOverCycle }"
          v-show="!sectionStates.cycle.collapsed"
          @dragover.prevent
          @dragenter.prevent="handleDragEnterCycle"
          @dragleave.prevent="handleDragLeaveCycle"
          @drop.prevent="handleDropOnCycle"
        >
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
          <div v-else v-for="(item, index) in cycleItems" 
               :key="item.id" 
               :class="['item-box cycle-item', item.status, { 
                   active: currentlyShowing?.id === item.id && currentlyShowing?.source === 'cycle', 
                   selected: selectedItem?.id === item.id,
                   'next-up': nextCycleItem && item.id === nextCycleItem.id, // Add next-up class
                   expanded: expandedItem.id === item.id,
                   'drag-over': dragOverIndex === index // Class for visual feedback
               }]" 
               draggable="true"                             
               @dragstart="handleCycleDragStart(item, index, $event)" 
               @dragover.prevent="handleCycleDragOver(index, $event)"
               @dragleave="handleCycleDragLeave()"
               @drop.prevent="handleCycleDrop(index, $event)"    
               @click="toggleSelectItem(item)">
            <!-- Thumbnail Area -->
            <div class="item-thumbnail">
              <img v-if="item.path && isImage(item.path)" :src="item.path" alt="Logo Preview" @error="handleImageError" />
              <video v-else-if="item.path" :src="item.path" muted playsinline preload="metadata"></video>
              <div v-else class="thumbnail-placeholder">
                <font-awesome-icon icon="fa-solid fa-photo-film" />
              </div>
            </div>
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
      <!-- B. Scheduler Section -->
      <div :class="['section', 'schedule-section', { collapsed: sectionStates.schedule.collapsed }]">
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
    </div> <!-- End main-content-area -->

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
            </div>
          </div>
        </div>

        <div v-else-if="activeDrawerTab === 'EditAdd'" class="drawer-tab-content">
          <div class="tab-header">
            <h5>Edit/Add Content</h5>
            <p>Add new content or edit existing items.</p>
          </div>
          <div class="tab-body">
            <form class="edit-form" @submit.prevent="handleSubmit">
              <div class="form-group">
                <label>Title</label>
                <input type="text" v-model="editForm.title" placeholder="Enter title" required>
              </div>
              
              <div class="form-group">
                <label>Artist</label>
                <input type="text" v-model="editForm.artist" placeholder="Enter artist name" required>
              </div>
              
              <div class="form-group">
                <label>Duration</label>
                <input type="text" v-model="editForm.duration" placeholder="HH:MM:SS" required>
              </div>
              
              <div class="form-group">
                <label>Media File</label>
                <div class="file-input">
                  <button type="button" @click="handleFileSelect">
                    <font-awesome-icon icon="fa-solid fa-upload" />
                    Choose File
                  </button>
                  <span v-if="editForm.file">{{ editForm.file }}</span>
                  <span v-else class="placeholder">No file selected</span>
                </div>
              </div>
              
              <div class="form-group">
                <label>Tags</label>
                <div class="tags-input">
                  <div class="selected-tags">
                    <span v-for="tag in editForm.tags" :key="tag" class="tag">
                      {{ tag }}
                      <button type="button" @click="removeTag(tag)">
                        <font-awesome-icon icon="fa-solid fa-times" />
                      </button>
                    </span>
                  </div>
                  <div class="available-tags">
                    <button 
                      type="button"
                      v-for="tag in availableTags" 
                      :key="tag"
                      @click="addTag(tag)"
                      :disabled="editForm.tags.includes(tag)">
                      {{ tag }}
                    </button>
                  </div>
                </div>
              </div>
              
              <div class="form-group">
                <label>Notes</label>
                <textarea v-model="editForm.notes" placeholder="Enter any additional notes"></textarea>
              </div>
              
              <div class="form-actions">
                <button type="submit" class="submit-btn">
                  <font-awesome-icon icon="fa-solid fa-save" />
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>

        <div v-else-if="activeDrawerTab === 'Schedule'" class="drawer-tab-content">
          <div class="tab-header">
            <h5>Schedule</h5>
            <p>Manage your broadcast schedule.</p>
            <button class="add-schedule-btn" @click="addScheduleItem">
              <font-awesome-icon icon="fa-solid fa-plus" />
              Add Show
            </button>
          </div>
          <div class="tab-body">
            <div class="schedule-grid">
              <div class="time-column">
                <div class="grid-header">Time</div>
                <div v-for="time in timeSlots" :key="time" class="time-slot">
                  {{ time }}
                </div>
              </div>
              <div v-for="day in days" :key="day" class="day-column">
                <div class="grid-header">{{ day }}</div>
                <div class="day-slots">
                  <div v-for="item in scheduleItems" 
                       v-if="item.days.includes(day)"
                       :key="item.id"
                       class="schedule-item"
                       :style="{
                         top: `${(parseInt(item.start.split(':')[0]) * 60) + parseInt(item.start.split(':')[1])}px`,
                         height: `${((parseInt(item.end.split(':')[0]) * 60) + parseInt(item.end.split(':')[1])) - 
                                  ((parseInt(item.start.split(':')[0]) * 60) + parseInt(item.start.split(':')[1]))}px`
                       }">
                    <div class="item-content">
                      <h6>{{ item.title }}</h6>
                      <p>{{ item.start }} - {{ item.end }}</p>
                      <button class="remove-btn" @click="removeScheduleItem(item.id)">
                        <font-awesome-icon icon="fa-solid fa-times" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-else-if="activeDrawerTab === 'Files'" class="drawer-tab-content">
          <div class="tab-header">
            <h5>File Browser</h5>
            <p>Browse and manage project-related files.</p>
          </div>
          <div class="tab-body">
            <FileExplorer />
          </div>
        </div>

        <div v-else-if="activeDrawerTab === 'Settings'" class="drawer-tab-content">
          <div class="tab-header">
            <h5>Settings</h5>
            <p>Customize your VJ.Tools experience.</p>
          </div>
          <div class="tab-body">
            <div class="settings-form">
              <div class="setting-group">
                <h6>Appearance</h6>
                <div class="setting-item">
                  <label>Theme</label>
                  <select v-model="settings.theme" @change="updateSetting('theme', $event.target.value)">
                    <option value="system">System</option>
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                  </select>
                </div>
                <div class="setting-item">
                  <label>Compact Mode</label>
                  <input type="checkbox" v-model="settings.compactMode" @change="updateSetting('compactMode', $event.target.checked)">
                </div>
              </div>
              <div class="setting-group">
                <h6>Preferences</h6>
                <div class="setting-item">
                  <label>Auto Save</label>
                  <input type="checkbox" v-model="settings.autoSave" @change="updateSetting('autoSave', $event.target.checked)">
                </div>
                <div class="setting-item">
                  <label>Notifications</label>
                  <input type="checkbox" v-model="settings.notifications" @change="updateSetting('notifications', $event.target.checked)">
                </div>
              </div>
            </div>
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

    <!-- Now Playing Section -->
    <div class="now-playing-container" :class="{ 'is-collapsed': !isExpanded }">
      <div class="section-header" @click="toggleExpand">
        <div class="header-left">
          <font-awesome-icon :icon="['fas', 'play-circle']" />
          <span>Now Playing</span>
          <span v-if="!isExpanded && currentItem" class="collapsed-info">: {{ currentItem.name }}</span>
        </div>
        <button class="expand-toggle-btn">
          <font-awesome-icon :icon="isExpanded ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down'" />
        </button>
      </div>
      <transition name="expand">
        <div v-show="isExpanded" class="now-playing-content">
          <div v-if="!currentItem" class="empty-state">
            <font-awesome-icon icon="fa-solid fa-inbox" class="empty-state-icon" />
            <p>Nothing playing. Drag items to the cycle.</p>
          </div>
          <div v-else>
            <h4>{{ currentItem.name }}</h4>
            <p>Progress: {{ currentItem.progress }}%</p>
          </div>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick, watch, shallowRef } from 'vue';
import { invoke } from '@tauri-apps/api/tauri';
import { getCurrent } from '@tauri-apps/api/window';
import { listen } from '@tauri-apps/api/event';
import { library } from '@fortawesome/fontawesome-svg-core';
import { faChevronUp, faChevronDown, faInbox, faPlayCircle, faClock, faEllipsisH } from '@fortawesome/free-solid-svg-icons';
import 'gridstack/dist/gridstack.min.css';
import { useModuleStore } from '../stores/modules';

// Add necessary icons
library.add(faChevronUp, faChevronDown, faInbox, faPlayCircle, faClock, faEllipsisH);
import { GridStack } from 'gridstack';
import draggable from 'vuedraggable';
import { open } from '@tauri-apps/api/dialog';
import { convertFileSrc } from '@tauri-apps/api/tauri';
import FileExplorer from './FileExplorer.vue';

// --- Store Setup ---
const moduleStore = useModuleStore();

// --- Gridstack State --- 
const grid = ref(null);
const gridLayoutKey = 'vjtools-grid-layout';
const isLayoutLocked = ref(false);

// --- Search State ---
const isSearchActive = ref(false);
const searchInputRef = ref(null);

// --- Other State --- 
const currentlyShowing = ref(null); // { id, name, type ('cycle'/'schedule'/'gallery'), progress, duration? path?, icon?, source?: 'cycle' | 'schedule' | 'manual' | 'gallery' }
const selectedItem = ref(null); 
const activeDrawerTab = ref(null);

// --- Define Missing Refs --- 
const isCycleLocked = ref(false);
const isScheduleLocked = ref(false);
const drawerTabs = ref([
  { id: 'Cycles', label: 'Cycles', icon: 'fa-solid fa-sync', title: 'Manage Cycle Order' },
  { id: 'EditAdd', label: 'Edit/Add', icon: 'fa-solid fa-plus', title: 'Add/Edit Items' },
  { id: 'Schedule', label: 'Schedule', icon: 'fa-solid fa-calendar-alt', title: 'View Full Schedule' },
  { id: 'Files', label: 'Files', icon: 'fa-solid fa-folder', title: 'Browse Files' },
  { id: 'Settings', label: 'Settings', icon: 'fa-solid fa-cog', title: 'App Settings' }
]);
const notifications = ref([]);
// --- End Define Missing Refs ---

const cycleItems = reactive([]);
const galleryItems = reactive([]);
const scheduleItems = ref([
  {
    id: 1,
    title: 'Morning Show',
    start: '09:00',
    end: '12:00',
    days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    description: 'Daily morning show with news and music.'
  },
  {
    id: 2,
    title: 'Afternoon Mix',
    start: '13:00',
    end: '16:00',
    days: ['Monday', 'Wednesday', 'Friday'],
    description: 'Afternoon music mix with listener requests.'
  }
]);
const artists = reactive([]);
const loading = reactive({ 
  cycle: false, gallery: false, schedule: false, artists: false,
  addLogo: false, addArtist: false, saveNamedCycle: false, addEvent: false
});
const errors = reactive({ 
  cycle: null, gallery: null, schedule: null, artists: null
});
const galleryFilter = ref(null); 

// New state for explicit filters
const gallerySearchTerm = ref('');
const gallerySelectedArtist = ref(null);

// Add state to track the current cycle index and item start time
const currentCycleIndex = ref(0);
const currentItemStartTime = ref(null);
const defaultCycleDuration = ref(5);
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

const newCycleGroupName = ref('');
// const loadingSaveNamedCycle = ref(false);

// State for section collapse/expand
const sectionStates = reactive({
  cycle: { collapsed: false },
  gallery: { collapsed: false },
  schedule: { collapsed: false },
});

// Add settings state
const settings = reactive({
  theme: 'system',
  autoSave: true,
  notifications: true,
  compactMode: false
});

// Add settings methods
const updateSetting = (key, value) => {
  settings[key] = value;
  console.log(`Updated setting: ${key} = ${value}`);
  // TODO: Save settings to storage
};

// --- Computed --- 
const filteredGalleryItems = computed(() => {
  let items = [...galleryItems];

  // 1. Apply explicit artist filter
  if (gallerySelectedArtist.value !== null) {
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
  
  // 3. Apply schedule-based filter if active
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

// Computed property to find the next item in the cycle
const nextCycleItem = computed(() => {
  if (!currentlyShowing.value || currentlyShowing.value.source !== 'cycle' || !cycleItems.length) {
    return null; // Not playing from cycle or cycle is empty
  }
  const currentIndex = cycleItems.findIndex(item => item.id === currentlyShowing.value.id);
  if (currentIndex === -1 || currentIndex === cycleItems.length - 1) {
    // Current item not found, or it's the last item, loop back to the start
    return cycleItems[0] || null;
  } else {
    // Return the next item in the array
    return cycleItems[currentIndex + 1];
  }
});

// --- Methods --- 

function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secondsRemaining = seconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secondsRemaining.toString().padStart(2, '0')}`;
}

function formatScheduleTime(timeStr) {
    try {
        const [hours, minutes] = timeStr.split(':').map(Number);
        const date = new Date();
        date.setHours(hours, minutes, 0, 0);
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } catch (e) {
        return timeStr;
    }
}

// --- Notification System (Keep as is) ---
const allNotifications = ref([]);
let notificationIdCounter = 0;
function showNotification(message, type = 'info', duration = 4000) { 
    const id = notificationIdCounter++;
    allNotifications.value.push({ id, message, type });
    setTimeout(() => {
        closeNotification(id);
    }, duration);
}
function closeNotification(id) { 
    allNotifications.value = allNotifications.value.filter(n => n.id !== id);
}
const currentNotifications = computed(() => allNotifications.value);

// --- Data Fetching (Keep specific fetch functions defined) ---
async function fetchGallery() { /* ... */ }
async function fetchArtists() { /* ... */ }
async function fetchDefaultCycle() { /* ... */ }
async function fetchSchedule() { /* ... */ }
async function fetchData() { /* ... */ }


// --- State Update Logic Helpers (NEW) ---

function findActiveScheduleItem(now) {
  return scheduleItems.value.find(item => {
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

function updateCurrentState_New() {
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
    currentlyShowing.value = { ...currentItem.value, source: currentItem.value.type };
    console.log(`Showing: ${currentItem.value.name} (${currentItem.value.type}), next check in ${nextCheckDelayMs}ms`);
  } else {
    currentItem.value = null;
    currentlyShowing.value = null;
    currentItemProgress.value = 0; 
    console.log("Nothing to display, checking again in 5s");
    nextCheckDelayMs = 5000;
  }

  const clampedDelay = Math.max(100, nextCheckDelayMs); 
  currentTimer.value = setTimeout(updateCurrentState, clampedDelay);
}

// --- Existing updateCurrentState (TO BE COMMENTED OUT) ---
/*
function updateCurrentState() {
  clearTimeout(currentTimer.value);
  currentItemProgress.value = 0;
        setTimeout(() => { saveCycleStatus.value = ""; }, 3000);
    }
}
*/

// --- Utility Functions (Keep as is) ---
function toggleTimeFormat() { /* ... */ }
function toggleTimeZone() { /* ... */ }
function getGalleryItemStatusClass(logo) { /* ... */ }

// --- Gridstack Methods (Restore Implementations) ---
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
  const layout = grid.value.save(false); 
  console.log('Saving layout:', layout);
  try {
    localStorage.setItem(gridLayoutKey, JSON.stringify(layout));
    showNotification("Layout saved.", "info", 2000);
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
    }
  } catch (e) {
    console.error("Failed to load layout from localStorage:", e);
    showNotification("Failed to load saved layout.", "error");
  }
}

function resetLayout() {
  if (!grid.value) return;
  console.log('Resetting layout to default');
  try { localStorage.removeItem(gridLayoutKey); } catch (e) {}
  
  const defaultLayout = [
      { id: 'cycle', x: 0, y: 0, w: 8, h: 3 },
      { id: 'gallery', x: 0, y: 3, w: 8, h: 9 },
      { id: 'schedule', x: 8, y: 0, w: 4, h: 12 },
  ];
  grid.value.batchUpdate();
  grid.value.removeAll(false);
  defaultLayout.forEach(item => {
      const element = document.querySelector(`.grid-stack-item[gs-id='${item.id}']`);
      if (element) {
          grid.value.addWidget(element, item);
      }
  });
  grid.value.commit();

  showNotification("Layout reset to default.", "info");
}

function toggleLayoutLock(lockState) {
    if (!grid.value) return;
    const shouldLock = typeof lockState === 'boolean' ? lockState : !isLayoutLocked.value;
    isLayoutLocked.value = shouldLock;

    if (isLayoutLocked.value) {
        grid.value.disable(); 
        console.log("Layout LOCKED");
    } else {
        grid.value.enable(); 
        console.log("Layout UNLOCKED");
    }
    
    grid.value.resizable('.grid-stack-item', !isLayoutLocked.value);

    try {
      const appWindow = getCurrent();
      appWindow.menuItems()['toggle-layout-lock'].then(item => {
          item?.setChecked(isLayoutLocked.value);
      });
    } catch (e) { console.error("Failed to update menu check state:", e); }
}


// --- Menu Event Listeners (Restore Implementation using correct IDs) ---
async function setupMenuListeners() {
    const appWindow = getCurrent();
    try {
        const item = await appWindow.menuItems()['toggle-layout-lock'];
        if (item) {
            const checked = await item.isChecked();
            isLayoutLocked.value = checked;
            if (grid.value) {
                if (isLayoutLocked.value) grid.value.disable();
                else grid.value.enable();
            }
        }
    } catch (e) { console.error("Failed to get initial menu check state:", e); }

    const unlisten = await appWindow.onMenuClicked(async (event) => {
        console.log('Menu item clicked:', event.payload);
        const menuItemId = event.payload; 
        
        switch (menuItemId) {
            case 'save-layout':
                saveLayout();
                break;
            case 'reset-layout':
                resetLayout();
                break;
            case 'toggle-layout-lock':
                 try {
                     const item = await appWindow.menuItems()['toggle-layout-lock'];
                     if (item) {
                         const checked = await item.isChecked();
                         toggleLayoutLock(checked); 
                     }
                 } catch(e) { console.error("Failed to handle toggle-layout-lock:", e); }
                break;
        }
    });
}

// --- Drawer Toggle (Keep as is) ---
function toggleDrawer(tabId) {
  console.log('Toggling drawer tab:', tabId);
  if (activeDrawerTab.value === tabId) {
    // If clicking the active tab, close it
    activeDrawerTab.value = null;
  } else {
    // Otherwise, switch to the clicked tab
    activeDrawerTab.value = tabId;
  }
}

// --- File Picker (Keep as is) ---
async function selectLogoFile() { /* ... */ }

// --- Expanded Item Logic (Keep as is) ---
async function saveExpandedItemDetails() { /* ... */ }

// --- Cycle Management (Keep as is) ---
function removeCycleItem(itemId) { /* ... */ }
async function handleSaveCycleOrder() { /* ... */ }
async function handleSaveNamedCycle() { /* ... (Implementation using notifications) */ }
function addToCycle(logoItemToAdd) { /* ... */ }

// --- Add/Edit Handlers (Keep UNCHANGED for now) ---
async function handleAddLogo() { /* ... uses old fetchData ... */ }
async function handleAddArtist() { /* ... uses old fetchData ... */ }
async function handleAddNewScheduleEvent() { /* ... uses old fetchData ... */ }

// --- Lifecycle & Timer (Keep as is, calls new fetchData) ---
onMounted(async () => {
  console.log('[NowPlaying.vue] Component is mounting...');
  await nextTick(); // Ensure DOM is ready
  initializeGrid();
  await fetchData();
  setupMenuListeners();
});

onUnmounted(() => {
  console.log('[NowPlaying.vue] Component unmounting...');
  if (currentTimer.value) {
    clearTimeout(currentTimer.value);
  }
  if (grid.value) { grid.value.destroy(false); }
  if (unlisten) unlisten();
});

function updateCurrentState() {
  updateCurrentState_New();
}

// Now Playing Section
const isExpanded = ref(true);
const toggleExpand = () => {
  isExpanded.value = !isExpanded.value;
};

// Toggle Collapse State
function toggleCollapse(sectionId) {
  if (sectionStates[sectionId]) {
    sectionStates[sectionId].collapsed = !sectionStates[sectionId].collapsed;
  }
}

// Placeholder for Expand Functionality
function expandSection(sectionId) {
  console.log(`Expand section requested for: ${sectionId} (Not Implemented)`);
  showNotification(`Maximize functionality for ${sectionId} section is not yet implemented.`, 'info');
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
  await nextTick();
  searchInputRef.value?.focus();
};

const deactivateSearch = () => {
  setTimeout(() => {
      if (!gallerySearchTerm.value) {
         isSearchActive.value = false;
      }
  }, 150);
};

const cancelSearch = () => {
   gallerySearchTerm.value = '';
   isSearchActive.value = false;
   searchInputRef.value?.blur();
};

// --- Drop Handler for Now Showing --- 
const isDraggingOverNowPlaying = ref(false);
const handleDropOnNowPlaying = async (event) => {
  event.preventDefault();
  console.log('[NowPlaying.vue] Drop event received.');
  try {
    const dataString = event.dataTransfer.getData('application/json');
    console.log('[NowPlaying.vue] Data String Received:', dataString);
    if (!dataString) {
      console.warn('[NowPlaying.vue] No data transferred in drop event.');
      return;
    }
    
    const droppedData = JSON.parse(dataString);
    console.log('[NowPlaying.vue] Parsed Dropped data:', droppedData);

    if (droppedData.type === 'logo' && droppedData.id && droppedData.name && droppedData.filePath) {
      console.log('[NowPlaying.vue] Logo dropped with file path:', droppedData.filePath);
      
      let logoFilePath = droppedData.filePath;
      
      currentlyShowing.value = {
        id: droppedData.id,
        name: droppedData.name,
        type: 'logo', 
        progress: 100, 
        icon: 'fa-solid fa-image',
        filePath: logoFilePath,
        source: 'manual'
      };
      console.log('[NowPlaying.vue] Updated Now Showing state:', currentlyShowing.value);

      await triggerNdiUpdate(currentlyShowing.value);

    } else {
      console.warn('[NowPlaying.vue] Dropped data missing required fields (type, id, name, filePath) or not a logo:', droppedData);
    }
  } catch (error) {
    console.error('[NowPlaying.vue] Error handling drop on Now Playing:', error);
  }
  isDraggingOverNowPlaying.value = false;
  event.dataTransfer.clearData();
};

const handleDragEnterNowPlaying = (event) => {
  // Check if the dragged data type is what we expect (optional but good practice)
  if (event.dataTransfer.types.includes('application/json')) {
    isDraggingOverNowPlaying.value = true;
  }
};

const handleDragLeaveNowPlaying = (event) => {
  // Simple leave, could add checks if needed (e.g., relatedTarget)
  isDraggingOverNowPlaying.value = false;
};

// --- NDI Trigger --- 
const triggerNdiUpdate = async (itemToShow) => {
  if (!itemToShow || !itemToShow.filePath) {
    console.warn('Cannot trigger NDI: Item or file path is missing.');
    return;
  }
  
  console.log(`Triggering NDI output for: ${itemToShow.name} (Path: ${itemToShow.filePath})`);
  try {
    await invoke('start_ndi_output', { logoPath: itemToShow.filePath });
    console.log('NDI output command invoked successfully.');
  } catch (error) {
    console.error('Failed to invoke NDI output command:', error);
  }
};

// --- Drawer Toggle Helpers ---
const getDrawerTabInfo = (tabId) => {
  return drawerTabs.value.find(tab => tab.id === tabId);
};
const getDrawerTabIcon = (tabId) => {
  return getDrawerTabInfo(tabId)?.icon || 'fa-solid fa-question-circle';
};
const getDrawerTabLabel = (tabId) => {
  return getDrawerTabInfo(tabId)?.label || 'Unknown Tab';
};

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const timeSlots = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);

// Add schedule methods
const addScheduleItem = () => {
  const newItem = {
    id: Date.now(),
    title: 'New Show',
    start: '12:00',
    end: '13:00',
    days: ['Monday'],
    description: 'New show description'
  };
  scheduleItems.value.push(newItem);
};

const removeScheduleItem = (id) => {
  scheduleItems.value = scheduleItems.value.filter(item => item.id !== id);
};

// Add edit/add state
const editForm = reactive({
  title: '',
  artist: '',
  duration: '',
  file: null,
  tags: [],
  notes: ''
});

const availableTags = ref([
  'Rock', 'Pop', 'Electronic', 'Hip Hop', 'Jazz', 'Classical',
  'Metal', 'Folk', 'Blues', 'Country', 'R&B', 'Reggae'
]);

// Add edit/add methods
const handleFileSelect = async () => {
  try {
    const selected = await open({
      multiple: false,
      filters: [{
        name: 'Media',
        extensions: ['mp4', 'mov', 'avi', 'mkv']
      }]
    });
    if (selected) {
      editForm.file = selected;
    }
  } catch (error) {
    console.error('Error selecting file:', error);
  }
};

const addTag = (tag) => {
  if (!editForm.tags.includes(tag)) {
    editForm.tags.push(tag);
  }
};

const removeTag = (tag) => {
  editForm.tags = editForm.tags.filter(t => t !== tag);
};

const handleSubmit = () => {
  console.log('Submitting form:', editForm);
  // TODO: Implement form submission
  // Reset form
  Object.keys(editForm).forEach(key => {
    editForm[key] = Array.isArray(editForm[key]) ? [] : '';
  });
};

// --- Drag/Drop Handlers for Cycle Panel --- NEW
const isDraggingOverCycle = ref(false);
const draggedItemIndex = ref(null);
const dragOverIndex = ref(null);

const handleCycleDragStart = (item, index, event) => {
  console.log(`[NowPlaying.vue] Drag Start Cycle Item: ${item.name}, Index: ${index}`);
  draggedItemIndex.value = index;
  // Set data to identify this as an internal cycle drag
  event.dataTransfer.setData('application/vnd.local.cycle-item', 'true');
  event.dataTransfer.effectAllowed = 'move';
};

const handleCycleDragOver = (index, event) => {
  // Provide visual feedback by setting the index we are dragging over
  if (index !== draggedItemIndex.value) {
    dragOverIndex.value = index;
    event.dataTransfer.dropEffect = 'move';
  } else {
    // Don't allow dropping onto itself
    dragOverIndex.value = null; 
    event.dataTransfer.dropEffect = 'none';
  }
};

const handleCycleDragLeave = () => {
  // Clear visual feedback when leaving an item
  dragOverIndex.value = null;
};

const handleCycleDrop = (targetIndex, event) => {
  console.log(`[NowPlaying.vue] Drop Cycle Item onto Index: ${targetIndex}`);
  if (draggedItemIndex.value === null || draggedItemIndex.value === targetIndex) {
    // Dropping onto itself or drag didn't start correctly
    draggedItemIndex.value = null;
    dragOverIndex.value = null;
    return;
  }

  // Perform the reorder
  const itemToMove = cycleItems.value.splice(draggedItemIndex.value, 1)[0];
  cycleItems.value.splice(targetIndex, 0, itemToMove);

  console.log('[NowPlaying.vue] Cycle reordered:', cycleItems.value.map(i => i.name));
  showNotification('Cycle order updated.', 'info');
  // TODO: Persist the new cycle order (e.g., invoke backend)
  // await invoke('update_default_cycle', { updatedCycle: cycleItems.value });

  // Reset drag state
  draggedItemIndex.value = null;
  dragOverIndex.value = null;
  event.dataTransfer.clearData('application/vnd.local.cycle-item');
};

// --- Add local Cycle playing state ---
const isCyclePlaying = ref(false); 

// --- Add method to toggle local cycle playback ---
const toggleCyclePlayback = () => {
  isCyclePlaying.value = !isCyclePlaying.value;
  console.log('Local Cycle Playback Toggled:', isCyclePlaying.value);
  // TODO: Add actual logic to start/stop the cycle timer/updates
  // If starting, need to immediately find the first item and start its progress.
  // If stopping, need to clear any cycle progress intervals.
};

// Helper function to determine if a file is an image
const isImage = (filePath) => {
  if (!filePath) return false;
  const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"];
  const extension = filePath.substring(filePath.lastIndexOf(".")).toLowerCase();
  return imageExtensions.includes(extension);
};
</script>

<style>
/* Import Gridstack base CSS */
@import 'gridstack/dist/gridstack.min.css';

/* Optional: Gridstack extras */
/* @import 'gridstack/dist/gridstack-extra.min.css'; */

/* Base Layout Styles (Restored) */
.live-control-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--background-color);
  color: var(--text-color);
}

.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: stretch;
  background: var(--surface-1);
  border-bottom: 1px solid var(--surface-3);
  padding: 0.5rem;
  gap: 1rem;
}

.main-content-grid { 
  flex-grow: 1;
  padding: 10px;
  margin: 0; 
}

.bottom-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 20px;
  background-color: var(--secondary-color);
  border-top: 1px solid var(--border-color);
}

.tab-group {
  display: flex;
  gap: 8px;
}

.tab-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--button-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  color: var(--text-color);
  cursor: pointer;
  transition: all var(--transition-speed);
}

.tab-button:hover {
  background: var(--button-hover-bg);
}

.tab-button.active {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.contextual-drawer-panel {
  position: fixed;
  bottom: 60px;
  left: 0;
  right: 0;
  background: var(--secondary-color);
  border-top: 1px solid var(--border-color);
  z-index: 100;
  height: 300px;
  display: flex;
  flex-direction: column;
}

.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 20px;
  border-bottom: 1px solid var(--border-color);
}

.drawer-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.drawer-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.close-drawer-btn {
  background: transparent;
  border: none;
  color: var(--text-color);
  cursor: pointer;
  padding: 8px;
  border-radius: var(--border-radius);
}

.close-drawer-btn:hover {
  background: var(--button-hover-bg);
}

.drawer-tab-content {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  .tab-header {
    padding: 1rem;
    background: var(--surface-2);
    border-bottom: 1px solid var(--surface-3);

    h5 {
      margin: 0 0 0.5rem;
      font-size: 1rem;
      color: var(--text-1);
    }

    p {
      margin: 0;
      font-size: 0.875rem;
      color: var(--text-2);
    }
  }

  .tab-body {
    flex: 1;
    overflow: hidden;
    background: var(--surface-1);
    position: relative;

    &.placeholder-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      color: var(--text-2);
      font-size: 0.875rem;

      svg {
        font-size: 2rem;
        opacity: 0.5;
      }
    }
  }
}

/* Add/Edit Form Styles */
.add-edit-forms {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.add-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
  background: var(--background-color);
  border-radius: var(--border-radius);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-weight: 500;
}

.form-group input,
.form-group select {
  padding: 0.75rem;
  background: var(--button-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  color: var(--text-color);
}

.file-input-group {
  display: flex;
  gap: 8px;
}

.file-picker-btn {
  padding: 0.75rem 1rem;
  background: var(--surface-2);
  border: 1px solid var(--surface-3);
  border-radius: var(--border-radius);
  color: var(--text-color);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s ease;

  &:hover {
    background: var(--surface-3);
  }
}

/* Gallery Filter Styles */
.filter-select,
.filter-input { padding: 4px 8px;
  border-radius: 4px;
  background-color: var(--background-color);
  border: 1px solid var(--border-color);
  color: var(--text-color);
  font-size: 13px;
  height: 28px;
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
  overflow: hidden;
}

.search-container.active .search-filter-dynamic {
  width: 150px;
  opacity: 1;
  padding-left: 8px;
  padding-right: 8px;
  border-color: var(--border-color);
  margin-left: 5px;
}

/* Ensure controls container adapts */
.section-controls {
    /* display: flex; */
    /* gap: 8px; */
    /* align-items: center; */
}

/* Style active state for cycle control buttons */
.section-controls .control-button.active {
  color: var(--primary-color); /* Or a specific active color */
  /* background-color: rgba(var(--primary-color-rgb), 0.1); */ /* Optional subtle background */
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
    z-index: 2;
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
    z-index: 20;
    width: 16px;
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
    background-color: var(--text-color-secondary, #aaa);
    opacity: 0;
    transition: opacity 0.15s ease-in-out;
    border-radius: 1px;
}

/* Show lines on handle hover */
.grid-stack-item > .ui-resizable-handle:hover::before,
.grid-stack-item > .ui-resizable-handle:hover::after {
    opacity: 0.9;
}

/* Edge Line Styles (using ::after) - Modified for 100% length */
.grid-stack-item > .ui-resizable-e::after, 
.grid-stack-item > .ui-resizable-w::after {
    top: 0; height: 100%; width: 3px;
}
.grid-stack-item > .ui-resizable-e::after { right: 1px; }
.grid-stack-item > .ui-resizable-w::after { left: 1px; }

.grid-stack-item > .ui-resizable-s::after, 
.grid-stack-item > .ui-resizable-n::after {
    left: 0; width: 100%; height: 3px;
}
.grid-stack-item > .ui-resizable-s::after { bottom: 0; }
.grid-stack-item > .ui-resizable-n::after { top: 1px; }

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
    align-items: center; /* Vertically align buttons */
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

.now-showing-preview:hover {
   /* Maybe a subtle hover effect */
   /* background-color: rgba(255, 255, 255, 0.03); */
}

/* Consider adding a class dynamically on dragover */
.now-showing-preview.dragging-over {
  border-color: var(--primary-color);
  background-color: rgba(33, 150, 243, 0.1);
}

.settings-form {
  padding: 1rem;
  overflow-y: auto;
  height: 100%;
}

.setting-group {
  margin-bottom: 2rem;

  h6 {
    margin: 0 0 1rem;
    font-size: 0.875rem;
    color: var(--text-2);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--surface-2);

  &:last-child {
    border-bottom: none;
  }

  label {
    font-size: 0.875rem;
    color: var(--text-1);
  }

  select {
    padding: 0.5rem;
    border-radius: 4px;
    border: 1px solid var(--surface-3);
    background: var(--surface-1);
    color: var(--text-1);
    font-size: 0.875rem;
    min-width: 120px;

    &:focus {
      outline: none;
      border-color: var(--brand);
    }
  }

  input[type="checkbox"] {
    width: 1.25rem;
    height: 1.25rem;
    border: 1px solid var(--surface-3);
    border-radius: 4px;
    background: var(--surface-1);
    cursor: pointer;

    &:checked {
      background: var(--brand);
      border-color: var(--brand);
    }

    &:focus {
      outline: none;
      border-color: var(--brand);
    }
  }
}

.schedule-grid {
  display: flex;
  height: 100%;
  overflow-x: auto;
  position: relative;
  background: var(--surface-1);
}

.time-column,
.day-column {
  min-width: 120px;
  border-right: 1px solid var(--surface-2);

  &:last-child {
    border-right: none;
  }
}

.time-column {
  position: sticky;
  left: 0;
  z-index: 2;
  background: var(--surface-1);
}

.grid-header {
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.875rem;
  background: var(--surface-2);
  border-bottom: 1px solid var(--surface-3);
  position: sticky;
  top: 0;
  z-index: 1;
}

.time-slot {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  color: var(--text-2);
  border-bottom: 1px solid var(--surface-2);
}

.day-slots {
  position: relative;
  height: calc(100% - 40px);
}

.schedule-item {
  position: absolute;
  left: 0;
  right: 0;
  margin: 0 4px;
  background: var(--brand-light);
  border-radius: 4px;
  padding: 8px;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: var(--brand);
    
    .remove-btn {
      opacity: 1;
    }
  }
}

.item-content {
  height: 100%;
  overflow: hidden;
  position: relative;

  h6 {
    margin: 0 0 4px;
    font-size: 0.75rem;
    color: var(--text-1);
  }

  p {
    margin: 0;
    font-size: 0.625rem;
    color: var(--text-2);
  }
}

.remove-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  background: none;
  border: none;
  color: var(--text-2);
  padding: 2px;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s ease;

  &:hover {
    color: var(--text-1);
  }
}

.add-schedule-btn {
  margin-top: 0.5rem;
  padding: 0.5rem 1rem;
  background: var(--brand);
  border: none;
  border-radius: 4px;
  color: white;
  font-size: 0.875rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: background 0.2s ease;

  &:hover {
    background: var(--brand-dark);
  }
}

.edit-form {
  padding: 1rem;
  overflow-y: auto;
  height: 100%;
}

.form-group {
  margin-bottom: 1.5rem;

  label {
    display: block;
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
    color: var(--text-1);
    font-weight: 500;
  }

  input[type="text"],
  textarea {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid var(--surface-3);
    border-radius: var(--border-radius);
    background: var(--surface-1);
    color: var(--text-1);
    font-size: 0.875rem;

    &:focus {
      outline: none;
      border-color: var(--brand);
    }

    &::placeholder {
      color: var(--text-2);
    }
  }

  textarea {
    min-height: 100px;
    resize: vertical;
  }
}

.file-input {
  display: flex;
  align-items: center;
  gap: 1rem;

  button {
    padding: 0.75rem 1rem;
    background: var(--surface-2);
    border: 1px solid var(--surface-3);
    border-radius: var(--border-radius);
    color: var(--text-1);
    font-size: 0.875rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    transition: all 0.2s ease;

    &:hover {
      background: var(--surface-3);
    }
  }

  .placeholder {
    color: var(--text-2);
    font-size: 0.875rem;
  }
}

.tags-input {
  .selected-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .tag {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0.75rem;
    background: var(--brand-light);
    border-radius: 16px;
    font-size: 0.75rem;
    color: var(--text-1);

    button {
      background: none;
      border: none;
      padding: 2px;
      color: var(--text-2);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;

      &:hover {
        color: var(--text-1);
      }
    }
  }

  .available-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;

    button {
      padding: 0.25rem 0.75rem;
      background: var(--surface-2);
      border: 1px solid var(--surface-3);
      border-radius: 16px;
      font-size: 0.75rem;
      color: var(--text-1);
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover:not(:disabled) {
        background: var(--surface-3);
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }
  }
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 2rem;

  .submit-btn {
    padding: 0.75rem 1.5rem;
    background: var(--brand);
    border: none;
    border-radius: var(--border-radius);
    color: white;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    transition: background 0.2s ease;

    &:hover {
      background: var(--brand-dark);
    }
  }
}

/* Style for when dragging over the cycle drop zone */
.cycle-section .section-body.dragging-over {
  outline: 2px dashed var(--primary-color);
  outline-offset: -4px; /* Pull outline inside padding */
  background-color: rgba(33, 150, 243, 0.05); /* Subtle highlight */
}

/* Highlight for the 'Next Up' item in the cycle */
.cycle-item.next-up {
  border-left: 4px solid var(--highlight-color, orange); /* Or some other highlight */
  background-color: rgba(255, 165, 0, 0.1); /* Subtle background */
}

/* Item Box Styles */
.item-box {
    background-color: var(--item-bg-color, rgba(255, 255, 255, 0.05));
    border-radius: var(--item-border-radius, 6px);
    padding: 10px;
    cursor: pointer;
    transition: background-color var(--transition-speed), border-color var(--transition-speed), transform var(--transition-speed), box-shadow var(--transition-speed);
    border: 1px solid var(--item-border-color, transparent);
    display: flex;
    flex-direction: column;
    overflow: hidden; /* Contain thumbnail */
}
.item-box:hover {
    background-color: var(--item-hover-bg-color, rgba(255, 255, 255, 0.1));
    transform: translateY(-1px);
}
.item-box.active {
    border-color: var(--item-active-border-color, var(--primary-color));
    box-shadow: 0 0 0 1px var(--item-active-shadow-color, var(--primary-color));
}
.item-box.selected {
    background-color: var(--item-selected-bg-color, rgba(var(--primary-color-rgb), 0.15));
    border-color: var(--item-selected-border-color, rgba(var(--primary-color-rgb), 0.5));
}

.cycle-item.drag-over {
    outline: 2px solid var(--item-drag-over-outline-color, var(--primary-color));
    background-color: var(--item-drag-over-bg-color, rgba(var(--primary-color-rgb), 0.1));
}

.item-thumbnail {
  width: 100%;
  aspect-ratio: 16 / 9; /* Maintain aspect ratio */
  background-color: var(--thumbnail-bg-color, #1a1a1a);
  border-radius: calc(var(--item-border-radius, 6px) - 4px); /* Slightly smaller radius */
  overflow: hidden;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.item-thumbnail img,
.item-thumbnail video {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain; /* Use 'cover' if you prefer filling */
}

.thumbnail-placeholder {
  color: var(--text-color-muted, #666);
  font-size: 1.5rem;
}

.item-content { flex-grow: 1; }
</style>