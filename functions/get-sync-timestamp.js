const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

exports.handler = async function(event, context) {
  // Set CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Content-Type": "application/json"
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: ""
    };
  }

  // Only allow GET requests
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" })
    };
  }

  try {
    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    // Get the last sync timestamp from Supabase
    const { data, error } = await supabase
      .from('sync_log')
      .select('*')
      .eq('id', 'last_sync')
      .single();
      
    if (error) {
      // If not found, create a new timestamp entry
      if (error.code === 'PGRST116') {
        const timestamp = new Date().toISOString();
        
        const { data: newData, error: insertError } = await supabase
          .from('sync_log')
          .insert([{ id: 'last_sync', timestamp: timestamp }])
          .select();
          
        if (insertError) throw insertError;
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            lastSync: timestamp,
            isNew: true
          })
        };
      }
      
      throw error;
    }
    
    // Return the timestamp
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        lastSync: data.timestamp
      })
    };
  } catch (error) {
    console.error('Error getting sync timestamp:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "An error occurred while getting the sync timestamp."
      })
    };
  }
};
