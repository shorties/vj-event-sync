const osc = require('node-osc');

class VJEventSyncPlugin {
    constructor() {
        this.client = null;
        this.currentLogo = null;
        this.timerRemaining = 0;
        this.isTimerRunning = false;
    }

    initialize(inputs, outputs) {
        try {
            // Initialize OSC client
            this.client = new osc.Client(
                inputs.host || '127.0.0.1',
                inputs.port || 12345
            );

            // Set up OSC message handlers
            this.setupOSCHandlers();

            // Start polling for updates
            this.startPolling();

            console.log('VJ Event Sync plugin initialized');
        } catch (error) {
            console.error('Failed to initialize VJ Event Sync plugin:', error);
        }
    }

    setupOSCHandlers() {
        // Handle logo updates
        this.client.on('/logo/update', (msg) => {
            const [logoId, status] = msg;
            if (status === 'success') {
                this.currentLogo = logoId;
            }
        });

        // Handle timer updates
        this.client.on('/timer/update', (msg) => {
            const [duration, status] = msg;
            if (status === 'success') {
                this.timerRemaining = duration;
                this.isTimerRunning = true;
            }
        });

        // Handle timer stop
        this.client.on('/timer/stop', (msg) => {
            const [status] = msg;
            if (status === 'success') {
                this.isTimerRunning = false;
                this.timerRemaining = 0;
            }
        });
    }

    startPolling() {
        // Poll for current state every second
        setInterval(() => {
            this.client.send('/status/request', [], (error) => {
                if (error) {
                    console.error('Failed to request status:', error);
                }
            });
        }, 1000);
    }

    update(inputs, outputs) {
        // Update outputs with current state
        outputs.currentLogo = this.currentLogo;
        outputs.timerRemaining = this.timerRemaining;
        outputs.isTimerRunning = this.isTimerRunning;
    }

    cleanup() {
        if (this.client) {
            this.client.close();
        }
    }
}

module.exports = VJEventSyncPlugin; 