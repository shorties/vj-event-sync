import axios from 'axios';
import { invoke } from '@tauri-apps/api/tauri';

class VjToolsService {
  constructor() {
    this.baseUrl = 'https://vj.tools/api';
    this.token = localStorage.getItem('vjToolsToken');
  }

  async login(username, password) {
    try {
      const response = await axios.post(`${this.baseUrl}/auth/login`, {
        username,
        password
      });

      this.token = response.data.token;
      localStorage.setItem('vjToolsToken', this.token);
      localStorage.setItem('vjToolsUsername', username);

      return response.data;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  logout() {
    this.token = null;
    localStorage.removeItem('vjToolsToken');
    localStorage.removeItem('vjToolsUsername');
  }

  async syncEvents() {
    try {
      const response = await axios.get(`${this.baseUrl}/events`, {
        headers: {
          Authorization: `Bearer ${this.token}`
        }
      });

      // Store events locally for offline access
      await invoke('store_events', { events: response.data });

      return response.data;
    } catch (error) {
      console.error('Failed to sync events:', error);
      // Try to get locally stored events
      return await invoke('get_stored_events');
    }
  }

  async syncMessages() {
    try {
      const response = await axios.get(`${this.baseUrl}/messages`, {
        headers: {
          Authorization: `Bearer ${this.token}`
        }
      });

      // Store messages locally for offline access
      await invoke('store_messages', { messages: response.data });

      return response.data;
    } catch (error) {
      console.error('Failed to sync messages:', error);
      // Try to get locally stored messages
      return await invoke('get_stored_messages');
    }
  }

  async sendMessage(message) {
    try {
      const response = await axios.post(`${this.baseUrl}/messages`, message, {
        headers: {
          Authorization: `Bearer ${this.token}`
        }
      });

      return response.data;
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }

  async updateEvent(eventId, updates) {
    try {
      const response = await axios.put(`${this.baseUrl}/events/${eventId}`, updates, {
        headers: {
          Authorization: `Bearer ${this.token}`
        }
      });

      return response.data;
    } catch (error) {
      console.error('Failed to update event:', error);
      throw error;
    }
  }

  async uploadLogo(eventId, file) {
    try {
      const formData = new FormData();
      formData.append('logo', file);

      const response = await axios.post(`${this.baseUrl}/events/${eventId}/logos`, formData, {
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Failed to upload logo:', error);
      throw error;
    }
  }

  async deleteLogo(eventId, logoId) {
    try {
      await axios.delete(`${this.baseUrl}/events/${eventId}/logos/${logoId}`, {
        headers: {
          Authorization: `Bearer ${this.token}`
        }
      });
    } catch (error) {
      console.error('Failed to delete logo:', error);
      throw error;
    }
  }
}

export default new VjToolsService(); 