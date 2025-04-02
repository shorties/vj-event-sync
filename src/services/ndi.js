const ndi = require('ndi');
const winston = require('winston');
const path = require('path');

// Configure logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'logs/ndi.log' }),
        new winston.transports.Console()
    ]
});

class NDIService {
    constructor() {
        this.sender = null;
        this.receiver = null;
        this.isInitialized = false;
        this.streamName = 'VJ Event Sync Output';
        this.previewName = 'VJ Event Sync Preview';
        this.width = 1920;
        this.height = 1080;
        this.fps = 60;
    }

    async initialize() {
        try {
            if (!process.env.NDI_ENABLED || process.env.NDI_ENABLED !== 'true') {
                logger.info('NDI is disabled, skipping initialization');
                return;
            }

            // Initialize NDI sender
            this.sender = new ndi.Sender({
                name: this.streamName,
                width: this.width,
                height: this.height,
                fps: this.fps,
                pixelFormat: 'RGBA',
                videoCodec: 'H264',
                audioCodec: 'AAC',
                audioChannels: 2,
                audioSampleRate: 48000
            });

            // Initialize NDI receiver for preview
            this.receiver = new ndi.Receiver({
                name: this.previewName,
                colorFormat: 'RGBA',
                bandwidth: 'highest',
                allowVideoFields: false
            });

            this.isInitialized = true;
            logger.info('NDI service initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize NDI service:', error);
            throw error;
        }
    }

    async sendFrame(frameData) {
        try {
            if (!this.isInitialized) {
                throw new Error('NDI service not initialized');
            }

            // Send frame to NDI output
            await this.sender.sendFrame({
                data: frameData,
                timestamp: Date.now()
            });

            logger.debug('Frame sent successfully');
        } catch (error) {
            logger.error('Failed to send frame:', error);
            throw error;
        }
    }

    async sendAudio(audioData) {
        try {
            if (!this.isInitialized) {
                throw new Error('NDI service not initialized');
            }

            // Send audio to NDI output
            await this.sender.sendAudio({
                data: audioData,
                timestamp: Date.now()
            });

            logger.debug('Audio sent successfully');
        } catch (error) {
            logger.error('Failed to send audio:', error);
            throw error;
        }
    }

    async receivePreview(callback) {
        try {
            if (!this.isInitialized) {
                throw new Error('NDI service not initialized');
            }

            // Set up preview receiver
            this.receiver.on('frame', (frame) => {
                callback(frame);
            });

            this.receiver.on('error', (error) => {
                logger.error('Preview receiver error:', error);
            });

            logger.info('Preview receiver started');
        } catch (error) {
            logger.error('Failed to start preview receiver:', error);
            throw error;
        }
    }

    async setResolution(width, height) {
        try {
            if (!this.isInitialized) {
                throw new Error('NDI service not initialized');
            }

            this.width = width;
            this.height = height;

            // Reinitialize sender with new resolution
            await this.cleanup();
            await this.initialize();

            logger.info(`Resolution updated to ${width}x${height}`);
        } catch (error) {
            logger.error('Failed to update resolution:', error);
            throw error;
        }
    }

    async setFPS(fps) {
        try {
            if (!this.isInitialized) {
                throw new Error('NDI service not initialized');
            }

            this.fps = fps;

            // Reinitialize sender with new FPS
            await this.cleanup();
            await this.initialize();

            logger.info(`FPS updated to ${fps}`);
        } catch (error) {
            logger.error('Failed to update FPS:', error);
            throw error;
        }
    }

    async cleanup() {
        try {
            if (this.sender) {
                await this.sender.destroy();
                this.sender = null;
            }

            if (this.receiver) {
                await this.receiver.destroy();
                this.receiver = null;
            }

            this.isInitialized = false;
            logger.info('NDI service cleaned up');
        } catch (error) {
            logger.error('Failed to cleanup NDI service:', error);
            throw error;
        }
    }
}

module.exports = new NDIService(); 