const express = require('express');
const cors = require('cors');
require('dotenv').config(); // Load environment variables
const app = express();

// Import services
const telegramNotificationService = require('./telegram_notifications');
const dataGenerator = require('./utils/dataGenerator');

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

// Data Generator routes
app.get('/generator/status', (req, res) => {
    try {
        const status = dataGenerator.getStatus();
        res.json({ success: true, status });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/generator/start', async (req, res) => {
    try {
        const intervalMinutes = parseInt(req.body.intervalMinutes) || 5;
        await dataGenerator.start(intervalMinutes);
        res.json({ success: true, message: `Data generator started with ${intervalMinutes} minute interval` });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/generator/stop', (req, res) => {
    try {
        dataGenerator.stop();
        res.json({ success: true, message: 'Data generator stopped' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/generator/generate-historical', async (req, res) => {
    try {
        const hoursBack = parseInt(req.body.hoursBack) || 24;
        const intervalMinutes = parseInt(req.body.intervalMinutes) || 5;
        await dataGenerator.generateHistoricalData(hoursBack, intervalMinutes);
        res.json({ success: true, message: `Generated ${hoursBack} hours of historical data` });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/', (req, res) => res.json({ 
    msg: "Hello from Heatmap Backend!", 
    telegramService: telegramNotificationService.getStatus().initialized ? 'Active' : 'Inactive',
    dataGenerator: dataGenerator.getStatus().isRunning ? 'Active' : 'Inactive'
}));            // Home route
// ===============================
// SERVER STARTUP & SERVICES INITIALIZATION
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
    
    // Initialize and Start Data Generator
    try {
        await dataGenerator.initialize();
        
        // Check if we need to generate historical data (check if history table is empty)
        const pool = require('./heatmap_db');
        const historyCheck = await pool.query('SELECT COUNT(*) as count FROM building_history');
        const historyCount = parseInt(historyCheck.rows[0].count);
        
        if (historyCount < 100) {
            console.log('📊 Generating initial historical data (past 24 hours)...');
            await dataGenerator.generateHistoricalData(24, 5);
        }
        
        // Start the data generator (generate data every 5 minutes)
        await dataGenerator.start(5);
        console.log('🚀 Data generator service started successfully');
    } catch (error) {
        console.error('❌ Failed to start data generator:', error.message);
        console.log('⚠️ Data generator disabled. You can start it manually via /generator/start endpoint');
    }
});
