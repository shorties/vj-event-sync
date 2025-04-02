<template>
  <div class="messaging-container">
    <div class="users-panel">
      <h3>Users</h3>
      <div class="users-list">
        <div v-for="user in onlineUsers" 
             :key="user.userId" 
             class="user-item"
             :class="{ 'active': selectedUser?.userId === user.userId }"
             @click="selectUser(user)">
          <div class="user-info">
            <span class="user-name">{{ user.name }}</span>
            <span class="user-role">{{ user.role }}</span>
          </div>
          <div class="user-status">
            <span class="status-indicator" :class="{ 'online': user.isOnline }"></span>
            <span class="status-text">{{ user.isOnline ? 'Online' : 'Offline' }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="conversation-panel">
      <div v-if="selectedUser" class="conversation-header">
        <h3>{{ selectedUser.name }}</h3>
        <div class="user-status">
          <span class="status-indicator" :class="{ 'online': selectedUser.isOnline }"></span>
          <span class="status-text">{{ selectedUser.isOnline ? 'Online' : 'Offline' }}</span>
        </div>
      </div>

      <div v-if="currentConversation" class="messages-container">
        <div v-for="message in messages" 
             :key="message.id" 
             class="message"
             :class="{ 'sent': message.senderId === userId }">
          <div class="message-content">
            {{ message.content }}
          </div>
          <div class="message-meta">
            <span class="message-time">{{ formatTime(message.sentAt) }}</span>
            <span v-if="message.readAt" class="message-status read">Read</span>
          </div>
        </div>
      </div>

      <div v-if="currentConversation" class="message-input">
        <input v-model="newMessage" 
               @keyup.enter="sendMessage"
               placeholder="Type a message..."
               :disabled="!selectedUser.isOnline">
        <button @click="sendMessage" 
                :disabled="!newMessage.trim() || !selectedUser.isOnline">
          Send
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, watch } from 'vue';
import axios from 'axios';
import io from 'socket.io-client';
import vjToolsService from '../../services/vjTools';

export default {
  name: 'Messaging',
  props: {
    userId: {
      type: String,
      required: true
    },
    userRole: {
      type: String,
      required: true
    },
    userName: {
      type: String,
      required: true
    },
    vjToolsEnabled: {
      type: Boolean,
      default: false
    }
  },
  setup(props) {
    const socket = ref(null);
    const onlineUsers = ref([]);
    const selectedUser = ref(null);
    const currentConversation = ref(null);
    const messages = ref([]);
    const newMessage = ref('');
    const conversations = ref([]);

    const initializeSocket = () => {
      socket.value = io('http://localhost:3000');
      
      socket.value.on('connect', () => {
        // Authenticate user
        socket.value.emit('auth', {
          name: props.userName,
          role: props.userRole
        });
      });

      socket.value.on('auth:success', async () => {
        await fetchConversations();
      });

      socket.value.on('users:status', (users) => {
        onlineUsers.value = users;
      });

      socket.value.on('conversation:new', (message) => {
        if (currentConversation.value?.id === message.conversationId) {
          messages.value.push(message);
        }
      });

      socket.value.on('message:read', (data) => {
        const message = messages.value.find(m => m.id === data.messageId);
        if (message) {
          message.readAt = new Date();
        }
      });
    };

    const fetchConversations = async () => {
      try {
        let response;
        if (props.vjToolsEnabled) {
          response = await vjToolsService.getConversations();
        } else {
          response = await axios.get(`http://localhost:3000/api/messages/users/${props.userId}/conversations`);
        }
        conversations.value = response.data;
      } catch (error) {
        console.error('Failed to fetch conversations:', error);
      }
    };

    const fetchMessages = async (conversationId) => {
      try {
        let response;
        if (props.vjToolsEnabled) {
          response = await vjToolsService.getConversationHistory(conversationId);
        } else {
          response = await axios.get(`http://localhost:3000/api/messages/conversations/${conversationId}`);
        }
        messages.value = response.data;
      } catch (error) {
        console.error('Failed to fetch messages:', error);
      }
    };

    const selectUser = async (user) => {
      selectedUser.value = user;
      
      // Find existing conversation
      const conversation = conversations.value.find(
        conv => (conv.dj_id === props.userId && conv.vj_id === user.userId) ||
                (conv.dj_id === user.userId && conv.vj_id === props.userId)
      );

      if (conversation) {
        currentConversation.value = conversation;
        await fetchMessages(conversation.id);
      } else {
        // Create new conversation
        try {
          let response;
          if (props.vjToolsEnabled) {
            response = await vjToolsService.createConversation({
              djId: props.userRole === 'dj' ? props.userId : user.userId,
              vjId: props.userRole === 'vj' ? props.userId : user.userId
            });
          } else {
            response = await axios.post('http://localhost:3000/api/messages/conversations', {
              djId: props.userRole === 'dj' ? props.userId : user.userId,
              vjId: props.userRole === 'vj' ? props.userId : user.userId
            });
          }
          currentConversation.value = {
            id: response.data.conversationId,
            dj_id: props.userRole === 'dj' ? props.userId : user.userId,
            vj_id: props.userRole === 'vj' ? props.userId : user.userId
          };
          messages.value = [];
        } catch (error) {
          console.error('Failed to create conversation:', error);
        }
      }
    };

    const sendMessage = async () => {
      if (!newMessage.value.trim() || !currentConversation.value) return;

      try {
        if (props.vjToolsEnabled) {
          await vjToolsService.sendMessage(
            currentConversation.value.id,
            newMessage.value
          );
        } else {
          socket.value.emit('message:send', {
            conversationId: currentConversation.value.id,
            content: newMessage.value
          });
        }
        newMessage.value = '';
      } catch (error) {
        console.error('Failed to send message:', error);
      }
    };

    const formatTime = (timestamp) => {
      return new Date(timestamp).toLocaleTimeString();
    };

    watch(selectedUser, async (newUser) => {
      if (newUser) {
        let status;
        if (props.vjToolsEnabled) {
          status = await vjToolsService.getUserStatus(newUser.userId);
        } else {
          const response = await axios.get(`http://localhost:3000/api/messages/users/${newUser.userId}/status`);
          status = response.data;
        }
        selectedUser.value = {
          ...newUser,
          ...status
        };
      }
    });

    onMounted(() => {
      initializeSocket();
    });

    onUnmounted(() => {
      if (socket.value) {
        socket.value.disconnect();
      }
    });

    return {
      onlineUsers,
      selectedUser,
      currentConversation,
      messages,
      newMessage,
      selectUser,
      sendMessage,
      formatTime
    };
  }
};
</script>

<style scoped>
.messaging-container {
  display: flex;
  height: 100%;
  background-color: white;
  border-radius: 8px;
  overflow: hidden;
}

.users-panel {
  width: 250px;
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
}

.users-panel h3 {
  padding: 1rem;
  margin: 0;
  border-bottom: 1px solid var(--border-color);
}

.users-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
}

.user-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.user-item:hover {
  background-color: #f5f5f5;
}

.user-item.active {
  background-color: #e3f2fd;
}

.user-info {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-weight: 500;
}

.user-role {
  font-size: 0.8rem;
  color: #666;
}

.user-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #ccc;
}

.status-indicator.online {
  background-color: var(--success-color);
}

.status-text {
  font-size: 0.8rem;
  color: #666;
}

.conversation-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.conversation-header {
  padding: 1rem;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.message {
  max-width: 70%;
  padding: 0.75rem;
  border-radius: 8px;
  background-color: #f5f5f5;
}

.message.sent {
  align-self: flex-end;
  background-color: var(--primary-color);
  color: white;
}

.message-content {
  margin-bottom: 0.5rem;
}

.message-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8rem;
  color: #666;
}

.message.sent .message-meta {
  color: rgba(255, 255, 255, 0.8);
}

.message-status.read {
  color: var(--success-color);
}

.message-input {
  padding: 1rem;
  border-top: 1px solid var(--border-color);
  display: flex;
  gap: 0.5rem;
}

.message-input input {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 1rem;
}

.message-input input:disabled {
  background-color: #f5f5f5;
  cursor: not-allowed;
}

.message-input button {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  background-color: var(--primary-color);
  color: white;
  cursor: pointer;
  transition: background-color 0.2s;
}

.message-input button:hover:not(:disabled) {
  background-color: var(--secondary-color);
}

.message-input button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}
</style> 