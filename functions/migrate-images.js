const { Octokit } = require("@octokit/rest");
const { Base64 } = require("js-base64");
const cloudinaryHelper = require("./utils/cloudinary-helper");

// GitHub repository information
const GITHUB_OWNER = "RyanNovinc"; // Your GitHub username
const GITHUB_REPO = "ClaudeAppBuilder"; // Your repository name
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
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
    
    // Validate required fields
    if (!data.submissionId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Missing submission ID" })
      };
    }
    
    if (!data.images || !Array.isArray(data.images) || data.images.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "No images provided for migration" })
      };
    }
    
    // Upload base64 images to Cloudinary
    console.log(`Uploading ${data.images.length} images to Cloudinary`);
    let cloudinaryImages = [];
    
    try {
      cloudinaryImages = await cloudinaryHelper.uploadMultipleImages(
        data.images, 
        'appfoundry-migrations'
      );
      
      console.log(`Successfully uploaded ${cloudinaryImages.length} images to Cloudinary`);
    } catch (uploadError) {
      console.error("Error uploading images to Cloudinary:", uploadError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: "Failed to upload images to Cloudinary",
          message: uploadError.message
        })
      };
    }
    
    // Find and update the submission in GitHub
    const octokit = new Octokit({
      auth: GITHUB_TOKEN
    });
    
    // Search for the submission in all status files
    const statusFiles = ['pending-submissions.json', 'approved-submissions.json', 'rejected-submissions.json'];
    let submissionFound = false;
    
    for (const statusFile of statusFiles) {
      const filePath = `data/${statusFile}`;
      
      try {
        // Get the file
        const { data: fileData } = await octokit.repos.getContent({
          owner: GITHUB_OWNER,
          repo: GITHUB_REPO,
          path: filePath
        });
        
        // Decode and parse content
        const content = JSON.parse(Base64.decode(fileData.content));
        
        // Find the submission by ID
        const submissionIndex = content.findIndex(s => s.id === data.submissionId);
        
        if (submissionIndex !== -1) {
          // Found the submission in this file
          submissionFound = true;
          
          // Get the original submission
          const submission = content[submissionIndex];
          
          // Replace base64 images with Cloudinary images
          if (submission.images && Array.isArray(submission.images)) {
            // Create a map from base64 to Cloudinary objects for quick lookup
            const imageMap = {};
            data.images.forEach((base64, i) => {
              if (cloudinaryImages[i]) {
                imageMap[base64] = cloudinaryImages[i];
              }
            });
            
            // Replace matching base64 images with Cloudinary objects
            submission.images = submission.images.map(img => {
              // If it's a base64 string and we have a Cloudinary replacement, use it
              if (typeof img === 'string' && img.startsWith('data:') && imageMap[img]) {
                return imageMap[img];
              }
              // Otherwise keep the original
              return img;
            });
            
            // Update the submission in the array
            content[submissionIndex] = submission;
            
            // Write back to GitHub
            await octokit.repos.createOrUpdateFileContents({
              owner: GITHUB_OWNER,
              repo: GITHUB_REPO,
              path: filePath,
              message: `Migrate images for submission ${data.submissionId}`,
              content: Base64.encode(JSON.stringify(content, null, 2)),
              sha: fileData.sha
            });
            
            // Return success with the updated submission
            return {
              statusCode: 200,
              headers,
              body: JSON.stringify({
                success: true,
                message: "Successfully migrated images to Cloudinary",
                submission,
                cloudinaryImages
              })
            };
          }
        }
      } catch (error) {
        // If file not found, continue to next file
        if (error.status === 404) {
          continue;
        }
        
        console.error(`Error processing ${filePath}:`, error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            error: `Error processing ${filePath}`,
            message: error.message
          })
        };
      }
    }
    
    // If we get here, the submission wasn't found
    if (!submissionFound) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: `Submission ${data.submissionId} not found` })
      };
    }
    
    // Submission was found but had no images to migrate
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: "Submission found but had no images to migrate",
        cloudinaryImages
      })
    };
    
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
