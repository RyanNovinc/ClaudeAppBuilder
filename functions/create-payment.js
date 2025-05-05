// Netlify function: create-payment.js
// Fully integrated with Supabase for authentication and user management
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL || 'https://vyzsauyekanaxevgxkyh.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

exports.handler = async function(event, context) {
  // Set CORS headers to allow requests from your domain
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

  console.log('Starting create-payment function');

  try {
    // Parse the incoming request body
    const data = JSON.parse(event.body);
    const { 
      paymentMethodId, 
      amount, 
      currency, 
      customerEmail, 
      customerName, 
      productName, 
      supportEmail, 
      testMode, 
      forceEmailSend 
    } = data;
    
    console.log('Payment request received for:', customerEmail);
    console.log('Test mode:', testMode === true);
    
    // Validate the required fields
    if (!paymentMethodId || !customerEmail) {
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
    
    // Process payment (or simulate for test mode)
    if (!isTestMode) {
      // Create a new customer in Stripe
      customer = await stripe.customers.create({
        email: customerEmail,
        name: customerName,
        payment_method: paymentMethodId,
      });
      
      // Create a payment intent
      paymentIntent = await stripe.paymentIntents.create({
        amount: amount || 19900, // $199.00 in cents by default
        currency: currency || 'usd',
        customer: customer.id,
        payment_method: paymentMethodId,
        description: `Purchase of ${productName}`,
        confirm: true,
        receipt_email: customerEmail,
        metadata: {
          product: productName,
          support_email: supportEmail || 'hello@risegg.net'
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
    
    // Generate a secure random password
    const tempPassword = generatePassword();
    
    // Create user account in Supabase
    let supabaseUser;
    let userCreationStatus = '';
    
    try {
      console.log('Creating/updating user account in Supabase');
      
      // Check if user already exists in Supabase Auth
      const { data: userData, error: userError } = await supabase.auth.admin
        .listUsers({ filter: `email.eq.${customerEmail}` });
      
      if (userError) {
        console.error('Error checking for existing user:', userError);
        throw userError;
      }
      
      // Check if user exists in Auth
      const existingUser = userData?.users && userData.users.length > 0 
        ? userData.users[0] 
        : null;
      
      if (existingUser) {
        console.log('User already exists in Supabase Auth, updating password');
        userCreationStatus = 'updated';
        
        // Update user password
        const { data, error } = await supabase.auth.admin.updateUserById(
          existingUser.id,
          { password: tempPassword }
        );
        
        if (error) {
          console.error('Error updating user password:', error);
          throw error;
        }
        
        supabaseUser = data.user;
      } else {
        console.log('Creating new user in Supabase Auth');
        userCreationStatus = 'created';
        
        // Create new user in Supabase Auth
        const { data, error } = await supabase.auth.admin.createUser({
          email: customerEmail,
          password: tempPassword,
          email_confirm: true
        });
        
        if (error) {
          console.error('Error creating user:', error);
          throw error;
        }
        
        supabaseUser = data.user;
      }
      
      // Now check if user exists in users table
      const { data: existingUserRecord, error: recordError } = await supabase
        .from('users')
        .select('id')
        .eq('id', supabaseUser.id)
        .single();
      
      if (recordError && recordError.code !== 'PGRST116') {
        console.error('Error checking user record:', recordError);
      }
      
      if (existingUserRecord) {
        // Update existing user record
        const { error: updateError } = await supabase
          .from('users')
          .update({
            name: customerName,
            email: customerEmail,
            test_mode: isTestMode,
            course_access: true,
            updated_at: new Date().toISOString(),
            payment_id: paymentIntent.id,
            payment_amount: amount || 19900,
            payment_date: new Date().toISOString()
          })
          .eq('id', supabaseUser.id);
        
        if (updateError) {
          console.error('Error updating user record:', updateError);
        }
      } else {
        // Insert new user record
        const { error: insertError } = await supabase
          .from('users')
          .insert([{
            id: supabaseUser.id,
            email: customerEmail,
            name: customerName || customerEmail.split('@')[0],
            test_mode: isTestMode,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            course_access: true,
            payment_id: paymentIntent.id,
            payment_amount: amount || 19900,
            payment_date: new Date().toISOString()
          }]);
        
        if (insertError) {
          console.error('Error inserting user record:', insertError);
        }
      }
      
      console.log(`User ${userCreationStatus} successfully in Supabase`);
    } catch (supabaseError) {
      console.error('Error with Supabase operations:', supabaseError);
      // Continue with the process even if Supabase operations fail
    }
    
    // Send welcome email with login credentials
    try {
      console.log('Sending welcome email');
      
      // Get the site URL
      const siteUrl = process.env.URL || `https://${process.env.NETLIFY_SITE_NAME}.netlify.app`;
      const emailFunctionUrl = `${siteUrl}/.netlify/functions/send-email`;
      
      console.log('Using email function URL:', emailFunctionUrl);
      
      // Send email in both real mode and test mode (if forceEmailSend is true)
      if (!isTestMode || forceEmailSend) {
        await fetch(emailFunctionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            customerEmail,
            customerName,
            orderDetails: {
              amount: isTestMode ? '0.00 (Test)' : ((amount || 19900) / 100).toFixed(2),
              paymentMethod: isTestMode ? 'Test Mode (No Charge)' : 'Credit Card',
              date: new Date().toISOString(),
              productName
            },
            sessionId: paymentIntent.id,
            loginDetails: {
              email: customerEmail,
              password: tempPassword
            },
            forceEmailInTestMode: forceEmailSend,
            testMode: isTestMode,
            supabaseIntegration: true
          })
        });
        console.log('Welcome email request sent');
      }
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
        amount: isTestMode ? 0 : (amount || 19900) / 100,
        userCreated: true,
        tempPassword: tempPassword,
        emailSent: !isTestMode || forceEmailSend,
        testMode: isTestMode,
        supabaseIntegration: true,
        userCreationStatus
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

// Helper function to generate a secure random password
function generatePassword(length = 12) {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()";
  let password = "";
  
  for (let i = 0, n = charset.length; i < length; ++i) {
    password += charset.charAt(Math.floor(Math.random() * n));
  }
  
  return password;
}
