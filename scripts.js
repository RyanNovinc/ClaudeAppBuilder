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
        // Remove any existing onclick attribute to prevent conflicts
        loginButton.removeAttribute('onclick');
        
        // Check if the user is authenticated with our simplified system
        const isAuthenticated = localStorage.getItem('sleeptech_auth') === 'true' || 
                               localStorage.getItem('appfoundry_auth') === 'true';
        const authEmail = localStorage.getItem('sleeptech_email');
        
        if (isAuthenticated) {
            // User is logged in
            loginButton.textContent = 'My Account';
            loginButton.addEventListener('click', function(e) {
                e.preventDefault();
                if (confirm('You are logged in as ' + authEmail + '. Would you like to log out?')) {
                    // Clear auth data
                    localStorage.removeItem('sleeptech_auth');
                    localStorage.removeItem('sleeptech_email');
                    localStorage.removeItem('sleeptech_login_time');
                    localStorage.removeItem('appfoundry_auth');
                    
                    // Refresh the page
                    window.location.reload();
                }
            });
            
            // Make sure Course tab exists if authenticated
            setTimeout(function() {
                const existingCourseTab = document.querySelector('#course-nav-item');
                if (!existingCourseTab) {
                    addCourseTab();
                }
            }, 200);
        } else {
            // User is not logged in
            loginButton.textContent = 'Log In';
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
            
            // Make sure Course tab is removed if not authenticated
            setTimeout(function() {
                const existingCourseTab = document.querySelector('#course-nav-item');
                if (existingCourseTab) {
                    existingCourseTab.parentNode.removeChild(existingCourseTab);
                }
            }, 200);
        }
    }
    
    // Function to add Course tab
    function addCourseTab() {
        const urlParams = new URLSearchParams(window.location.search);
        const isTestMode = urlParams.get('test_mode') === 'true';
        
        // Create course nav item
        const courseNavItem = document.createElement('li');
        courseNavItem.className = 'highlight-nav-item';
        courseNavItem.id = 'course-nav-item';
        
        const courseNavLink = document.createElement('a');
        
        // Determine correct course.html path based on current page location
        const path = window.location.pathname;
        const isInSubdirectory = path.split('/').length > 2;
        
        // Include test_mode parameter if this was originally in test mode
        const testParam = isTestMode ? '?test_mode=true' : '';
        courseNavLink.href = isInSubdirectory ? `../course.html${testParam}` : `course.html${testParam}`;
        courseNavLink.textContent = 'Course';
        courseNavLink.id = 'course-nav-link';
        
        // Add highlight styling to make it stand out
        courseNavLink.style.backgroundColor = '#fbbf24';
        courseNavLink.style.color = '#7c2d12';
        courseNavLink.style.fontWeight = 'bold';
        courseNavLink.style.borderRadius = '4px';
        courseNavLink.style.padding = '6px 12px';
        
        courseNavItem.appendChild(courseNavLink);
        
        // Get the navigation list
        const navList = document.querySelector('header nav ul');
        if (!navList) {
            console.warn('Navigation list not found, cannot add Course tab');
            return;
        }
        
        // Try to insert before Success Stories
        const successStoriesItem = document.querySelector('header nav ul li a[href*="success-stories"]')?.parentNode;
        if (successStoriesItem) {
            navList.insertBefore(courseNavItem, successStoriesItem);
        } else {
            // If success stories item not found, add to the end
            navList.appendChild(courseNavItem);
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
    
    // Important: Add the hashchange listener for the main page
    window.addEventListener('hashchange', function() {
        console.log('Hash changed on main page - checking authentication');
        
        // Check authentication status
        const isAuthenticated = localStorage.getItem('sleeptech_auth') === 'true' || 
                               localStorage.getItem('appfoundry_auth') === 'true';
                               
        if (isAuthenticated) {
            // User is authenticated, ensure Course tab exists
            setTimeout(function() {
                const existingCourseTab = document.querySelector('#course-nav-item');
                if (!existingCourseTab) {
                    addCourseTab();
                }
            }, 200);
        } else {
            // User is not authenticated, ensure Course tab is removed
            setTimeout(function() {
                const existingCourseTab = document.querySelector('#course-nav-item');
                if (existingCourseTab) {
                    existingCourseTab.parentNode.removeChild(existingCourseTab);
                }
            }, 200);
        }
    });
});
