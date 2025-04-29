// checkout.js - Client-side JavaScript for Stripe integration
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
      // Create a payment method and confirm payment
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
          amount: 9900, // $99.00 in cents
          currency: 'usd',
          customerEmail: customerData.email,
          customerName: customerData.name,
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
        window.location.href = '/thank-you.html?session_id=' + result.paymentIntentId;
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
