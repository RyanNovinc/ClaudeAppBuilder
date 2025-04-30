// Add to scripts.js or include in your site footer
document.addEventListener('DOMContentLoaded', function() {
    // Handle login/my account button in header
    const loginButton = document.getElementById('loginButton');
    if (loginButton) {
        // Check if the user is authenticated with our simplified system
        const isAuthenticated = localStorage.getItem('sleeptech_auth') === 'true';
        const authEmail = localStorage.getItem('sleeptech_email');
        
        if (isAuthenticated) {
            // User is logged in
            loginButton.textContent = 'My Account';
            loginButton.onclick = function() {
                if (confirm('You are logged in as ' + authEmail + '. Would you like to log out?')) {
                    // Clear auth data
                    localStorage.removeItem('sleeptech_auth');
                    localStorage.removeItem('sleeptech_email');
                    localStorage.removeItem('sleeptech_login_time');
                    
                    // Refresh the page
                    window.location.reload();
                }
            };
        } else {
            // User is not logged in
            loginButton.textContent = 'Log In';
            loginButton.onclick = function() {
                // Check if we're in the root directory or a subdirectory
                const path = window.location.pathname;
                const isInSubdirectory = path.split('/').length > 2;
                
                if (isInSubdirectory) {
                    window.location.href = '../direct-login.html';
                } else {
                    window.location.href = 'direct-login.html';
                }
            };
        }
    }
});
