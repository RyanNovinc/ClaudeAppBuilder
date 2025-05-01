// login-verification.js - Modified to handle login/logout without Course tab
document.addEventListener('DOMContentLoaded', function() {
    console.log('Login verification loaded');
    
    // Check authentication status
    const isAuthenticated = localStorage.getItem('sleeptech_auth') === 'true' || 
                           localStorage.getItem('appfoundry_auth') === 'true';
    const authEmail = localStorage.getItem('sleeptech_email');
    
    // Handle authentication state
    if (isAuthenticated) {
        console.log('User is authenticated as:', authEmail);
        
        // Update login button to say "Log Out" with red color
        const loginButton = document.getElementById('loginButton');
        if (loginButton) {
            loginButton.textContent = 'Log Out';
            loginButton.style.backgroundColor = '#ef4444'; // Red color
            loginButton.removeAttribute('onclick');
            
            // Set up logout functionality - direct to home page
            loginButton.addEventListener('click', function(e) {
                e.preventDefault();
                // Clear auth data
                localStorage.removeItem('sleeptech_auth');
                localStorage.removeItem('sleeptech_email');
                localStorage.removeItem('sleeptech_login_time');
                localStorage.removeItem('appfoundry_auth');
                
                // Redirect to home page
                const isInSubdirectory = window.location.pathname.split('/').length > 2;
                window.location.href = isInSubdirectory ? '../index.html' : 'index.html';
            });
        }
    } else {
        console.log('User is not authenticated');
        
        // Update login button to say "Log In"
        const loginButton = document.getElementById('loginButton');
        if (loginButton) {
            loginButton.textContent = 'Log In';
            // Reset to default button style
            loginButton.style.backgroundColor = '';
            
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
    }
    
    // Make sure there's NO Course tab in navigation
    removeCourseTab();
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
