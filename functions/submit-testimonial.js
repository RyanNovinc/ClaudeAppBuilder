const { Octokit } = require("@octokit/rest");
const { Base64 } = require("js-base64");
const cloudinaryHelper = require("./utils/cloudinary-helper");

// GitHub repository information
const GITHUB_OWNER = "RyanNovinc"; // Your actual GitHub username
const GITHUB_REPO = "ClaudeAppBuilder"; // Your actual repository name
const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // Set this in Netlify environment variables

exports.handler = async function(event, context) {
  // Set CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
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

  try {
    // Parse the incoming request body
    const data = JSON.parse(event.body);
    
    // Validate required fields
    const requiredFields = ["name", "email", "appType", "appName", "story", "testimonial"];
    for (const field of requiredFields) {
      if (!data[field]) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: `Missing required field: ${field}` })
        };
      }
    }
    
    // Process images first - upload to Cloudinary
    let processedImages = [];
    
    if (data.images && Array.isArray(data.images) && data.images.length > 0) {
      console.log(`Processing ${data.images.length} images for upload to Cloudinary`);
      
      try {
        // Upload all images to Cloudinary
        processedImages = await cloudinaryHelper.uploadMultipleImages(
          data.images, 
          'appfoundry-submissions'
        );
        
        console.log(`Successfully uploaded ${processedImages.length} images to Cloudinary`);
      } catch (imgError) {
        console.error('Error uploading images to Cloudinary:', imgError);
        // Continue with empty images array - this way the submission still works 
        // even if image upload fails
        processedImages = [];
      }
    }
    
    // Create submission object
    const newSubmission = {
      id: `story_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`,
      name: data.name,
      email: data.email,
      appName: data.appName,
      appType: data.appType,
      experienceLevel: data.experienceLevel || "No experience",
      testimonial: data.testimonial,
      story: data.story,
      images: processedImages, // Now using Cloudinary image objects instead of base64
      date: new Date().toISOString(),
      status: "pending"
    };
    
    // Initialize GitHub API client
    const octokit = new Octokit({
      auth: GITHUB_TOKEN
    });
    
    // Get the current pending submissions
    let pendingSubmissions = [];
    try {
      // Get the current file from GitHub
      const { data: fileData } = await octokit.repos.getContent({
        owner: GITHUB_OWNER,
        repo: GITHUB_REPO,
        path: "data/pending-submissions.json",
      });
      
      // Decode content from base64
      const content = Base64.decode(fileData.content);
      pendingSubmissions = JSON.parse(content);
      
      // Save the SHA for updating the file
      const fileSha = fileData.sha;
      
      // Add new submission to the beginning of the array
      pendingSubmissions.unshift(newSubmission);
      
      // Update the file in GitHub
      await octokit.repos.createOrUpdateFileContents({
        owner: GITHUB_OWNER,
        repo: GITHUB_REPO,
        path: "data/pending-submissions.json",
        message: `Add new submission: ${newSubmission.id}`,
        content: Base64.encode(JSON.stringify(pendingSubmissions, null, 2)),
        sha: fileSha,
      });
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: "Success story submitted for review!",
          submissionId: newSubmission.id
        })
      };
    } catch (error) {
      // If file doesn't exist yet, create it with the new submission
      if (error.status === 404) {
        pendingSubmissions = [newSubmission];
        
        await octokit.repos.createOrUpdateFileContents({
          owner: GITHUB_OWNER,
          repo: GITHUB_REPO,
          path: "data/pending-submissions.json",
          message: "Create pending submissions file with first submission",
          content: Base64.encode(JSON.stringify(pendingSubmissions, null, 2)),
        });
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: "Success story submitted for review!",
            submissionId: newSubmission.id
          })
        };
      }
      
      console.error("Error saving submission to GitHub:", error);
      
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: "An error occurred while saving your submission."
        })
      };
    }
  } catch (error) {
    console.error("Error processing submission:", error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "An error occurred while processing your submission."
      })
    };
  }
};
