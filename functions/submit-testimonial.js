const { Octokit } = require("@octokit/rest");
const { Base64 } = require("js-base64");
const cloudinary = require('cloudinary').v2;

// GitHub repository information (maintain for transition period)
const GITHUB_OWNER = "RyanNovinc";
const GITHUB_REPO = "ClaudeAppBuilder";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

exports.handler = async function(event, context) {
  // Set CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json"
  };

  // Handle preflight requests
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

  try {
    // Parse request body
    const data = JSON.parse(event.body);
    
    // Generate a unique ID for the submission
    const submissionId = `story_${Date.now()}`;
    
    // Process images - upload to Cloudinary instead of storing as base64
    const processedImages = [];
    
    if (data.images && data.images.length > 0) {
      for (const base64Image of data.images) {
        if (base64Image && typeof base64Image === 'string' && base64Image.startsWith('data:')) {
          try {
            // Upload image to Cloudinary
            const uploadResult = await cloudinary.uploader.upload(base64Image, {
              folder: 'appfoundry-screenshots',
              public_id: `${submissionId}_${processedImages.length + 1}`,
              tags: ['appfoundry', 'success-story'],
              resource_type: 'image'
            });
            
            // Store the Cloudinary URL instead of base64
            processedImages.push(uploadResult.secure_url);
            
            console.log(`Successfully uploaded image to Cloudinary: ${uploadResult.public_id}`);
          } catch (uploadError) {
            console.error('Error uploading to Cloudinary:', uploadError);
            // Skip failed uploads but continue processing
          }
        }
      }
    }
    
    // Create submission object with Cloudinary URLs instead of base64
    const submission = {
      id: submissionId,
      name: data.name,
      email: data.email,
      appName: data.appName,
      appType: data.appType,
      experienceLevel: data.experienceLevel,
      testimonial: data.testimonial,
      story: data.story,
      images: processedImages, // Now contains Cloudinary URLs instead of base64
      date: new Date().toISOString(),
      status: 'pending'
    };
    
    // During transition period: Still save to GitHub too
    try {
      // Initialize GitHub API client (keep for transition period)
      const octokit = new Octokit({
        auth: GITHUB_TOKEN
      });
      
      // Get existing pending submissions
      const pendingPath = 'data/pending-submissions.json';
      let pendingSubmissions = [];
      let pendingSha;
      
      try {
        const { data: fileData } = await octokit.repos.getContent({
          owner: GITHUB_OWNER,
          repo: GITHUB_REPO,
          path: pendingPath
        });
        
        pendingSubmissions = JSON.parse(Base64.decode(fileData.content));
        pendingSha = fileData.sha;
      } catch (error) {
        if (error.status !== 404) {
          throw error;
        }
        // If file doesn't exist yet, that's fine - we'll create it
      }
      
      // Add new submission to the beginning of the array
      pendingSubmissions.unshift(submission);
      
      // Save updated submissions back to GitHub
      await octokit.repos.createOrUpdateFileContents({
        owner: GITHUB_OWNER,
        repo: GITHUB_REPO,
        path: pendingPath,
        message: `Add new success story submission: ${submission.appName}`,
        content: Base64.encode(JSON.stringify(pendingSubmissions, null, 2)),
        sha: pendingSha
      });
      
      console.log('Successfully saved submission to GitHub');
    } catch (githubError) {
      console.error('Error saving to GitHub:', githubError);
      // Continue even if GitHub fails - we're transitioning away from it
    }
    
    // Also store the submission in a Netlify database function or similar
    // (Future enhancement - store in dedicated database)
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: "Submission received successfully",
        submissionId: submission.id
      })
    };
  } catch (error) {
    console.error('Error processing submission:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "An error occurred while processing your submission."
      })
    };
  }
};
