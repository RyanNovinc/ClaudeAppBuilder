// functions/get-approved-stories.js
const { getApprovedSubmissions } = require('./utils/kv-store');

exports.handler = async function(event, context) {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
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

  try {
    // Get approved stories
    const approvedStories = await getApprovedSubmissions();
    
    // Map to public fields only (omit email, etc)
    const publicStories = approvedStories.map(story => ({
      id: story.id,
      name: story.name,
      appName: story.appName,
      appType: story.appType,
      testimonial: story.testimonial,
      images: story.images || [],
      date: story.date
    }));
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(publicStories)
    };
  } catch (error) {
    console.error('Error fetching approved stories:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to fetch approved stories' })
    };
  }
};
