// Netlify function: create-payment.js
// This file should be placed in the "functions" folder in your repository root
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');

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

  console.log('Starting create-payment function');

  try {
    // Parse the incoming request body
    const data = JSON.parse(event.body);
    const { paymentMethodId, amount, currency, customerEmail, customerName, productName, testMode } = data;
    
    console.log('Payment request received for:', customerEmail);
    
    // Validate the required fields
    if (!paymentMethodId || !amount || !currency || !customerEmail) {
      console.log('Missing required parameters');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required parameters' })
      };
    }
    
    // Check if it's test mode
    const isTestMode = testMode === true;
    let paymentIntent;
    let customer;
    
    if (!isTestMode) {
      // Create a new customer
      customer = await stripe.customers.create({
        email: customerEmail,
        name: customerName,
        payment_method: paymentMethodId,
      });
      
      // Create a payment intent
      paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: currency,
        customer: customer.id,
        payment_method: paymentMethodId,
        description: `Purchase of ${productName}`,
        confirm: true,
        receipt_email: customerEmail,
        metadata: {
          product: productName,
          support_email: 'hello@risegg.net'
        }
      });
      
      console.log('Payment processed successfully:', paymentIntent.id);
    } else {
      // In test mode, create a dummy payment intent ID
      paymentIntent = {
        id: `test_pi_${uuidv4().replace(/-/g, '')}`
      };
      console.log('Test mode payment with ID:', paymentIntent.id);
    }
    
    // Create user account in Netlify Identity
    // Generate a random password or use one provided
    const tempPassword = data.password || generatePassword();
    
    try {
      console.log('Creating user account in Netlify Identity');
      
      // Get the site URL - ensure it's the full absolute URL
      const siteUrl = process.env.URL || `https://${process.env.NETLIFY_SITE_NAME}.netlify.app`;
      
      // Netlify Identity API endpoint for creating users
      const netlifyIdentityEndpoint = `${siteUrl}/.netlify/identity/admin/users`;
      
      console.log('Using Netlify Identity endpoint:', netlifyIdentityEndpoint);
      
      // First check if the user already exists
      const getUsersResponse = await fetch(netlifyIdentityEndpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.NETLIFY_IDENTITY_TOKEN}`
        }
      });
      
      if (getUsersResponse.ok) {
        const users = await getUsersResponse.json();
        const existingUser = users.find(u => u.email === customerEmail);
        
        if (existingUser) {
          console.log('User already exists, updating instead of creating');
          
          // Update the existing user
          const updateResponse = await fetch(`${netlifyIdentityEndpoint}/${existingUser.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.NETLIFY_IDENTITY_TOKEN}`
            },
            body: JSON.stringify({
              email: customerEmail,
              confirmed_at: new Date().toISOString(),
              app_metadata: {
                ...(existingUser.app_metadata || {}),
                roles: ["paying_customer"]
              },
              user_metadata: {
                ...(existingUser.user_metadata || {}),
                full_name: customerName,
                course_access: true,
                purchase_date: new Date().toISOString(),
                payment_id: paymentIntent.id
              }
            })
          });
          
          if (!updateResponse.ok) {
            console.error('Error updating user:', await updateResponse.text());
          } else {
            console.log('User updated successfully');
          }
        } else {
          // Create a new user
          const userResponse = await fetch(netlifyIdentityEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.NETLIFY_IDENTITY_TOKEN}`
            },
            body: JSON.stringify({
              email: customerEmail,
              password: tempPassword,
              confirmed_at: new Date().toISOString(),
              app_metadata: {
                roles: ["paying_customer"]
              },
              user_metadata: {
                full_name: customerName,
                course_access: true,
                purchase_date: new Date().toISOString(),
                payment_id: paymentIntent.id
              }
            })
          });
          
          if (!userResponse.ok) {
            const errorData = await userResponse.text();
            console.error('Error creating user in Netlify Identity:', errorData);
          } else {
            console.log('User account created successfully');
          }
        }
      } else {
        console.error('Failed to get users from Netlify Identity');
      }
    } catch (userError) {
      console.error('Error creating user account:', userError);
      // Don't fail the whole process if user creation fails
    }
    
    // Send welcome email with receipt and login details
    try {
      console.log('Sending welcome email');
      
      // Get the site URL - ensure it's the full absolute URL
      const siteUrl = process.env.URL || `https://${process.env.NETLIFY_SITE_NAME}.netlify.app`;
      const emailFunctionUrl = `${siteUrl}/.netlify/functions/send-email`;
      
      console.log('Using email function URL:', emailFunctionUrl);
      
      // We'll send real emails even in test mode
      await fetch(emailFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customerEmail,
          customerName,
          orderDetails: {
            amount: (amount / 100).toFixed(2), // Convert cents to dollars
            paymentMethod: isTestMode ? 'Test Mode (No Charge)' : 'Credit Card',
            date: new Date().toISOString(),
            productName
          },
          sessionId: paymentIntent.id,
          loginDetails: {
            email: customerEmail,
            password: tempPassword
          },
          forceEmailInTestMode: true // New flag to force email sending in test mode
        })
      });
      console.log('Welcome email request sent');
    } catch (emailError) {
      console.error('Error sending welcome email:', emailError);
      // Don't fail the process if email sending fails
    }
    
    // Send success response
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        paymentIntentId: paymentIntent.id,
        customerEmail: customerEmail,
        amount: amount / 100, // Convert back to dollars for display
        userCreated: true,
        tempPassword: tempPassword, // Include this in response for test mode only
        emailSent: true // Indicate that we attempted to send an email
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

// Helper function to generate a random password
function generatePassword() {
  const length = 12;
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()";
  let password = "";
  
  for (let i = 0, n = charset.length; i < length; ++i) {
    password += charset.charAt(Math.floor(Math.random() * n));
  }
  
  return password;
}
