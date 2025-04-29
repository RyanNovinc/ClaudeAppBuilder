// identity-widget.js - Handles all login-related functionality
document.addEventListener('DOMContentLoaded', function() {
  // Initialize the login button if present
  const loginButton = document.getElementById('loginButton');
  
  // Check if Netlify Identity is available
  if (window.netlifyIdentity) {
    // Set up event handlers
    setupIdentityHandlers();
    
    // Configure the login button
    if (loginButton) {
      loginButton.addEventListener('click', function() {
        // Always open identity widget, whether logged in or not
        netlifyIdentity.open();
      });
    }
  } else {
    console.warn('Netlify Identity widget not loaded');
    
    // Add a fallback for the login button if identity is not loaded
    if (loginButton) {
      loginButton.addEventListener('click', function() {
        alert('Login system is not available. Please try again later or contact support.');
      });
    }
  }
  
  function setupIdentityHandlers() {
    // Handle initialization
    netlifyIdentity.on('init', user => {
      updateLoginButton(user);
      
      // If on the thank you page after purchase, we may need to force login
      const urlParams = new URLSearchParams(window.location.search);
      const sessionId = urlParams.get('session_id');
      const forceLogin = urlParams.get('login') === 'true';
      
      if (sessionId && forceLogin && !user) {
        // We're on the thank you page after purchase, but not logged in
        const emailParam = urlParams.get('email');
        
        if (emailParam) {
          // Show a message about checking email
          const thankYouContainer = document.querySelector('.thank-you-container');
          
          if (thankYouContainer) {
            const loginMessage = document.createElement('div');
            loginMessage.className = 'login-message';
            loginMessage.innerHTML = `
              <div style="background-color: #e0f2ff; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: left;">
                <h3 style="margin-top: 0; color: #0070f3;">Check Your Email</h3>
                <p>We've sent login details to <strong>${emailParam}</strong>. Please check your inbox to access your course.</p>
                <p>If you don't see the email, please check your spam folder or click the button below to login or reset your password.</p>
                <button id="open-login" class="cta-button">Login to Your Account</button>
              </div>
            `;
            
            thankYouContainer.insertBefore(loginMessage, thankYouContainer.firstChild.nextSibling);
            
            // Add click handler for the login button
            document.getElementById('open-login').addEventListener('click', function() {
              netlifyIdentity.open();
            });
          }
        }
      }
    });
    
    // Handle login event
    netlifyIdentity.on('login', user => {
      updateLoginButton(user);
      
      // Check if the user has course access
      const userMeta = user.user_metadata || {};
      
      // If the user has purchased the course, redirect to the course content
      if (userMeta.course_access === true) {
        // Only redirect if we're not already on a course page
        if (!window.location.pathname.includes('modules/')) {
          // Check if we're on the thank you page, and if so, add a delay
          if (window.location.pathname.includes('thank-you.html')) {
            setTimeout(() => {
              window.location.href = 'modules/module1.html';
            }, 3000); // Give them 3 seconds to see the thank you page
          } else {
            window.location.href = 'modules/module1.html';
          }
        }
      } else {
        // User doesn't have course access, show a message
        alert('Your account does not have access to the course. Please purchase the course to gain access.');
        // Optional: Redirect to checkout page
        // window.location.href = 'checkout.html';
      }
    });
    
    // Handle logout event
    netlifyIdentity.on('logout', () => {
      updateLoginButton(null);
      
      // If on a protected page, redirect to home
      if (window.location.pathname.includes('modules/')) {
        window.location.href = '/index.html';
      }
    });
  }
  
  function updateLoginButton(user) {
    // Skip if there's no login button
    if (!loginButton) return;
    
    if (user) {
      // User is logged in
      loginButton.textContent = 'My Account';
      
      // Add user's name if we have it
      const userMeta = user.user_metadata || {};
      if (userMeta.full_name) {
        loginButton.setAttribute('data-username', userMeta.full_name);
        
        // Add tooltip style
        const style = document.createElement('style');
        style.textContent = `
          #loginButton[data-username]:hover::after {
            content: "Hello, " attr(data-username);
            position: absolute;
            top: 100%;
            left: 50%;
            transform: translateX(-50%);
            background: #333;
            color: white;
            padding: 5px 10px;
            border-radius: 4px;
            font-size: 14px;
            white-space: nowrap;
            z-index: 10;
            margin-top: 5px;
          }
          
          #loginButton {
            position: relative;
          }
        `;
        document.head.appendChild(style);
      }
    } else {
      // User is logged out
      loginButton.textContent = 'Log in';
      loginButton.removeAttribute('data-username');
    }
  }
});
