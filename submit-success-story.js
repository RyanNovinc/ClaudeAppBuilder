// functions/submit-success-story.js
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight OPTIONS request
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
    // Parse the multipart form data
    // Note: In a real implementation, you would use a library to parse multipart form data
    // For simplicity, we're assuming the data is sent as JSON
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
    
    // Generate a unique ID for the submission
    const submissionId = uuidv4();
    
    // Get the current date
    const submissionDate = new Date().toISOString();
    
    // Create submission object
    const submission = {
      id: submissionId,
      date: submissionDate,
      status: 'pending', // pending, approved, rejected
      name: data.name,
      email: data.email,
      appType: data['app-type'],
      appName: data['app-name'],
      story: data.story,
      testimonial: data.testimonial,
      images: data.images || [] // Array of image URLs (would be stored separately in a real implementation)
    };
    
    // In a real implementation, you would:
    // 1. Store the submission in a database
    // 2. Upload images to a storage service like AWS S3
    // 3. Send a notification email to the admin
    // 4. Send a confirmation email to the user
    
    // For this example, we'll just store the submission in a JSON file
    // Note: In a serverless environment, writing to the filesystem isn't persistent
    // This is just for demonstration purposes
    
    // Send email notification to admin
    // This is a placeholder for real email functionality
    const emailContent = `
      New Success Story Submission
      
      Name: ${data.name}
      Email: ${data.email}
      App Type: ${data['app-type']}
      App Name: ${data['app-name']}
      
      Testimonial:
      ${data.testimonial}
      
      Full Story:
      ${data.story}
    `;
    
    // Log the submission (would go to your function logs)
    console.log('New success story submission:', submissionId);
    console.log(emailContent);
    
    // Return success response
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Success story submitted successfully',
        submissionId
      })
    };
  } catch (error) {
    console.error('Error processing success story submission:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'An error occurred while processing your submission'
      })
    };
  }
};
