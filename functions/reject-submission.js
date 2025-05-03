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
    
    // Function to handle moving a submission with retry logic for SHA conflicts
    async function moveSubmission(id, possibleSources, targetStatus) {
      // Maximum number of retries
      const MAX_RETRIES = 3;
      
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          console.log(`Attempt ${attempt + 1}/${MAX_RETRIES} to move submission ${id} to ${targetStatus}`);
          
          // Try to find the submission in any of the possible source locations
          let sourceStatus = null;
          let sourceFile = null;
          let submission = null;
          let submissionIndex = -1;
          
          for (const status of possibleSources) {
            try {
              const sourcePath = `data/${status}-submissions.json`;
              
              const { data: fileData } = await octokit.repos.getContent({
                owner: GITHUB_OWNER,
                repo: GITHUB_REPO,
                path: sourcePath,
              });
              
              const content = JSON.parse(Base64.decode(fileData.content));
              const index = content.findIndex(s => s.id === id);
              
              if (index >= 0) {
                sourceStatus = status;
                sourceFile = {
                  content,
                  sha: fileData.sha,
                  path: sourcePath
                };
                submission = content[index];
                submissionIndex = index;
                console.log(`Found submission ${id} in ${sourceStatus}`);
                break;
              }
            } catch (error) {
              if (error.status === 404) {
                console.log(`Source file data/${status}-submissions.json not found, trying next source`);
                continue;
              }
              throw error;
            }
          }
          
          // If submission was not found in any source
          if (!submission) {
            console.log(`Submission ${id} not found in any source`);
            return {
              success: false,
              error: `Submission not found in ${possibleSources.join(', ')} submissions`
            };
          }
          
          // Remove from source
          sourceFile.content.splice(submissionIndex, 1);
          
          // Update submission status
          submission.status = targetStatus;
          
          // Get target file
          let targetFile;
          let targetPath = `data/${targetStatus}-submissions.json`;
          
          try {
            const { data: fileData } = await octokit.repos.getContent({
              owner: GITHUB_OWNER,
              repo: GITHUB_REPO,
              path: targetPath,
            });
            
            targetFile = {
              content: JSON.parse(Base64.decode(fileData.content)),
              sha: fileData.sha
            };
          } catch (error) {
            if (error.status === 404) {
              console.log(`Target file ${targetPath} not found, will create it`);
              targetFile = {
                content: [],
                sha: null
              };
            } else {
              throw error;
            }
          }
          
          // Add the submission to target
          targetFile.content.unshift(submission);
          
          // Update both files in GitHub
          const results = await Promise.all([
            // Update source file
            octokit.repos.createOrUpdateFileContents({
              owner: GITHUB_OWNER,
              repo: GITHUB_REPO,
              path: sourceFile.path,
              message: `Remove submission ${id} from ${sourceStatus}`,
              content: Base64.encode(JSON.stringify(sourceFile.content, null, 2)),
              sha: sourceFile.sha,
            }),
            
            // Update target file
            octokit.repos.createOrUpdateFileContents({
              owner: GITHUB_OWNER,
              repo: GITHUB_REPO,
              path: targetPath,
              message: `Add submission ${id} to ${targetStatus}`,
              content: Base64.encode(JSON.stringify(targetFile.content, null, 2)),
              sha: targetFile.sha || undefined, // If file doesn't exist, don't include sha
            })
          ]);
          
          console.log(`Successfully moved submission ${id} from ${sourceStatus} to ${targetStatus}`);
          
          return {
            success: true,
            submission
          };
        } catch (error) {
          // If it's a SHA conflict and we haven't exceeded retries, try again
          if (error.status === 409 && attempt < MAX_RETRIES - 1) {
            console.log(`SHA conflict detected, retrying (${attempt + 1}/${MAX_RETRIES})...`);
            continue;
          }
          
          // Otherwise, rethrow the error
          throw error;
        }
      }
      
      // If we get here, we've exceeded our retry attempts
      throw new Error(`Failed to move submission after ${MAX_RETRIES} attempts due to SHA conflicts`);
    }
    
    // Move the submission from pending OR approved to rejected
    // We need to check both since submissions can be rejected from either state
    const result = await moveSubmission(id, ["pending", "approved"], "rejected");
    
    if (!result.success) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: result.error })
      };
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: "Submission rejected successfully",
        submission: result.submission
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
