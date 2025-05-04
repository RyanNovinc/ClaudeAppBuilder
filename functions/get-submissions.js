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
  
  // IMPROVED AUTHENTICATION HANDLING
  // Get the token from either Authorization header or query parameter
  let token = null;
  
  // Check Authorization header
  const authHeader = event.headers.authorization;
  if (authHeader) {
    // Allow both "Bearer TOKEN" and just "TOKEN"
    token = authHeader.startsWith("Bearer ") 
      ? authHeader.split(" ")[1]
      : authHeader;
  }
  
  // If no token in header, check query parameters
  if (!token && event.queryStringParameters && event.queryStringParameters.token) {
    token = event.queryStringParameters.token;
  }
  
  // Check if token is valid
  if (!token || token !== ADMIN_TOKEN) {
    console.log("Authentication failed. Provided token:", token ? "***" : "none");
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: "Unauthorized - Invalid or missing token" })
    };
  }

  try {
    // Initialize Supabase client with service key for admin operations
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    // Get query parameters
    const queryParams = event.queryStringParameters || {};
    const status = queryParams.status || "all"; // pending, approved, rejected, or all
    
    // Build the Supabase query
    let query = supabase.from('submissions').select('*');
    
    // Add status filter if specified (and not 'all')
    if (status !== 'all') {
      query = query.eq('status', status);
    }
    
    // Order by created_at, newest first
    query = query.order('created_at', { ascending: false });
    
    // Execute the query
    const { data: submissions, error } = await query;
    
    if (error) throw error;
    
    // Format submissions to match the expected structure in the frontend
    const formattedSubmissions = submissions.map(submission => {
      // Parse cloudinary_images, which is stored as JSON string in Supabase
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
        images = [];
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
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(formattedSubmissions)
    };
  } catch (error) {
    console.error("Error fetching submissions:", error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "An error occurred while fetching submissions."
      })
    };
  }
};
