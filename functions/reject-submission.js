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
    // Parse request body
    const data = JSON.parse(event.body);
    const { id } = data;
    
    if (!id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Missing submission ID" })
      };
    }
    
    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    // First, get the current submission
    const { data: submission, error: fetchError } = await supabase
      .from('submissions')
      .select('*')
      .eq('id', id)
      .single();
      
    if (fetchError) {
      // Not found error
      if (fetchError.code === 'PGRST116') {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: `Submission with ID ${id} not found` })
        };
      }
      throw fetchError;
    }
    
    // Update the submission status to 'rejected'
    const { data: updatedSubmission, error: updateError } = await supabase
      .from('submissions')
      .update({ status: 'rejected' })
      .eq('id', id)
      .select()
      .single();
      
    if (updateError) throw updateError;
    
    // Format the submission for the response
    const formattedSubmission = {
      id: updatedSubmission.id,
      name: updatedSubmission.name,
      email: updatedSubmission.email,
      appName: updatedSubmission.app_name,
      appType: updatedSubmission.app_type,
      experienceLevel: updatedSubmission.experience_level,
      testimonial: updatedSubmission.testimonial,
      story: updatedSubmission.story,
      status: updatedSubmission.status,
      date: updatedSubmission.created_at,
      images: parseCloudinaryImages(updatedSubmission.cloudinary_images)
    };
    
    // Update sync timestamp
    const timestamp = new Date().toISOString();
    await supabase
      .from('sync_log')
      .upsert([{ id: 'last_sync', timestamp: timestamp }]);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: "Submission rejected successfully",
        submission: formattedSubmission
      })
    };
  } catch (error) {
    console.error('Error rejecting submission:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "An error occurred while rejecting the submission."
      })
    };
  }
};

// Helper function to parse Cloudinary images
function parseCloudinaryImages(cloudinaryImages) {
  if (!cloudinaryImages) return [];
  
  try {
    if (typeof cloudinaryImages === 'string') {
      return JSON.parse(cloudinaryImages);
    }
    
    if (Array.isArray(cloudinaryImages)) {
      return cloudinaryImages;
    }
  } catch (error) {
    console.error('Error parsing Cloudinary images:', error);
  }
  
  return [];
}
