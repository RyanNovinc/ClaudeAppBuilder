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

  try {
    // Parse the incoming request body
    const data = JSON.parse(event.body);
    const { paymentMethodId, amount, currency, customerEmail, customerName, productName, testMode } = data;
    
    // Validate the required fields
    if (!paymentMethodId || !amount || !currency || !customerEmail) {
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
      try {
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
      } catch (stripeError) {
        console.error('Stripe error:', stripeError);
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: stripeError.message })
        };
      }
    } else {
      // In test mode, create a dummy payment intent ID
      paymentIntent = {
        id: `test_pi_${uuidv4().replace(/-/g, '')}`
      };
    }
    
    // Generate a temporary password
    const tempPassword = data.password || generatePassword();
    let userCreated = false;
    
    // Create user account in Netlify Identity
    try {
      // Skip actual Netlify Identity API call if environment variables aren't set
      if (!process.env.NETLIFY_SITE_NAME || !process.env.NETLIFY_IDENTITY_TOKEN) {
        console.log('Skipping Netlify Identity user creation - environment variables not set');
        if (isTestMode) {
          userCreated = true; // Pretend it worked in test mode
        }
      } else {
        // Netlify Identity API endpoint for creating users
        const netlifyIdentityEndpoint = `https://${process.env.NETLIFY_SITE_NAME}.netlify.app/.netlify/identity/admin/users`;
        
        // Create the user
        const userResponse = await fetch(netlifyIdentityEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.NETLIFY_IDENTITY_TOKEN}`
          },
          body: JSON.stringify({
            email: customerEmail,
            password: tempPassword,
            user_metadata: {
              full_name: customerName,
              course_access: true,
              purchase_date: new Date().toISOString(),
              payment_id: paymentIntent.id
            }
          })
        });
        
        if (userResponse.ok) {
          userCreated = true;
          console.log('User created successfully in Netlify Identity');
        } else {
          const errorData = await userResponse.json();
          console.error('Error creating user in Netlify Identity:', errorData);
          // Don't fail the whole process for test mode
          if (!isTestMode) {
            return {
              statusCode: 500,
              headers,
              body: JSON.stringify({ error: 'Failed to create user account' })
            };
          }
        }
      }
    } catch (userError) {
      console.error('Error creating user account:', userError);
      // Don't fail the whole process for test mode
      if (!isTestMode) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Failed to create user account: ' + userError.message })
        };
      }
    }
    
    // Send welcome email with receipt and login details
    let emailSent = false;
    try {
      // Skip actual email sending if environment variables aren't set or in test mode
      if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.log('Skipping email sending - environment variables not set');
        if (isTestMode) {
          emailSent = true; // Pretend it worked in test mode
        }
      } else {
        const emailResponse = await fetch('/.netlify/functions/send-email', {
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
              productName,
              sessionId: paymentIntent.id
            },
            sessionId: paymentIntent.id,
            loginDetails: {
              email: customerEmail,
              password: tempPassword
            }
          })
        });
        
        if (emailResponse.ok) {
          emailSent = true;
          console.log('Welcome email sent successfully');
        } else {
          const errorData = await emailResponse.text();
          console.error('Error sending welcome email:', errorData);
        }
      }
    } catch (emailError) {
      console.error('Error sending welcome email:', emailError);
      // Don't fail the whole process if email sending fails
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
        userCreated: userCreated,
        emailSent: emailSent,
        testMode: isTestMode
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
