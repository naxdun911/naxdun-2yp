// index.js - Main entry point for telegram notifications service

const telegramBotService = require('./telegram-bot-service');
const notificationScheduler = require('./notification-scheduler');
const databaseService = require('./database-service');
const config = require('./config');

class TelegramNotificationService {
    constructor() {
        this.isInitialized = false;
        this.config = config;
    }

    /**
     * Initialize the telegram notification service
     * @param {string} botToken - Telegram bot token
     * @param {Object} options - Additional options
     */
    async initialize(botToken, options = {}) {
        try {
            console.log('🚀 Initializing Telegram Notification Service...');

            // Validate bot token
            if (!botToken) {
                throw new Error('Telegram bot token is required');
            }

            // Test database connection
            const dbConnected = await databaseService.testConnection();
            if (!dbConnected) {
                throw new Error('Database connection failed');
            }

            // Initialize Telegram bot
            telegramBotService.initialize(botToken);

            // Setup configuration
            this.config.notifications = { ...this.config.notifications, ...options };

            this.isInitialized = true;
            console.log('✅ Telegram Notification Service initialized successfully');

            return true;
        } catch (error) {
            console.error('❌ Error initializing Telegram Notification Service:', error.message);
            throw error;
        }
    }

    /**
     * Start the notification service
     * @param {number} intervalSeconds - Notification interval in seconds
     */
    start(intervalSeconds = null) {
        if (!this.isInitialized) {
            throw new Error('Service not initialized. Call initialize() first.');
        }

        const interval = intervalSeconds || this.config.notifications.intervalSeconds;
        notificationScheduler.start(interval);
        
        console.log(`🎯 Telegram Notification Service started with ${interval}s interval`);
    }

    /**
     * Stop the notification service
     */
    stop() {
        notificationScheduler.stop();
        console.log('🛑 Telegram Notification Service stopped');
    }

    /**
     * Restart the service with new settings
     * @param {number} intervalSeconds - New interval in seconds
     */
    restart(intervalSeconds = null) {
        const interval = intervalSeconds || this.config.notifications.intervalSeconds;
        notificationScheduler.restart(interval);
        console.log(`🔄 Telegram Notification Service restarted with ${interval}s interval`);
    }

    /**
     * Send a test notification
     */
    async sendTestNotification() {
        if (!this.isInitialized) {
            throw new Error('Service not initialized. Call initialize() first.');
        }

        await notificationScheduler.sendTestNotification();
    }

    /**
     * Get current service status
     * @returns {Object} Service status
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            scheduler: notificationScheduler.getStatus(),
            config: {
                threshold: this.config.notifications.lowOccupancyThreshold,
                interval: this.config.notifications.intervalSeconds
            },
            nextNotification: notificationScheduler.getNextNotificationTime()
        };
    }

    /**
     * Get low occupancy buildings (for debugging)
     * @returns {Array} Low occupancy buildings
     */
    async getLowOccupancyBuildings() {
        return await databaseService.getLowOccupancyBuildings(
            this.config.notifications.lowOccupancyThreshold
        );
    }

    /**
     * Get all buildings status (for debugging)
     * @returns {Array} All buildings with status
     */
    async getAllBuildingsStatus() {
        return await databaseService.getAllBuildingsStatus();
    }

    /**
     * Update notification settings
     * @param {Object} newSettings - New settings to apply
     */
    updateSettings(newSettings) {
        this.config.notifications = { ...this.config.notifications, ...newSettings };
        console.log('⚙️ Notification settings updated:', newSettings);
    }
}

module.exports = new TelegramNotificationService();