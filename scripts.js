document.addEventListener('DOMContentLoaded', function() {
    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 100,
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // Enrollment button action
    const enrollButtons = document.querySelectorAll('.cta-button');
    
    enrollButtons.forEach(button => {
        if (!button.hasAttribute('onclick')) {
            button.addEventListener('click', function() {
                window.location.href = 'checkout.html';
            });
        }
    });
    
    // Header scroll effect
    const header = document.querySelector('header');
    
    window.addEventListener('scroll', function() {
        if (window.scrollY > 100) {
            header.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.1)';
        } else {
            header.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
        }
    });
    
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
    
    // Toggle FAQ items if they exist
    const faqItems = document.querySelectorAll('.faq-item');
    if (faqItems.length > 0) {
        faqItems.forEach(item => {
            const question = item.querySelector('.faq-question');
            question.addEventListener('click', () => {
                item.classList.toggle('active');
            });
        });
    }
});
