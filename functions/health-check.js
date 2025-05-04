const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

exports.handler = async function(event, context) {
  // Set CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
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

  try {
    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      components: [],
      tables: []
    };
    
    // Check Supabase connection
    try {
      // Test connection with a simple query
      const { data, error } = await supabase
        .from('submissions')
        .select('id', { count: 'exact', head: true });
        
      if (error) throw error;
      
      result.components.push({ 
        name: "Supabase", 
        status: "connected",
        message: "Successfully connected to Supabase" 
      });
      
      // Check submissions table
      result.tables.push({
        name: "submissions",
        count: data.length,
        status: "available"
      });
      
      // Check sync_log table
      try {
        const { data: syncData, error: syncError } = await supabase
          .from('sync_log')
          .select('*')
          .limit(1);
          
        if (syncError) throw syncError;
        
        result.tables.push({
          name: "sync_log",
          status: "available",
          lastSync: syncData.length > 0 ? syncData[0].timestamp : null
        });
      } catch (syncError) {
        result.tables.push({
          name: "sync_log",
          status: "error",
          message: syncError.message
        });
      }
    } catch (supabaseError) {
      result.success = false;
      result.components.push({ 
        name: "Supabase", 
        status: "error",
        message: supabaseError.message 
      });
    }
    
    // Check environment variables
    const requiredEnvVars = [
      'SUPABASE_URL',
      'SUPABASE_SERVICE_KEY',
      'ADMIN_TOKEN'
    ];
    
    const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingEnvVars.length === 0) {
      result.components.push({
        name: "Environment Variables",
        status: "available",
        message: "All required environment variables are set"
      });
    } else {
      result.success = false;
      result.components.push({
        name: "Environment Variables",
        status: "error",
        message: `Missing required environment variables: ${missingEnvVars.join(', ')}`
      });
    }
    
    // Return health check result
    return {
      statusCode: result.success ? 200 : 500,
      headers,
      body: JSON.stringify(result)
    };
  } catch (error) {
    console.error('Error during health check:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: "An error occurred during the health check."
      })
    };
  }
};
