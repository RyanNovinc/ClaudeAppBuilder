// scripts.js - Modified to handle login/logout without Course tab
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
        if (!button.hasAttribute('onclick') && !button.id && button.classList.contains('large')) {
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
    
    // Handle login/logout button in header
    const loginButton = document.getElementById('loginButton');
    if (loginButton) {
        // Remove any existing onclick attribute to prevent conflicts
        loginButton.removeAttribute('onclick');
        
        // Check if the user is authenticated with our simplified system
        const isAuthenticated = localStorage.getItem('sleeptech_auth') === 'true' || 
                               localStorage.getItem('appfoundry_auth') === 'true';
        const authEmail = localStorage.getItem('sleeptech_email');
        
        if (isAuthenticated) {
            // User is logged in - show Log Out button
            loginButton.textContent = 'Log Out';
            loginButton.style.backgroundColor = '#ef4444'; // Red color
            
            loginButton.addEventListener('click', function(e) {
                e.preventDefault();
                // Clear auth data
                localStorage.removeItem('sleeptech_auth');
                localStorage.removeItem('sleeptech_email');
                localStorage.removeItem('sleeptech_login_time');
                localStorage.removeItem('appfoundry_auth');
                
                // Redirect to home page
                const path = window.location.pathname;
                const isInSubdirectory = path.split('/').length > 2;
                window.location.href = isInSubdirectory ? '../index.html' : 'index.html';
            });
        } else {
            // User is not logged in - show Login button
            loginButton.textContent = 'Log In';
            // Reset to default button style
            loginButton.style.backgroundColor = '';
            
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
    }
    
    // Make sure there's NO Course tab in navigation
    removeCourseTab();
    
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
