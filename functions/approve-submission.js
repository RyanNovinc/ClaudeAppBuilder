const { Octokit } = require("@octokit/rest");
const { Base64 } = require("js-base64");

// GitHub repository information
const GITHUB_OWNER = "RyanNovinc";
const GITHUB_REPO = "ClaudeAppBuilder";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

// Default configurations
const DEFAULT_CONFIG = {
  MAX_RETRIES: 5,
  RETRY_DELAY_MS: 500,
  FETCH_ALL_STATUSES: true,
  SEARCH_STATUSES: ['pending', 'approved', 'rejected'],
  LOG_LEVEL: 'info' // 'debug', 'info', 'warn', 'error'
};

// Utility function for logging with timestamps and levels
function log(level, message, data = null) {
  if (['debug', 'info', 'warn', 'error'].indexOf(level) < ['debug', 'info', 'warn', 'error'].indexOf(DEFAULT_CONFIG.LOG_LEVEL)) {
    return;
  }
  
  const timestamp = new Date().toISOString();
  const logEntry = { 
    timestamp, 
    level, 
    message,
    ...(data ? { data } : {})
  };
  
  console.log(JSON.stringify(logEntry));
}

// Utility function for sleeping - useful for retries with exponential backoff
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

exports.handler = async function(event, context) {
  log('info', 'Approve submission function called');
  
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
    log('warn', 'Authentication failed', { providedToken: token ? '***' : 'none' });
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: "Unauthorized - Invalid or missing token" })
    };
  }

  try {
    // Parse request body
    let data;
    try {
      data = JSON.parse(event.body);
    } catch (parseError) {
      log('error', 'Failed to parse request body', { error: parseError.message });
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Invalid request body - must be valid JSON" })
      };
    }
    
    const { id } = data;
    
    if (!id) {
      log('warn', 'Missing submission ID');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Submission ID is required" })
      };
    }
    
    log('info', `Processing approval for submission ${id}`);
    
    // Initialize GitHub API client
    const octokit = new Octokit({
      auth: GITHUB_TOKEN
    });
    
    // IMPROVED: Find submission in ANY status, not just pending
    async function findSubmission(id) {
      log('info', `Looking for submission ${id}`);
      
      // Try each possible source location in sequence
      for (const status of DEFAULT_CONFIG.SEARCH_STATUSES) {
        const path = `data/${status}-submissions.json`;
        
        try {
          log('debug', `Checking ${path}`);
          const { data: fileData } = await octokit.repos.getContent({
            owner: GITHUB_OWNER,
            repo: GITHUB_REPO,
            path,
          });
          
          const content = JSON.parse(Base64.decode(fileData.content));
          const index = content.findIndex(s => s.id === id);
          
          if (index !== -1) {
            log('info', `Found submission ${id} in ${status}`, { path });
            return {
              status,
              path,
              content,
              sha: fileData.sha,
              submission: content[index],
              index
            };
          }
        } catch (error) {
          if (error.status === 404) {
            log('debug', `Source file ${path} not found, checking next source`);
            continue;
          }
          
          log('error', `Error checking ${path}`, { error: error.message, stack: error.stack });
          throw error;
        }
      }
      
      log('warn', `Submission ${id} not found in any status`);
      return null; // Not found in any source
    }
    
    async function removeFromSource(sourceInfo) {
      const MAX_RETRIES = DEFAULT_CONFIG.MAX_RETRIES;
      
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          log('info', `Attempt ${attempt + 1}/${MAX_RETRIES} to remove submission from ${sourceInfo.path}`);
          
          // If not first attempt, re-fetch the latest content and SHA
          if (attempt > 0) {
            log('debug', `Re-fetching latest content for ${sourceInfo.path}`);
            try {
              const { data: fileData } = await octokit.repos.getContent({
                owner: GITHUB_OWNER,
                repo: GITHUB_REPO,
                path: sourceInfo.path,
              });
              
              sourceInfo.content = JSON.parse(Base64.decode(fileData.content));
              sourceInfo.sha = fileData.sha;
              
              // Re-find the submission index as it might have changed
              sourceInfo.index = sourceInfo.content.findIndex(s => s.id === sourceInfo.submission.id);
              
              // If not found anymore, it was already removed
              if (sourceInfo.index === -1) {
                log('info', `Submission no longer exists in ${sourceInfo.path}, already removed`);
                return true;
              }
            } catch (error) {
              if (error.status === 404) {
                log('info', `Source file ${sourceInfo.path} no longer exists`);
                return true; // Consider it removed
              }
              throw error;
            }
          }
          
          // Remove the submission
          sourceInfo.content.splice(sourceInfo.index, 1);
          
          // Update the source file
          await octokit.repos.createOrUpdateFileContents({
            owner: GITHUB_OWNER,
            repo: GITHUB_REPO,
            path: sourceInfo.path,
            message: `Remove submission ${sourceInfo.submission.id} from ${sourceInfo.status}`,
            content: Base64.encode(JSON.stringify(sourceInfo.content, null, 2)),
            sha: sourceInfo.sha,
          });
          
          log('info', `Successfully removed submission from ${sourceInfo.path}`);
          return true;
        } catch (error) {
          // IMPROVED ERROR HANDLING: Better detection of SHA conflicts
          if (error.status === 409 && attempt < MAX_RETRIES - 1) {
            log('warn', `SHA conflict detected when removing, retrying (${attempt + 1}/${MAX_RETRIES})...`);
            // Add exponential backoff for retries
            await sleep(DEFAULT_CONFIG.RETRY_DELAY_MS * Math.pow(2, attempt));
            continue;
          }
          
          log('error', `Failed to remove submission from ${sourceInfo.path}`, { error: error.message, status: error.status });
          throw error;
        }
      }
      
      log('error', `Failed to remove submission after ${MAX_RETRIES} attempts`);
      return false;
    }
    
    async function addToTarget(submission, targetStatus = "approved") {
      const MAX_RETRIES = DEFAULT_CONFIG.MAX_RETRIES;
      const targetPath = `data/${targetStatus}-submissions.json`;
      
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          log('info', `Attempt ${attempt + 1}/${MAX_RETRIES} to add submission to ${targetPath}`);
          
          // Prepare target file - always fetch fresh on each attempt
          let targetContent = [];
          let targetSha = null;
          
          try {
            const { data: fileData } = await octokit.repos.getContent({
              owner: GITHUB_OWNER,
              repo: GITHUB_REPO,
              path: targetPath,
            });
            
            targetContent = JSON.parse(Base64.decode(fileData.content));
            targetSha = fileData.sha;
          } catch (error) {
            if (error.status === 404) {
              log('info', `Target file ${targetPath} not found, will create it`);
              // Leave the defaults (empty array, null SHA)
            } else {
              throw error;
            }
          }
          
          // Update submission status
          submission.status = targetStatus;
          
          // Check if the submission already exists in the target (to avoid duplicates)
          const existingIndex = targetContent.findIndex(s => s.id === submission.id);
          if (existingIndex !== -1) {
            log('warn', `Submission ${submission.id} already exists in ${targetPath}, updating it`);
            targetContent[existingIndex] = submission;
          } else {
            // Add to the beginning of the array
            targetContent.unshift(submission);
          }
          
          // Update the target file
          await octokit.repos.createOrUpdateFileContents({
            owner: GITHUB_OWNER,
            repo: GITHUB_REPO,
            path: targetPath,
            message: `Add submission ${submission.id} to ${targetStatus}`,
            content: Base64.encode(JSON.stringify(targetContent, null, 2)),
            sha: targetSha,
          });
          
          log('info', `Successfully added submission to ${targetPath}`);
          return true;
        } catch (error) {
          if (error.status === 409 && attempt < MAX_RETRIES - 1) {
            log('warn', `SHA conflict detected when adding, retrying (${attempt + 1}/${MAX_RETRIES})...`);
            // Add exponential backoff for retries
            await sleep(DEFAULT_CONFIG.RETRY_DELAY_MS * Math.pow(2, attempt));
            continue;
          }
          
          log('error', `Failed to add submission to ${targetPath}`, { error: error.message, status: error.status });
          throw error;
        }
      }
      
      log('error', `Failed to add submission after ${MAX_RETRIES} attempts`);
      return false;
    }
    
    // Find the submission in any status
    const sourceInfo = await findSubmission(id);
    
    if (!sourceInfo) {
      log('error', `Submission ${id} not found in any source`);
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: "Submission not found in any status" })
      };
    }
    
    log('info', `Found submission ${id} in ${sourceInfo.status}`);
    
    // If it's already approved, no need to do anything
    if (sourceInfo.status === 'approved') {
      log('info', `Submission ${id} is already approved`);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: "Submission is already approved",
          submission: sourceInfo.submission
        })
      };
    }
    
    // Process in separate steps
    // Step 1: Remove from source
    const removeSuccess = await removeFromSource(sourceInfo);
    
    if (!removeSuccess) {
      throw new Error(`Failed to remove submission from ${sourceInfo.status}`);
    }
    
    // Step 2: Add to approved
    const addSuccess = await addToTarget(sourceInfo.submission);
    
    if (!addSuccess) {
      throw new Error(`Failed to add submission to approved`);
    }
    
    log('info', `Successfully approved submission ${id}`);
    
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
    log('error', `Error approving submission: ${error.message}`, { stack: error.stack });
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "An error occurred while approving the submission.",
        message: error.message
      })
    };
  }
};
