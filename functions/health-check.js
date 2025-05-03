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
  log('info', 'Health check function called');
  
  // Set CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
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

  // Only allow GET requests
  if (event.httpMethod !== "GET") {
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
    
    // Health check results
    const healthResult = {
      success: true,
      timestamp: new Date().toISOString(),
      errors: [],
      warnings: [],
      repository: `${GITHUB_OWNER}/${GITHUB_REPO}`,
      dataFiles: [],
      submissionCounts: {
        pending: 0,
        approved: 0,
        rejected: 0,
        total: 0
      }
    };
    
    // Check repository existence and access
    try {
      log('info', 'Checking repository access');
      const { data: repoData } = await octokit.repos.get({
        owner: GITHUB_OWNER,
        repo: GITHUB_REPO
      });
      
      healthResult.repository = repoData.full_name;
      healthResult.repositoryInfo = {
        defaultBranch: repoData.default_branch,
        visibility: repoData.visibility,
        lastUpdated: repoData.updated_at
      };
    } catch (repoError) {
      log('error', 'Failed to access repository', { error: repoError.message });
      healthResult.success = false;
      healthResult.errors.push(`Repository access error: ${repoError.message}`);
    }
    
    // Check data file existence and counts
    const dataStatuses = ['pending', 'approved', 'rejected'];
    
    for (const status of dataStatuses) {
      const path = `data/${status}-submissions.json`;
      
      try {
        log('info', `Checking ${path}`);
        const { data: fileData } = await octokit.repos.getContent({
          owner: GITHUB_OWNER,
          repo: GITHUB_REPO,
          path,
        });
        
        const content = JSON.parse(Base64.decode(fileData.content));
        
        healthResult.dataFiles.push(path);
        healthResult.submissionCounts[status] = content.length;
        healthResult.submissionCounts.total += content.length;
      } catch (fileError) {
        if (fileError.status === 404) {
          log('warn', `Data file ${path} not found`);
          healthResult.warnings.push(`Data file ${path} not found`);
        } else {
          log('error', `Error accessing data file ${path}`, { error: fileError.message });
          healthResult.errors.push(`Data file access error (${path}): ${fileError.message}`);
          healthResult.success = false;
        }
      }
    }
    
    // Check if any data files are missing and report warnings
    if (healthResult.dataFiles.length < dataStatuses.length) {
      const missingFiles = dataStatuses
        .map(status => `data/${status}-submissions.json`)
        .filter(path => !healthResult.dataFiles.includes(path));
      
      log('warn', 'Some data files are missing', { missingFiles });
      healthResult.warnings.push(`Missing data files: ${missingFiles.join(', ')}`);
    }
    
    // If there are errors, mark the health check as failed
    if (healthResult.errors.length > 0) {
      healthResult.success = false;
      healthResult.message = "Health check found issues";
    } else if (healthResult.warnings.length > 0) {
      healthResult.message = "Health check passed with warnings";
    } else {
      healthResult.message = "System is healthy";
    }
    
    log('info', 'Health check completed', { result: healthResult });
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(healthResult)
    };
  } catch (error) {
    log('error', `Health check error: ${error.message}`, { stack: error.stack });
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        message: "Health check failed",
        error: error.message
      })
    };
  }
};
