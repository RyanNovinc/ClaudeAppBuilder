// identity-widget.js - Handles all login-related functionality with simplified approach
document.addEventListener('DOMContentLoaded', function() {
  console.log('Identity widget loaded - Page:', window.location.pathname);
  
  // Check for test mode
  const urlParams = new URLSearchParams(window.location.search);
  const isTestMode = urlParams.get('test_mode') === 'true';
  
  if (isTestMode) {
    console.log('Test mode detected - setting permanent auth flag');
    // When in test mode, set a permanent flag in localStorage
    localStorage.setItem('appfoundry_auth', 'true');
  }
  
  // Check authentication status from localStorage
  const isAuthenticated = localStorage.getItem('sleeptech_auth') === 'true' || 
                          localStorage.getItem('appfoundry_auth') === 'true';
  
  console.log('Auth status check - authenticated:', isAuthenticated);
  
  // Initialize the login/enroll button if present
  initializeHeaderButton();
  
  // Force immediate addition of Course tab for logged-in users
  addCourseTab();
  
  // Also add a fragment navigation listener to ensure Course tab appears after hash changes
  window.addEventListener('hashchange', function() {
    console.log('Hash changed - checking for Course tab');
    setTimeout(addCourseTab, 100); // Small delay to ensure DOM is updated
    setTimeout(initializeHeaderButton, 100); // Also make sure header button is correct
  });
  
  // Function to initialize the header button (Enroll Now / Log In / My Account)
  function initializeHeaderButton() {
    // Look for the button in different forms (both CTA button and login button)
    const loginButton = document.getElementById('loginButton');
    
    if (loginButton) {
      // Remove any existing onclick attribute to avoid conflicts
      loginButton.removeAttribute('onclick');
      
      const authEmail = localStorage.getItem('sleeptech_email') || 'test@example.com';
      
      if (isAuthenticated) {
        // User is logged in - should show "My Account"
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
        // User is not logged in - should show "Log In"
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
    } else {
      // Check for CTA button as an alternative
      const ctaButtons = document.querySelectorAll('.cta-button');
      ctaButtons.forEach(button => {
        if (button.textContent.includes('Enroll') && !isAuthenticated) {
          // If user is not authenticated, make sure it still says "Enroll Now"
          // This is the default state, no change needed
        } else if (button.textContent.includes('Enroll') && isAuthenticated) {
          // If user is authenticated, change "Enroll Now" to "Go to Course"
          button.textContent = 'Go to Course';
          button.removeAttribute('onclick');
          button.addEventListener('click', function(e) {
            e.preventDefault();
            // Determine correct path for course.html
            const path = window.location.pathname;
            const isInSubdirectory = path.split('/').length > 2;
            const testParam = isTestMode ? '?test_mode=true' : '';
            const coursePath = isInSubdirectory ? `../course.html${testParam}` : `course.html${testParam}`;
            window.location.href = coursePath;
          });
        }
      });
    }
  }
  
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
  
  // If on the thank you page after purchase, we may need to handle login
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
      
      // Refresh the page to show the course tab
      window.location.reload();
    }
  }
});
