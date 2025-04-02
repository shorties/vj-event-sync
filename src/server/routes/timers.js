const express = require('express');
const router = express.Router();
const videoService = require('../../services/video');

// Get timer status for an event
router.get('/event/:eventId', async (req, res) => {
    try {
        const timer = await videoService.getTimerByEventId(req.params.eventId);
        res.json(timer);
    } catch (error) {
        console.error('Error fetching timer:', error);
        res.status(500).json({ error: 'Failed to fetch timer' });
    }
});

// Start timer for an event
router.post('/start', async (req, res) => {
    try {
        const { eventId } = req.body;
        await videoService.startTimer(eventId);
        res.json({ success: true, message: 'Timer started successfully' });
    } catch (error) {
        console.error('Error starting timer:', error);
        res.status(500).json({ error: 'Failed to start timer' });
    }
});

// Stop timer for an event
router.post('/stop', async (req, res) => {
    try {
        const { eventId } = req.body;
        await videoService.stopTimer(eventId);
        res.json({ success: true, message: 'Timer stopped successfully' });
    } catch (error) {
        console.error('Error stopping timer:', error);
        res.status(500).json({ error: 'Failed to stop timer' });
    }
});

// Reset timer for an event
router.post('/reset', async (req, res) => {
    try {
        const { eventId } = req.body;
        await videoService.resetTimer(eventId);
        res.json({ success: true, message: 'Timer reset successfully' });
    } catch (error) {
        console.error('Error resetting timer:', error);
        res.status(500).json({ error: 'Failed to reset timer' });
    }
});

// Update timer settings
router.put('/settings', async (req, res) => {
    try {
        const { eventId, settings } = req.body;
        await videoService.updateTimerSettings(eventId, settings);
        res.json({ success: true, message: 'Timer settings updated successfully' });
    } catch (error) {
        console.error('Error updating timer settings:', error);
        res.status(500).json({ error: 'Failed to update timer settings' });
    }
});

module.exports = router; 