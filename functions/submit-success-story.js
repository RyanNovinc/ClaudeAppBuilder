// functions/submit-success-story.js
exports.handler = async function(event, context) {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Parse the request body
    const data = JSON.parse(event.body);
    
    // Validate required fields
    const requiredFields = ['name', 'email', 'app-type', 'app-name', 'story', 'testimonial'];
    for (const field of requiredFields) {
      if (!data[field]) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: `Missing required field: ${field}` })
        };
      }
    }
    
    // Generate a unique ID using timestamp and random string
    const uniqueId = `story_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    
    // Create submission object
    const submission = {
      id: uniqueId,
      date: new Date().toISOString(),
      status: 'pending', // pending, approved, rejected
      name: data.name,
      email: data.email,
      appType: data['app-type'],
      appName: data['app-name'],
      experienceLevel: data['experience-level'] || 'No experience',
      story: data.story,
      testimonial: data.testimonial,
      images: data.images || [] // Array of image URLs
    };
    
    console.log('New success story submission:', submission.id);
    
    // Skip attempting to use Netlify Blobs since it's causing errors
    // Just return the submission and signal client to use localStorage
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Success story submitted for localStorage storage',
        submissionId: submission.id,
        submission: submission,
        useLocalStorage: true,
        storageFallback: true
      })
    };
  } catch (error) {
    console.error('Error processing success story submission:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'An error occurred while processing your submission' })
    };
  }
};
