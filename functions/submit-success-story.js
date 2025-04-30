// functions/submit-success-story.js
const { v4: uuidv4 } = require('uuid');
const { storeSubmission } = require('./utils/kv-store');

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
    
    // Create submission object
    const submission = {
      id: uuidv4(),
      date: new Date().toISOString(),
      status: 'pending', // pending, approved, rejected
      name: data.name,
      email: data.email,
      appType: data['app-type'],
      appName: data['app-name'],
      story: data.story,
      testimonial: data.testimonial,
      images: data.images || [] // Array of image URLs
    };
    
    // Store the submission
    await storeSubmission(submission);
    
    // Send email notification (optional - would be implemented in production)
    // In a production system, you'd notify admins of the new submission
    
    // Log the submission
    console.log('New success story submission:', submission.id);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Success story submitted successfully',
        submissionId: submission.id
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
