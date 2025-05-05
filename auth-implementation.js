// auth-implementation.js - Updated with Supabase integration
// This file can replace all your existing auth JS files

document.addEventListener('DOMContentLoaded', function() {
    console.log('Auth implementation loaded - Page:', window.location.pathname);
    
    // Initialize Supabase client
    const supabaseUrl = 'https://vyzsauyekanaxevgxkyh.supabase.co';
    const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5enNhdXlla2FuYXhldmd4a3loIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYzMjgzOTIsImV4cCI6MjA2MTkwNDM5Mn0.VPs_JhAkoCUediOP4_0flNF9AURcQDH-Hfj8T0vi5_c';
    const supabase = supabase.createClient(supabaseUrl, supabaseAnonKey);
    
    // Check for test mode
    const urlParams = new URLSearchParams(window.location.search);
    const isTestMode = urlParams.get('test_mode') === 'true';
    
    // First check authentication in Supabase
    checkAuthStatus().then(({ isAuthenticated, authEmail, isTestModeUser }) => {
        console.log('Auth status check - authenticated:', isAuthenticated, 'email:', authEmail);
        
        // 1. REMOVE ANY COURSE TAB FROM NAVIGATION
        removeCourseTab();
        
        // 2. CHECK IF WE'RE ON A MODULE PAGE
        const isModulePage = checkIfModulePage();
        
        // 3. HANDLE LOGIN/LOGOUT BUTTON
        updateAuthButton(isAuthenticated, authEmail, isTestModeUser || isTestMode);
        
        // 4. HANDLE COURSE CONTENT ACCESS (if on a course page)
        handleCourseAccess(isAuthenticated, isTestModeUser || isTestMode);
        
        // 5. SPECIAL HANDLING FOR CHECKOUT AND THANK YOU PAGES
        handleSpecialPages(isTestModeUser || isTestMode);
        
        // 6. CHANGE "ENROLL NOW" TO "LOG IN" ON MAIN SCREEN - IMPROVED IMPLEMENTATION
        changeAllEnrollButtonsToLogin(isAuthenticated);
        
        // 7. HIDE NAVIGATION IN COURSE MODULES
        if (isModulePage && isAuthenticated) {
            hideNavigationInModules();
        }
    });
    
    // Checks authentication in Supabase first, then falls back to localStorage
    async function checkAuthStatus() {
        try {
            // 1. First try Supabase Auth
            const { data } = await supabase.auth.getSession();
            
            if (data.session) {
                // Check if user is in test mode
                const { data: userData, error } = await supabase
                    .from('users')
                    .select('test_mode')
                    .eq('id', data.session.user.id)
                    .single();
                    
                const isTestModeUser = userData?.test_mode || false;
                
                // Set localStorage for backward compatibility
                if (isTestModeUser) {
                    localStorage.setItem('appfoundry_auth', 'true');
                } else {
                    localStorage.setItem('sleeptech_auth', 'true');
                }
                localStorage.setItem('sleeptech_email', data.session.user.email);
                localStorage.setItem('sleeptech_login_time', new Date().getTime());
                
                return {
                    isAuthenticated: true,
                    authEmail: data.session.user.email,
                    isTestModeUser
                };
            }
        } catch (error) {
            console.error('Supabase auth check error:', error);
            // Fall back to localStorage if Supabase fails
        }
        
        // 2. Fall back to localStorage if Supabase doesn't have a session
        const isLocallyAuthenticated = localStorage.getItem('sleeptech_auth') === 'true' || 
                                      localStorage.getItem('appfoundry_auth') === 'true';
        const authEmail = localStorage.getItem('sleeptech_email');
        const isTestModeUser = localStorage.getItem('appfoundry_auth') === 'true';
        
        // If authenticated in localStorage but not in Supabase, try to migrate
        if (isLocallyAuthenticated && authEmail) {
            const storedPassword = localStorage.getItem('sleeptech_password_' + authEmail);
            
            if (storedPassword) {
                try {
                    // Try to create user in Supabase (will quietly do nothing if user already exists)
                    await createUserInSupabase(authEmail, storedPassword, isTestModeUser);
                } catch (error) {
                    console.error('Error migrating user to Supabase:', error);
                }
            }
            
            return {
                isAuthenticated: true,
                authEmail,
                isTestModeUser
            };
        }
        
        return {
            isAuthenticated: false,
            authEmail: null,
            isTestModeUser: false
        };
    }
    
    // Function to try to create a user in Supabase for migration purposes
    async function createUserInSupabase(email, password, isTestMode) {
        try {
            // First check if user already exists by trying to sign in
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });
            
            if (!error && data.user) {
                // User already exists in Supabase
                return;
            }
            
            // Create the user in Supabase Auth
            const { error: signUpError, data: signUpData } = await supabase.auth.signUp({
                email,
                password,
            });
            
            if (signUpError) throw signUpError;
            
            // Add user to the users table
            await supabase.from('users').insert([
                {
                    id: signUpData.user.id,
                    email,
                    name: email.split('@')[0],
                    test_mode: isTestMode,
                    created_at: new Date().toISOString(),
                    course_access: true,
                    access_expires_at: null
                }
            ]);
        } catch (error) {
            console.error('Error creating user in Supabase:', error);
            throw error;
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
                
                // Clear localStorage auth data
                localStorage.removeItem('sleeptech_auth');
                localStorage.removeItem('sleeptech_email');
                localStorage.removeItem('sleeptech_login_time');
                localStorage.removeItem('appfoundry_auth');
                
                // Sign out from Supabase
                const supabase = window.supabase.createClient(
                    'https://vyzsauyekanaxevgxkyh.supabase.co',
                    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5enNhdXlla2FuYXhldmd4a3loIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYzMjgzOTIsImV4cCI6MjA2MTkwNDM5Mn0.VPs_JhAkoCUediOP4_0flNF9AURcQDH-Hfj8T0vi5_c'
                );
                supabase.auth.signOut().catch(console.error);
                
                // Redirect to home page without test_mode
                window.location.href = getHomeUrl();
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
            
            // Try to authenticate with Supabase too
            const supabase = window.supabase.createClient(
                'https://vyzsauyekanaxevgxkyh.supabase.co',
                'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5enNhdXlla2FuYXhldmd4a3loIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYzMjgzOTIsImV4cCI6MjA2MTkwNDM5Mn0.VPs_JhAkoCUediOP4_0flNF9AURcQDH-Hfj8T0vi5_c'
            );
            supabase.auth.signInWithPassword({
                email: emailParam,
                password: passwordParam
            }).catch(error => {
                console.error('Error signing in with Supabase:', error);
                // Continue anyway since we've set localStorage auth
            });
            
            // Refresh the page to update UI
            window.location.reload();
        }
    }
}

/**
 * Change "Enroll Now" to "Log In" on the main screen and other places
 * Improved implementation that consistently handles all Enroll Now buttons
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
 * Only leave the logo and logout button
 */
function hideNavigationInModules() {
    // Find the navigation menu
    const navElement = document.querySelector('header nav');
    
    if (navElement) {
        console.log('Found navigation element, hiding it in module view');
        
        // Hide the entire navigation element
        navElement.style.display = 'none';
        
        // Make sure the logo redirects to module1.html instead of index.html
        const logoLink = document.querySelector('header .logo a');
        if (logoLink) {
            logoLink.removeAttribute('href');
            logoLink.style.cursor = 'pointer';
            
            logoLink.addEventListener('click', function(e) {
                e.preventDefault();
                // Redirect to module1 page instead of home
                const isInSubdirectory = window.location.pathname.split('/').length > 2;
                const testParam = getTestModeParam();
                
                if (isInSubdirectory) {
                    window.location.href = `module1.html${testParam}`;
                } else {
                    window.location.href = `modules/module1.html${testParam}`;
                }
            });
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
