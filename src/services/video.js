const vlc = require('node-vlc');
const path = require('path');
const winston = require('winston');
const eventSyncService = require('./eventSync');

// Configure logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'logs/video.log' }),
        new winston.transports.Console()
    ]
});

class VideoService {
    constructor() {
        this.vlc = null;
        this.currentLogo = null;
        this.currentTimer = null;
        this.timerInterval = null;
        this.transitionDuration = 1000; // 1 second transition
        this.isPlaying = false;
    }

    async initialize() {
        try {
            // Initialize VLC instance
            this.vlc = new vlc({
                vlcPath: process.env.VLC_PATH || 'vlc',
                options: [
                    '--no-audio',
                    '--no-video-title-show',
                    '--no-stats',
                    '--quiet',
                    '--no-xlib'
                ]
            });

            // Set up event listeners
            this.vlc.on('error', (error) => {
                logger.error('VLC error:', error);
            });

            this.vlc.on('end', () => {
                this.handlePlaybackEnd();
            });

            logger.info('Video service initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize video service:', error);
            throw error;
        }
    }

    async changeLogo(logoId) {
        try {
            const logo = await this.getLogoById(logoId);
            if (!logo) {
                throw new Error(`Logo with ID ${logoId} not found`);
            }

            // Stop current playback if any
            if (this.isPlaying) {
                await this.stop();
            }

            // Start new logo playback
            await this.playLogo(logo);
            this.currentLogo = logo;

            logger.info(`Changed logo to: ${logo.path}`);
        } catch (error) {
            logger.error('Failed to change logo:', error);
            throw error;
        }
    }

    async playLogo(logo) {
        return new Promise((resolve, reject) => {
            this.vlc.play(logo.path, (error) => {
                if (error) {
                    reject(error);
                } else {
                    this.isPlaying = true;
                    resolve();
                }
            });
        });
    }

    async startTimer(duration) {
        try {
            // Clear existing timer if any
            if (this.timerInterval) {
                clearInterval(this.timerInterval);
            }

            // Set up new timer
            const startTime = Date.now();
            this.timerInterval = setInterval(() => {
                const elapsed = Date.now() - startTime;
                const remaining = duration - elapsed;

                if (remaining <= 0) {
                    this.handleTimerEnd();
                }
            }, 1000);

            logger.info(`Started timer for ${duration}ms`);
        } catch (error) {
            logger.error('Failed to start timer:', error);
            throw error;
        }
    }

    async stop() {
        try {
            if (this.timerInterval) {
                clearInterval(this.timerInterval);
                this.timerInterval = null;
            }

            return new Promise((resolve, reject) => {
                this.vlc.stop((error) => {
                    if (error) {
                        reject(error);
                    } else {
                        this.isPlaying = false;
                        resolve();
                    }
                });
            });
        } catch (error) {
            logger.error('Failed to stop playback:', error);
            throw error;
        }
    }

    async getLogoById(logoId) {
        // First try to get from event sync service
        const logos = await eventSyncService.getLogosByEventId(logoId);
        if (logos && logos.length > 0) {
            return logos[0];
        }

        // If not found, check local assets
        const localPath = path.join(__dirname, '../../assets/logos', `${logoId}.png`);
        try {
            await fs.access(localPath);
            return {
                id: logoId,
                path: localPath,
                type: 'local'
            };
        } catch {
            return null;
        }
    }

    handlePlaybackEnd() {
        this.isPlaying = false;
        logger.info('Playback ended');
    }

    handleTimerEnd() {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
        logger.info('Timer ended');
    }

    async cleanup() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        if (this.vlc) {
            await this.stop();
            this.vlc.quit();
        }
    }
}

module.exports = new VideoService(); 