// test-telegram-service.js - Test script for telegram notification service

require('dotenv').config();
const telegramNotificationService = require('./telegram_notifications');
const databaseService = require('./telegram_notifications/database-service');

async function testTelegramService() {
    console.log('🧪 Testing Telegram Notification Service...\n');

    try {
        // Test 1: Database connection
        console.log('1️⃣ Testing database connection...');
        const dbConnected = await databaseService.testConnection();
        console.log(`   Database: ${dbConnected ? '✅ Connected' : '❌ Failed'}\n`);

        // Test 2: Get low occupancy buildings
        console.log('2️⃣ Testing low occupancy building query...');
        const lowOccupancyBuildings = await databaseService.getLowOccupancyBuildings(40);
        console.log(`   Found ${lowOccupancyBuildings.length} buildings with <40% occupancy:`);
        lowOccupancyBuildings.forEach(building => {
            console.log(`   • ${building.building_name}: ${building.occupancy_percentage}% (${building.current_crowd}/${building.building_capacity})`);
        });
        console.log();

        // Test 3: Get all buildings
        console.log('3️⃣ Testing all buildings query...');
        const allBuildings = await databaseService.getAllBuildingsStatus();
        console.log(`   Total buildings with names: ${allBuildings.length}`);
        console.log();

        // Test 4: Telegram bot token check
        console.log('4️⃣ Checking Telegram bot configuration...');
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        if (botToken && botToken !== 'YOUR_BOT_TOKEN_HERE') {
            console.log('   ✅ Bot token configured');
            
            // Test 5: Initialize service (if token is valid)
            console.log('5️⃣ Testing service initialization...');
            try {
                await telegramNotificationService.initialize(botToken);
                console.log('   ✅ Service initialized successfully');
                
                console.log('6️⃣ Service status:');
                const status = telegramNotificationService.getStatus();
                console.log('   ', status);
                
            } catch (error) {
                console.log(`   ❌ Service initialization failed: ${error.message}`);
            }
        } else {
            console.log('   ⚠️ Bot token not configured or using placeholder');
            console.log('   💡 Set TELEGRAM_BOT_TOKEN in .env file to test full functionality');
        }

        console.log('\n✅ Test completed!');
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
    }
}

// Run the test
testTelegramService()
    .then(() => process.exit(0))
    .catch(error => {
        console.error('❌ Unexpected error:', error);
        process.exit(1);
    });