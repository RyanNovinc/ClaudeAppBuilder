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
  
  // Add Course navigation item for logged-in users
  // Check if user is logged in
  const isAuthenticated = localStorage.getItem('sleeptech_auth') === 'true';
  
  if (isAuthenticated) {
    // Create course nav item
    const courseNavItem = document.createElement('li');
    const courseNavLink = document.createElement('a');
    
    // Determine correct course.html path based on current page location
    const path = window.location.pathname;
    const isInSubdirectory = path.split('/').length > 2;
    courseNavLink.href = isInSubdirectory ? '../course.html' : 'course.html';
    courseNavLink.textContent = 'Course';
    courseNavItem.appendChild(courseNavLink);
    
    // Get the navigation list and insert before the Success Stories item
    const navList = document.querySelector('header nav ul');
    const successStoriesItem = document.querySelector('header nav ul li a[href*="success-stories"]')?.parentNode;
    
    if (navList && successStoriesItem) {
      navList.insertBefore(courseNavItem, successStoriesItem);
    } else if (navList) {
      // If success stories item not found, add to the end
      navList.appendChild(courseNavItem);
    }
    
    // If we're on the course page or any module page, add active class
    if (window.location.pathname.includes('course') || window.location.pathname.includes('module')) {
      // Remove active class from other nav items
      const allNavLinks = document.querySelectorAll('header nav ul li a');
      allNavLinks.forEach(link => link.classList.remove('active'));
      
      // Add active class to course link
      courseNavLink.classList.add('active');
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
