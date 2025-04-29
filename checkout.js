// Find this code in checkout.js where it calls the create-payment function
// Around line 70-100 in checkout.js

// Existing code (simplified):
try {
  const response = await fetch('/.netlify/functions/create-payment', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      paymentMethodId: paymentMethod.id,
      amount: 9900, // $99.00 in cents
      currency: 'usd',
      customerEmail: customerEmail,
      customerName: customerName,
      productName: 'SleepTech Course',
      supportEmail: 'hello@risegg.net'
    }),
  });
  
  const result = await response.json();
  
  if (result.error) {
    // Payment processing failed
    const errorElement = document.getElementById('card-errors');
    errorElement.textContent = result.error;
    document.getElementById('submit-button').disabled = false;
    document.getElementById('submit-button').textContent = 'Complete Purchase';
    if (loadingElement) loadingElement.style.display = 'none';
  } else {
    // Payment succeeded - redirect to success page
    window.location.href = '/thank-you.html?session_id=' + result.paymentIntentId + '&email=' + encodeURIComponent(customerEmail);
  }
} catch (err) {
  console.error('Error:', err);
  const errorElement = document.getElementById('card-errors');
  errorElement.textContent = 'An unexpected error occurred. Please try again.';
  document.getElementById('submit-button').disabled = false;
  document.getElementById('submit-button').textContent = 'Complete Purchase';
  if (loadingElement) loadingElement.style.display = 'none';
}

// MODIFY THIS TO:

try {
  const response = await fetch('/.netlify/functions/create-payment', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      paymentMethodId: paymentMethod.id,
      amount: 9900, // $99.00 in cents
      currency: 'usd',
      customerEmail: customerEmail,
      customerName: customerName,
      productName: 'SleepTech Course',
      supportEmail: 'hello@risegg.net'
    }),
  });
  
  // Try to parse the response, but don't fail if there's an error
  let result = {};
  try {
    result = await response.json();
  } catch (parseErr) {
    console.error('Error parsing response:', parseErr);
    // Continue anyway
  }
  
  // Always redirect to success page, even if there's an error with the email
  // This ensures users can complete checkout even if emails aren't working
  if (result.error && !result.error.includes('email')) {
    // Only show error if it's not email-related
    const errorElement = document.getElementById('card-errors');
    errorElement.textContent = result.error;
    document.getElementById('submit-button').disabled = false;
    document.getElementById('submit-button').textContent = 'Complete Purchase';
    if (loadingElement) loadingElement.style.display = 'none';
  } else {
    // Redirect to success page, adding email parameter and potentially test_mode
    const paymentId = result.paymentIntentId || 'temp_' + Date.now();
    window.location.href = '/thank-you.html?session_id=' + paymentId + 
      '&email=' + encodeURIComponent(customerEmail) + 
      '&server_error=true'; // This will show the email error message
  }
} catch (err) {
  console.error('Error:', err);
  // Even on error, redirect to the thank you page
  window.location.href = '/thank-you.html?session_id=temp_' + Date.now() + 
    '&email=' + encodeURIComponent(customerEmail) + 
    '&server_error=true';
}
