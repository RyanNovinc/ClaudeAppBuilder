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
    const { customerEmail, customerName, orderDetails, sessionId, loginDetails } = data;
    
    if (!customerEmail || !customerName || !orderDetails || !sessionId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required parameters' })
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
    
    // Configure nodemailer transport for Gmail
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER || 'hello@risegg.net',
        pass: process.env.EMAIL_PASS // This should be an App Password for Gmail
      },
      tls: {
        // Do not fail on invalid certificates
        rejectUnauthorized: false
      }
    });
    
    // Create receipt PDF (optional, for a more sophisticated approach)
    // const receiptPdfBuffer = await createReceiptPDF(orderDetails);
    
    console.log('Preparing welcome email for:', customerEmail);
    
    // Prepare welcome email with receipt and login details
    const welcomeEmail = {
      from: `"${process.env.EMAIL_FROM_NAME || 'ClaudeAppCourse'}" <${process.env.EMAIL_FROM || 'hello@risegg.net'}>`,
      to: customerEmail,
      subject: 'Welcome to ClaudeAppCourse: Your Course Access Details',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #007AFF; padding: 20px; text-align: center; color: white;">
            <h1 style="margin: 0;">Welcome to ClaudeAppCourse!</h1>
          </div>
          
          <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
            <p>Hello ${customerName},</p>
            
            <p>Thank you for purchasing the ClaudeAppCourse! We're excited to have you on board.</p>
            
            <h2 style="color: #007AFF; margin-top: 30px;">Your Course Access Details</h2>
            
            <div style="background-color: #f9fafb; border-radius: 8px; padding: 15px; margin: 15px 0;">
              <p style="margin: 0;"><strong>Email:</strong> ${customerEmail}</p>
              <p style="margin: 10px 0 0;"><strong>Password:</strong> ${loginDetails?.password || 'Use the "Login with Email" option to set your password'}</p>
              <p style="margin: 10px 0 0;"><strong>Course URL:</strong> <a href="https://radiant-travesseiro-481254.netlify.app/modules/module1.html">https://radiant-travesseiro-481254.netlify.app/modules/module1.html</a></p>
            </div>
            
            <h2 style="color: #007AFF; margin-top: 30px;">Your Receipt</h2>
            
            <div style="background-color: #f9fafb; border-radius: 8px; padding: 15px; margin: 15px 0;">
              <p style="margin: 0;"><strong>Order Number:</strong> ST-${sessionId.substring(0, 8)}</p>
              <p style="margin: 10px 0 0;"><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
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
            
            <p>Best regards,<br>Claude<br>ClaudeAppCourse Team</p>
          </div>
          
          <div style="background-color: #f2f2f7; padding: 20px; text-align: center; font-size: 14px; color: #6b7280;">
            <p style="margin: 0;">© 2025 RiseGG. All rights reserved.</p>
            <p style="margin: 10px 0 0;">RiseGG, Inc.</p>
          </div>
        </div>
      `,
      attachments: [
        // Uncomment if using PDF generation
        /*{
          filename: 'receipt.pdf',
          content: receiptPdfBuffer
        }*/
      ]
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
        messageId: info.messageId
      })
    };
  } catch (error) {
    console.error('Error sending email:', error);
    
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
