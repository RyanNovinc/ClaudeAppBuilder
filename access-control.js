// access-control.js - Modified to handle course access without adding Course tab
document.addEventListener('DOMContentLoaded', function() {
    console.log('Access control script loaded');
    
    // Check if we're on the login page, and if so, exit early
    const isLoginPage = window.location.pathname.includes('direct-login.html');
    if (isLoginPage) {
        console.log('On login page, skipping access control');
        return; // Skip access control on login page
    }
    
    // Check if we're in test mode
    const urlParams = new URLSearchParams(window.location.search);
    const isTestMode = urlParams.get('test_mode') === 'true';
    
    // If in test mode, automatically grant access
    if (isTestMode) {
        console.log('Test mode detected, granting access');
        showTestModeIndicator();
        showContent();
        return;
    }
    
    // Check if the user is authenticated with our simplified system
    const isAuthenticated = localStorage.getItem('sleeptech_auth') === 'true' || 
                           localStorage.getItem('appfoundry_auth') === 'true';
    const authEmail = localStorage.getItem('sleeptech_email');
    const authTime = localStorage.getItem('sleeptech_login_time');
    
    // Check if authentication is valid (not expired)
    const now = new Date().getTime();
    const oneDay = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    const isAuthValid = authTime && (now - parseInt(authTime) < oneDay);
    
    if (isAuthenticated && isAuthValid) {
        // User is authenticated with our simplified system
        console.log('User is authenticated, showing content');
        showContent();
        return;
    }
    
    // No valid authentication, show login prompt
    console.log('No valid authentication, showing login prompt');
    showLoginPrompt();
    
    // Make sure there's NO Course tab in navigation
    removeCourseTab();
    
    // Show a test mode indicator
    function showTestModeIndicator() {
        // Create test mode indicator
        const testModeIndicator = document.createElement('div');
        testModeIndicator.style.backgroundColor = '#fbbf24';
        testModeIndicator.style.color = '#7c2d12';
        testModeIndicator.style.padding = '10px';
        testModeIndicator.style.textAlign = 'center';
        testModeIndicator.style.fontWeight = 'bold';
        testModeIndicator.style.position = 'fixed';
        testModeIndicator.style.top = '0';
        testModeIndicator.style.left = '0';
        testModeIndicator.style.right = '0';
        testModeIndicator.style.zIndex = '9999';
        testModeIndicator.innerHTML = 'TEST MODE - All content is accessible without payment';
        
        document.body.prepend(testModeIndicator);
        
        // Adjust body padding to account for the indicator
        document.body.style.paddingTop = (testModeIndicator.offsetHeight + 'px');
    }
    
    // Show login prompt for non-logged-in users
    function showLoginPrompt() {
        const overlay = document.getElementById('access-overlay');
        if (!overlay) {
            console.warn('Access overlay element not found');
            return;
        }
        
        overlay.style.display = 'flex';
        overlay.innerHTML = `
            <div class="access-box">
                <h2>Course Access Required</h2>
                <p>Please log in to access this course content.</p>
                <button class="cta-button large" onclick="window.location.href='../direct-login.html'">Log In</button>
                <p class="small-text">Don't have an account? <a href="../checkout.html">Purchase the course</a> to gain access.</p>
                <p class="small-text">Or <a href="?test_mode=true">activate test mode</a> to preview the course.</p>
            </div>
        `;
    }
    
    // Show access denied for users without course access
    function showAccessDenied() {
        const overlay = document.getElementById('access-overlay');
        if (!overlay) return;
        
        overlay.style.display = 'flex';
        overlay.innerHTML = `
            <div class="access-box">
                <h2>Access Denied</h2>
                <p>Your account doesn't have access to this course content.</p>
                <button class="cta-button large" onclick="window.location.href='../checkout.html'">Purchase Course</button>
                <p class="small-text">Already purchased? <a href="mailto:hello@risegg.net">Contact support</a>.</p>
                <p class="small-text">Or <a href="?test_mode=true">activate test mode</a> to preview the course.</p>
            </div>
        `;
    }
    
    // Show content for authorized users
    function showContent() {
        const overlay = document.getElementById('access-overlay');
        const content = document.getElementById('course-content');
        
        if (overlay) overlay.style.display = 'none';
        if (content) {
            content.style.display = 'flex';
            console.log('Course content is now visible');
        } else {
            console.warn('Course content element not found');
        }
        
        // Update login button to say "Log Out" with red styling
        const loginButton = document.getElementById('loginButton');
        if (loginButton) {
            loginButton.textContent = 'Log Out';
            loginButton.style.backgroundColor = '#ef4444'; // Red color
            loginButton.onclick = function() {
                // Log out directly without confirmation
                localStorage.removeItem('sleeptech_auth');
                localStorage.removeItem('sleeptech_email');
                localStorage.removeItem('sleeptech_login_time');
                localStorage.removeItem('appfoundry_auth');
                window.location.href = '../index.html';
            };
        }
    }
    
    // Show error message for system issues
    function showError(message) {
        const overlay = document.getElementById('access-overlay');
        if (!overlay) return;
        
        overlay.style.display = 'flex';
        overlay.innerHTML = `
            <div class="access-box">
                <h2>System Error</h2>
                <p>${message}</p>
                <p>Please try again later or contact support for assistance.</p>
                <button class="cta-button large" onclick="window.location.reload()">Retry</button>
                <p class="small-text">Or <a href="?test_mode=true">activate test mode</a> to preview the course.</p>
            </div>
        `;
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
