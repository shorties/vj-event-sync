<template>
  <div id="app">
    <Login v-if="!isLoggedIn" @login-success="handleLoginSuccess" />
    <div v-else>
      <nav class="navbar">
        <div class="navbar-brand">VJ Event Sync</div>
        <div class="navbar-menu">
          <button @click="toggleOfflineMode" :class="{ 'active': isOffline }">
            {{ isOffline ? 'Offline Mode' : 'Online Mode' }}
          </button>
          <button @click="triggerSync" :disabled="isOffline">
            Sync Events
          </button>
          <button @click="handleLogout" class="logout-button">
            Logout
          </button>
        </div>
      </nav>

      <div class="main-content">
        <div class="events-panel">
          <h2>Events</h2>
          <div class="events-list">
            <div v-for="event in events" 
                 :key="event.id" 
                 class="event-card"
                 :class="{ 'active': currentEvent?.id === event.id }"
                 @click="selectEvent(event)">
              <div class="event-header">
                <h3>{{ event.title }}</h3>
                <span class="event-time">{{ formatTime(event.start_time) }}</span>
              </div>
              <div class="event-details">
                <p>{{ event.artist_name }}</p>
                <p>Duration: {{ formatDuration(event.set_duration) }}</p>
              </div>
              <div class="event-logos">
                <div v-for="logo in event.logos" 
                     :key="logo.id" 
                     class="logo-thumbnail"
                     @click.stop="changeLogo(logo.id)">
                  <img :src="logo.path" :alt="logo.type">
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="control-panel">
          <div class="timer-section">
            <h2>Timer Control</h2>
            <div class="timer-display">
              {{ formatTimeRemaining }}
            </div>
            <div class="timer-controls">
              <button @click="startTimer" :disabled="isTimerRunning">
                Start Timer
              </button>
              <button @click="stopTimer" :disabled="!isTimerRunning">
                Stop Timer
              </button>
            </div>
          </div>

          <div class="preview-section">
            <h2>Preview</h2>
            <div class="preview-container">
              <img :src="currentLogo?.path" alt="Current Logo" v-if="currentLogo">
              <div v-else class="no-logo">No Logo Selected</div>
            </div>
          </div>

          <div class="messaging-section">
            <h2>Messages</h2>
            <Messaging 
              :userId="userId"
              :userRole="userRole"
              :userName="userName"
              :vjToolsEnabled="true"
            />
          </div>
        </div>
      </div>

      <div class="status-bar">
        <div class="status-item">
          <span class="status-label">Connection:</span>
          <span :class="['status-value', isOffline ? 'offline' : 'online']">
            {{ isOffline ? 'Offline' : 'Online' }}
          </span>
        </div>
        <div class="status-item">
          <span class="status-label">Last Sync:</span>
          <span class="status-value">{{ formatLastSync }}</span>
        </div>
        <div class="status-item">
          <span class="status-label">vj.tools:</span>
          <span class="status-value online">Connected</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import axios from 'axios';
import io from 'socket.io-client';
import Messaging from './components/Messaging.vue';
import Login from './components/Login.vue';
import vjToolsService from '../services/vjTools';

export default {
  name: 'App',
  components: {
    Messaging,
    Login
  },
  setup() {
    const socket = ref(null);
    const events = ref([]);
    const currentEvent = ref(null);
    const currentLogo = ref(null);
    const isOffline = ref(false);
    const lastSync = ref(null);
    const timerRemaining = ref(0);
    const isTimerRunning = ref(false);
    const userId = ref(`user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
    const userRole = ref('vj');
    const userName = ref('');
    const isLoggedIn = ref(false);

    const formatTimeRemaining = computed(() => {
      const minutes = Math.floor(timerRemaining.value / 60);
      const seconds = timerRemaining.value % 60;
      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    });

    const formatLastSync = computed(() => {
      if (!lastSync.value) return 'Never';
      return new Date(lastSync.value).toLocaleString();
    });

    const initializeSocket = () => {
      socket.value = io('http://localhost:3000');
      
      socket.value.on('connect', () => {
        console.log('Connected to server');
      });

      socket.value.on('logo:updated', (data) => {
        updateCurrentLogo(data.logoId);
      });

      socket.value.on('timer:started', (data) => {
        startTimerCountdown(data.duration);
      });
    };

    const fetchEvents = async () => {
      try {
        const response = await axios.get('http://localhost:3000/api/events');
        events.value = response.data;
      } catch (error) {
        console.error('Failed to fetch events:', error);
      }
    };

    const selectEvent = (event) => {
      currentEvent.value = event;
      if (event.logos && event.logos.length > 0) {
        currentLogo.value = event.logos[0];
      }
    };

    const changeLogo = async (logoId) => {
      try {
        await axios.post('http://localhost:3000/api/logos/change', { logoId });
        updateCurrentLogo(logoId);
      } catch (error) {
        console.error('Failed to change logo:', error);
      }
    };

    const updateCurrentLogo = (logoId) => {
      const logo = events.value
        .flatMap(event => event.logos)
        .find(logo => logo.id === logoId);
      if (logo) {
        currentLogo.value = logo;
      }
    };

    const startTimer = async () => {
      try {
        await axios.post('http://localhost:3000/api/timers/start', {
          duration: currentEvent.value?.set_duration || 300000 // 5 minutes default
        });
        isTimerRunning.value = true;
      } catch (error) {
        console.error('Failed to start timer:', error);
      }
    };

    const stopTimer = async () => {
      try {
        await axios.post('http://localhost:3000/api/timers/stop');
        isTimerRunning.value = false;
        timerRemaining.value = 0;
      } catch (error) {
        console.error('Failed to stop timer:', error);
      }
    };

    const startTimerCountdown = (duration) => {
      timerRemaining.value = Math.floor(duration / 1000);
      const interval = setInterval(() => {
        if (timerRemaining.value > 0) {
          timerRemaining.value--;
        } else {
          clearInterval(interval);
          isTimerRunning.value = false;
        }
      }, 1000);
    };

    const toggleOfflineMode = async () => {
      try {
        await axios.post('http://localhost:3000/api/sync/offline', {
          enabled: !isOffline.value
        });
        isOffline.value = !isOffline.value;
      } catch (error) {
        console.error('Failed to toggle offline mode:', error);
      }
    };

    const triggerSync = async () => {
      try {
        await axios.post('http://localhost:3000/api/sync/trigger');
        lastSync.value = new Date();
      } catch (error) {
        console.error('Failed to trigger sync:', error);
      }
    };

    const formatTime = (time) => {
      return new Date(time).toLocaleTimeString();
    };

    const formatDuration = (duration) => {
      const minutes = Math.floor(duration / 60000);
      const seconds = Math.floor((duration % 60000) / 1000);
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const handleLoginSuccess = async (user) => {
      isLoggedIn.value = true;
      userName.value = user.name;
      userRole.value = user.role;
      
      // Sync events and messages from vj.tools
      try {
        const [eventsData, messagesData] = await Promise.all([
          vjToolsService.syncEvents(),
          vjToolsService.syncMessages()
        ]);
        
        events.value = eventsData;
        lastSync.value = new Date();
      } catch (error) {
        console.error('Failed to sync data from vj.tools:', error);
      }
    };

    const handleLogout = () => {
      vjToolsService.logout();
      isLoggedIn.value = false;
      userName.value = '';
      userRole.value = 'vj';
      events.value = [];
      currentEvent.value = null;
      currentLogo.value = null;
    };

    onMounted(() => {
      initializeSocket();
      fetchEvents();

      // Check for saved username
      const savedUsername = localStorage.getItem('vjToolsUsername');
      if (savedUsername) {
        // Auto-fill username if saved
        const loginComponent = document.querySelector('#app').__vue__.$refs.login;
        if (loginComponent) {
          loginComponent.username = savedUsername;
          loginComponent.rememberMe = true;
        }
      }
    });

    onUnmounted(() => {
      if (socket.value) {
        socket.value.disconnect();
      }
    });

    return {
      events,
      currentEvent,
      currentLogo,
      isOffline,
      lastSync,
      timerRemaining,
      isTimerRunning,
      formatTimeRemaining,
      formatLastSync,
      selectEvent,
      changeLogo,
      startTimer,
      stopTimer,
      toggleOfflineMode,
      triggerSync,
      formatTime,
      formatDuration,
      userId,
      userRole,
      userName,
      isLoggedIn,
      handleLoginSuccess,
      handleLogout
    };
  }
};
</script>

<style>
:root {
  --primary-color: #2196f3;
  --secondary-color: #1976d2;
  --background-color: #f5f5f5;
  --text-color: #333;
  --border-color: #ddd;
  --success-color: #4caf50;
  --error-color: #f44336;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background-color: var(--background-color);
  color: var(--text-color);
  line-height: 1.6;
}

#app {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background-color: var(--primary-color);
  color: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.navbar-brand {
  font-size: 1.5rem;
  font-weight: bold;
}

.navbar-menu button {
  margin-left: 1rem;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  background-color: var(--secondary-color);
  color: white;
  cursor: pointer;
  transition: background-color 0.3s;
}

.navbar-menu button:hover {
  background-color: #1565c0;
}

.navbar-menu button.active {
  background-color: var(--error-color);
}

.main-content {
  display: flex;
  flex: 1;
  padding: 2rem;
  gap: 2rem;
  overflow: hidden;
}

.events-panel {
  flex: 2;
  background-color: white;
  border-radius: 8px;
  padding: 1rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow-y: auto;
}

.control-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.event-card {
  background-color: white;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.event-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.event-card.active {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px var(--primary-color);
}

.event-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.event-time {
  color: #666;
  font-size: 0.9rem;
}

.event-details {
  color: #666;
  font-size: 0.9rem;
  margin-bottom: 1rem;
}

.event-logos {
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  padding: 0.5rem 0;
}

.logo-thumbnail {
  width: 60px;
  height: 60px;
  border-radius: 4px;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid transparent;
  transition: border-color 0.2s;
}

.logo-thumbnail:hover {
  border-color: var(--primary-color);
}

.logo-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.timer-section {
  background-color: white;
  border-radius: 8px;
  padding: 1rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.timer-display {
  font-size: 3rem;
  font-weight: bold;
  text-align: center;
  margin: 1rem 0;
  font-family: monospace;
}

.timer-controls {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.timer-controls button {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  background-color: var(--primary-color);
  color: white;
  cursor: pointer;
  transition: background-color 0.3s;
}

.timer-controls button:hover:not(:disabled) {
  background-color: var(--secondary-color);
}

.timer-controls button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.preview-section {
  background-color: white;
  border-radius: 8px;
  padding: 1rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  flex: 1;
}

.preview-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f8f8f8;
  border-radius: 4px;
  overflow: hidden;
}

.preview-container img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.no-logo {
  color: #999;
  font-size: 1.2rem;
}

.status-bar {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 2rem;
  background-color: white;
  border-top: 1px solid var(--border-color);
}

.status-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-label {
  color: #666;
}

.status-value {
  font-weight: 500;
}

.status-value.online {
  color: var(--success-color);
}

.status-value.offline {
  color: var(--error-color);
}

.messaging-section {
  flex: 1;
  min-height: 300px;
  margin-top: 1rem;
}

.messaging-section h2 {
  margin-bottom: 0.5rem;
}

.logout-button {
  background-color: var(--error-color);
  margin-left: 1rem;
}

.logout-button:hover {
  background-color: #d32f2f;
}
</style> 