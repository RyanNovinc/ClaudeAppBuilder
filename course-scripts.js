document.addEventListener('DOMContentLoaded', function() {
    // Handle checkbox state persistence
    const checkboxes = document.querySelectorAll('.checklist-item input[type="checkbox"]');
    const currentModule = document.querySelector('.module-navigation a.active').textContent.split('.')[0];
    
    // Load saved states
    checkboxes.forEach((checkbox, index) => {
        const savedState = localStorage.getItem(`module${currentModule}_task${index+1}`);
        if (savedState === 'true') {
            checkbox.checked = true;
        }
    });
    
    // Save states on change
    checkboxes.forEach((checkbox, index) => {
        checkbox.addEventListener('change', function() {
            localStorage.setItem(`module${currentModule}_task${index+1}`, this.checked);
            updateProgress();
        });
    });
    
    // Update progress bar
    function updateProgress() {
        const totalTasks = checkboxes.length;
        const completedTasks = Array.from(checkboxes).filter(box => box.checked).length;
        const progressPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
        
        // Update progress bar
        document.querySelector('.progress').style.width = `${progressPercentage}%`;
        document.querySelector('.progress-text').textContent = `${Math.round(progressPercentage)}% Complete`;
        
        // Save overall progress
        localStorage.setItem(`module${currentModule}_progress`, progressPercentage);
    }
    
    // Initial progress update
    updateProgress();
    
    // Handle video placeholder click
    const videoPlaceholder = document.querySelector('.video-placeholder');
    if (videoPlaceholder) {
        videoPlaceholder.addEventListener('click', function() {
            // This would be replaced with actual video embed code
            // For now, it's just a placeholder action
            alert('Video player will be embedded here in the final version');
            
            // Example of how to replace with an actual video:
            /*
            const videoContainer = document.querySelector('.video-container');
            videoContainer.innerHTML = `
                <iframe 
                    src="https://www.youtube.com/embed/YOUR_VIDEO_ID" 
                    frameborder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowfullscreen
                    style="width: 100%; height: 100%; aspect-ratio: 16/9;"
                ></iframe>
            `;
            */
        });
    }
    
    // Handle next/previous lesson navigation
    const nextButton = document.querySelector('.nav-button.next');
    if (nextButton && !nextButton.classList.contains('disabled')) {
        nextButton.addEventListener('click', function() {
            // Find the next module in the sidebar
            const activeLink = document.querySelector('.module-navigation a.active');
            const nextLink = activeLink.parentElement.nextElementSibling?.querySelector('a');
            
            if (nextLink) {
                window.location.href = nextLink.getAttribute('href');
            }
        });
    }
    
    const prevButton = document.querySelector('.nav-button:not(.next):not(.disabled)');
    if (prevButton) {
        prevButton.addEventListener('click', function() {
            // Find the previous module in the sidebar
            const activeLink = document.querySelector('.module-navigation a.active');
            const prevLink = activeLink.parentElement.previousElementSibling?.querySelector('a');
            
            if (prevLink) {
                window.location.href = prevLink.getAttribute('href');
            }
        });
    }
    
    // Login button functionality (placeholder)
    const loginButton = document.getElementById('loginButton');
    if (loginButton) {
        loginButton.addEventListener('click', function() {
            alert('Login functionality will be implemented with Netlify Identity or similar service');
        });
    }
    
    // Resource download links (placeholder)
    const downloadLinks = document.querySelectorAll('.download-link');
    downloadLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            alert('Download functionality will be implemented in the final version');
        });
    });
});