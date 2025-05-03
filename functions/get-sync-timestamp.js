const { Octokit } = require("@octokit/rest");
const { Base64 } = require("js-base64");

// GitHub repository information
const GITHUB_OWNER = "RyanNovinc";
const GITHUB_REPO = "ClaudeAppBuilder";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

exports.handler = async function(event, context) {
  // Set CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
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

  try {
    // Initialize GitHub API client
    const octokit = new Octokit({
      auth: GITHUB_TOKEN
    });
    
    try {
      // Get the sync file
      const { data: syncFile } = await octokit.repos.getContent({
        owner: GITHUB_OWNER,
        repo: GITHUB_REPO,
        path: 'data/last-sync.json'
      });
      
      // Decode and parse content
      const content = JSON.parse(Base64.decode(syncFile.content));
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(content)
      };
    } catch (error) {
      // If file doesn't exist, return a default timestamp
      if (error.status === 404) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ lastSync: new Date().toISOString() })
        };
      }
      
      throw error;
    }
  } catch (error) {
    console.error("Error getting sync timestamp:", error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "An error occurred while getting sync timestamp",
        message: error.message
      })
    };
  }
};
