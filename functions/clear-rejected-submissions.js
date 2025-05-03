const { Octokit } = require("@octokit/rest");
const { Base64 } = require("js-base64");

// GitHub repository information
const GITHUB_OWNER = "RyanNovinc";
const GITHUB_REPO = "ClaudeAppBuilder";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

// Log function for consistent logging
function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const logEntry = { 
    timestamp, 
    level, 
    message,
    ...(data ? { data } : {})
  };
  
  console.log(JSON.stringify(logEntry));
}

exports.handler = async function(event, context) {
  log('info', 'Clear rejected submissions function called');
  
  // Set CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json"
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === "OPTIONS") {
    log('debug', 'Handling OPTIONS request');
    return {
      statusCode: 200,
      headers,
      body: ""
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    log('warn', 'Method not allowed', { method: event.httpMethod });
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" })
    };
  }
  
  // AUTHENTICATION HANDLING
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
    log('warn', 'Authentication failed', { providedToken: token ? '***' : 'none' });
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: "Unauthorized - Invalid or missing token" })
    };
  }

  try {
    // Initialize GitHub API client
    const octokit = new Octokit({
      auth: GITHUB_TOKEN
    });
    
    // Path to rejected submissions file
    const path = "data/rejected-submissions.json";
    
    try {
      log('info', `Clearing rejected submissions from ${path}`);
      
      // Check if file exists
      let sha = null;
      try {
        const { data: fileData } = await octokit.repos.getContent({
          owner: GITHUB_OWNER,
          repo: GITHUB_REPO,
          path,
        });
        
        // Get the current SHA (required for updating the file)
        sha = fileData.sha;
        
        // Get the current content to count how many were cleared
        const currentContent = JSON.parse(Base64.decode(fileData.content));
        const clearedCount = currentContent.length;
        
        log('info', `Found ${clearedCount} rejected submissions to clear`);
      } catch (error) {
        if (error.status === 404) {
          log('info', `Rejected submissions file not found, nothing to clear`);
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              message: "No rejected submissions found to clear",
              clearedCount: 0
            })
          };
        }
        throw error;
      }
      
      // Create or update file with empty array
      await octokit.repos.createOrUpdateFileContents({
        owner: GITHUB_OWNER,
        repo: GITHUB_REPO,
        path,
        message: "Clear all rejected submissions",
        content: Base64.encode(JSON.stringify([])),
        sha
      });
      
      log('info', 'Successfully cleared rejected submissions');
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: "All rejected submissions cleared successfully",
          clearedCount: null // We don't return the count since we don't have access to it after clearing
        })
      };
    } catch (error) {
      log('error', `Error clearing rejected submissions: ${error.message}`, { error });
      throw error;
    }
  } catch (error) {
    log('error', `Error in clear rejected submissions function: ${error.message}`, { stack: error.stack });
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        message: "Failed to clear rejected submissions",
        error: error.message
      })
    };
  }
};
