// notification-scheduler.js - Scheduler for sending periodic notifications

const cron = require('node-cron');
const telegramBotService = require('./telegram-bot-service');

class NotificationScheduler {
    constructor() {
        this.isRunning = false;
        this.task = null;
    this.intervalSeconds = 10;
    }

    /**
     * Start the notification scheduler
     * @param {number} intervalSeconds - Interval in seconds (default: 30)
     */
    start(intervalSeconds = 10) {
        if (this.isRunning) {
            console.log('⚠️ Notification scheduler is already running');
            return;
        }

        this.intervalSeconds = intervalSeconds;
        
    // Create cron expression for every N seconds
    // Note: node-cron minimum interval is 1 second, so we'll use setInterval instead for sub-minute intervals
        if (intervalSeconds < 60) {
            this.startIntervalScheduler();
        } else {
            this.startCronScheduler();
        }

        this.isRunning = true;
        console.log(`✅ Notification scheduler started - sending notifications every ${intervalSeconds} seconds`);
    }

    /**
     * Start interval-based scheduler for sub-minute intervals
     */
    startIntervalScheduler() {
        this.task = setInterval(async () => {
            try {
                if (telegramBotService.isReady()) {
                    await telegramBotService.sendLowOccupancyNotifications();
                    console.log(`📤 Scheduled notification sent at ${new Date().toLocaleString()}`);
                } else {
                    console.log('⚠️ Telegram bot not ready, skipping notification');
                }
            } catch (error) {
                console.error('❌ Error in scheduled notification:', error.message);
            }
        }, this.intervalSeconds * 1000);
    }

    /**
     * Start cron-based scheduler for minute+ intervals
     */
    startCronScheduler() {
        const minutes = Math.floor(this.intervalSeconds / 60);
        const cronExpression = `*/${minutes} * * * *`; // Every N minutes
        
        this.task = cron.schedule(cronExpression, async () => {
            try {
                if (telegramBotService.isReady()) {
                    await telegramBotService.sendLowOccupancyNotifications();
                    console.log(`📤 Scheduled notification sent at ${new Date().toLocaleString()}`);
                } else {
                    console.log('⚠️ Telegram bot not ready, skipping notification');
                }
            } catch (error) {
                console.error('❌ Error in scheduled notification:', error.message);
            }
        }, {
            scheduled: true,
            timezone: "UTC"
        });
    }

    /**
     * Stop the notification scheduler
     */
    stop() {
        if (!this.isRunning) {
            console.log('⚠️ Notification scheduler is not running');
            return;
        }

        if (this.task) {
            if (typeof this.task.destroy === 'function') {
                this.task.destroy(); // For cron tasks
            } else {
                clearInterval(this.task); // For interval tasks
            }
            this.task = null;
        }

        this.isRunning = false;
        console.log('🛑 Notification scheduler stopped');
    }

    /**
     * Restart the scheduler with new interval
     * @param {number} intervalSeconds - New interval in seconds
     */
    restart(intervalSeconds = 10) {
        this.stop();
        setTimeout(() => {
            this.start(intervalSeconds);
        }, 1000);
    }

    /**
     * Send a test notification immediately
     */
    async sendTestNotification() {
        try {
            console.log('🧪 Sending test notification...');
            await telegramBotService.sendLowOccupancyNotifications();
            console.log('✅ Test notification sent successfully');
        } catch (error) {
            console.error('❌ Error sending test notification:', error.message);
        }
    }

    /**
     * Get scheduler status
     * @returns {Object} Scheduler status information
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            intervalSeconds: this.intervalSeconds,
            subscriberCount: telegramBotService.getSubscriberCount(),
            botReady: telegramBotService.isReady()
        };
    }

    /**
     * Get next notification time (estimate for interval-based)
     * @returns {Date|null} Next notification time
     */
    getNextNotificationTime() {
        if (!this.isRunning) return null;
        
        const now = new Date();
        const nextTime = new Date(now.getTime() + (this.intervalSeconds * 1000));
        return nextTime;
    }
}

module.exports = new NotificationScheduler();