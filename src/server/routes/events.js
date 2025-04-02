const express = require('express');
const router = express.Router();
const eventSyncService = require('../../services/eventSync');
const videoService = require('../../services/video');

// Get all events
router.get('/', async (req, res) => {
    try {
        const events = await eventSyncService.getAllEvents();
        res.json(events);
    } catch (error) {
        console.error('Error fetching events:', error);
        res.status(500).json({ error: 'Failed to fetch events' });
    }
});

// Get a specific event
router.get('/:id', async (req, res) => {
    try {
        const event = await eventSyncService.getEventById(req.params.id);
        if (!event) {
            return res.status(404).json({ error: 'Event not found' });
        }
        res.json(event);
    } catch (error) {
        console.error('Error fetching event:', error);
        res.status(500).json({ error: 'Failed to fetch event' });
    }
});

// Update an event
router.put('/:id', async (req, res) => {
    try {
        const updatedEvent = await eventSyncService.updateEvent(req.params.id, req.body);
        res.json(updatedEvent);
    } catch (error) {
        console.error('Error updating event:', error);
        res.status(500).json({ error: 'Failed to update event' });
    }
});

// Trigger manual sync
router.post('/sync', async (req, res) => {
    try {
        const result = await eventSyncService.syncEvents();
        res.json({ success: true, message: 'Sync completed', data: result });
    } catch (error) {
        console.error('Error syncing events:', error);
        res.status(500).json({ error: 'Failed to sync events' });
    }
});

// Toggle offline mode
router.post('/offline', async (req, res) => {
    try {
        const { enabled } = req.body;
        await eventSyncService.setOfflineMode(enabled);
        res.json({ success: true, offline: enabled });
    } catch (error) {
        console.error('Error toggling offline mode:', error);
        res.status(500).json({ error: 'Failed to toggle offline mode' });
    }
});

module.exports = router; 