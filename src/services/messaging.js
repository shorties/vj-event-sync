const winston = require('winston');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Configure logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'logs/messaging.log' }),
        new winston.transports.Console()
    ]
});

class MessagingService {
    constructor() {
        this.db = null;
        this.onlineUsers = new Map(); // Map of userId -> { socketId, lastSeen, role }
        this.messageHistory = new Map(); // Map of conversationId -> messages
    }

    async initialize() {
        try {
            // Initialize SQLite database
            this.db = new sqlite3.Database(path.join(__dirname, '../../cache/messages.db'));
            await this.initializeDatabase();
            logger.info('Messaging service initialized');
        } catch (error) {
            logger.error('Failed to initialize messaging service:', error);
            throw error;
        }
    }

    async initializeDatabase() {
        return new Promise((resolve, reject) => {
            this.db.serialize(() => {
                // Users table
                this.db.run(`CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    role TEXT NOT NULL,
                    last_seen DATETIME DEFAULT CURRENT_TIMESTAMP
                )`);

                // Conversations table
                this.db.run(`CREATE TABLE IF NOT EXISTS conversations (
                    id TEXT PRIMARY KEY,
                    dj_id TEXT NOT NULL,
                    vj_id TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (dj_id) REFERENCES users(id),
                    FOREIGN KEY (vj_id) REFERENCES users(id)
                )`);

                // Messages table
                this.db.run(`CREATE TABLE IF NOT EXISTS messages (
                    id TEXT PRIMARY KEY,
                    conversation_id TEXT NOT NULL,
                    sender_id TEXT NOT NULL,
                    content TEXT NOT NULL,
                    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    read_at DATETIME,
                    FOREIGN KEY (conversation_id) REFERENCES conversations(id),
                    FOREIGN KEY (sender_id) REFERENCES users(id)
                )`);

                resolve();
            });
        });
    }

    async userConnect(userId, socketId, userData) {
        try {
            const { name, role } = userData;
            
            // Update or insert user
            await this.db.run(
                `INSERT OR REPLACE INTO users (id, name, role, last_seen)
                VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
                [userId, name, role]
            );

            // Update online status
            this.onlineUsers.set(userId, {
                socketId,
                lastSeen: new Date(),
                role
            });

            logger.info(`User ${userId} connected as ${role}`);
            return true;
        } catch (error) {
            logger.error('Failed to connect user:', error);
            return false;
        }
    }

    async userDisconnect(userId) {
        try {
            const user = this.onlineUsers.get(userId);
            if (user) {
                // Update last seen in database
                await this.db.run(
                    'UPDATE users SET last_seen = CURRENT_TIMESTAMP WHERE id = ?',
                    [userId]
                );
                
                this.onlineUsers.delete(userId);
                logger.info(`User ${userId} disconnected`);
            }
            return true;
        } catch (error) {
            logger.error('Failed to disconnect user:', error);
            return false;
        }
    }

    async sendMessage(conversationId, senderId, content) {
        try {
            const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            await this.db.run(
                `INSERT INTO messages (id, conversation_id, sender_id, content)
                VALUES (?, ?, ?, ?)`,
                [messageId, conversationId, senderId, content]
            );

            const message = {
                id: messageId,
                conversationId,
                senderId,
                content,
                sentAt: new Date(),
                readAt: null
            };

            // Update message history cache
            if (!this.messageHistory.has(conversationId)) {
                this.messageHistory.set(conversationId, []);
            }
            this.messageHistory.get(conversationId).push(message);

            return message;
        } catch (error) {
            logger.error('Failed to send message:', error);
            throw error;
        }
    }

    async markMessageAsRead(messageId, conversationId) {
        try {
            await this.db.run(
                'UPDATE messages SET read_at = CURRENT_TIMESTAMP WHERE id = ?',
                [messageId]
            );

            // Update message in cache
            const messages = this.messageHistory.get(conversationId);
            if (messages) {
                const message = messages.find(m => m.id === messageId);
                if (message) {
                    message.readAt = new Date();
                }
            }

            return true;
        } catch (error) {
            logger.error('Failed to mark message as read:', error);
            return false;
        }
    }

    async getConversationHistory(conversationId) {
        try {
            // Check cache first
            if (this.messageHistory.has(conversationId)) {
                return this.messageHistory.get(conversationId);
            }

            // If not in cache, fetch from database
            const messages = await new Promise((resolve, reject) => {
                this.db.all(
                    `SELECT m.*, u.name as sender_name
                    FROM messages m
                    JOIN users u ON m.sender_id = u.id
                    WHERE m.conversation_id = ?
                    ORDER BY m.sent_at ASC`,
                    [conversationId],
                    (err, rows) => {
                        if (err) reject(err);
                        else resolve(rows);
                    }
                );
            });

            // Cache the results
            this.messageHistory.set(conversationId, messages);
            return messages;
        } catch (error) {
            logger.error('Failed to get conversation history:', error);
            throw error;
        }
    }

    async getOnlineUsers() {
        return Array.from(this.onlineUsers.entries()).map(([userId, data]) => ({
            userId,
            ...data
        }));
    }

    async getUserStatus(userId) {
        const user = this.onlineUsers.get(userId);
        if (user) {
            return {
                isOnline: true,
                lastSeen: user.lastSeen,
                role: user.role
            };
        }

        // If not in online users, check database for last seen
        const dbUser = await new Promise((resolve, reject) => {
            this.db.get(
                'SELECT last_seen, role FROM users WHERE id = ?',
                [userId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });

        return {
            isOnline: false,
            lastSeen: dbUser?.last_seen,
            role: dbUser?.role
        };
    }

    async cleanup() {
        if (this.db) {
            this.db.close();
        }
    }
}

module.exports = new MessagingService(); 