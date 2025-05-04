const { createClient } = require('@supabase/supabase-js');
const cloudinaryHelper = require("./utils/cloudinary-helper");

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
    
    // Determine operation mode (specific submission or all)
    const { submissionId, forceAll } = data;
    
    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    // Function to find a submission by ID
    async function findSubmission(id) {
      try {
        const { data, error } = await supabase
          .from('submissions')
          .select('*')
          .eq('id', id)
          .single();
          
        if (error) throw error;
        if (!data) return null;
        
        return {
          submission: {
            id: data.id,
            name: data.name,
            email: data.email,
            appName: data.app_name,
            appType: data.app_type,
            experienceLevel: data.experience_level,
            testimonial: data.testimonial,
            story: data.story,
            status: data.status,
            date: data.created_at,
            images: parseCloudinaryImages(data.cloudinary_images)
          },
          originalData: data
        };
      } catch (error) {
        console.error(`Error finding submission ${id}:`, error);
        return null;
      }
    }
    
    // Parse Cloudinary images from string
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
    
    // Function to migrate images for a single submission
    async function migrateSubmissionImages(sourceInfo) {
      const submission = sourceInfo.submission;
      let updated = false;
      
      // Skip if no images
      if (!submission.images || !Array.isArray(submission.images)) {
        return { updated: false, submission };
      }
      
      // Check for base64 images that need migration
      const base64Images = submission.images.filter(img => 
        typeof img === 'string' && img.startsWith('data:')
      );
      
      if (base64Images.length === 0 && !forceAll) {
        console.log(`No base64 images to migrate for submission ${submission.id}`);
        return { updated: false, submission };
      }
      
      console.log(`Migrating ${base64Images.length} images for submission ${submission.id}`);
      
      // Upload images to Cloudinary
      try {
        // Create a map to track the original to Cloudinary URL
        const imageMap = new Map();
        
        for (let i = 0; i < submission.images.length; i++) {
          const image = submission.images[i];
          
          // Skip null/empty images or non-base64 images (unless forceAll)
          if (!image || (typeof image !== 'string' || !image.startsWith('data:')) && !forceAll) {
            continue;
          }
          
          // Upload to Cloudinary
          const result = await cloudinaryHelper.uploadImage(
            image, 
            `${submission.id}_${i}`,
            'appfoundry'
          );
          
          // Store the mapping
          imageMap.set(i, result.secure_url);
        }
        
        // Update images in the submission
        if (imageMap.size > 0) {
          const updatedImages = [...submission.images];
          
          // Replace each image with its Cloudinary URL
          for (const [index, url] of imageMap.entries()) {
            updatedImages[index] = url;
          }
          
          // Update the submission in Supabase
          const { data, error } = await supabase
            .from('submissions')
            .update({
              cloudinary_images: JSON.stringify(updatedImages)
            })
            .eq('id', submission.id);
            
          if (error) throw error;
          
          submission.images = updatedImages;
          updated = true;
          
          // Return the updated submission
          return { 
            updated: true, 
            submission
          };
        }
      } catch (error) {
        console.error(`Error migrating images for submission ${submission.id}:`, error);
        throw error;
      }
      
      return { updated, submission };
    }
    
    // If we're migrating a specific submission
    if (submissionId) {
      const sourceInfo = await findSubmission(submissionId);
      
      if (!sourceInfo) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: `Submission ${submissionId} not found` })
        };
      }
      
      const result = await migrateSubmissionImages(sourceInfo);
      
      // Update the last sync timestamp in Supabase (for client syncs)
      try {
        const timestamp = new Date().toISOString();
        const { data, error } = await supabase
          .from('sync_log')
          .upsert([{ id: 'last_sync', timestamp: timestamp }]);
          
        if (error) throw error;
      } catch (syncError) {
        console.warn("Error updating sync timestamp:", syncError);
        // Continue anyway as this is not critical
      }
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          updated: result.updated,
          message: result.updated 
            ? "Successfully migrated images to Cloudinary" 
            : "No images needed migration",
          submission: result.submission
        })
      };
    }
    // Migrate all submissions
    else {
      const results = {
        total: 0,
        updated: 0,
        details: []
      };
      
      // Get all submissions
      const { data: submissions, error: fetchError } = await supabase
        .from('submissions')
        .select('*');
        
      if (fetchError) throw fetchError;
      
      results.total = submissions.length;
      
      // Process each submission
      for (const submission of submissions) {
        const sourceInfo = {
          submission: {
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
            images: parseCloudinaryImages(submission.cloudinary_images)
          },
          originalData: submission
        };
        
        // Skip if no images
        if (!sourceInfo.submission.images || !Array.isArray(sourceInfo.submission.images)) {
          continue;
        }
        
        // Check for base64 images that need migration
        const base64Images = sourceInfo.submission.images.filter(img => 
          typeof img === 'string' && img.startsWith('data:')
        );
        
        if (base64Images.length === 0 && !forceAll) {
          continue;
        }
        
        try {
          console.log(`Migrating ${base64Images.length} images for submission ${sourceInfo.submission.id}`);
          
          // Migrate images
          const result = await migrateSubmissionImages(sourceInfo);
          
          if (result.updated) {
            results.updated++;
            results.details.push({
              id: sourceInfo.submission.id,
              message: "Successfully migrated images to Cloudinary"
            });
          }
        } catch (error) {
          console.error(`Error migrating images for submission ${sourceInfo.submission.id}:`, error);
          results.details.push({
            id: sourceInfo.submission.id,
            error: error.message
          });
        }
      }
      
      // Update the last sync timestamp in Supabase
      try {
        const timestamp = new Date().toISOString();
        const { data, error } = await supabase
          .from('sync_log')
          .upsert([{ id: 'last_sync', timestamp: timestamp }]);
          
        if (error) throw error;
      } catch (syncError) {
        console.warn("Error updating sync timestamp:", syncError);
        // Continue anyway as this is not critical
      }
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          results
        })
      };
    }
  } catch (error) {
    console.error("Error migrating images:", error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "An error occurred while migrating images",
        message: error.message
      })
    };
  }
};
