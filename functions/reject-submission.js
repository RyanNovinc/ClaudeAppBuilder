const { Octokit } = require("@octokit/rest");
const { Base64 } = require("js-base64");

// GitHub repository information
const GITHUB_OWNER = "RyanNovinc";
const GITHUB_REPO = "ClaudeAppBuilder";
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
    
    // First check if submission is in pending
    let submissionSource = "pending";
    let submission = null;
    let sourceSubmissions = [];
    let sourceSha = "";
    
    // Try to find in pending submissions
    try {
      const { data: fileData } = await octokit.repos.getContent({
        owner: GITHUB_OWNER,
        repo: GITHUB_REPO,
        path: "data/pending-submissions.json",
      });
      
      sourceSubmissions = JSON.parse(Base64.decode(fileData.content));
      sourceSha = fileData.sha;
      
      const submissionIndex = sourceSubmissions.findIndex(s => s.id === id);
      if (submissionIndex !== -1) {
        submission = sourceSubmissions[submissionIndex];
        sourceSubmissions.splice(submissionIndex, 1);
      }
    } catch (error) {
      if (error.status !== 404) {
        throw error;
      }
    }
    
    // If not found in pending, check approved
    if (!submission) {
      submissionSource = "approved";
      try {
        const { data: fileData } = await octokit.repos.getContent({
          owner: GITHUB_OWNER,
          repo: GITHUB_REPO,
          path: "data/approved-submissions.json",
        });
        
        sourceSubmissions = JSON.parse(Base64.decode(fileData.content));
        sourceSha = fileData.sha;
        
        const submissionIndex = sourceSubmissions.findIndex(s => s.id === id);
        if (submissionIndex !== -1) {
          submission = sourceSubmissions[submissionIndex];
          sourceSubmissions.splice(submissionIndex, 1);
        }
      } catch (error) {
        if (error.status !== 404) {
          throw error;
        }
      }
    }
    
    // If not found in either, return error
    if (!submission) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: "Submission not found in pending or approved" })
      };
    }
    
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
      // Update source submissions file
      octokit.repos.createOrUpdateFileContents({
        owner: GITHUB_OWNER,
        repo: GITHUB_REPO,
        path: `data/${submissionSource}-submissions.json`,
        message: `Remove submission ${id} from ${submissionSource}`,
        content: Base64.encode(JSON.stringify(sourceSubmissions, null, 2)),
        sha: sourceSha,
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
