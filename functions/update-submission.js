// functions/update-submission.js
const { updateSubmissionStatus } = require('./utils/kv-store');

exports.handler = async function(event, context) {
  // Basic auth check
  if (!event.headers.authorization || event.headers.authorization !== `Bearer ${process.env.ADMIN_API_KEY}`) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Unauthorized' })
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { id, status } = JSON.parse(event.body);
    
    if (!id || !status || !['pending', 'approved', 'rejected'].includes(status)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid parameters' })
      };
    }
    
    const updated = await updateSubmissionStatus(id, status);
    
    if (!updated) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Submission not found' })
      };
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify(updated)
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
