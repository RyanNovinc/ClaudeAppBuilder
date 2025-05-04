const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
const cloudinary = require('cloudinary').v2;

// Supabase configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Function to upload an image to Cloudinary
async function uploadToCloudinary(base64Image, id) {
  console.log("Starting Cloudinary upload for submission", id);
  try {
    const result = await cloudinary.uploader.upload(base64Image, {
      folder: 'appfoundry',
      public_id: `${id}_${Date.now()}`
    });
    console.log("Successfully uploaded to Cloudinary:", result.secure_url);
    return result.secure_url;
  } catch (error) {
    console.error("Error uploading to Cloudinary:", error);
    throw error;
  }
}

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

  console.log("Submit testimonial function called");

  try {
    // Parse request body
    const data = JSON.parse(event.body);
    console.log("Received submission with name:", data.name, "and app:", data.appName);
    
    // Validate required fields
    if (!data.name || !data.appName || !data.testimonial || !data.story) {
      console.log("Validation failed - missing required fields");
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Missing required fields" })
      };
    }

    // Generate a unique ID for this submission
    const submissionId = uuidv4();
    console.log("Generated submission ID:", submissionId);

    // Upload images to Cloudinary if present
    let cloudinaryUrls = [];
    if (data.images && Array.isArray(data.images) && data.images.length > 0) {
      console.log(`Processing ${data.images.length} images for upload`);
      
      // Upload each image to Cloudinary
      const uploadPromises = data.images.map(async (image) => {
        if (image && typeof image === 'string' && image.startsWith('data:')) {
          return await uploadToCloudinary(image, submissionId);
        }
        // If it's already a URL, keep it as is
        if (image && typeof image === 'string' && (image.startsWith('http://') || image.startsWith('https://'))) {
          return image;
        }
        return null;
      });
      
      // Wait for all uploads to complete
      const results = await Promise.all(uploadPromises);
      cloudinaryUrls = results.filter(url => url !== null);
      console.log(`Successfully uploaded ${cloudinaryUrls.length} images to Cloudinary`);
    }

    // Initialize Supabase client
    console.log("Initializing Supabase client...");
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    console.log("Supabase client initialized successfully");

    // Prepare the submission data
    const submission = {
      id: submissionId,
      name: data.name,
      email: data.email || '',
      app_name: data.appName,
      app_type: data.appType || '',
      experience_level: data.experienceLevel || '',
      testimonial: data.testimonial,
      story: data.story,
      status: 'pending',
      cloudinary_images: cloudinaryUrls, // Store the Cloudinary URLs directly
      created_at: new Date().toISOString()
    };

    console.log("Prepared submission data with", cloudinaryUrls.length, "Cloudinary image URLs");

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
        message: "Testimonial submitted successfully",
        id: submissionId
      })
    };
  } catch (error) {
    console.error("Error processing testimonial:", error);
    
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
