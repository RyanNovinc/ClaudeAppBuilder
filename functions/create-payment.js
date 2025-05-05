// Netlify function: create-payment.js
// Debug version with extra logging for troubleshooting Supabase integration
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// Log Supabase configuration (without revealing full keys)
console.log('[DEBUG] Supabase URL:', supabaseUrl);
console.log('[DEBUG] Supabase Service Key available:', !!supabaseServiceKey);
console.log('[DEBUG] Supabase Anon Key available:', !!supabaseAnonKey);

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

  console.log('[DEBUG] Starting create-payment function');

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
    
    console.log('[DEBUG] Payment request received for:', customerEmail);
    console.log('[DEBUG] Test mode:', testMode === true);
    console.log('[DEBUG] Amount:', amount);
    console.log('[DEBUG] Product:', productName);
    
    // Validate the required fields
    if (!paymentMethodId || !customerEmail) {
      console.log('[DEBUG] Missing required parameters');
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
      console.log('[DEBUG] Creating Stripe customer');
      customer = await stripe.customers.create({
        email: customerEmail,
        name: customerName,
        payment_method: paymentMethodId,
      });
      
      // Create a payment intent
      console.log('[DEBUG] Creating Stripe payment intent');
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
      
      console.log('[DEBUG] Payment processed successfully:', paymentIntent.id);
    } else {
      // In test mode, create a dummy payment intent ID
      paymentIntent = {
        id: `test_pi_${uuidv4().replace(/-/g, '')}`
      };
      console.log('[DEBUG] Test mode payment with ID:', paymentIntent.id);
    }
    
    // Generate a secure random password
    const tempPassword = generatePassword();
    console.log('[DEBUG] Generated password for user');
    
    // Create Supabase client
    console.log('[DEBUG] Initializing Supabase client');
    let supabase;
    try {
      supabase = createClient(supabaseUrl, supabaseServiceKey);
      console.log('[DEBUG] Supabase client initialized successfully');
    } catch (supabaseClientError) {
      console.error('[DEBUG] Error initializing Supabase client:', supabaseClientError);
      throw new Error('Failed to initialize Supabase client: ' + supabaseClientError.message);
    }
    
    // Create user account in Supabase
    let supabaseUser;
    let userCreationStatus = '';
    let supabaseSuccess = false;
    
    try {
      console.log('[DEBUG] Creating/updating user account in Supabase');
      
      // Check if user already exists in Supabase Auth
      console.log('[DEBUG] Checking if user exists in Supabase Auth');
      const { data: userList, error: listError } = await supabase.auth.admin.listUsers({
        filter: `email.eq.${customerEmail}`
      });
      
      if (listError) {
        console.error('[DEBUG] Error listing users:', listError);
        throw listError;
      }
      
      console.log('[DEBUG] User list response:', JSON.stringify(userList || {}));
      
      // Check if user exists in Auth
      const existingUser = userList?.users && userList.users.length > 0 
        ? userList.users[0] 
        : null;
      
      if (existingUser) {
        console.log('[DEBUG] User already exists in Supabase Auth, id:', existingUser.id);
        userCreationStatus = 'updated';
        
        // Update user password
        console.log('[DEBUG] Updating existing user password');
        const { data, error } = await supabase.auth.admin.updateUserById(
          existingUser.id,
          { password: tempPassword }
        );
        
        if (error) {
          console.error('[DEBUG] Error updating user password:', error);
          throw error;
        }
        
        console.log('[DEBUG] Password updated successfully');
        supabaseUser = data.user;
      } else {
        console.log('[DEBUG] Creating new user in Supabase Auth');
        userCreationStatus = 'created';
        
        // Create new user in Supabase Auth
        const { data, error } = await supabase.auth.admin.createUser({
          email: customerEmail,
          password: tempPassword,
          email_confirm: true
        });
        
        if (error) {
          console.error('[DEBUG] Error creating user:', error);
          throw error;
        }
        
        console.log('[DEBUG] User created successfully in Auth, id:', data.user.id);
        supabaseUser = data.user;
      }
      
      // Now check if user exists in users table
      console.log('[DEBUG] Checking if user exists in users table');
      const { data: existingUserRecord, error: recordError } = await supabase
        .from('users')
        .select('id')
        .eq('id', supabaseUser.id)
        .single();
      
      if (recordError && recordError.code !== 'PGRST116') {
        console.error('[DEBUG] Error checking user record:', recordError);
      }
      
      console.log('[DEBUG] Existing user record check result:', JSON.stringify(existingUserRecord || {}));
      
      if (existingUserRecord) {
        // Update existing user record
        console.log('[DEBUG] Updating existing user record in users table');
        const { error: updateError } = await supabase
          .from('users')
          .update({
            name: customerName || customerEmail.split('@')[0],
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
          console.error('[DEBUG] Error updating user record:', updateError);
          throw updateError;
        }
        
        console.log('[DEBUG] User record updated successfully');
      } else {
        // Insert new user record
        console.log('[DEBUG] Creating new user record in users table');
        console.log('[DEBUG] User data for insert:', {
          id: supabaseUser.id,
          email: customerEmail,
          name: customerName || customerEmail.split('@')[0],
          test_mode: isTestMode,
          created_at: new Date().toISOString(),
          course_access: true
        });
        
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
          console.error('[DEBUG] Error inserting user record:', insertError);
          throw insertError;
        }
        
        console.log('[DEBUG] User record inserted successfully');
      }
      
      console.log(`[DEBUG] User ${userCreationStatus} successfully in Supabase`);
      supabaseSuccess = true;
    } catch (supabaseError) {
      console.error('[DEBUG] Error with Supabase operations:', supabaseError);
      // Continue with the process even if Supabase operations fail
    }
    
    // Send welcome email with login credentials
    try {
      console.log('[DEBUG] Sending welcome email');
      
      // Get the site URL
      const siteUrl = process.env.URL || `https://${process.env.NETLIFY_SITE_NAME}.netlify.app`;
      const emailFunctionUrl = `${siteUrl}/.netlify/functions/send-email`;
      
      console.log('[DEBUG] Using email function URL:', emailFunctionUrl);
      
      // Send email in both real mode and test mode (if forceEmailSend is true)
      if (!isTestMode || forceEmailSend) {
        const emailResponse = await fetch(emailFunctionUrl, {
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
            supabaseIntegration: supabaseSuccess
          })
        });
        
        if (!emailResponse.ok) {
          console.error('[DEBUG] Email service error:', await emailResponse.text());
        } else {
          console.log('[DEBUG] Welcome email request sent successfully');
        }
      }
    } catch (emailError) {
      console.error('[DEBUG] Error sending welcome email:', emailError);
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
        supabaseIntegration: supabaseSuccess,
        userCreationStatus,
        debug: {
          supabaseUrlConfigured: !!supabaseUrl,
          supabaseServiceKeyConfigured: !!supabaseServiceKey, 
          supabaseInitialized: true
        }
      })
    };
  } catch (error) {
    console.error('[DEBUG] Error processing payment:', error);
    
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error: error.message,
        stack: error.stack
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
