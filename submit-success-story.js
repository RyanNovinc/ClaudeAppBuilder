const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

// Supabase configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

exports.handler = async function(event, context) {
  // Set CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
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

  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" })
    };
  }

  console.log("Submit success story function called");

  try {
    // Parse request body
    const data = JSON.parse(event.body);
    console.log("Received submission data:", JSON.stringify(data));
    
    // Validate required fields
    if (!data.name || !data.appName || !data.testimonial || !data.story) {
      console.log("Validation failed - missing required fields");
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Missing required fields" })
      };
    }

    // Initialize Supabase client
    console.log("Initializing Supabase client...");
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    console.log("Supabase client initialized successfully");

    // Prepare the submission data
    const submission = {
      id: uuidv4(),
      name: data.name,
      email: data.email || '',
      app_name: data.appName,
      app_type: data.appType || '',
      experience_level: data.experienceLevel || '',
      testimonial: data.testimonial,
      story: data.story,
      status: 'pending',
      cloudinary_images: data.images ? JSON.stringify(data.images) : '[]',
      created_at: new Date().toISOString()
    };

    console.log("Prepared submission data:", JSON.stringify(submission));

    // Insert into Supabase
    console.log("Inserting submission into Supabase...");
    const { data: insertedData, error } = await supabase
      .from('submissions')
      .insert([submission])
      .select();

    if (error) {
      console.error("Supabase insert error:", error);
      throw error;
    }

    console.log("Submission successfully inserted into Supabase");

    // Update the sync timestamp
    try {
      console.log("Updating sync timestamp...");
      const timestamp = new Date().toISOString();
      
      await supabase
        .from('sync_log')
        .upsert([{ id: 'last_sync', timestamp: timestamp }]);
        
      console.log("Sync timestamp updated successfully");
    } catch (syncError) {
      console.warn("Error updating sync timestamp:", syncError);
      // Continue anyway as this is not critical
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: "Success story submitted successfully",
        id: submission.id
      })
    };
  } catch (error) {
    console.error("Error processing submission:", error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "An error occurred while processing your submission",
        message: error.message
      })
    };
  }
};
