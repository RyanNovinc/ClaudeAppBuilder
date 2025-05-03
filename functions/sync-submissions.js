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
  log('info', 'Sync submissions function called');
  
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
    
    // Fetch all submissions from all status files
    const submissions = [];
    const errors = [];
    const dataStatuses = ['pending', 'approved', 'rejected'];
    
    for (const status of dataStatuses) {
      const path = `data/${status}-submissions.json`;
      
      try {
        log('info', `Fetching submissions from ${path}`);
        const { data: fileData } = await octokit.repos.getContent({
          owner: GITHUB_OWNER,
          repo: GITHUB_REPO,
          path,
        });
        
        const content = JSON.parse(Base64.decode(fileData.content));
        
        // Ensure all submissions have their status set correctly
        const statusSubmissions = content.map(submission => ({
          ...submission,
          status
        }));
        
        submissions.push(...statusSubmissions);
        log('info', `Added ${statusSubmissions.length} ${status} submissions`);
      } catch (fileError) {
        if (fileError.status === 404) {
          log('warn', `Data file ${path} not found`);
        } else {
          log('error', `Error fetching submissions from ${path}`, { error: fileError.message });
          errors.push(`Error fetching ${status} submissions: ${fileError.message}`);
        }
      }
    }
    
    // Sort submissions by date, newest first
    submissions.sort((a, b) => {
      const dateA = new Date(a.date || 0);
      const dateB = new Date(b.date || 0);
      return dateB - dateA;
    });
    
    // Check for duplicate IDs (which shouldn't happen but let's be safe)
    const submissionIds = new Set();
    const uniqueSubmissions = [];
    const duplicates = [];
    
    for (const submission of submissions) {
      if (submissionIds.has(submission.id)) {
        duplicates.push(submission.id);
        log('warn', `Found duplicate submission ID: ${submission.id}`);
      } else {
        submissionIds.add(submission.id);
        uniqueSubmissions.push(submission);
      }
    }
    
    // Prepare response
    const response = {
      success: true,
      submissionCounts: {
        total: uniqueSubmissions.length,
        pending: uniqueSubmissions.filter(s => s.status === 'pending').length,
        approved: uniqueSubmissions.filter(s => s.status === 'approved').length,
        rejected: uniqueSubmissions.filter(s => s.status === 'rejected').length
      },
      submissions: uniqueSubmissions
    };
    
    if (duplicates.length > 0) {
      response.warnings = [`Found ${duplicates.length} duplicate submission IDs`];
      response.duplicateIds = duplicates;
    }
    
    if (errors.length > 0) {
      response.errors = errors;
    }
    
    log('info', 'Sync completed successfully', { 
      counts: response.submissionCounts,
      duplicates: duplicates.length
    });
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response)
    };
  } catch (error) {
    log('error', `Sync submissions error: ${error.message}`, { stack: error.stack });
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        message: "Sync failed",
        error: error.message
      })
    };
  }
};
