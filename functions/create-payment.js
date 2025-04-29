// Add to your create-payment.js function
// This would be placed after successful payment processing

// Create new user or update existing user
async function manageUserAccess(customerEmail, customerName) {
  try {
    // Check if user exists
    const adminAuthToken = process.env.NETLIFY_IDENTITY_ADMIN_TOKEN;
    
    // First check if the user exists
    const userCheckResponse = await fetch(`${process.env.URL}/.netlify/identity/admin/users`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminAuthToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    const users = await userCheckResponse.json();
    const existingUser = users.find(user => user.email === customerEmail);
    
    if (existingUser) {
      // Update existing user with course access
      await fetch(`${process.env.URL}/.netlify/identity/admin/users/${existingUser.id}`, {
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
      
      console.log(`Updated existing user ${customerEmail} with course access`);
    } else {
      // Generate a secure random password
      const tempPassword = Math.random().toString(36).slice(-10);
      
      // Create a new user
      await fetch(`${process.env.URL}/.netlify/identity/admin/users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminAuthToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: customerEmail,
          password: tempPassword,
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
      
      console.log(`Created new user ${customerEmail} with course access`);
      
      // Send welcome email with login instructions
      // You would implement this using a service like SendGrid or AWS SES
    }
    
    return true;
  } catch (error) {
    console.error('Error managing user access:', error);
    return false;
  }
}

// Then add this to your payment success handler
const userAccessGranted = await manageUserAccess(customerEmail, customerName);

// If access was granted successfully, add this information to your response
return {
  statusCode: 200,
  headers,
  body: JSON.stringify({
    success: true,
    paymentIntentId: paymentIntent.id,
    customerEmail: customerEmail,
    amount: amount / 100,
    accessGranted: userAccessGranted
  })
};
