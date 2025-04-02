<template>
  <div class="events-container">
    <h2>Events</h2>
    <div class="events-list">
      <div v-if="events.length === 0" class="no-events">
        No events available
      </div>
      <div v-else v-for="event in events" :key="event.id" class="event-item">
        <div class="event-header">
          <h3>{{ event.name }}</h3>
          <span class="event-date">{{ formatDate(event.date) }}</span>
        </div>
        <div class="event-details">
          <p>{{ event.description }}</p>
        </div>
        <div class="event-actions">
          <button @click="selectEvent(event)" class="btn-primary">Select</button>
          <button @click="editEvent(event)" class="btn-secondary">Edit</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { invoke } from '@tauri-apps/api/tauri';

export default {
  name: 'Events',
  setup() {
    const events = ref([]);
    const loading = ref(false);
    const error = ref(null);

    const fetchEvents = async () => {
      loading.value = true;
      error.value = null;
      
      try {
        // This would be replaced with an actual Tauri command to fetch events
        // For now, we'll use mock data
        events.value = [
          { id: 1, name: 'Summer Festival', date: '2023-07-15', description: 'Annual summer music festival' },
          { id: 2, name: 'Winter Gala', date: '2023-12-10', description: 'Holiday celebration event' },
          { id: 3, name: 'Spring Concert', date: '2024-03-20', description: 'Spring season opening concert' }
        ];
      } catch (err) {
        error.value = err.message;
        console.error('Error fetching events:', err);
      } finally {
        loading.value = false;
      }
    };

    const formatDate = (dateString) => {
      const options = { year: 'numeric', month: 'long', day: 'numeric' };
      return new Date(dateString).toLocaleDateString(undefined, options);
    };

    const selectEvent = (event) => {
      // Emit an event to notify parent component
      console.log('Selected event:', event);
    };

    const editEvent = (event) => {
      // Emit an event to notify parent component
      console.log('Edit event:', event);
    };

    onMounted(() => {
      fetchEvents();
    });

    return {
      events,
      loading,
      error,
      formatDate,
      selectEvent,
      editEvent
    };
  }
};
</script>

<style scoped>
.events-container {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.events-list {
  margin-top: 20px;
}

.no-events {
  text-align: center;
  padding: 30px;
  color: #666;
  font-style: italic;
}

.event-item {
  background-color: #f5f5f5;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 15px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.event-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.event-header h3 {
  margin: 0;
  color: #333;
}

.event-date {
  color: #666;
  font-size: 0.9em;
}

.event-details {
  margin-bottom: 15px;
}

.event-actions {
  display: flex;
  gap: 10px;
}

button {
  padding: 8px 16px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
}

.btn-primary {
  background-color: #2196F3;
  color: white;
}

.btn-primary:hover {
  background-color: #1976D2;
}

.btn-secondary {
  background-color: #e0e0e0;
  color: #333;
}

.btn-secondary:hover {
  background-color: #d0d0d0;
}
</style> 