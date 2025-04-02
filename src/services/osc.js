const osc = require('node-osc');
const winston = require('winston');
const videoService = require('./video');
const eventSyncService = require('./eventSync');

// Configure logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'logs/osc.log' }),
        new winston.transports.Console()
    ]
});

class OSCService {
    constructor() {
        this.server = null;
        this.client = null;
        this.port = process.env.OSC_PORT || 12345;
        this.host = process.env.OSC_HOST || '127.0.0.1';
    }

    async initialize() {
        try {
            // Initialize OSC server
            this.server = new osc.Server(this.port, this.host);
            this.setupServerHandlers();

            // Initialize OSC client for sending messages
            this.client = new osc.Client(this.host, this.port);

            logger.info(`OSC service initialized on ${this.host}:${this.port}`);
        } catch (error) {
            logger.error('Failed to initialize OSC service:', error);
            throw error;
        }
    }

    setupServerHandlers() {
        // Logo control
        this.server.on('/logo/change', async (msg) => {
            try {
                const logoId = msg[0];
                await videoService.changeLogo(logoId);
                this.send('/logo/status', [logoId, 'success']);
            } catch (error) {
                logger.error('Failed to handle logo change:', error);
                this.send('/logo/status', [msg[0], 'error', error.message]);
            }
        });

        // Timer control
        this.server.on('/timer/start', async (msg) => {
            try {
                const duration = parseInt(msg[0]);
                await videoService.startTimer(duration);
                this.send('/timer/status', [duration, 'success']);
            } catch (error) {
                logger.error('Failed to handle timer start:', error);
                this.send('/timer/status', [msg[0], 'error', error.message]);
            }
        });

        this.server.on('/timer/stop', async (msg) => {
            try {
                await videoService.stop();
                this.send('/timer/status', ['stopped', 'success']);
            } catch (error) {
                logger.error('Failed to handle timer stop:', error);
                this.send('/timer/status', ['stopped', 'error', error.message]);
            }
        });

        // Event sync control
        this.server.on('/sync/trigger', async (msg) => {
            try {
                await eventSyncService.syncEvents();
                this.send('/sync/status', ['success']);
            } catch (error) {
                logger.error('Failed to handle sync trigger:', error);
                this.send('/sync/status', ['error', error.message]);
            }
        });

        this.server.on('/sync/offline', async (msg) => {
            try {
                const enabled = msg[0] === 'true';
                await eventSyncService.setOfflineMode(enabled);
                this.send('/sync/status', ['offline', enabled]);
            } catch (error) {
                logger.error('Failed to handle offline mode:', error);
                this.send('/sync/status', ['error', error.message]);
            }
        });

        // Error handling
        this.server.on('error', (error) => {
            logger.error('OSC server error:', error);
        });
    }

    send(address, args) {
        if (this.client) {
            this.client.send(address, args, (error) => {
                if (error) {
                    logger.error(`Failed to send OSC message to ${address}:`, error);
                }
            });
        }
    }

    // Helper methods for sending specific messages
    sendLogoUpdate(logoId, status) {
        this.send('/logo/update', [logoId, status]);
    }

    sendTimerUpdate(duration, status) {
        this.send('/timer/update', [duration, status]);
    }

    sendSyncStatus(status, details) {
        this.send('/sync/status', [status, details]);
    }

    async cleanup() {
        if (this.server) {
            this.server.close();
        }
        if (this.client) {
            this.client.close();
        }
    }
}

module.exports = new OSCService(); 