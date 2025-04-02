import axios from 'axios';

// Configure logger - Using console for frontend
const logger = {
    info: console.log,
    error: console.error
};

class VJToolsService {
    constructor() {
        this.baseUrl = 'https://vj.tools/api';
        this.token = null;
        this.user = null;
    }

    async login(username, password) {
        try {
            const response = await axios.post(`${this.baseUrl}/auth/login`, {
                username,
                password
            });

            this.token = response.data.token;
            this.user = response.data.user;

            // Set up axios defaults for future requests
            axios.defaults.headers.common['Authorization'] = `Bearer ${this.token}`;

            logger.info(`User ${username} logged in successfully`);
            return this.user;
        } catch (error) {
            logger.error('Failed to login to vj.tools:', error.response ? error.response.data : error.message);
            throw error;
        }
    }

    async syncEvents() {
        try {
            const response = await axios.get(`${this.baseUrl}/events`);
            logger.info('Successfully synced events from vj.tools');
            return response.data;
        } catch (error) {
            logger.error('Failed to sync events from vj.tools:', error.response ? error.response.data : error.message);
            throw error;
        }
    }

    async syncMessages() {
        try {
            const response = await axios.get(`${this.baseUrl}/messages`);
            logger.info('Successfully synced messages from vj.tools');
            return response.data;
        } catch (error) {
            logger.error('Failed to sync messages from vj.tools:', error.response ? error.response.data : error.message);
            throw error;
        }
    }

    async sendMessage(conversationId, content) {
        try {
            const response = await axios.post(`${this.baseUrl}/messages`, {
                conversationId,
                content
            });
            logger.info('Message sent successfully to vj.tools');
            return response.data;
        } catch (error) {
            logger.error('Failed to send message to vj.tools:', error.response ? error.response.data : error.message);
            throw error;
        }
    }

    async getConversations() {
        try {
            const response = await axios.get(`${this.baseUrl}/conversations`);
            logger.info('Successfully fetched conversations from vj.tools');
            return response.data;
        } catch (error) {
            logger.error('Failed to fetch conversations from vj.tools:', error.response ? error.response.data : error.message);
            throw error;
        }
    }

    async getOnlineUsers() {
        try {
            const response = await axios.get(`${this.baseUrl}/users/online`);
            logger.info('Successfully fetched online users from vj.tools');
            return response.data;
        } catch (error) {
            logger.error('Failed to fetch online users from vj.tools:', error.response ? error.response.data : error.message);
            throw error;
        }
    }

    isAuthenticated() {
        return !!this.token;
    }

    logout() {
        this.token = null;
        this.user = null;
        delete axios.defaults.headers.common['Authorization'];
        logger.info('User logged out successfully');
    }
}

// Export the instance as the default export
const instance = new VJToolsService();
export default instance; 