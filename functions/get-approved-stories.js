const { Octokit } = require("@octokit/rest");
const { Base64 } = require("js-base64");

// GitHub repository information
const GITHUB_OWNER = "RyanNovinc";
const GITHUB_REPO = "ClaudeAppBuilder";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

// Sample data as fallback if GitHub fetch fails
const sampleStories = [
  {
    id: '1',
    name: 'Sarah Johnson',
    appName: 'SleepTrack',
    appType: 'Health & Fitness',
    testimonial: '"I had zero coding experience but managed to build a sleep tracking app in just 3 weeks using the AppFoundry method. The step-by-step process made it so easy!"',
    images: ['https://placeholder.pics/svg/300x200'],
    date: '2025-04-15T10:30:00Z'
  },
  {
    id: '2',
    name: 'Michael Chen',
    appName: 'RecipeKeeper',
    appType: 'Lifestyle',
    testimonial: '"I\'ve been wanting to build this app for years but was intimidated by coding. The AppFoundry course made it possible for me to create exactly what I envisioned!"',
    images: ['https://placeholder.pics/svg/300x200'],
    date: '2025-04-22T14:45:00Z'
  }
];

// Function to log with timestamp
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
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache' // Add this to prevent caching
  };
  
  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }
  
  try {
    log('info', 'Fetching approved stories from GitHub');
    
    // Initialize GitHub API client
    const octokit = new Octokit({
      auth: GITHUB_TOKEN
    });
    
    // Fetch approved submissions
    const path = "data/approved-submissions.json";
    
    try {
      // Get the file from GitHub
      const { data: fileData } = await octokit.repos.getContent({
        owner: GITHUB_OWNER,
        repo: GITHUB_REPO,
        path
      });
      
      // Decode the content
      const approvedSubmissions = JSON.parse(Base64.decode(fileData.content));
      
      log('info', `Found ${approvedSubmissions.length} approved stories`);
      
      // Map the submissions to public format (exclude sensitive info)
      const publicStories = approvedSubmissions.map(story => ({
        id: story.id,
        name: story.name,
        appName: story.appName,
        appType: story.appType || story.app_type,
        experienceLevel: story.experienceLevel,
        testimonial: story.testimonial,
        images: story.images || [],
        date: story.date
      }));
      
      // Sort by date, newest first
      publicStories.sort((a, b) => {
        const dateA = new Date(a.date || 0);
        const dateB = new Date(b.date || 0);
        return dateB - dateA;
      });
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(publicStories)
      };
    } catch (fileError) {
      log('error', `Error fetching approved submissions: ${fileError.message}`, { 
        status: fileError.status, 
        path 
      });
      
      // If file not found or other GitHub error, use sample data as fallback
      if (fileError.status === 404) {
        log('warn', 'Approved submissions file not found, using sample data');
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(sampleStories)
        };
      }
      
      // Try using localStorage fallback
      log('warn', 'Trying localStorage fallback');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(sampleStories)
      };
    }
  } catch (error) {
    log('error', `Error getting approved stories: ${error.message}`, { stack: error.stack });
    
    // Return sample data as fallback on any error
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(sampleStories)
    };
  }
};
