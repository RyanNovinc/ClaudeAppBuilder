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
    "Access-Control-Allow-Methods": "GET, OPTIONS",
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

  // Only allow GET requests
  if (event.httpMethod !== "GET") {
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
    // Initialize GitHub API client
    const octokit = new Octokit({
      auth: GITHUB_TOKEN
    });
    
    // Get query parameters
    const queryParams = event.queryStringParameters || {};
    const status = queryParams.status || "all"; // pending, approved, rejected, or all
    
    let submissions = [];
    
    // Determine which file to get based on the status parameter
    let filePath = "data/pending-submissions.json";
    if (status === "approved") {
      filePath = "data/approved-submissions.json";
    } else if (status === "rejected") {
      filePath = "data/rejected-submissions.json";
    } else if (status === "all") {
      // If "all", we'll combine all three files
      const files = [
        "data/pending-submissions.json",
        "data/approved-submissions.json",
        "data/rejected-submissions.json"
      ];
      
      for (const path of files) {
        try {
          const { data: fileData } = await octokit.repos.getContent({
            owner: GITHUB_OWNER,
            repo: GITHUB_REPO,
            path: path,
          });
          
          const content = Base64.decode(fileData.content);
          const fileSubmissions = JSON.parse(content);
          
          // Add status field based on the file
          if (path.includes("pending")) {
            fileSubmissions.forEach(s => s.status = "pending");
          } else if (path.includes("approved")) {
            fileSubmissions.forEach(s => s.status = "approved");
          } else if (path.includes("rejected")) {
            fileSubmissions.forEach(s => s.status = "rejected");
          }
          
          submissions = submissions.concat(fileSubmissions);
        } catch (error) {
          // Skip if file doesn't exist
          if (error.status !== 404) {
            throw error;
          }
        }
      }
      
      // Sort by date (newest first)
      submissions.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(submissions)
      };
    }
    
    // If we're getting a specific file (not "all")
    try {
      const { data: fileData } = await octokit.repos.getContent({
        owner: GITHUB_OWNER,
        repo: GITHUB_REPO,
        path: filePath,
      });
      
      const content = Base64.decode(fileData.content);
      submissions = JSON.parse(content);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(submissions)
      };
    } catch (error) {
      // If file doesn't exist, return empty array
      if (error.status === 404) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify([])
        };
      }
      
      throw error;
    }
  } catch (error) {
    console.error("Error fetching submissions:", error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "An error occurred while fetching submissions."
      })
    };
  }
};
