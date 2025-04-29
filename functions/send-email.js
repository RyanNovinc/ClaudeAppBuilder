// functions/send-email.js
const nodemailer = require('nodemailer');
const { createReceiptPDF } = require('./utils/receipt-generator');

exports.handler = async function(event, context) {
  // Set CORS headers for preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }
  
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }
  
  try {
    // Parse the incoming request body
    const data = JSON.parse(event.body);
    const { customerEmail, customerName, orderDetails, sessionId, loginDetails, testMode } = data;
    
    if (!customerEmail || !customerName || !orderDetails || !sessionId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required parameters' })
      };
    }
    
    // Check if required environment variables are present
    if (!process.env.EMAIL_HOST || !process.env.EMAIL_PORT || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error('Missing email configuration environment variables');
      
      // For test mode, we can pretend it worked
      if (testMode === true) {
        return {
          statusCode: 200,
          headers: {
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            success: true,
            message: 'Test mode - email would have been sent',
            testMode: true
          })
        };
      }
      
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          error: 'Email configuration not available',
          message: 'The server is not configured to send emails. Please contact support.'
        })
      };
    }
    
    console.log('Creating email transport with settings:', {
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
      }
    });
    
    // Configure nodemailer transport
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER || 'hello@risegg.net',
        pass: process.env.EMAIL_PASS
      },
      tls: {
        // Do not fail on invalid certificates
        rejectUnauthorized: false
      }
    });
    
    console.log('Preparing welcome email for:', customerEmail);
    
    // Determine if this is a test mode email
    const isTestMode = testMode === true;
    const testModeTag = isTestMode ? '[TEST MODE] ' : '';
    const courseUrl = 'https://your-netlify-site.netlify.app/modules/module1.html';
    
    // Prepare welcome email with receipt and login details
    const welcomeEmail = {
      from: `"${testModeTag}${process.env.EMAIL_FROM_NAME || 'SleepTech'}" <${process.env.EMAIL_FROM || 'hello@risegg.net'}>`,
      to: customerEmail,
      subject: `${testModeTag}Welcome to SleepTech: Your Course Access Details`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #007AFF; padding: 20px; text-align: center; color: white;">
            <h1 style="margin: 0;">Welcome to SleepTech!</h1>
            ${isTestMode ? '<p style="color: yellow; margin-top: 5px;"><strong>TEST MODE</strong> - No actual purchase was made</p>' : ''}
          </div>
          
          <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
            <p>Hello ${customerName},</p>
            
            <p>Thank you for purchasing the SleepTech course! We're excited to have you on board.</p>
            
            <h2 style="color: #007AFF; margin-top: 30px;">Your Course Access Details</h2>
            
            <div style="background-color: #f9fafb; border-radius: 8px; padding: 15px; margin: 15px 0;">
              <p style="margin: 0;"><strong>Email:</strong> ${customerEmail}</p>
              <p style="margin: 10px 0 0;"><strong>Password:</strong> ${loginDetails?.password || 'Use the "Login with Email" option to set your password'}</p>
              <p style="margin: 10px 0 0;"><strong>Course URL:</strong> <a href="${courseUrl}">${courseUrl}</a></p>
            </div>
            
            <h2 style="color: #007AFF; margin-top: 30px;">Your Receipt</h2>
            
            <div style="background-color: #f9fafb; border-radius: 8px; padding: 15px; margin: 15px 0;">
              <p style="margin: 0;"><strong>Order Number:</strong> ${isTestMode ? 'TEST-' : 'ST-'}${sessionId.substring(0, 8)}</p>
              <p style="margin: 10px 0 0;"><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
              <p style="margin: 10px 0 0;"><strong>Amount:</strong> ${isTestMode ? '$0.00 (Test)' : '$' + orderDetails.amount}</p>
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
            
            ${isTestMode ? '<p style="color: #b91c1c;"><strong>TEST MODE NOTICE:</strong> This is a test email. No actual purchase has been made and no charges have been applied to any payment method.</p>' : ''}
          </div>
          
          <div style="background-color: #f2f2f7; padding: 20px; text-align: center; font-size: 14px; color: #6b7280;">
            <p style="margin: 0;">© 2025 SleepTech. All rights reserved.</p>
            <p style="margin: 10px 0 0;">SleepTech</p>
          </div>
        </div>
      `
    };
    
    console.log('Attempting to send email...');
    
    // Send the welcome email
    const info = await transporter.sendMail(welcomeEmail);
    
    console.log('Email sent successfully:', info.messageId);
    
    // Send success response
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        message: 'Welcome email sent successfully',
        messageId: info.messageId,
        testMode: isTestMode
      })
    };
  } catch (error) {
    console.error('Error sending email:', error);
    
    // Check if this was a test mode request
    let isTestMode = false;
    try {
      const data = JSON.parse(event.body);
      isTestMode = data.testMode === true;
    } catch (e) {
      // Ignore parsing error
    }
    
    // For test mode, provide a friendlier response
    if (isTestMode) {
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          error: 'Failed to send test email',
          message: 'Email sending failed, but test mode is active, so you can still access the course.',
          testMode: true
        })
      };
    }
    
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Failed to send email: ' + error.message
      })
    };
  }
};
