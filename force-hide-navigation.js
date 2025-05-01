// force-hide-navigation.js - Forces immediate hiding of navigation in module pages
// Add this file directly to your module pages

// Execute immediately without waiting for DOMContentLoaded
(function() {
    console.log('Force hiding navigation immediately');

    // Function to aggressively hide navigation
    function forceHideNavigation() {
        // Target the navigation items directly
        const navItems = document.querySelectorAll('header nav ul li');
        if (navItems.length > 0) {
            console.log('Found nav items, hiding them:', navItems.length);
            navItems.forEach(item => {
                item.style.display = 'none';
            });
        }

        // Try to hide the entire nav container
        const navElement = document.querySelector('header nav');
        if (navElement) {
            console.log('Found nav element, hiding it');
            navElement.style.display = 'none';
        }
        
        // Try also with !important to override any other styles
        const styleElement = document.createElement('style');
        styleElement.textContent = `
            header nav { display: none !important; }
            header nav ul { display: none !important; }
            header nav ul li { display: none !important; }
        `;
        document.head.appendChild(styleElement);
        
        // Make sure the login button is still visible
        const loginButton = document.getElementById('loginButton');
        if (loginButton) {
            loginButton.style.display = 'block';
        }
    }

    // Run immediately
    forceHideNavigation();
    
    // Also run when DOM is fully loaded
    document.addEventListener('DOMContentLoaded', forceHideNavigation);
    
    // And also when the window is loaded
    window.addEventListener('load', forceHideNavigation);
    
    // Set up a mutation observer to keep checking for nav elements
    // This will catch any dynamically added navigation
    const observer = new MutationObserver(function(mutations) {
        forceHideNavigation();
    });
    
    // Start observing when the DOM is loaded
    document.addEventListener('DOMContentLoaded', function() {
        observer.observe(document.body, { 
            childList: true, 
            subtree: true 
        });
    });
})();
