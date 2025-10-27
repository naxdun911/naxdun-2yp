const express = require('express');
const cors = require('cors');
require('dotenv').config(); // Load environment variables
const app = express();

// Import Telegram Notification Service
const telegramNotificationService = require('./telegram_notifications');

// ===============================
// MIDDLEWARE
// ===============================
app.use(cors());
app.use(express.json());



 
// ===============================
// FEATURE-BASED ROUTES
// ===============================

// Register each feature router
app.use('/heatmap', require('./routes/heatmap'));       // Heatmap data from CCTV
app.use('/api', require('./routes/sample_buildings'));  // Demo building data
app.use('/reports', require('./routes/reporting'));

// Telegram notification routes
app.get('/telegram/status', (req, res) => {
    try {
        const status = telegramNotificationService.getStatus();
        res.json(status);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/telegram/test', async (req, res) => {
    try {
        await telegramNotificationService.sendTestNotification();
        res.json({ message: 'Test notification sent successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/telegram/buildings', async (req, res) => {
    try {
        const buildings = await telegramNotificationService.getLowOccupancyBuildings();
        res.json(buildings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/', (req, res) => res.json({ 
    msg: "Hello from Heatmap Backend!", 
    telegramService: telegramNotificationService.getStatus().initialized ? 'Active' : 'Inactive'
}));            // Home route
// ===============================
// SERVER STARTUP & TELEGRAM SERVICE INITIALIZATION
// ===============================
const PORT = process.env.PORT || process.env.BACKEND_HEATMAP_SERVICE_PORT || 3897;

app.listen(PORT, async () => {
    console.log(`API running on port ${PORT}`);
    
    // Initialize Telegram Notification Service
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (botToken && botToken !== 'YOUR_BOT_TOKEN_HERE') {
        try {
            await telegramNotificationService.initialize(botToken);
            telegramNotificationService.start(30); // Start with 30-second intervals
            console.log('🤖 Telegram notification service started successfully');
        } catch (error) {
            console.error('❌ Failed to start Telegram service:', error.message);
        }
    } else {
        console.log('⚠️ Telegram bot token not configured. Telegram service disabled.');
        console.log('💡 Add TELEGRAM_BOT_TOKEN to .env file to enable notifications');
    }
});
