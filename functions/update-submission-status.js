// functions/update-submission-status.js
const { getStore } = require('@netlify/blobs');

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
    // Parse the request body
    const data = JSON.parse(event.body);
    
    // Validate required fields
    if (!data.id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required field: id' })
      };
    }
    
    // Initialize Netlify Blob Storage using getStore
    const store = getStore({
      name: 'success-stories'
    });
    
    // Check if it's a simple status update or a full submission update
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
      
      // Get the current submission
      try {
        const submissionData = await store.get(`submission-${id}`);
        
        if (!submissionData) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Submission not found' })
          };
        }
        
        // Parse and update the submission
        const submission = JSON.parse(submissionData);
        submission.status = status;
        
        // Save the updated submission
        await store.set(`submission-${id}`, JSON.stringify(submission));
        
        // Also update the index
        try {
          const indexData = await store.get('submission-index');
          
          if (indexData) {
            const index = JSON.parse(indexData);
            const submissionIndex = index.findIndex(s => s.id === id);
            
            if (submissionIndex !== -1) {
              index[submissionIndex].status = status;
              await store.set('submission-index', JSON.stringify(index));
            }
          }
        } catch (indexError) {
          console.error('Error updating index:', indexError);
          // Continue even if index update fails
        }
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: `Status updated to ${status}`,
            submission: submission
          })
        };
      } catch (submissionError) {
        console.error('Error updating submission status:', submissionError);
        
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Failed to update submission status' })
        };
      }
    } else if (data.id) {
      // Full submission update
      try {
        // First check if the submission exists
        const submissionData = await store.get(`submission-${data.id}`);
        
        if (!submissionData) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Submission not found' })
          };
        }
        
        // Parse the existing submission
        const existingSubmission = JSON.parse(submissionData);
        
        // Create updated submission by merging
        const updatedSubmission = {
          ...existingSubmission,
          ...data,
          // Ensure these fields are not overwritten with undefined values
          id: data.id || existingSubmission.id,
          date: data.date || existingSubmission.date,
          images: data.images || existingSubmission.images || []
        };
        
        // Save the updated submission
        await store.set(`submission-${data.id}`, JSON.stringify(updatedSubmission));
        
        // Update the index if status or name changed
        if (data.status !== existingSubmission.status || 
            data.name !== existingSubmission.name || 
            data.appName !== existingSubmission.appName) {
          
          try {
            const indexData = await store.get('submission-index');
            
            if (indexData) {
              const index = JSON.parse(indexData);
              const submissionIndex = index.findIndex(s => s.id === data.id);
              
              if (submissionIndex !== -1) {
                index[submissionIndex] = {
                  id: updatedSubmission.id,
                  name: updatedSubmission.name,
                  appName: updatedSubmission.appName,
                  date: updatedSubmission.date,
                  status: updatedSubmission.status
                };
                
                await store.set('submission-index', JSON.stringify(index));
              }
            }
          } catch (indexError) {
            console.error('Error updating index for full submission update:', indexError);
            // Continue even if index update fails
          }
        }
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: 'Submission updated successfully',
            submission: updatedSubmission
          })
        };
      } catch (updateError) {
        console.error('Error updating submission:', updateError);
        
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Failed to update submission' })
        };
      }
    } else {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid request format' })
      };
    }
  } catch (error) {
    console.error('Error processing request:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'An error occurred while processing your request' })
    };
  }
};
