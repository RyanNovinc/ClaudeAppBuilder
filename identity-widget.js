// identity-widget.js - Handles all login-related functionality with simplified approach
document.addEventListener('DOMContentLoaded', function() {
  // Initialize the login button if present
  const loginButton = document.getElementById('loginButton');
  
  if (loginButton) {
    // Remove any existing onclick attribute
    loginButton.removeAttribute('onclick');
    
    // Check if the user is authenticated with our simplified system
    const isAuthenticated = localStorage.getItem('sleeptech_auth') === 'true';
    const authEmail = localStorage.getItem('sleeptech_email');
    
    if (isAuthenticated) {
      // User is logged in
      loginButton.textContent = 'My Account';
      loginButton.addEventListener('click', function(e) {
        e.preventDefault();
        if (confirm('You are logged in as ' + authEmail + '. Would you like to log out?')) {
          // Clear auth data
          localStorage.removeItem('sleeptech_auth');
          localStorage.removeItem('sleeptech_email');
          localStorage.removeItem('sleeptech_login_time');
          
          // Refresh the page
          window.location.reload();
        }
      });
    } else {
      // User is not logged in
      loginButton.textContent = 'Log In';
      loginButton.addEventListener('click', function(e) {
        e.preventDefault();
        // Check if we're in the root directory or a subdirectory
        const path = window.location.pathname;
        const isInSubdirectory = path.split('/').length > 2;
        
        if (isInSubdirectory) {
          window.location.href = '../direct-login.html';
        } else {
          window.location.href = 'direct-login.html';
        }
      });
    }
  }
  
  // If on the thank you page after purchase, we may need to handle login
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('session_id');
  const forceLogin = urlParams.get('login') === 'true';
  const emailParam = urlParams.get('email');
  const passwordParam = urlParams.get('password');
  
  if (sessionId && emailParam && passwordParam) {
    // Store password for this email
    localStorage.setItem('sleeptech_password_' + emailParam, passwordParam);
    
    // If force login is true, log the user in
    if (forceLogin) {
      localStorage.setItem('sleeptech_auth', 'true');
      localStorage.setItem('sleeptech_email', emailParam);
      localStorage.setItem('sleeptech_login_time', new Date().getTime());
    }
  }
});
