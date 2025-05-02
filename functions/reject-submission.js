const { Octokit } = require("@octokit/rest");
const { Base64 } = require("js-base64");

// GitHub repository information
const GITHUB_OWNER = "YOUR_GITHUB_USERNAME"; // Change this to your GitHub username
const GITHUB_REPO = "YOUR_REPO_NAME"; // Change this to your repository name
const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // Set this in Netlify environment variables
const ADMIN_TOKEN = process.env.ADMIN_TOKEN; // Simple admin token for basic auth

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
  
  // Basic authentication check
  const authHeader = event.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: "Unauthorized" })
    };
  }
  
  const token = authHeader.split(" ")[1];
  if (token !== ADMIN_TOKEN) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: "Invalid token" })
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
        body: JSON.stringify({ error: "Submission ID is required" })
      };
    }
    
    // Initialize GitHub API client
    const octokit = new Octokit({
      auth: GITHUB_TOKEN
    });
    
    // Get pending submissions
    let pendingSubmissions = [];
    let pendingSha = "";
    try {
      const { data: fileData } = await octokit.repos.getContent({
        owner: GITHUB_OWNER,
        repo: GITHUB_REPO,
        path: "data/pending-submissions.json",
      });
      
      pendingSubmissions = JSON.parse(Base64.decode(fileData.content));
      pendingSha = fileData.sha;
    } catch (error) {
      if (error.status === 404) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: "No pending submissions found" })
        };
      }
      throw error;
    }
    
    // Find the submission to reject
    const submissionIndex = pendingSubmissions.findIndex(s => s.id === id);
    if (submissionIndex === -1) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: "Submission not found" })
      };
    }
    
    // Get the submission and remove it from pending
    const submission = pendingSubmissions[submissionIndex];
    pendingSubmissions.splice(submissionIndex, 1);
    
    // Update submission status
    submission.status = "rejected";
    
    // Get current rejected submissions
    let rejectedSubmissions = [];
    let rejectedSha = "";
    try {
      const { data: fileData } = await octokit.repos.getContent({
        owner: GITHUB_OWNER,
        repo: GITHUB_REPO,
        path: "data/rejected-submissions.json",
      });
      
      rejectedSubmissions = JSON.parse(Base64.decode(fileData.content));
      rejectedSha = fileData.sha;
    } catch (error) {
      // If rejected file doesn't exist, it will be created
      if (error.status !== 404) {
        throw error;
      }
    }
    
    // Add the submission to rejected
    rejectedSubmissions.unshift(submission);
    
    // Update both files in GitHub
    await Promise.all([
      // Update pending submissions
      octokit.repos.createOrUpdateFileContents({
        owner: GITHUB_OWNER,
        repo: GITHUB_REPO,
        path: "data/pending-submissions.json",
        message: `Remove submission ${id} from pending`,
        content: Base64.encode(JSON.stringify(pendingSubmissions, null, 2)),
        sha: pendingSha,
      }),
      
      // Update rejected submissions
      octokit.repos.createOrUpdateFileContents({
        owner: GITHUB_OWNER,
        repo: GITHUB_REPO,
        path: "data/rejected-submissions.json",
        message: `Add submission ${id} to rejected`,
        content: Base64.encode(JSON.stringify(rejectedSubmissions, null, 2)),
        sha: rejectedSha || undefined, // If file doesn't exist, don't include sha
      })
    ]);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: "Submission rejected successfully",
        submission
      })
    };
  } catch (error) {
    console.error("Error rejecting submission:", error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "An error occurred while rejecting the submission."
      })
    };
  }
};
