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
    
    // Handle header login/logout button
    const loginButtons = document.querySelectorAll('header .cta-button');
    
    // Check if the user is authenticated
    const isAuthenticated = localStorage.getItem('sleeptech_auth') === 'true' || 
                           localStorage.getItem('appfoundry_auth') === 'true';
    const authEmail = localStorage.getItem('sleeptech_email');
    
    loginButtons.forEach(button => {
        // Skip buttons that already have event listeners
        if (button.getAttribute('data-initialized') === 'true') {
            return;
        }
        
        // Remove any existing onclick attributes to prevent conflicts
        button.removeAttribute('onclick');
        
        // Mark as initialized
        button.setAttribute('data-initialized', 'true');
        
        if (isAuthenticated) {
            // User is logged in - show Log Out button
            button.textContent = 'Log Out';
            button.style.backgroundColor = '#ef4444'; // Red color
            
            button.addEventListener('click', function(e) {
                e.preventDefault();
                // Clear auth data
                localStorage.removeItem('sleeptech_auth');
                localStorage.removeItem('sleeptech_email');
                localStorage.removeItem('sleeptech_login_time');
                localStorage.removeItem('appfoundry_auth');
                
                // Redirect to home page
                window.location.href = 'index.html';
            });
        } else {
            // User is not logged in
            // If this is a small button (like in the header), change it to "Log In"
            if (!button.classList.contains('large') || button.id === 'loginButton') {
                button.textContent = 'Log In';
                // Reset to default button style
                button.style.backgroundColor = '';
                
                button.addEventListener('click', function(e) {
                    e.preventDefault();
                    window.location.href = 'direct-login.html';
                });
            }
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
