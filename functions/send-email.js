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
  
  console.log('==================== EMAIL FUNCTION START ====================');
  console.log('Starting send-email function');
  
  try {
    // Parse the incoming request body
    const data = JSON.parse(event.body);
    const { customerEmail, customerName, orderDetails, sessionId, loginDetails, forceEmailInTestMode } = data;
    
    console.log('Email request received for:', customerEmail);
    console.log('Session ID:', sessionId);
    console.log('Force email in test mode:', forceEmailInTestMode === true);
    
    if (!customerEmail || !customerName || !orderDetails || !sessionId) {
      console.log('Missing required parameters');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required parameters' })
      };
    }
    
    // Check if this is a test mode request
    const isTestMode = sessionId.startsWith('test_');
    
    // Only proceed if we're either in real mode OR we've been explicitly told to force email in test mode
    if (isTestMode && !forceEmailInTestMode) {
      console.log('Test mode detected but forceEmailInTestMode not set - skipping email send');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Email sending skipped in test mode'
        })
      };
    }
    
    // Get SendGrid API key from environment variables - try both possible keys
    const apiKey = process.env.SENDGRID_API_KEY || process.env.NETLIFY_EMAILS_PROVIDER_API_KEY;
    if (!apiKey) {
      console.log('SendGrid API key is not set in environment variables');
      
      // Log available environment variables (excluding sensitive ones)
      const safeEnvVars = {};
      for (const key in process.env) {
        if (key.includes('KEY') || key.includes('SECRET') || key.includes('PASS') || key.includes('TOKEN')) {
          safeEnvVars[key] = '[REDACTED]';
        } else {
          safeEnvVars[key] = process.env[key];
        }
      }
      console.log('Available env vars:', JSON.stringify(safeEnvVars, null, 2));
      
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Email service is not properly configured - missing API key' })
      };
    }
    
    // Set SendGrid API key
    sgMail.setApiKey(apiKey);
    console.log('Set SendGrid API key');
    
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
    
    // Get site URL for links
    const siteUrl = process.env.URL || 'https://radiant-travesseiro-481254.netlify.app';
    const courseUrl = `${siteUrl}/modules/module1.html`;
    
    // Add test mode indicator to subject if in test mode
    const emailSubject = isTestMode 
      ? '[TEST MODE] Welcome to SleepTech: Your Course Access Details' 
      : 'Welcome to SleepTech: Your Course Access Details';
    
    // Prepare welcome email with receipt and login details
    const msg = {
      to: customerEmail,
      from: {
        email: fromEmail,
        name: fromName
      },
      subject: emailSubject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          ${isTestMode ? `
            <div style="background-color: #fbbf24; color: #7c2d12; padding: 10px; text-align: center; font-weight: bold;">
              THIS IS A TEST EMAIL - No actual purchase was made
            </div>
          ` : ''}
          
          <div style="background-color: #007AFF; padding: 20px; text-align: center; color: white;">
            <h1 style="margin: 0;">Welcome to SleepTech!</h1>
          </div>
          
          <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
            <p>Hello ${customerName},</p>
            
            <p>Thank you for ${isTestMode ? 'testing' : 'purchasing'} the SleepTech Course! We're excited to have you on board.</p>
            
            <h2 style="color: #007AFF; margin-top: 30px;">Your Course Access Details</h2>
            
            <div style="background-color: #f9fafb; border-radius: 8px; padding: 15px; margin: 15px 0;">
              <p style="margin: 0;"><strong>Email:</strong> ${customerEmail}</p>
              <p style="margin: 10px 0 0;"><strong>Password:</strong> ${loginDetails?.password || 'Use the "Login with Email" option to set your password'}</p>
              <p style="margin: 10px 0 0;"><strong>Course URL:</strong> <a href="${courseUrl}">${courseUrl}</a></p>
            </div>
            
            <h2 style="color: #007AFF; margin-top: 30px;">Your Receipt</h2>
            
            <div style="background-color: #f9fafb; border-radius: 8px; padding: 15px; margin: 15px 0;">
              <p style="margin: 0;"><strong>Order Number:</strong> ${isTestMode ? 'TEST-' : 'ST-'}${sessionId.substring(0, 8)}</p>
              <p style="margin: 10px 0 0;"><strong>Date:</strong> ${orderDate}</p>
              <p style="margin: 10px 0 0;"><strong>Amount:</strong> ${isTestMode ? '$0.00 (Test)' : `$${orderDetails.amount}`}</p>
              <p style="margin: 10px 0 0;"><strong>Payment Method:</strong> ${isTestMode ? 'TEST MODE (No charge)' : orderDetails.paymentMethod}</p>
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
    
    console.log('Email message prepared:', JSON.stringify({
      to: msg.to,
      from: msg.from,
      subject: msg.subject,
      htmlLength: msg.html?.length || 0
    }, null, 2));
    
    console.log('Attempting to send email via SendGrid');
    
    // Try the primary sending method
    try {
      console.log('Using sgMail.send() method');
      const [response] = await sgMail.send(msg);
      console.log('SendGrid response:', JSON.stringify({
        statusCode: response?.statusCode,
        headers: response?.headers ? 'present' : 'absent',
        body: response?.body ? 'present' : 'absent'
      }, null, 2));
      
      console.log('Email sent successfully to:', customerEmail);
    } catch (sendError) {
      console.error('Error with sgMail.send():', sendError.toString());
      console.error('SendGrid error details:', JSON.stringify({
        message: sendError.message,
        code: sendError.code,
        response: sendError.response ? {
          body: sendError.response.body,
          statusCode: sendError.response.statusCode,
        } : 'No response details'
      }, null, 2));
      
      // Try alternative sending method
      console.log('Attempting alternative sending method via direct API call');
      
      try {
        const fetch = require('node-fetch');
        console.log('Making direct API call to SendGrid');
        
        const apiBody = {
          personalizations: [{ to: [{ email: customerEmail }] }],
          from: { email: fromEmail, name: fromName },
          subject: emailSubject,
          content: [
            {
              type: 'text/html',
              value: msg.html
            }
          ]
        };
        
        console.log('API request data structure:', JSON.stringify({
          url: 'https://api.sendgrid.com/v3/mail/send',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer [REDACTED]'
          },
          bodyStructure: {
            personalizations: 'present',
            from: 'present',
            subject: 'present',
            content: 'present'
          }
        }, null, 2));
        
        const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify(apiBody)
        });
        
        console.log('Direct API response:', JSON.stringify({
          status: response.status,
          statusText: response.statusText,
          ok: response.ok
        }, null, 2));
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('API error response:', errorText);
          throw new Error(`API call failed: ${response.status} - ${errorText}`);
        } else {
          console.log('Email sent successfully via direct API call');
        }
      } catch (apiError) {
        console.error('Error with direct API call:', apiError.toString());
        throw apiError; // Re-throw to be caught by the outer try/catch
      }
    }
    
    console.log('==================== EMAIL FUNCTION END (SUCCESS) ====================');
    
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
    console.error('==================== EMAIL FUNCTION END (ERROR) ====================');
    console.error('Final error sending email:', error.toString());
    
    // Return success anyway to not block checkout
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Email could not be sent, but purchase was successful',
        error: error.message
      })
    };
  }
};
