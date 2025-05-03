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
    
    // Function to find a submission in pending
    async function findSubmission(id, sourcePath = "pending") {
      try {
        const path = `data/${sourcePath}-submissions.json`;
        const { data: fileData } = await octokit.repos.getContent({
          owner: GITHUB_OWNER,
          repo: GITHUB_REPO,
          path,
        });
        
        const content = JSON.parse(Base64.decode(fileData.content));
        const index = content.findIndex(s => s.id === id);
        
        if (index !== -1) {
          return {
            path,
            content,
            sha: fileData.sha,
            submission: content[index],
            index
          };
        }
        
        return null; // Not found
      } catch (error) {
        if (error.status === 404) {
          console.log(`Source file data/${sourcePath}-submissions.json not found`);
          return null;
        }
        throw error;
      }
    }
    
    async function removeFromSource(sourceInfo) {
      const MAX_RETRIES = 5;
      
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          console.log(`Attempt ${attempt + 1}/${MAX_RETRIES} to remove submission from ${sourceInfo.path}`);
          
          // If not first attempt, re-fetch the latest content and SHA
          if (attempt > 0) {
            console.log(`Re-fetching latest content for ${sourceInfo.path}`);
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
                console.log(`Submission no longer exists in ${sourceInfo.path}, already removed`);
                return true;
              }
            } catch (error) {
              if (error.status === 404) {
                console.log(`Source file ${sourceInfo.path} no longer exists`);
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
            message: `Remove submission ${sourceInfo.submission.id} from pending`,
            content: Base64.encode(JSON.stringify(sourceInfo.content, null, 2)),
            sha: sourceInfo.sha,
          });
          
          console.log(`Successfully removed submission from ${sourceInfo.path}`);
          return true;
        } catch (error) {
          if (error.status === 409 && attempt < MAX_RETRIES - 1) {
            console.log(`SHA conflict detected when removing, retrying (${attempt + 1}/${MAX_RETRIES})...`);
            continue;
          }
          
          throw error;
        }
      }
      
      return false;
    }
    
    async function addToTarget(submission, targetStatus = "approved") {
      const MAX_RETRIES = 5;
      const targetPath = `data/${targetStatus}-submissions.json`;
      
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          console.log(`Attempt ${attempt + 1}/${MAX_RETRIES} to add submission to ${targetPath}`);
          
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
              console.log(`Target file ${targetPath} not found, will create it`);
              // Leave the defaults (empty array, null SHA)
            } else {
              throw error;
            }
          }
          
          // Update submission status
          submission.status = targetStatus;
          
          // Add to the beginning of the array
          targetContent.unshift(submission);
          
          // Update the target file
          await octokit.repos.createOrUpdateFileContents({
            owner: GITHUB_OWNER,
            repo: GITHUB_REPO,
            path: targetPath,
            message: `Add submission ${submission.id} to ${targetStatus}`,
            content: Base64.encode(JSON.stringify(targetContent, null, 2)),
            sha: targetSha,
          });
          
          console.log(`Successfully added submission to ${targetPath}`);
          return true;
        } catch (error) {
          if (error.status === 409 && attempt < MAX_RETRIES - 1) {
            console.log(`SHA conflict detected when adding, retrying (${attempt + 1}/${MAX_RETRIES})...`);
            continue;
          }
          
          throw error;
        }
      }
      
      return false;
    }
    
    // Find the submission in pending
    console.log(`Looking for submission ${id} in pending`);
    const sourceInfo = await findSubmission(id);
    
    if (!sourceInfo) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: "Submission not found in pending submissions" })
      };
    }
    
    console.log(`Found submission ${id} in pending`);
    
    // Process in separate steps
    // Step 1: Remove from pending
    const removeSuccess = await removeFromSource(sourceInfo);
    
    if (!removeSuccess) {
      throw new Error(`Failed to remove submission from pending`);
    }
    
    // Step 2: Add to approved
    const addSuccess = await addToTarget(sourceInfo.submission);
    
    if (!addSuccess) {
      throw new Error(`Failed to add submission to approved`);
    }
    
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
    console.error("Error approving submission:", error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "An error occurred while approving the submission."
      })
    };
  }
};
