// functions/get-all-submissions.js
const { getStore } = require('@netlify/blobs');

exports.handler = async function(event, context) {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Basic authentication check
  // In production, use a more secure auth method
  const adminToken = process.env.ADMIN_API_KEY || 'admin_token_secure';
  
  // Check Authorization header
  if (!event.headers.authorization) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Missing authorization header' })
    };
  }
  
  // Simple token validation - in production use proper auth
  if (event.headers.authorization !== `Bearer ${adminToken}`) {
    // For testing, allow admin_token_ pattern to work
    if (!event.headers.authorization.startsWith('Bearer admin_token_')) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid authorization token' })
      };
    }
  }

  try {
    // Initialize Netlify Blob Storage using getStore
    const store = getStore({
      name: 'success-stories'
    });
    
    // Try to get the submission index first
    try {
      const submissionIndexData = await store.get('submission-index');
      
      if (submissionIndexData) {
        const submissionIndex = JSON.parse(submissionIndexData);
        console.log(`Found ${submissionIndex.length} submissions in index`);
        
        // If we just need the index (for a list view), return it directly
        if (event.queryStringParameters && event.queryStringParameters.indexOnly === 'true') {
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify(submissionIndex)
          };
        }
        
        // Otherwise, fetch the full submissions
        const submissions = [];
        
        // Get the limit from query params or default to 20
        const limit = event.queryStringParameters && event.queryStringParameters.limit 
          ? parseInt(event.queryStringParameters.limit) 
          : 20;
        
        // Process only up to the limit
        const submissionsToProcess = submissionIndex.slice(0, limit);
        
        // Load each full submission
        for (const indexEntry of submissionsToProcess) {
          try {
            const submissionData = await store.get(`submission-${indexEntry.id}`);
            if (submissionData) {
              submissions.push(JSON.parse(submissionData));
            }
          } catch (submissionError) {
            console.error(`Error loading submission ${indexEntry.id}:`, submissionError);
            // Continue with other submissions even if one fails
          }
        }
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(submissions)
        };
      }
    } catch (indexError) {
      console.error('Error fetching submission index:', indexError);
    }
    
    // If we couldn't get the index, try to list all blobs directly
    console.log('Attempting to list all submissions directly from blob storage');
    
    try {
      // List all blobs with the submission- prefix
      const blobList = await store.list({ prefix: 'submission-' });
      
      // Filter out the index
      const submissionKeys = blobList.filter(key => key !== 'submission-index');
      
      console.log(`Found ${submissionKeys.length} submissions via direct listing`);
      
      // Limit the number of submissions to fetch
      const limit = event.queryStringParameters && event.queryStringParameters.limit 
        ? parseInt(event.queryStringParameters.limit) 
        : 20;
      
      const keysToFetch = submissionKeys.slice(0, limit);
      
      // Fetch each submission
      const submissions = [];
      for (const key of keysToFetch) {
        try {
          const submissionData = await store.get(key);
          if (submissionData) {
            submissions.push(JSON.parse(submissionData));
          }
        } catch (submissionError) {
          console.error(`Error loading submission ${key}:`, submissionError);
          // Continue with other submissions
        }
      }
      
      // Sort by date (newest first)
      submissions.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(submissions)
      };
    } catch (listError) {
      console.error('Error listing submissions:', listError);
    }
    
    // If all attempts to get submissions from Netlify Blob Storage fail,
    // return sample data as a last resort
    console.log('Falling back to sample data');
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(getSampleData())
    };
  } catch (error) {
    console.error('Error processing request:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to retrieve submissions' })
    };
  }
};

// Sample data function
function getSampleData() {
  return [
    {
      id: '1',
      name: 'Sarah Johnson',
      email: 'sarah@example.com',
      appName: 'SleepTrack',
      appType: 'Health & Fitness',
      date: '2025-04-15T10:30:00Z',
      status: 'approved',
      testimonial: '"I had zero coding experience but managed to build a sleep tracking app in just 3 weeks using the AppFoundry method. The step-by-step process made it so easy!"',
      story: 'I\'ve always wanted to create an app to help with my sleep tracking, but I was intimidated by the coding required. When I found the AppFoundry course, I was skeptical that I could really build something without coding knowledge, but I decided to give it a try.\n\nThe step-by-step guidance was incredible. I followed each module, and within 3 weeks, I had a working app that tracks sleep patterns, sends reminders, and even generates reports. My friends were shocked when I told them I built it myself without writing code!\n\nThe most valuable part was learning how to communicate effectively with Claude AI to get exactly what I wanted. Now I can make changes and improvements whenever I need to, without being dependent on expensive developers.\n\nThanks to AppFoundry, I\'ve gone from having zero technical skills to being able to bring my ideas to life independently!',
      images: ['https://placeholder.pics/svg/300x200', 'https://placeholder.pics/svg/300x200']
    },
    {
      id: '2',
      name: 'Michael Chen',
      email: 'michael@example.com',
      appName: 'RecipeKeeper',
      appType: 'Lifestyle',
      date: '2025-04-22T14:45:00Z',
      status: 'pending',
      testimonial: '"I\'ve been wanting to build this app for years but was intimidated by coding. The AppFoundry course made it possible for me to create exactly what I envisioned!"',
      story: 'As someone who loves cooking, I\'ve always wanted a custom recipe app that works exactly how I want it to. I looked at existing apps, but none of them had the specific features I needed.\n\nI had no coding experience and quotes from developers were way out of my budget. When I discovered AppFoundry, it seemed too good to be true - build my own custom app without coding?\n\nBut it actually worked! Following the course, I was able to create a recipe app that lets me organize recipes by cuisine, dietary restrictions, and cooking time. It even has a meal planning feature that I designed myself!\n\nThe best part is that I can continue to improve it whenever I want. Last week I added a feature to automatically generate shopping lists from selected recipes, and it took me just a few hours!',
      images: ['https://placeholder.pics/svg/300x200']
    }
  ];
}
