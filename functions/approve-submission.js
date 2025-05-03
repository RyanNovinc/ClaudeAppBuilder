const { Octokit } = require("@octokit/rest");
const { Base64 } = require("js-base64");

// GitHub repository information (maintain for transition period)
const GITHUB_OWNER = "RyanNovinc";
const GITHUB_REPO = "ClaudeAppBuilder";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

exports.handler = async function(event, context) {
  // Authentication and validation code remains the same...
  
  try {
    // Parse request body
    const data = JSON.parse(event.body);
    const { id } = data;
    
    // Initialize GitHub API client
    const octokit = new Octokit({
      auth: GITHUB_TOKEN
    });
    
    // Find the submission in any status file
    // This code largely remains the same...
    
    // When moving the submission to approved status, no special handling is needed
    // for Cloudinary URLs as they're just strings in the JSON
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: "Submission approved successfully",
        submission: sourceInfo.submission
      })
    };
  } catch (error) {
    console.error('Error approving submission:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "An error occurred while approving the submission."
      })
    };
  }
};
