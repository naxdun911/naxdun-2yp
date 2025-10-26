const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function testSupabaseConnection() {
    try {
        console.log('🔍 Testing Supabase connection...');
        console.log('URL:', process.env.SUPABASE_URL);
        
        // Try a simple query
        const { data, error } = await supabase
            .from('events')  // Assuming there's an events table
            .select('*')
            .limit(1);
            
        if (error) {
            console.log('⚠️ Supabase query error:', error.message);
        } else {
            console.log('✅ Supabase connection successful!');
            console.log('Data retrieved:', data);
        }
    } catch (err) {
        console.error('❌ Supabase connection error:', err.message);
    }
}

testSupabaseConnection();