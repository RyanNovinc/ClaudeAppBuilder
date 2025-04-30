// functions/get-submissions.js
const { getSubmissions } = require('./utils/kv-store');

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
  
  if (!event.headers.authorization || event.headers.authorization !== `Bearer ${adminToken}`) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Unauthorized' })
    };
  }

  try {
    // Get all submissions
    const submissions = await getSubmissions();
    
    // Sort by date (newest first)
    submissions.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(submissions)
    };
  } catch (error) {
    console.error('Error fetching submissions:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to fetch submissions' })
    };
  }
};
