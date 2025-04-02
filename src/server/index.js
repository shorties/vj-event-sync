require('dotenv').config();
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const path = require('path');
const { createServer } = require('http');
const { Server } = require('socket.io');

// Import services
const eventSyncService = require('../services/eventSync');
const oscService = require('../services/osc');
const ndiService = require('../services/ndi');
const videoService = require('../services/video');
const messagingService = require('../services/messaging');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../../dist')));

// API Routes
app.use('/api/events', require('./routes/events'));
app.use('/api/logos', require('./routes/logos'));
app.use('/api/timers', require('./routes/timers'));
app.use('/api/messages', require('./routes/messages'));

// WebSocket connection handling
io.on('connection', async (socket) => {
    console.log('Client connected');

    // Handle user authentication
    socket.on('auth', async (userData) => {
        const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await messagingService.userConnect(userId, socket.id, userData);
        socket.userId = userId;
        socket.emit('auth:success', { userId });
        
        // Broadcast online status
        const onlineUsers = await messagingService.getOnlineUsers();
        io.emit('users:status', onlineUsers);
    });

    socket.on('disconnect', async () => {
        if (socket.userId) {
            await messagingService.userDisconnect(socket.userId);
            const onlineUsers = await messagingService.getOnlineUsers();
            io.emit('users:status', onlineUsers);
        }
        console.log('Client disconnected');
    });

    // Handle real-time updates
    socket.on('logo:change', async (data) => {
        try {
            await videoService.changeLogo(data.logoId);
            io.emit('logo:updated', { logoId: data.logoId });
        } catch (error) {
            console.error('Error changing logo:', error);
            socket.emit('error', { message: 'Failed to change logo' });
        }
    });

    socket.on('timer:start', async (data) => {
        try {
            await videoService.startTimer(data.duration);
            io.emit('timer:started', { duration: data.duration });
        } catch (error) {
            console.error('Error starting timer:', error);
            socket.emit('error', { message: 'Failed to start timer' });
        }
    });

    // Handle messaging
    socket.on('message:send', async (data) => {
        try {
            const { conversationId, content } = data;
            const message = await messagingService.sendMessage(
                conversationId,
                socket.userId,
                content
            );
            
            // Emit to all users in the conversation
            io.emit(`conversation:${conversationId}`, message);
        } catch (error) {
            console.error('Error sending message:', error);
            socket.emit('error', { message: 'Failed to send message' });
        }
    });

    socket.on('message:read', async (data) => {
        try {
            const { messageId, conversationId } = data;
            await messagingService.markMessageAsRead(messageId, conversationId);
            io.emit(`message:${messageId}:read`, { messageId, conversationId });
        } catch (error) {
            console.error('Error marking message as read:', error);
            socket.emit('error', { message: 'Failed to mark message as read' });
        }
    });
});

// Initialize services
async function initializeServices() {
    try {
        await eventSyncService.initialize();
        await oscService.initialize();
        if (process.env.NDI_ENABLED === 'true') {
            await ndiService.initialize();
        }
        await videoService.initialize();
        await messagingService.initialize();
    } catch (error) {
        console.error('Failed to initialize services:', error);
        process.exit(1);
    }
}

// Start server
const PORT = process.env.PORT || 3000;
initializeServices().then(() => {
    httpServer.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}).catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
}); 