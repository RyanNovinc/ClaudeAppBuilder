// login-verification.js - Add this to all pages that need to maintain login state
document.addEventListener('DOMContentLoaded', function() {
    console.log('Login verification loaded');
    
    // Check authentication status
    const isAuthenticated = localStorage.getItem('sleeptech_auth') === 'true' || 
                           localStorage.getItem('appfoundry_auth') === 'true';
    const authEmail = localStorage.getItem('sleeptech_email') || 'test@example.com';
    
    // Handle authentication state
    if (isAuthenticated) {
        console.log('User is authenticated as:', authEmail);
        
        // Ensure login button says "My Account"
        const loginButton = document.getElementById('loginButton');
        if (loginButton) {
            loginButton.textContent = 'My Account';
            loginButton.removeAttribute('onclick');
            
            // Set up logout functionality
            loginButton.addEventListener('click', function(e) {
                e.preventDefault();
                if (confirm('You are logged in as ' + authEmail + '. Would you like to log out?')) {
                    // Clear auth data
                    localStorage.removeItem('sleeptech_auth');
                    localStorage.removeItem('sleeptech_email');
                    localStorage.removeItem('sleeptech_login_time');
                    localStorage.removeItem('appfoundry_auth');
                    
                    // Refresh the page
                    window.location.reload();
                }
            });
        }
        
        // Ensure Course tab exists
        const existingCourseTab = document.querySelector('#course-nav-item');
        if (!existingCourseTab) {
            console.log('Adding Course tab...');
            addCourseTab();
        }
    } else {
        console.log('User is not authenticated');
        
        // Ensure login button says "Log In"
        const loginButton = document.getElementById('loginButton');
        if (loginButton) {
            loginButton.textContent = 'Log In';
            
            // Set up login functionality
            loginButton.removeAttribute('onclick');
            loginButton.addEventListener('click', function(e) {
                e.preventDefault();
                const path = window.location.pathname;
                const isInSubdirectory = path.split('/').length > 2;
                
                // Navigate to login page
                if (isInSubdirectory) {
                    window.location.href = '../direct-login.html';
                } else {
                    window.location.href = 'direct-login.html';
                }
            });
        }
        
        // Ensure Course tab is removed
        const existingCourseTab = document.querySelector('#course-nav-item');
        if (existingCourseTab) {
            console.log('Removing Course tab...');
            existingCourseTab.parentNode.removeChild(existingCourseTab);
        }
    }
    
    // Function to add Course tab
    function addCourseTab() {
        // Check if we're in test mode
        const urlParams = new URLSearchParams(window.location.search);
        const isTestMode = urlParams.get('test_mode') === 'true';
        
        // Create course nav item
        const courseNavItem = document.createElement('li');
        courseNavItem.className = 'highlight-nav-item';
        courseNavItem.id = 'course-nav-item';
        
        const courseNavLink = document.createElement('a');
        
        // Determine correct course.html path
        const path = window.location.pathname;
        const isInSubdirectory = path.split('/').length > 2;
        
        // Include test_mode parameter if needed
        const testParam = isTestMode ? '?test_mode=true' : '';
        courseNavLink.href = isInSubdirectory ? `../course.html${testParam}` : `course.html${testParam}`;
        courseNavLink.textContent = 'Course';
        courseNavLink.id = 'course-nav-link';
        
        // Add styling
        courseNavLink.style.backgroundColor = '#fbbf24';
        courseNavLink.style.color = '#7c2d12';
        courseNavLink.style.fontWeight = 'bold';
        courseNavLink.style.borderRadius = '4px';
        courseNavLink.style.padding = '6px 12px';
        
        courseNavItem.appendChild(courseNavLink);
        
        // Get navigation list
        const navList = document.querySelector('header nav ul');
        if (!navList) {
            console.warn('Navigation list not found, cannot add Course tab');
            return;
        }
        
        // Insert before Success Stories if possible
        const successStoriesItem = document.querySelector('header nav ul li a[href*="success-stories"]')?.parentNode;
        if (successStoriesItem) {
            navList.insertBefore(courseNavItem, successStoriesItem);
        } else {
            navList.appendChild(courseNavItem);
        }
        
        console.log('Course tab added successfully');
    }
});
