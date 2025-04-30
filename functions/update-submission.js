// functions/update-submission.js
const { updateSubmission, updateSubmissionStatus } = require('./utils/kv-store');

exports.handler = async function(event, context) {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
    // Parse the request body
    const data = JSON.parse(event.body);
    
    let result;
    
    // Check if this is a simple status update or a full submission update
    if (data.id && data.status && Object.keys(data).length === 2) {
      // Simple status update
      const { id, status } = data;
      
      // Validate status
      if (!['pending', 'approved', 'rejected'].includes(status)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid status value' })
        };
      }
      
      result = await updateSubmissionStatus(id, status);
    } else if (data.id) {
      // Full submission update
      result = await updateSubmission(data);
    } else {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required field: id' })
      };
    }
    
    // Check if submission was found
    if (!result) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Submission not found' })
      };
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        submission: result
      })
    };
  } catch (error) {
    console.error('Error updating submission:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'An error occurred while updating the submission' })
    };
  }
};
