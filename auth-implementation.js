// auth-implementation.js - Unified authentication with red logout and no Course tab
// This file can replace all your existing auth JS files

document.addEventListener('DOMContentLoaded', function() {
    console.log('Auth implementation loaded - Page:', window.location.pathname);
    
    // Check for test mode
    const urlParams = new URLSearchParams(window.location.search);
    const isTestMode = urlParams.get('test_mode') === 'true';
    
    // Check authentication status
    const isAuthenticated = localStorage.getItem('sleeptech_auth') === 'true' || 
                          localStorage.getItem('appfoundry_auth') === 'true';
    const authEmail = localStorage.getItem('sleeptech_email') || 'user@example.com';
    
    console.log('Auth status check - authenticated:', isAuthenticated);
    
    // 1. REMOVE ANY COURSE TAB FROM NAVIGATION
    removeCourseTab();
    
    // 2. HANDLE LOGIN/LOGOUT BUTTON
    updateAuthButton(isAuthenticated, authEmail, isTestMode);
    
    // 3. HANDLE COURSE CONTENT ACCESS (if on a course page)
    handleCourseAccess(isAuthenticated, isTestMode);
    
    // 4. SPECIAL HANDLING FOR CHECKOUT AND THANK YOU PAGES
    handleSpecialPages(isTestMode);
});

/**
 * Removes any existing Course tab from the navigation
 */
function removeCourseTab() {
    // Find and remove any existing Course tab elements
    const courseTabs = document.querySelectorAll('#course-nav-item, li a[href*="course.html"]');
    
    courseTabs.forEach(tab => {
        const parentLi = tab.tagName === 'LI' ? tab : tab.closest('li');
        if (parentLi) {
            parentLi.parentNode.removeChild(parentLi);
            console.log('Course tab removed from navigation');
        }
    });
}

/**
 * Updates the login/logout button
 */
function updateAuthButton(isAuthenticated, authEmail, isTestMode) {
    // Find login buttons in header
    const loginButtons = document.querySelectorAll('#loginButton, header .cta-button:not([onclick*="checkout"])');
    
    loginButtons.forEach(button => {
        // Remove existing onclick attributes and event listeners by cloning
        const newButton = button.cloneNode(true);
        if (button.parentNode) {
            button.parentNode.replaceChild(newButton, button);
        }
        
        if (isAuthenticated) {
            // USER IS LOGGED IN - Show red Log Out button
            newButton.textContent = 'Log Out';
            newButton.style.backgroundColor = '#ef4444'; // Red color
            
            newButton.addEventListener('click', function(e) {
                e.preventDefault();
                
                // Clear all auth data
                localStorage.removeItem('sleeptech_auth');
                localStorage.removeItem('sleeptech_email');
                localStorage.removeItem('sleeptech_login_time');
                localStorage.removeItem('appfoundry_auth');
                
                // Redirect to home page without test_mode
                const path = window.location.pathname;
                const isInSubdirectory = path.split('/').length > 2;
                window.location.href = isInSubdirectory ? '../index.html' : 'index.html';
            });
        } else {
            // USER IS NOT LOGGED IN - Show Login button
            // Skip main call-to-action buttons that should go to checkout
            if (!button.classList.contains('large') || button.id === 'loginButton') {
                newButton.textContent = 'Log In';
                // Reset to default button style
                newButton.style.backgroundColor = '';
                
                newButton.addEventListener('click', function(e) {
                    e.preventDefault();
                    
                    // Determine correct login path
                    const path = window.location.pathname;
                    const isInSubdirectory = path.split('/').length > 2;
                    const testParam = isTestMode ? '?test_mode=true' : '';
                    
                    if (isInSubdirectory) {
                        window.location.href = `../direct-login.html${testParam}`;
                    } else {
                        window.location.href = `direct-login.html${testParam}`;
                    }
                });
            }
        }
    });
}

/**
 * Handles access to course content pages
 */
function handleCourseAccess(isAuthenticated, isTestMode) {
    // Check if we're on a course page that needs access control
    const accessOverlay = document.getElementById('access-overlay');
    const courseContent = document.getElementById('course-content');
    
    if (accessOverlay && courseContent) {
        console.log('Course page detected, handling access control');
        
        // If test mode, automatically show content
        if (isTestMode) {
            showTestModeIndicator();
            showCourseContent();
            return;
        }
        
        // Check if authentication is valid (not expired)
        const authTime = localStorage.getItem('sleeptech_login_time');
        const now = new Date().getTime();
        const oneDay = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
        const isAuthValid = authTime && (now - parseInt(authTime) < oneDay);
        
        if (isAuthenticated && isAuthValid) {
            // User is authenticated with a valid session
            showCourseContent();
        } else {
            // No valid authentication, show login prompt
            showLoginPrompt();
        }
    }
    
    // Show test mode indicator at the top of the page
    function showTestModeIndicator() {
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
        document.body.style.paddingTop = (testModeIndicator.offsetHeight + 'px');
    }
    
    // Show login prompt for non-logged-in users
    function showLoginPrompt() {
        accessOverlay.style.display = 'flex';
        accessOverlay.innerHTML = `
            <div class="access-box">
                <h2>Course Access Required</h2>
                <p>Please log in to access this course content.</p>
                <button class="cta-button large" onclick="window.location.href='../direct-login.html'">Log In</button>
                <p class="small-text">Don't have an account? <a href="../checkout.html">Purchase the course</a> to gain access.</p>
                <p class="small-text">Or <a href="?test_mode=true">activate test mode</a> to preview the course.</p>
            </div>
        `;
    }
    
    // Show course content for authorized users
    function showCourseContent() {
        accessOverlay.style.display = 'none';
        courseContent.style.display = 'flex';
    }
}

/**
 * Handles special pages like checkout and thank you
 */
function handleSpecialPages(isTestMode) {
    const path = window.location.pathname;
    
    // Special handling for checkout page
    if (path.includes('checkout.html') && isTestMode) {
        console.log('Test mode on checkout page - auth will be set after completing checkout');
        // Don't set auth yet - this will be handled by checkout.js
    }
    
    // Special handling for thank-you.html page
    if (path.includes('thank-you.html')) {
        console.log('On thank-you page - handling auth separately');
        // Don't automatically set or check auth on thank-you page
        // Auth will be set by the thank-you.html page's own script
        return;
    }
    
    // Handle URL parameters for login from thank you page
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    const forceLogin = urlParams.get('login') === 'true';
    const emailParam = urlParams.get('email');
    const passwordParam = urlParams.get('password');
    
    if (sessionId && emailParam && passwordParam && !path.includes('thank-you.html')) {
        // Store password for this email
        localStorage.setItem('sleeptech_password_' + emailParam, passwordParam);
        
        // If force login is true, log the user in
        if (forceLogin) {
            localStorage.setItem('sleeptech_auth', 'true');
            localStorage.setItem('sleeptech_email', emailParam);
            localStorage.setItem('sleeptech_login_time', new Date().getTime());
            
            // Refresh the page to update UI
            window.location.reload();
        }
    }
}
