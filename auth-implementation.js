// auth-implementation.js - Using centralized authentication service
// This file handles auth behavior across the site

document.addEventListener('DOMContentLoaded', function() {
    console.log('Auth implementation loaded - Page:', window.location.pathname);
    
    // Ensure auth-service.js is loaded before proceeding
    if (typeof window.AuthService === 'undefined') {
        console.error('AuthService not found! Make sure auth-service.js is loaded before this script.');
        loadAuthService().then(initializeAuth).catch(error => {
            console.error('Failed to load AuthService:', error);
        });
    } else {
        initializeAuth();
    }
    
    // Load the auth service script if not already loaded
    function loadAuthService() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = '/auth-service.js';
            script.type = 'module';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
    
    // Initialize auth functionality across the site
    async function initializeAuth() {
        try {
            // Check if we're on the login page, and if so, skip access control
            const isLoginPage = window.location.pathname.includes('direct-login.html');
            if (isLoginPage) {
                console.log('On login page, skipping access control');
                return; // Skip access control on login page
            }
            
            // Wait for AuthService to be initialized
            await window.AuthService._ensureInitialized();
            
            // Get URL parameters
            const urlParams = new URLSearchParams(window.location.search);
            const isTestMode = urlParams.get('test_mode') === 'true';
            
            // Check if user is authenticated and has course access
            const { hasAccess, isTestMode: isTestModeUser } = await window.AuthService.checkCourseAccess();
            const currentUser = window.AuthService.getCurrentUser();
            
            console.log('Auth status:', { 
                hasAccess, 
                isTestMode: isTestModeUser || isTestMode,
                currentUser: currentUser?.email 
            });
            
            // 1. REMOVE ANY COURSE TAB FROM NAVIGATION
            removeCourseTab();
            
            // 2. CHECK IF WE'RE ON A MODULE PAGE
            const isModulePage = checkIfModulePage();
            
            // 3. HANDLE LOGIN/LOGOUT BUTTON
            updateAuthButton(hasAccess, currentUser?.email, isTestModeUser || isTestMode);
            
            // 4. HANDLE COURSE CONTENT ACCESS (if on a course page)
            handleCourseAccess(hasAccess, isTestModeUser || isTestMode);
            
            // 5. SPECIAL HANDLING FOR CHECKOUT AND THANK YOU PAGES
            handleSpecialPages(isTestModeUser || isTestMode);
            
            // 6. CHANGE "ENROLL NOW" TO "LOG IN" ON MAIN SCREEN
            changeAllEnrollButtonsToLogin(hasAccess);
            
            // 7. HIDE NAVIGATION IN COURSE MODULES
            if (isModulePage && hasAccess) {
                hideNavigationInModules();
            }
        } catch (error) {
            console.error('Error in auth initialization:', error);
            
            // Check if we're on the login page, and if so, skip fallback
            const isLoginPage = window.location.pathname.includes('direct-login.html');
            if (isLoginPage) {
                console.log('On login page, skipping fallback');
                return;
            }
            
            // Fall back to test mode if available
            const urlParams = new URLSearchParams(window.location.search);
            const isTestMode = urlParams.get('test_mode') === 'true';
            
            if (isTestMode) {
                console.log('Falling back to test mode due to auth error');
                
                removeCourseTab();
                const isModulePage = checkIfModulePage();
                updateAuthButton(true, 'test@user.com', true);
                handleCourseAccess(true, true);
                handleSpecialPages(true);
                
                if (isModulePage) {
                    hideNavigationInModules();
                }
            } else {
                // Default to unauthenticated behavior
                removeCourseTab();
                updateAuthButton(false, null, false);
                handleCourseAccess(false, false);
                handleSpecialPages(false);
                changeAllEnrollButtonsToLogin(false);
            }
        }
    }
});

/**
 * Checks if the current page is a module page
 */
function checkIfModulePage() {
    // Check URL pattern for module
    const isModuleUrl = window.location.pathname.includes('/module') || 
                       window.location.pathname.includes('module') && 
                       !window.location.pathname.includes('index.html');
    
    // Also check for module page elements
    const hasSidebar = document.querySelector('.sidebar') !== null;
    const hasCourseContent = document.getElementById('course-content') !== null;
    
    return isModuleUrl || hasSidebar || hasCourseContent;
}

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
                
                // Sign out using the auth service
                if (window.AuthService) {
                    window.AuthService.signOut().then(() => {
                        // Clear cache to prevent back button issues
                        localStorage.removeItem('sleeptech_auth');
                        localStorage.removeItem('sleeptech_email');
                        localStorage.removeItem('sleeptech_login_time');
                        localStorage.removeItem('appfoundry_auth');
                        
                        // Replace current page in history instead of adding to it
                        window.location.replace(getHomeUrl());
                    }).catch(error => {
                        console.error('Error signing out:', error);
                        // Clear cache and redirect anyway
                        localStorage.removeItem('sleeptech_auth');
                        localStorage.removeItem('sleeptech_email');
                        localStorage.removeItem('sleeptech_login_time');
                        localStorage.removeItem('appfoundry_auth');
                        window.location.replace(getHomeUrl());
                    });
                } else {
                    // Fallback if auth service is not available
                    localStorage.removeItem('sleeptech_auth');
                    localStorage.removeItem('sleeptech_email');
                    localStorage.removeItem('sleeptech_login_time');
                    localStorage.removeItem('appfoundry_auth');
                    
                    // Replace current page in history instead of adding to it
                    window.location.replace(getHomeUrl());
                }
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
                    window.location.href = getLoginUrl(isTestMode);
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
        
        if (isAuthenticated) {
            // User is authenticated, show content
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
}

/**
 * Change "Enroll Now" to "Log In" on the main screen and other places
 */
function changeAllEnrollButtonsToLogin(isAuthenticated) {
    // Skip if user is already logged in
    if (isAuthenticated) {
        return;
    }
    
    // Get all buttons on the page, both "Enroll Now" and large CTA buttons 
    const allButtons = document.querySelectorAll('button, .cta-button');
    
    allButtons.forEach(button => {
        // Check if this is an "Enroll Now" button or a general CTA in the header
        if (button.textContent.trim() === 'Enroll Now' || 
            (button.classList.contains('cta-button') && 
             button.classList.contains('small') && 
             !button.id && 
             button.parentElement && 
             button.parentElement.tagName === 'HEADER')) {
            
            console.log('Found "Enroll Now" button or header CTA button to update:', button);
            
            // Skip if this button was already processed
            if (button.getAttribute('data-login-processed') === 'true') {
                return;
            }
            
            // Change text to "Log In"
            button.textContent = 'Log In';
            
            // Remove any existing onclick attributes
            button.removeAttribute('onclick');
            
            // Add event listener to navigate to login page
            button.addEventListener('click', function(e) {
                e.preventDefault();
                
                // Check if we're in a subdirectory
                const isInSubdirectory = window.location.pathname.split('/').length > 2;
                const testMode = new URLSearchParams(window.location.search).get('test_mode') === 'true';
                const testParam = testMode ? '?test_mode=true' : '';
                
                if (isInSubdirectory) {
                    window.location.href = `../direct-login.html${testParam}`;
                } else {
                    window.location.href = `direct-login.html${testParam}`;
                }
            });
            
            // Mark as processed to avoid duplicate event listeners
            button.setAttribute('data-login-processed', 'true');
        }
    });
}

/**
 * Completely hide the navigation menu in module pages
 * Only leave the logo visible but not clickable
 */
function hideNavigationInModules() {
    // Find the navigation menu
    const navElement = document.querySelector('header nav');
    
    if (navElement) {
        console.log('Found navigation element, hiding it in module view');
        
        // Hide the entire navigation element
        navElement.style.display = 'none';
        
        // Make the logo visible but not clickable
        const logoLink = document.querySelector('header .logo a');
        if (logoLink) {
            // Get the text content of the link
            const logoText = logoLink.textContent;
            
            // Create a span to replace the link
            const logoSpan = document.createElement('span');
            logoSpan.textContent = logoText;
            logoSpan.style.cursor = 'default'; // Normal cursor, not pointer
            
            // Replace the link with the span
            logoLink.parentNode.replaceChild(logoSpan, logoLink);
            
            console.log('Replaced logo link with non-clickable text');
        }
    }
}

/**
 * Gets the URL for the login page
 */
function getLoginUrl(isTestMode) {
    const path = window.location.pathname;
    const isInSubdirectory = path.split('/').length > 2;
    const testParam = isTestMode ? '?test_mode=true' : '';
    
    return isInSubdirectory ? `../direct-login.html${testParam}` : `direct-login.html${testParam}`;
}

/**
 * Gets the URL for the home page
 */
function getHomeUrl() {
    const path = window.location.pathname;
    const isInSubdirectory = path.split('/').length > 2;
    
    return isInSubdirectory ? '../index.html' : 'index.html';
}

/**
 * Gets the test mode parameter if present
 */
function getTestModeParam() {
    const urlParams = new URLSearchParams(window.location.search);
    const isTestMode = urlParams.get('test_mode') === 'true';
    
    return isTestMode ? '?test_mode=true' : '';
}
