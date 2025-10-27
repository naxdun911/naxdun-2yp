// config.js - Configuration for telegram notifications

module.exports = {
    // Telegram Bot Configuration
    telegram: {
        // Bot token will be set via environment variable or passed during initialization
        botToken: process.env.TELEGRAM_BOT_TOKEN || null,
        
        // Default settings
        defaultSettings: {
            occupancyThreshold: 40, // Percentage threshold for low occupancy notifications
            notificationInterval: 10, // Seconds between notifications
            enableAutoNotifications: true
        }
    },

    // Notification Settings
    notifications: {
        // Threshold for low occupancy (percentage)
        lowOccupancyThreshold: 40,
        
        // Interval between notifications (seconds)
    intervalSeconds: 10,
        
        // Message settings
        includeTimestamp: true,
        includeEmojis: true,
        maxBuildingsPerMessage: 10
    },

    // Database Settings (inherited from main app)
    database: {
        // These will use the existing database connection from heatmap_db.js
        useExistingConnection: true
    },

    // Logging Settings
    logging: {
        enableDebugLogs: true,
        logNotificationsSent: true,
        logSubscriberChanges: true
    }
};