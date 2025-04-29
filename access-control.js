// access-control.js - Add this to your site for course content protection

document.addEventListener('DOMContentLoaded', function() {
    // Check if Netlify Identity is available
    if (window.netlifyIdentity) {
        // Initialize user state
        netlifyIdentity.on('init', user => {
            handleUserState(user);
        });
        
        // Handle login events
        netlifyIdentity.on('login', user => {
            handleUserState(user);
        });
        
        // Handle logout events
        netlifyIdentity.on('logout', () => {
            showLoginPrompt();
        });
    } else {
        console.error('Netlify Identity widget not loaded');
        showError('Authentication system not available. Please try again later.');
    }
    
    // Update UI based on login and course access state
    function handleUserState(user) {
        if (!user) {
            // Not logged in
            showLoginPrompt();
            return;
        }
        
        // User is logged in, check for course access
        const userMeta = user.user_metadata || {};
        
        if (userMeta.course_access === true) {
            // User has access, show content
            showContent();
            
            // Log this access for analytics (optional)
            logAccess(user.id);
        } else {
            // User is logged in but doesn't have course access
            showAccessDenied();
        }
    }
    
    // Show login prompt for non-logged-in users
    function showLoginPrompt() {
        const overlay = document.getElementById('access-overlay');
        if (!overlay) return;
        
        overlay.style.display = 'flex';
        overlay.innerHTML = `
            <div class="access-box">
                <h2>Course Access Required</h2>
                <p>Please log in to access this course content.</p>
                <button class="cta-button large" onclick="netlifyIdentity.open('login')">Log In</button>
                <p class="small-text">Don't have an account? <a href="../checkout.html">Purchase the course</a> to gain access.</p>
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
                <p class="small-text">Already purchased? <a href="mailto:support@sleeptech.com">Contact support</a>.</p>
            </div>
        `;
    }
    
    // Show content for authorized users
    function showContent() {
        const overlay = document.getElementById('access-overlay');
        const content = document.getElementById('course-content');
        
        if (overlay) overlay.style.display = 'none';
        if (content) content.style.display = 'flex';
        
        // Update login button to say "My Account"
        const loginButton = document.getElementById('loginButton');
        if (loginButton) {
            loginButton.textContent = 'My Account';
            loginButton.onclick = function() {
                netlifyIdentity.open('user');
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
            </div>
        `;
    }
    
    // Log access for analytics (optional)
    async function logAccess(userId) {
        // This is optional - you can implement a function to log access
        // to track usage, prevent sharing, etc.
        try {
            // Example - you would need to create this function in Netlify
            /*
            await fetch('/.netlify/functions/log-access', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: userId,
                    page: window.location.pathname,
                    timestamp: new Date().toISOString()
                })
            });
            */
        } catch (error) {
            console.error('Error logging access:', error);
            // Non-critical, so we don't show an error to the user
        }
    }
});
