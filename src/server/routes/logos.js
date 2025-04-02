const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const videoService = require('../../services/video');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../uploads/logos');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and SVG files are allowed.'));
        }
    }
});

// Get all logos for an event
router.get('/event/:eventId', async (req, res) => {
    try {
        const logos = await videoService.getLogosByEventId(req.params.eventId);
        res.json(logos);
    } catch (error) {
        console.error('Error fetching logos:', error);
        res.status(500).json({ error: 'Failed to fetch logos' });
    }
});

// Upload a new logo for an event
router.post('/event/:eventId', upload.single('logo'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const logo = await videoService.addLogoToEvent(
            req.params.eventId,
            req.file.path,
            req.body.type || 'default'
        );

        res.status(201).json(logo);
    } catch (error) {
        console.error('Error uploading logo:', error);
        res.status(500).json({ error: 'Failed to upload logo' });
    }
});

// Change the current logo
router.post('/change', async (req, res) => {
    try {
        const { logoId } = req.body;
        await videoService.changeLogo(logoId);
        res.json({ success: true, message: 'Logo changed successfully' });
    } catch (error) {
        console.error('Error changing logo:', error);
        res.status(500).json({ error: 'Failed to change logo' });
    }
});

// Delete a logo
router.delete('/:id', async (req, res) => {
    try {
        await videoService.deleteLogo(req.params.id);
        res.json({ success: true, message: 'Logo deleted successfully' });
    } catch (error) {
        console.error('Error deleting logo:', error);
        res.status(500).json({ error: 'Failed to delete logo' });
    }
});

module.exports = router; 