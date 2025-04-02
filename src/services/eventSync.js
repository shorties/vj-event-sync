const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs').promises;
const winston = require('winston');

// Configure logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'logs/event-sync.log' }),
        new winston.transports.Console()
    ]
});

class EventSyncService {
    constructor() {
        this.db = null;
        this.syncInterval = null;
        this.isOnline = true;
        this.lastSync = null;
        this.cacheDir = path.join(__dirname, '../../cache');
    }

    async initialize() {
        try {
            // Ensure cache directory exists
            await fs.mkdir(this.cacheDir, { recursive: true });

            // Initialize SQLite database
            this.db = new sqlite3.Database(path.join(this.cacheDir, 'events.db'));
            await this.initializeDatabase();

            // Start sync process
            this.startSync();
        } catch (error) {
            logger.error('Failed to initialize EventSyncService:', error);
            throw error;
        }
    }

    async initializeDatabase() {
        return new Promise((resolve, reject) => {
            this.db.serialize(() => {
                // Events table
                this.db.run(`CREATE TABLE IF NOT EXISTS events (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    start_time DATETIME NOT NULL,
                    end_time DATETIME NOT NULL,
                    artist_name TEXT,
                    logo_path TEXT,
                    set_duration INTEGER,
                    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
                )`);

                // Logos table
                this.db.run(`CREATE TABLE IF NOT EXISTS logos (
                    id TEXT PRIMARY KEY,
                    event_id TEXT,
                    path TEXT NOT NULL,
                    type TEXT NOT NULL,
                    FOREIGN KEY (event_id) REFERENCES events(id)
                )`);

                resolve();
            });
        });
    }

    async startSync() {
        // Initial sync
        await this.syncEvents();

        // Set up periodic sync (every 5 minutes)
        this.syncInterval = setInterval(() => {
            this.syncEvents().catch(error => {
                logger.error('Sync failed:', error);
            });
        }, 5 * 60 * 1000);
    }

    async syncEvents() {
        try {
            if (!this.isOnline) {
                logger.warn('Offline mode - skipping sync');
                return;
            }

            const response = await axios.get('https://api.vj.tools/events', {
                headers: {
                    'Authorization': `Bearer ${process.env.VJ_TOOLS_API_KEY}`
                }
            });

            const events = response.data;
            await this.updateLocalCache(events);
            this.lastSync = new Date();

            logger.info(`Successfully synced ${events.length} events`);
        } catch (error) {
            logger.error('Failed to sync events:', error);
            this.isOnline = false;
            throw error;
        }
    }

    async updateLocalCache(events) {
        return new Promise((resolve, reject) => {
            this.db.serialize(() => {
                this.db.run('BEGIN TRANSACTION');

                events.forEach(event => {
                    // Update or insert event
                    this.db.run(
                        `INSERT OR REPLACE INTO events 
                        (id, title, start_time, end_time, artist_name, set_duration)
                        VALUES (?, ?, ?, ?, ?, ?)`,
                        [
                            event.id,
                            event.title,
                            event.start_time,
                            event.end_time,
                            event.artist_name,
                            event.set_duration
                        ]
                    );

                    // Handle logos
                    if (event.logos) {
                        event.logos.forEach(logo => {
                            this.db.run(
                                `INSERT OR REPLACE INTO logos 
                                (id, event_id, path, type)
                                VALUES (?, ?, ?, ?)`,
                                [logo.id, event.id, logo.path, logo.type]
                            );
                        });
                    }
                });

                this.db.run('COMMIT', (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        });
    }

    async getEvents() {
        return new Promise((resolve, reject) => {
            this.db.all(
                `SELECT e.*, GROUP_CONCAT(l.id) as logo_ids
                FROM events e
                LEFT JOIN logos l ON e.id = l.event_id
                GROUP BY e.id
                ORDER BY e.start_time`,
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
    }

    async getEventById(id) {
        return new Promise((resolve, reject) => {
            this.db.get(
                `SELECT e.*, GROUP_CONCAT(l.id) as logo_ids
                FROM events e
                LEFT JOIN logos l ON e.id = l.event_id
                WHERE e.id = ?
                GROUP BY e.id`,
                [id],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
    }

    async getLogosByEventId(eventId) {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT * FROM logos WHERE event_id = ?',
                [eventId],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
    }

    async setOfflineMode(enabled) {
        this.isOnline = !enabled;
        if (enabled) {
            clearInterval(this.syncInterval);
        } else {
            this.startSync();
        }
        logger.info(`Offline mode ${enabled ? 'enabled' : 'disabled'}`);
    }

    async cleanup() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
        if (this.db) {
            this.db.close();
        }
    }
}

module.exports = new EventSyncService(); 