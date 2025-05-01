// checkout.js - Client-side JavaScript for Stripe integration with accounts
document.addEventListener('DOMContentLoaded', function() {
  // Initialize Stripe with your publishable key
  const stripe = Stripe('pk_live_51OXbiNFi6Y0LXnPSzJ31J6zFABTFibfouamxrc9Eb2t07ni2WyM2KvbhuIvyGYwKABk6Z3UOg0uY2h19vKIvuqXO00hoPLQiCF');
  const elements = stripe.elements();
  
  // Create card element
  const cardElement = elements.create('card', {
    style: {
      base: {
        fontSize: '16px',
        color: '#32325d',
        fontFamily: 'Inter, sans-serif',
        '::placeholder': {
          color: '#aab7c4',
        },
      },
      invalid: {
        color: '#fa755a',
        iconColor: '#fa755a',
      },
    },
  });
  
  // Mount the card element to the DOM
  cardElement.mount('#card-element');
  
  // Handle real-time validation errors
  cardElement.on('change', function(event) {
    const displayError = document.getElementById('card-errors');
    if (event.error) {
      displayError.textContent = event.error.message;
    } else {
      displayError.textContent = '';
    }
  });
  
  // TEST MODE: Add a special parameter to the URL to enable test mode
  const urlParams = new URLSearchParams(window.location.search);
  const isTestMode = urlParams.get('test_mode') === 'true';
  
  // Add a test mode indicator if in test mode
  if (isTestMode) {
    const testModeIndicator = document.createElement('div');
    testModeIndicator.className = 'test-mode-indicator';
    testModeIndicator.innerHTML = 'TEST MODE ACTIVE';
    document.querySelector('.checkout-header').appendChild(testModeIndicator);
    
    // Add test mode styling
    const testModeStyle = document.createElement('style');
    testModeStyle.textContent = `
      .test-mode-indicator {
        background-color: #fbbf24;
        color: #7c2d12;
        padding: 5px 10px;
        border-radius: 4px;
        margin-top: 10px;
        font-weight: bold;
        display: inline-block;
      }
      
      .test-mode-note {
        background-color: #f9fafb;
        border: 1px dashed #9ca3af;
        padding: 10px;
        border-radius: 6px;
        margin-top: 15px;
        font-size: 14px;
      }
    `;
    document.head.appendChild(testModeStyle);
    
    // Add a note about test mode
    const testModeNote = document.createElement('div');
    testModeNote.className = 'test-mode-note';
    testModeNote.innerHTML = 'In test mode, you can use any email and any valid card format to test the checkout flow. A test account will be created with access to all course content.';
    document.querySelector('.payment-form').appendChild(testModeNote);
  }
  
  // Handle form submission
  const form = document.getElementById('payment-form');
  form.addEventListener('submit', async function(event) {
    event.preventDefault();
    
    // Disable the submit button to prevent repeated clicks
    document.getElementById('submit-button').disabled = true;
    document.getElementById('submit-button').textContent = 'Processing...';
    
    // Show loading state
    const loadingElement = document.getElementById('loading');
    if (loadingElement) loadingElement.style.display = 'block';
    
    // Collect customer data
    const customerData = {
      name: document.getElementById('name').value,
      email: document.getElementById('email').value,
    };
    
    try {
      // For test mode, we'll still call create-payment to generate credentials
      if (isTestMode) {
        console.log('Processing test mode purchase...');
        
        // Generate a test session ID
        const testSessionId = 'test_' + Date.now();
        
        // Call the create-payment function to get credentials
        try {
          const response = await fetch('/.netlify/functions/create-payment', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              paymentMethodId: 'test_pm_' + Date.now(),
              amount: 19900, // $199.00 in cents
              currency: 'usd',
              customerEmail: customerData.email,
              customerName: customerData.name,
              productName: 'AppFoundry Course',
              supportEmail: 'hello@risegg.net',
              testMode: true,
              forceEmailSend: true // Force email sending in test mode
            }),
          });
          
          if (response.ok) {
            const result = await response.json();
            console.log('Test mode account creation successful:', result);
            
            // Store the password for future logins
            if (result.tempPassword) {
              localStorage.setItem('sleeptech_password_' + customerData.email, result.tempPassword);
            }
            
            // Set the auth flag - NOW is when the user should be considered "logged in" in test mode
            localStorage.setItem('appfoundry_auth', 'true');
            localStorage.setItem('sleeptech_email', customerData.email);
            localStorage.setItem('sleeptech_login_time', new Date().getTime());
            
            // Redirect to thank you page with password (if available)
            window.location.href = '/thank-you.html?session_id=' + testSessionId + 
                                  '&test_mode=true&email=' + 
                                  encodeURIComponent(customerData.email) + 
                                  '&password=' + encodeURIComponent(result.tempPassword || '');
          } else {
            // If server call fails, still redirect to thank you page but with an error flag
            console.error('Error in test mode account creation');
            
            // Even in case of error, we'll set auth in test mode to allow access
            localStorage.setItem('appfoundry_auth', 'true');
            localStorage.setItem('sleeptech_email', customerData.email);
            localStorage.setItem('sleeptech_login_time', new Date().getTime());
            
            window.location.href = '/thank-you.html?session_id=' + testSessionId + 
                                  '&test_mode=true&email=' + 
                                  encodeURIComponent(customerData.email) + 
                                  '&server_error=true';
          }
        } catch (error) {
          console.error('Error in test mode:', error);
          
          // Still redirect to thank you page even if there's an error
          // And set auth to provide access in test mode
          localStorage.setItem('appfoundry_auth', 'true');
          localStorage.setItem('sleeptech_email', customerData.email);
          localStorage.setItem('sleeptech_login_time', new Date().getTime());
          
          window.location.href = '/thank-you.html?session_id=' + testSessionId + 
                                '&test_mode=true&email=' + 
                                encodeURIComponent(customerData.email) + 
                                '&server_error=true';
        }
        
        return;
      }
      
      // For real payments, proceed with Stripe
      const { paymentMethod, error } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
        billing_details: {
          name: customerData.name,
          email: customerData.email,
        },
      });
      
      if (error) {
        // Show error to customer
        const errorElement = document.getElementById('card-errors');
        errorElement.textContent = error.message;
        document.getElementById('submit-button').disabled = false;
        document.getElementById('submit-button').textContent = 'Complete Purchase';
        if (loadingElement) loadingElement.style.display = 'none';
        return;
      }
      
      // Send the payment method ID to your serverless function
      const response = await fetch('/.netlify/functions/create-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentMethodId: paymentMethod.id,
          amount: 19900, // $199.00 in cents
          currency: 'usd',
          customerEmail: customerData.email,
          customerName: customerData.name,
          productName: 'AppFoundry Course',
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
        // Store the password for future logins
        if (result.tempPassword) {
          localStorage.setItem('sleeptech_password_' + customerData.email, result.tempPassword);
        }
        
        // When payment succeeds, set authentication in localStorage for real users too
        localStorage.setItem('sleeptech_auth', 'true');
        localStorage.setItem('sleeptech_email', customerData.email);
        localStorage.setItem('sleeptech_login_time', new Date().getTime());
        
        // Payment succeeded - redirect to success page
        window.location.href = '/thank-you.html?session_id=' + result.paymentIntentId + 
                               '&email=' + encodeURIComponent(customerData.email) + 
                               '&password=' + encodeURIComponent(result.tempPassword || '');
      }
    } catch (err) {
      console.error('Error:', err);
      const errorElement = document.getElementById('card-errors');
      errorElement.textContent = 'An unexpected error occurred. Please try again.';
      document.getElementById('submit-button').disabled = false;
      document.getElementById('submit-button').textContent = 'Complete Purchase';
      if (loadingElement) loadingElement.style.display = 'none';
    }
  });
});
