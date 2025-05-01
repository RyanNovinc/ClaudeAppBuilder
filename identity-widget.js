// identity-widget.js - Handles all login-related functionality with simplified approach
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
      // User is logged in
      loginButton.textContent = 'My Account';
      loginButton.addEventListener('click', function(e) {
        e.preventDefault();
        if (confirm('You are logged in as ' + authEmail + '. Would you like to log out?')) {
          // Clear auth data
          localStorage.removeItem('sleeptech_auth');
          localStorage.removeItem('sleeptech_email');
          localStorage.removeItem('sleeptech_login_time');
          localStorage.removeItem('appfoundry_auth');
          
          // Refresh the page without test_mode parameter if present
          if (isTestMode) {
            window.location.href = window.location.pathname;
          } else {
            window.location.reload();
          }
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
      // If this is a header button and user is authenticated, change it to "My Account"
      if (isAuthenticated) {
        button.textContent = 'My Account';
        button.removeAttribute('onclick');
        
        const authEmail = localStorage.getItem('sleeptech_email') || 'test@example.com';
        
        button.addEventListener('click', function(e) {
          e.preventDefault();
          if (confirm('You are logged in as ' + authEmail + '. Would you like to log out?')) {
            // Clear auth data
            localStorage.removeItem('sleeptech_auth');
            localStorage.removeItem('sleeptech_email');
            localStorage.removeItem('sleeptech_login_time');
            localStorage.removeItem('appfoundry_auth');
            
            // Refresh the page without test_mode parameter if present
            if (isTestMode) {
              window.location.href = window.location.pathname;
            } else {
              window.location.reload();
            }
          }
        });
      } 
      // If not authenticated but button doesn't have proper login behavior, change it
      else if (!button.id && (button.textContent.includes('Enroll') || button.textContent.includes('Sign'))) {
        // If in test mode but not on index page or checkout page, change text to "Log In"
        // This preserves "Enroll Now" on the main page and "Test drive the course" on that page
        const isIndexPage = window.location.pathname.endsWith('index.html') || 
                           window.location.pathname === '/' || 
                           window.location.pathname.endsWith('/');
        const isCheckoutPage = window.location.pathname.includes('checkout');
        
        if (isTestMode && !isIndexPage && !isCheckoutPage) {
          button.textContent = 'Log In';
        }
        
        // We don't change the onclick for the test drive button on index page
        // or the enrollment buttons, as they should follow their normal flow
      }
    });
  }
  
  // Force immediate addition of Course tab for logged-in users
  addCourseTab();
  
  // Also add a fragment navigation listener to ensure Course tab appears after hash changes
  window.addEventListener('hashchange', function() {
    console.log('Hash changed - checking for Course tab');
    setTimeout(addCourseTab, 100); // Small delay to ensure DOM is updated
  });
  
  // Function to add Course tab
  function addCourseTab() {
    if (!isAuthenticated) {
      console.log('User is not authenticated, Course tab not added');
      return;
    }
    
    console.log('Adding/checking Course tab...');
    
    // First check if we've already added the Course tab (prevent duplicates)
    const existingCourseTab = document.querySelector('header nav ul li a[href*="course.html"]');
    if (existingCourseTab) {
      console.log('Course tab already exists in navigation');
      return;
    }
    
    // Create course nav item
    const courseNavItem = document.createElement('li');
    courseNavItem.className = 'highlight-nav-item'; // Add a class for styling
    courseNavItem.id = 'course-nav-item'; // Add ID for easier reference
    
    const courseNavLink = document.createElement('a');
    
    // Determine correct course.html path based on current page location
    const path = window.location.pathname;
    const isInSubdirectory = path.split('/').length > 2;
    
    // Include test_mode parameter if this was originally in test mode
    const testParam = isTestMode ? '?test_mode=true' : '';
    courseNavLink.href = isInSubdirectory ? `../course.html${testParam}` : `course.html${testParam}`;
    courseNavLink.textContent = 'Course';
    courseNavLink.id = 'course-nav-link'; // Add ID for easier reference
    
    // Add highlight styling to make it stand out
    courseNavLink.style.backgroundColor = '#fbbf24'; // Yellow background
    courseNavLink.style.color = '#7c2d12'; // Dark brown text
    courseNavLink.style.fontWeight = 'bold';
    courseNavLink.style.borderRadius = '4px';
    courseNavLink.style.padding = '6px 12px';
    
    courseNavItem.appendChild(courseNavLink);
    
    // Get the navigation list
    const navList = document.querySelector('header nav ul');
    if (!navList) {
      console.warn('Navigation list not found, cannot add Course tab');
      return;
    }
    
    // Try to insert before Success Stories
    const successStoriesItem = document.querySelector('header nav ul li a[href*="success-stories"]')?.parentNode;
    if (successStoriesItem) {
      console.log('Inserting Course tab before Success Stories');
      navList.insertBefore(courseNavItem, successStoriesItem);
    } else {
      // If success stories item not found, add to the end
      console.log('Success Stories item not found, adding Course tab to the end');
      navList.appendChild(courseNavItem);
    }
    
    // If we're on the course page or any module page, add active class
    if (window.location.pathname.includes('course') || window.location.pathname.includes('module')) {
      // Remove active class from other nav items
      const allNavLinks = document.querySelectorAll('header nav ul li a');
      allNavLinks.forEach(link => link.classList.remove('active'));
      
      // Change style when active
      courseNavLink.style.backgroundColor = '#d97706'; // Darker yellow/orange
    }
    
    console.log('Course tab added to navigation with permanent auth');
  }
  
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
      
      // Refresh the page to show the course tab
      window.location.reload();
    }
  }
  
  // Special handling for checkout.js in test mode
  if (isTestMode && window.location.pathname.includes('checkout')) {
    console.log('Test mode on checkout page - auth will be set after completing checkout');
    // Don't set auth yet - this will be handled by checkout.js when they complete the process
  }
});
