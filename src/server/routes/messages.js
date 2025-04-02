const express = require('express');
const router = express.Router();
const messagingService = require('../../services/messaging');

// Get conversation history
router.get('/conversations/:conversationId', async (req, res) => {
    try {
        const messages = await messagingService.getConversationHistory(req.params.conversationId);
        res.json(messages);
    } catch (error) {
        console.error('Failed to get conversation history:', error);
        res.status(500).json({ error: 'Failed to get conversation history' });
    }
});

// Get online users
router.get('/users/online', async (req, res) => {
    try {
        const onlineUsers = await messagingService.getOnlineUsers();
        res.json(onlineUsers);
    } catch (error) {
        console.error('Failed to get online users:', error);
        res.status(500).json({ error: 'Failed to get online users' });
    }
});

// Get user status
router.get('/users/:userId/status', async (req, res) => {
    try {
        const status = await messagingService.getUserStatus(req.params.userId);
        res.json(status);
    } catch (error) {
        console.error('Failed to get user status:', error);
        res.status(500).json({ error: 'Failed to get user status' });
    }
});

// Create new conversation
router.post('/conversations', async (req, res) => {
    try {
        const { djId, vjId } = req.body;
        const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        await messagingService.db.run(
            `INSERT INTO conversations (id, dj_id, vj_id)
            VALUES (?, ?, ?)`,
            [conversationId, djId, vjId]
        );

        res.json({ conversationId });
    } catch (error) {
        console.error('Failed to create conversation:', error);
        res.status(500).json({ error: 'Failed to create conversation' });
    }
});

// Get user's conversations
router.get('/users/:userId/conversations', async (req, res) => {
    try {
        const conversations = await new Promise((resolve, reject) => {
            messagingService.db.all(
                `SELECT c.*, 
                    CASE 
                        WHEN c.dj_id = ? THEN u2.name
                        ELSE u1.name
                    END as other_user_name
                FROM conversations c
                JOIN users u1 ON c.dj_id = u1.id
                JOIN users u2 ON c.vj_id = u2.id
                WHERE c.dj_id = ? OR c.vj_id = ?
                ORDER BY c.created_at DESC`,
                [req.params.userId, req.params.userId, req.params.userId],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });

        res.json(conversations);
    } catch (error) {
        console.error('Failed to get user conversations:', error);
        res.status(500).json({ error: 'Failed to get user conversations' });
    }
});

module.exports = router; 