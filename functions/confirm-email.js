// functions/confirm-email.js
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
    // Parse the incoming request body
    const data = JSON.parse(event.body);
    const { email } = data;
    
    if (!email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Email is required' })
      };
    }
    
    // Get the site URL - ensure it's the full absolute URL
    const siteUrl = process.env.URL || `https://${process.env.NETLIFY_SITE_NAME}.netlify.app`;
    
    // Netlify Identity API endpoint
    const netlifyIdentityEndpoint = `${siteUrl}/.netlify/identity/admin/users`;
    
    // First, find the user by email
    const getUserResponse = await fetch(netlifyIdentityEndpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.NETLIFY_IDENTITY_TOKEN}`
      }
    });
    
    if (!getUserResponse.ok) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to get users from Netlify Identity' })
      };
    }
    
    const users = await getUserResponse.json();
    const user = users.find(u => u.email === email);
    
    if (!user) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'User not found' })
      };
    }
    
    // Update the user to confirm their email
    const updateUserResponse = await fetch(`${netlifyIdentityEndpoint}/${user.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NETLIFY_IDENTITY_TOKEN}`
      },
      body: JSON.stringify({
        ...user,
        confirmed_at: new Date().toISOString(),
        app_metadata: {
          ...(user.app_metadata || {}),
          roles: ["paying_customer"]
        },
        user_metadata: {
          ...(user.user_metadata || {}),
          course_access: true
        }
      })
    });
    
    if (!updateUserResponse.ok) {
      const errorText = await updateUserResponse.text();
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Failed to update user', 
          details: errorText 
        })
      };
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        message: `User ${email} has been confirmed and granted course access`
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
