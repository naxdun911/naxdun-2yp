// telegram-bot-service.js - Telegram Bot Service for sending notifications

const TelegramBot = require('node-telegram-bot-api');
const databaseService = require('./database-service');

class TelegramBotService {
    constructor() {
        this.bot = null;
        this.subscribers = new Set(); // Store chat IDs of subscribed users
        this.isInitialized = false;
    }

    /**
     * Initialize the Telegram bot
     * @param {string} botToken - Telegram bot token
     */
    initialize(botToken) {
        if (!botToken) {
            throw new Error('Telegram bot token is required');
        }

        try {
            this.bot = new TelegramBot(botToken, { polling: true });
            this.setupBotHandlers();
            this.isInitialized = true;
            console.log('✅ Telegram bot initialized successfully');
        } catch (error) {
            console.error('❌ Error initializing Telegram bot:', error.message);
            throw error;
        }
    }

    /**
     * Setup bot command handlers
     */
    setupBotHandlers() {
        // Handle /start command
        this.bot.onText(/\/start/, async (msg) => {
            const chatId = msg.chat.id;
            this.subscribers.add(chatId);
            
            const welcomeMessage = `
🏢 *Welcome to Heatmap Notifications!*

You will now receive notifications about less crowded buildings every 30 seconds.

Buildings with less than 40% occupancy will be reported to help you find the best spots!

Commands:
/start - Subscribe to notifications
/stop - Unsubscribe from notifications
/status - Get current building status
/help - Show this help message
            `;

            await this.bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
            console.log(`👤 New subscriber: ${chatId}`);
            
            // Send immediate notification with current building status
            try {
                const lowOccupancyBuildings = await databaseService.getLowOccupancyBuildings(40);
                if (lowOccupancyBuildings.length > 0) {
                    const immediateMessage = this.formatLowOccupancyMessage(lowOccupancyBuildings);
                    await this.bot.sendMessage(chatId, immediateMessage, { parse_mode: 'Markdown' });
                    console.log(`📤 Sent immediate notification to new subscriber: ${chatId}`);
                } else {
                    await this.bot.sendMessage(chatId, '📊 Currently no buildings have less than 40% occupancy. You\'ll be notified when less crowded buildings become available!\n\n🛑 _Tap_ /stop _to unsubscribe from notifications_', { parse_mode: 'Markdown' });
                }
            } catch (error) {
                console.error(`❌ Error sending immediate notification to ${chatId}:`, error.message);
                await this.bot.sendMessage(chatId, '⚠️ Welcome! You\'ll receive your first notification within 30 seconds.\n\n🛑 _Tap_ /stop _to unsubscribe from notifications_', { parse_mode: 'Markdown' });
            }
        });

        // Handle /stop command
        this.bot.onText(/\/stop/, (msg) => {
            const chatId = msg.chat.id;
            this.subscribers.delete(chatId);
            
            const goodbyeMessage = `
👋 You have been unsubscribed from heatmap notifications.

Send /start anytime to subscribe again!
            `;

            this.bot.sendMessage(chatId, goodbyeMessage);
            console.log(`👤 Unsubscribed: ${chatId}`);
        });

        // Handle /status command
        this.bot.onText(/\/status/, async (msg) => {
            const chatId = msg.chat.id;
            try {
                const buildings = await databaseService.getAllBuildingsStatus();
                const statusMessage = this.formatAllBuildingsStatus(buildings);
                this.bot.sendMessage(chatId, statusMessage, { parse_mode: 'Markdown' });
            } catch (error) {
                this.bot.sendMessage(chatId, '❌ Error fetching building status. Please try again later.');
            }
        });

        // Handle /help command
        this.bot.onText(/\/help/, (msg) => {
            const chatId = msg.chat.id;
            const helpMessage = `
🏢 *Heatmap Notifications Bot Help*

This bot sends you notifications about less crowded buildings on campus.

*Commands:*
/start - Subscribe to notifications
/stop - Unsubscribe from notifications
/status - Get current status of all buildings
/help - Show this help message

*About Notifications:*
• Sent every 30 seconds
• Shows buildings with less than 40% occupancy
• Helps you find the least crowded spots
• Includes occupancy percentage and current crowd count
            `;

            this.bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
        });

        // Error handling
        this.bot.on('error', (error) => {
            console.error('❌ Telegram bot error:', error.message);
        });

        console.log('🤖 Telegram bot handlers setup complete');
    }

    /**
     * Send low occupancy notifications to all subscribers
     */
    async sendLowOccupancyNotifications() {
        if (!this.isInitialized || this.subscribers.size === 0) {
            return;
        }

        try {
            const lowOccupancyBuildings = await databaseService.getLowOccupancyBuildings(40);
            
            if (lowOccupancyBuildings.length === 0) {
                // Optional: Send a message when no buildings are available
                return;
            }

            const message = this.formatLowOccupancyMessage(lowOccupancyBuildings);
            
            // Send to all subscribers
            const promises = Array.from(this.subscribers).map(chatId => 
                this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' })
                    .catch(error => {
                        console.error(`❌ Failed to send message to ${chatId}:`, error.message);
                        // Remove subscriber if they blocked the bot
                        if (error.response && error.response.statusCode === 403) {
                            this.subscribers.delete(chatId);
                            console.log(`🚫 Removed blocked subscriber: ${chatId}`);
                        }
                    })
            );

            await Promise.allSettled(promises);
            console.log(`📤 Sent notifications to ${this.subscribers.size} subscribers`);

        } catch (error) {
            console.error('❌ Error sending notifications:', error.message);
        }
    }

    /**
     * Format low occupancy message
     * @param {Array} buildings - Array of low occupancy buildings
     * @returns {string} Formatted message
     */
    formatLowOccupancyMessage(buildings) {
        const timestamp = new Date().toLocaleString();
        let message = `🟢 *Less Crowded Buildings Available* 📍\n\n`;
        
        buildings.forEach((building, index) => {
            const emoji = this.getOccupancyEmoji(building.occupancy_percentage);
            message += `${emoji} *${building.building_name}*\n`;
            message += `   📊 ${building.occupancy_percentage}% capacity (${building.current_crowd}/${building.building_capacity} people)\n`;
            if (index < buildings.length - 1) message += '\n';
        });

        message += `\n⏰ *Updated:* ${timestamp}`;
        message += `\n\n🛑 _Tap_ /stop _to unsubscribe from notifications_`;
        return message;
    }

    /**
     * Format all buildings status message
     * @param {Array} buildings - Array of all buildings
     * @returns {string} Formatted message
     */
    formatAllBuildingsStatus(buildings) {
        const timestamp = new Date().toLocaleString();
        let message = `🏢 *All Buildings Status* 📊\n\n`;
        
        buildings.forEach((building, index) => {
            const emoji = this.getOccupancyEmoji(building.occupancy_percentage);
            const statusEmoji = building.occupancy_percentage < 40 ? '🟢' : 
                               building.occupancy_percentage < 70 ? '🟡' : '🔴';
            
            message += `${statusEmoji} *${building.building_name}*\n`;
            message += `   📊 ${building.occupancy_percentage}% (${building.current_crowd}/${building.building_capacity})\n`;
            if (index < buildings.length - 1) message += '\n';
        });

        message += `\n⏰ *Updated:* ${timestamp}`;
        message += `\n\n🛑 _Tap_ /stop _to unsubscribe from notifications_`;
        return message;
    }

    /**
     * Get appropriate emoji based on occupancy percentage
     * @param {number} percentage - Occupancy percentage
     * @returns {string} Emoji
     */
    getOccupancyEmoji(percentage) {
        if (percentage < 25) return '🟢';
        if (percentage < 40) return '🟡';
        if (percentage < 70) return '🟠';
        return '🔴';
    }

    /**
     * Get number of active subscribers
     * @returns {number} Number of subscribers
     */
    getSubscriberCount() {
        return this.subscribers.size;
    }

    /**
     * Check if bot is initialized
     * @returns {boolean} Initialization status
     */
    isReady() {
        return this.isInitialized;
    }
}

module.exports = new TelegramBotService();