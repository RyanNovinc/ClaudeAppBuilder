// Netlify function: create-payment.js
// This file should be placed in the "functions" folder in your repository root

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  // Set CORS headers to allow requests from your domain
  const headers = {
    'Access-Control-Allow-Origin': '*', // In production, set this to your specific domain
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
    const { paymentMethodId, amount, currency, customerEmail, customerName, productName } = data;
    
    // Validate the required fields
    if (!paymentMethodId || !amount || !currency || !customerEmail) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required parameters' })
      };
    }
    
    // Create a new customer
    const customer = await stripe.customers.create({
      email: customerEmail,
      name: customerName,
      payment_method: paymentMethodId,
    });
    
    // Create a payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: currency,
      customer: customer.id,
      payment_method: paymentMethodId,
      description: `Purchase of ${productName}`,
      confirm: true,
      receipt_email: customerEmail,
      metadata: {
        product: productName
      }
    });
    
    // Create/update user account and grant course access
    const userAccessGranted = await manageUserAccess(customerEmail, customerName);
    
    // Send success response
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        paymentIntentId: paymentIntent.id,
        customerEmail: customerEmail,
        amount: amount / 100, // Convert back to dollars for display
        accessGranted: userAccessGranted
      })
    };
  } catch (error) {
    console.error('Error processing payment:', error);
    
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error: error.message
      })
    };
  }
};

// Function to create or update user and grant course access
async function manageUserAccess(customerEmail, customerName) {
  try {
    // Get Netlify Identity admin token from environment variable
    const adminAuthToken = process.env.NETLIFY_IDENTITY_ADMIN_TOKEN;
    
    if (!adminAuthToken) {
      console.error('Missing Netlify Identity admin token');
      return false;
    }
    
    // Get site URL from environment
    const siteUrl = process.env.URL || process.env.DEPLOY_PRIME_URL;
    
    // Check if user already exists
    const userCheckResponse = await fetch(`${siteUrl}/.netlify/identity/admin/users`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminAuthToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!userCheckResponse.ok) {
      console.error('Failed to fetch users:', await userCheckResponse.text());
      return false;
    }
    
    const users = await userCheckResponse.json();
    const existingUser = users.find(user => user.email === customerEmail);
    
    if (existingUser) {
      // Update existing user with course access
      const updateResponse = await fetch(`${siteUrl}/.netlify/identity/admin/users/${existingUser.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${adminAuthToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          app_metadata: {
            roles: ['course-member']
          },
          user_metadata: {
            full_name: customerName,
            payment_status: 'paid',
            course_access: true,
            purchase_date: new Date().toISOString()
          }
        })
      });
      
      if (!updateResponse.ok) {
        console.error('Failed to update user:', await updateResponse.text());
        return false;
      }
      
      console.log(`Updated existing user ${customerEmail} with course access`);
      return true;
    } else {
      // Generate a secure random password
      const tempPassword = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-10).toUpperCase() + '!';
      
      // Create a new user
      const createResponse = await fetch(`${siteUrl}/.netlify/identity/admin/users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminAuthToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: customerEmail,
          password: tempPassword,
          confirm: true, // Auto-confirm the user
          app_metadata: {
            roles: ['course-member']
          },
          user_metadata: {
            full_name: customerName,
            payment_status: 'paid',
            course_access: true,
            purchase_date: new Date().toISOString()
          }
        })
      });
      
      if (!createResponse.ok) {
        console.error('Failed to create user:', await createResponse.text());
        return false;
      }
      
      console.log(`Created new user ${customerEmail} with course access`);
      
      // Trigger password recovery to let user set their own password
      const newUser = await createResponse.json();
      
      const recoveryResponse = await fetch(`${siteUrl}/.netlify/identity/admin/users/${newUser.id}/recover`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminAuthToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!recoveryResponse.ok) {
        console.error('Failed to trigger password recovery:', await recoveryResponse.text());
        // Not returning false here as the user is still created successfully
      }
      
      return true;
    }
  } catch (error) {
    console.error('Error managing user access:', error);
    return false;
  }
}
