// functions/send-email.js
const sgMail = require('@sendgrid/mail');

exports.handler = async function(event, context) {
  // Set CORS headers for preflight requests
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
  
  console.log('Starting send-email function');
  
  try {
    // Parse the incoming request body
    const data = JSON.parse(event.body);
    const { customerEmail, customerName, orderDetails, sessionId, loginDetails } = data;
    
    console.log('Email request received for:', customerEmail);
    console.log('Session ID:', sessionId);
    
    if (!customerEmail || !customerName || !orderDetails || !sessionId) {
      console.log('Missing required parameters');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required parameters' })
      };
    }
    
    // Get SendGrid API key from environment variables - try both possible keys
    const apiKey = process.env.SENDGRID_API_KEY || process.env.NETLIFY_EMAILS_PROVIDER_API_KEY;
    if (!apiKey) {
      console.log('SendGrid API key is not set in environment variables');
      console.log('Available env vars:', Object.keys(process.env).filter(key => !key.includes('SECRET') && !key.includes('KEY')));
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Email service is not properly configured' })
      };
    }
    
    // Set SendGrid API key
    sgMail.setApiKey(apiKey);
    
    console.log('Preparing email content');
    
    // Format date
    const orderDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    // Define sender email
    const fromEmail = process.env.EMAIL_FROM || 'hello@risegg.net';
    const fromName = process.env.EMAIL_FROM_NAME || 'SleepTech';
    
    console.log('Sending from:', fromEmail);
    
    // Prepare welcome email with receipt and login details
    const msg = {
      to: customerEmail,
      from: {
        email: fromEmail,
        name: fromName
      },
      subject: 'Welcome to SleepTech: Your Course Access Details',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #007AFF; padding: 20px; text-align: center; color: white;">
            <h1 style="margin: 0;">Welcome to SleepTech!</h1>
          </div>
          
          <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
            <p>Hello ${customerName},</p>
            
            <p>Thank you for purchasing the SleepTech Course! We're excited to have you on board.</p>
            
            <h2 style="color: #007AFF; margin-top: 30px;">Your Course Access Details</h2>
            
            <div style="background-color: #f9fafb; border-radius: 8px; padding: 15px; margin: 15px 0;">
              <p style="margin: 0;"><strong>Email:</strong> ${customerEmail}</p>
              <p style="margin: 10px 0 0;"><strong>Password:</strong> ${loginDetails?.password || 'Use the "Login with Email" option to set your password'}</p>
              <p style="margin: 10px 0 0;"><strong>Course URL:</strong> <a href="https://radiant-travesseiro-481254.netlify.app/modules/module1.html">https://radiant-travesseiro-481254.netlify.app/modules/module1.html</a></p>
            </div>
            
            <h2 style="color: #007AFF; margin-top: 30px;">Your Receipt</h2>
            
            <div style="background-color: #f9fafb; border-radius: 8px; padding: 15px; margin: 15px 0;">
              <p style="margin: 0;"><strong>Order Number:</strong> ST-${sessionId.substring(0, 8)}</p>
              <p style="margin: 10px 0 0;"><strong>Date:</strong> ${orderDate}</p>
              <p style="margin: 10px 0 0;"><strong>Amount:</strong> $${orderDetails.amount}</p>
              <p style="margin: 10px 0 0;"><strong>Payment Method:</strong> ${orderDetails.paymentMethod}</p>
            </div>
            
            <h2 style="color: #007AFF; margin-top: 30px;">Getting Started</h2>
            
            <ol>
              <li style="margin-bottom: 10px;"><strong>Log in to your account</strong> using the email and password above.</li>
              <li style="margin-bottom: 10px;"><strong>Start with Module 1</strong> to set up your development environment.</li>
              <li style="margin-bottom: 10px;"><strong>Follow along step-by-step</strong> to build your first app without coding.</li>
            </ol>
            
            <p style="margin-top: 30px;">If you have any questions or need assistance, please don't hesitate to contact us at <a href="mailto:hello@risegg.net">hello@risegg.net</a>.</p>
            
            <p>We're excited to see what you'll build!</p>
            
            <p>Best regards,<br>SleepTech Team</p>
          </div>
          
          <div style="background-color: #f2f2f7; padding: 20px; text-align: center; font-size: 14px; color: #6b7280;">
            <p style="margin: 0;">© 2025 SleepTech. All rights reserved.</p>
            <p style="margin: 10px 0 0;">SleepTech, Inc.</p>
          </div>
        </div>
      `
    };
    
    console.log('Sending email via SendGrid');
    
    try {
      // Try using the regular SendGrid send method
      await sgMail.send(msg);
      console.log('Email sent successfully to:', customerEmail);
    } catch (sendError) {
      console.error('Error with sgMail.send:', sendError);
      
      // If that fails, try an alternative approach - making a direct API call
      console.log('Attempting alternative sending method...');
      
      try {
        const fetch = require('node-fetch');
        const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: customerEmail }] }],
            from: { email: fromEmail, name: fromName },
            subject: 'Welcome to SleepTech: Your Course Access Details',
            content: [
              {
                type: 'text/html',
                value: msg.html
              }
            ]
          })
        });
        
        if (response.ok) {
          console.log('Email sent successfully via API call to:', customerEmail);
        } else {
          const errorData = await response.text();
          throw new Error(`API call failed: ${response.status} - ${errorData}`);
        }
      } catch (apiError) {
        console.error('Error with direct API call:', apiError);
        throw apiError; // Re-throw to be caught by the outer try/catch
      }
    }
    
    // Send success response
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Welcome email sent successfully'
      })
    };
  } catch (error) {
    console.error('Error sending email:', error);
    
    // Instead of failing, return a success response but log the error
    // This allows the checkout process to continue even if email fails
    return {
      statusCode: 200, // Changed from 500 to 200 to let the process continue
      headers,
      body: JSON.stringify({
        success: true, // Changed from false to true
        message: 'Email could not be sent, but purchase was successful',
        error: error.message
      })
    };
  }
};
