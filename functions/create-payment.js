
// Netlify function: create-payment.js
// This file should be placed in the "functions" folder in your repository root

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

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
    
    // Send success response
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        paymentIntentId: paymentIntent.id,
        customerEmail: customerEmail,
        amount: amount / 100 // Convert back to dollars for display
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
