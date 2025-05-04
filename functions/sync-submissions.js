const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

exports.handler = async function(event, context) {
  // Set CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
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
  
  // Check authentication
  const authHeader = event.headers.authorization;
  let token = null;
  
  if (authHeader) {
    token = authHeader.startsWith("Bearer ") 
      ? authHeader.split(" ")[1]
      : authHeader;
  }
  
  if (!token || token !== ADMIN_TOKEN) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: "Unauthorized - Invalid or missing admin token" })
    };
  }

  try {
    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    // Fetch all submissions from Supabase
    const { data, error } = await supabase
      .from('submissions')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    
    // Format the submissions for the response
    const formattedSubmissions = data.map(submission => {
      // Parse cloudinary_images
      let images = [];
      try {
        if (submission.cloudinary_images) {
          if (typeof submission.cloudinary_images === 'string') {
            images = JSON.parse(submission.cloudinary_images);
          } else if (Array.isArray(submission.cloudinary_images)) {
            images = submission.cloudinary_images;
          }
        }
      } catch (e) {
        console.error(`Error parsing cloudinary_images for submission ${submission.id}:`, e);
      }
      
      return {
        id: submission.id,
        name: submission.name,
        email: submission.email,
        appName: submission.app_name,
        appType: submission.app_type,
        experienceLevel: submission.experience_level,
        testimonial: submission.testimonial,
        story: submission.story,
        status: submission.status,
        date: submission.created_at,
        images: images
      };
    });
    
    // Update the sync timestamp
    const timestamp = new Date().toISOString();
    await supabase
      .from('sync_log')
      .upsert([{ id: 'last_sync', timestamp: timestamp }]);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Successfully synced ${formattedSubmissions.length} submissions from Supabase`,
        submissions: formattedSubmissions,
        timestamp: timestamp
      })
    };
  } catch (error) {
    console.error('Error syncing submissions from Supabase:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "An error occurred while syncing submissions from Supabase."
      })
    };
  }
};
