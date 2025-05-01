// identity-widget.js - Modified to handle login/logout without Course tab
document.addEventListener('DOMContentLoaded', function() {
  console.log('Identity widget loaded - Page:', window.location.pathname);
  
  // Check for test mode
  const urlParams = new URLSearchParams(window.location.search);
  const isTestMode = urlParams.get('test_mode') === 'true';
  
  // We no longer automatically set the auth flag just because test_mode is true
  // Instead, we'll set it only when they complete the checkout or login process
  
  // Check authentication status from localStorage
  const isAuthenticated = localStorage.getItem('sleeptech_auth') === 'true' || 
                          localStorage.getItem('appfoundry_auth') === 'true';
  
  console.log('Auth status check - authenticated:', isAuthenticated);
  
  // Initialize the login button if present
  const loginButton = document.getElementById('loginButton');
  
  if (loginButton) {
    // Remove any existing onclick attribute
    loginButton.removeAttribute('onclick');
    
    const authEmail = localStorage.getItem('sleeptech_email') || 'test@example.com';
    
    if (isAuthenticated) {
      // User is logged in - show Log Out button
      loginButton.textContent = 'Log Out';
      loginButton.style.backgroundColor = '#ef4444'; // Red color
      
      loginButton.addEventListener('click', function(e) {
        e.preventDefault();
        // Clear auth data immediately without confirmation
        localStorage.removeItem('sleeptech_auth');
        localStorage.removeItem('sleeptech_email');
        localStorage.removeItem('sleeptech_login_time');
        localStorage.removeItem('appfoundry_auth');
          
        // Redirect to home page
        const isInSubdirectory = window.location.pathname.split('/').length > 2;
        window.location.href = isInSubdirectory ? '../index.html' : 'index.html';
      });
    } else {
      // User is not logged in
      loginButton.textContent = 'Log In';
      loginButton.style.backgroundColor = ''; // Reset to default style
      
      loginButton.addEventListener('click', function(e) {
        e.preventDefault();
        // Check if we're in the root directory or a subdirectory
        const path = window.location.pathname;
        const isInSubdirectory = path.split('/').length > 2;
        
        if (isInSubdirectory) {
          window.location.href = '../direct-login.html' + (isTestMode ? '?test_mode=true' : '');
        } else {
          window.location.href = 'direct-login.html' + (isTestMode ? '?test_mode=true' : '');
        }
      });
    }
  } else {
    // Check for header button with "Enroll Now" text (for index.html)
    const headerButtons = document.querySelectorAll('header .cta-button');
    headerButtons.forEach(button => {
      // If this is a header button and user is authenticated, change it to "Log Out"
      if (isAuthenticated) {
        // Only change small buttons or ones with id='loginButton'
        if (!button.classList.contains('large') || button.id === 'loginButton') {
          button.textContent = 'Log Out';
          button.style.backgroundColor = '#ef4444'; // Red color
          button.removeAttribute('onclick');
          
          button.addEventListener('click', function(e) {
            e.preventDefault();
            // Clear auth data
            localStorage.removeItem('sleeptech_auth');
            localStorage.removeItem('sleeptech_email');
            localStorage.removeItem('sleeptech_login_time');
            localStorage.removeItem('appfoundry_auth');
            
            // Redirect to home page
            window.location.href = 'index.html';
          });
        }
      } 
      // If not authenticated and button is the login button
      else if (button.id === 'loginButton') {
        button.textContent = 'Log In';
        button.style.backgroundColor = ''; // Reset to default style
        
        button.removeAttribute('onclick');
        button.addEventListener('click', function(e) {
          e.preventDefault();
          // Check if we're in root or subdirectory
          const path = window.location.pathname;
          const isInSubdirectory = path.split('/').length > 2;
          
          if (isInSubdirectory) {
            window.location.href = '../direct-login.html' + (isTestMode ? '?test_mode=true' : '');
          } else {
            window.location.href = 'direct-login.html' + (isTestMode ? '?test_mode=true' : '');
          }
        });
      }
    });
  }
  
  // Make sure there's NO Course tab in navigation
  removeCourseTab();
  
  // Special handling for thank-you.html page
  if (window.location.pathname.includes('thank-you.html')) {
    console.log('On thank-you page - handling auth separately');
    // Don't automatically set or check auth on thank-you page
    // Auth will be set by the thank-you.html page's own script
    return; // Exit early to prevent conflicts
  }
  
  // If on the thank you page after purchase, we may need to handle login
  const sessionId = urlParams.get('session_id');
  const forceLogin = urlParams.get('login') === 'true';
  const emailParam = urlParams.get('email');
  const passwordParam = urlParams.get('password');
  
  if (sessionId && emailParam && passwordParam && !window.location.pathname.includes('thank-you.html')) {
    // Store password for this email
    localStorage.setItem('sleeptech_password_' + emailParam, passwordParam);
    
    // If force login is true, log the user in
    if (forceLogin) {
      localStorage.setItem('sleeptech_auth', 'true');
      localStorage.setItem('sleeptech_email', emailParam);
      localStorage.setItem('sleeptech_login_time', new Date().getTime());
      
      // Refresh the page to show the updated login button
      window.location.reload();
    }
  }
  
  // Special handling for checkout.js in test mode
  if (isTestMode && window.location.pathname.includes('checkout')) {
    console.log('Test mode on checkout page - auth will be set after completing checkout');
    // Don't set auth yet - this will be handled by checkout.js when they complete the process
  }
});

// Function to remove Course tab if it exists
function removeCourseTab() {
  // Find and remove any existing Course tab
  const courseTabs = document.querySelectorAll('#course-nav-item, li a[href*="course.html"]');
  
  courseTabs.forEach(tab => {
    const parentLi = tab.tagName === 'LI' ? tab : tab.closest('li');
    if (parentLi) {
      parentLi.parentNode.removeChild(parentLi);
      console.log('Course tab removed from navigation');
    }
  });
}
