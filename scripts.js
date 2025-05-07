// Main interactive components script for AppFoundry landing page
document.addEventListener('DOMContentLoaded', function() {
    console.log("Scripts.js loaded - waiting for all components to be available...");
    
    // Execute initialization after a delay to ensure DOM is fully loaded
    setTimeout(function() {
        initializeInteractiveComponents();
    }, 1500);
    
    // Main function to initialize all interactive elements
    function initializeInteractiveComponents() {
        console.log("Initializing all interactive components");
        
        // Initialize the ROI Calculator
        initializeRoiCalculator();
        
        // Initialize the module toggles
        initializeModuleToggles();
        
        // Initialize the FAQ toggles
        initializeFaqToggles();
        
        // Initialize the carousel
        initializeCarousel();
        
        // Initialize login button
        initializeLoginButton();
        
        // Initialize smooth scrolling for anchor links
        initializeSmoothScrolling();
        
        console.log("All interactive components initialization complete");
    }
    
    // ROI Calculator initialization function
    function initializeRoiCalculator() {
        console.log("Initializing ROI Calculator...");
        
        const calculateRoiButton = document.getElementById('calculate-roi');
        
        if (!calculateRoiButton) {
            console.warn("ROI Calculator button not found - retrying in 1 second");
            setTimeout(initializeRoiCalculator, 1000);
            return;
        }
        
        console.log("ROI Calculator button found, adding event listener");
        
        calculateRoiButton.addEventListener('click', function() {
            console.log("Calculate ROI button clicked");
            
            // Get input values
            const complexity = document.getElementById('app-complexity').value;
            const rate = parseInt(document.getElementById('developer-rate').value) || 85;
            const revisions = parseInt(document.getElementById('revisions').value) || 3;
            
            console.log("Calculator inputs:", { complexity, rate, revisions });
            
            // Calculate base costs and times based on complexity
            let baseCost, baseTime;
            
            switch(complexity) {
                case 'simple':
                    baseCost = 8000;
                    baseTime = 2.5;
                    break;
                case 'medium':
                    baseCost = 15000;
                    baseTime = 4.5;
                    break;
                case 'complex':
                    baseCost = 30000;
                    baseTime = 7;
                    break;
                default:
                    baseCost = 15000;
                    baseTime = 4.5;
            }
            
            // Adjust based on rate
            const rateFactor = rate / 85;
            baseCost = Math.round(baseCost * rateFactor);
            
            // Calculate revision costs
            const revisionCost = Math.round(baseCost * 0.15 * revisions);
            const totalCost = baseCost + revisionCost;
            
            // Calculate total time
            const revisionTime = revisions * 0.5;
            const totalTime = baseTime + revisionTime;
            
            console.log("Calculated values:", {
                baseCost,
                revisionCost,
                totalCost,
                baseTime,
                revisionTime,
                totalTime
            });
            
            // Update the traditional development results
            const costElement = document.querySelector('.result-card.traditional .result-cost');
            if (costElement) {
                costElement.textContent = '$' + totalCost.toLocaleString();
            }
            
            const timeElement = document.querySelector('.result-card.traditional .result-time');
            if (timeElement) {
                timeElement.textContent = `${totalTime.toFixed(1)} months`;
            }
            
            // Update the breakdown elements
            const breakdownDev = document.querySelector('.result-card.traditional .result-breakdown li:nth-child(1)');
            if (breakdownDev) {
                breakdownDev.innerHTML = `<span class="breakdown-label">Development:</span> $${baseCost.toLocaleString()}`;
            }
            
            const breakdownRev = document.querySelector('.result-card.traditional .result-breakdown li:nth-child(2)');
            if (breakdownRev) {
                breakdownRev.innerHTML = `<span class="breakdown-label">Revisions:</span> $${revisionCost.toLocaleString()}`;
            }
            
            // Calculate and update savings
            const savings = totalCost - 499;
            const timeMonths = totalTime - 0.5;
            
            const savingsAmount = document.querySelector('.savings-amount');
            if (savingsAmount) {
                savingsAmount.textContent = '$' + savings.toLocaleString();
            }
            
            const savingsTime = document.querySelector('.savings-time');
            if (savingsTime) {
                savingsTime.textContent = `${timeMonths.toFixed(1)} months`;
            }
            
            console.log("ROI Calculator results updated");
        });
        
        console.log("ROI Calculator initialization complete");
    }
    
    // Module details toggle initialization
    function initializeModuleToggles() {
        console.log("Initializing module toggles...");
        
        const toggles = document.querySelectorAll('.module-expand');
        
        if (!toggles.length) {
            console.warn("No module toggles found - curriculum might not be loaded yet");
            return;
        }
        
        toggles.forEach(toggle => {
            toggle.addEventListener('click', function() {
                const moduleId = this.getAttribute('data-module');
                const details = document.getElementById(`module-details-${moduleId}`);
                
                if (details) {
                    if (details.style.display === 'block') {
                        details.style.display = 'none';
                        this.textContent = `See Lesson Details +`;
                    } else {
                        details.style.display = 'block';
                        this.textContent = `Hide Lesson Details -`;
                    }
                }
            });
        });
        
        console.log(`${toggles.length} module toggles initialized`);
    }
    
    // FAQ toggles initialization
    function initializeFaqToggles() {
        console.log("Initializing FAQ toggles...");
        
        const questions = document.querySelectorAll('.faq-question');
        
        if (!questions.length) {
            console.warn("No FAQ questions found - FAQ section might not be loaded yet");
            return;
        }
        
        questions.forEach(question => {
            question.addEventListener('click', function() {
                const answer = this.nextElementSibling;
                const icon = this.querySelector('.toggle-icon');
                
                if (!answer || !icon) return;
                
                // Close all other FAQs
                document.querySelectorAll('.faq-answer').forEach(item => {
                    if (item !== answer && item.classList.contains('show')) {
                        item.classList.remove('show');
                        const otherIcon = item.previousElementSibling.querySelector('.toggle-icon');
                        if (otherIcon) otherIcon.textContent = '+';
                    }
                });
                
                // Toggle current FAQ
                if (answer.classList.contains('show')) {
                    answer.classList.remove('show');
                    icon.textContent = '+';
                } else {
                    answer.classList.add('show');
                    icon.textContent = '-';
                }
            });
        });
        
        console.log(`${questions.length} FAQ toggles initialized`);
    }
    
    // Carousel functionality initialization
    function initializeCarousel() {
        console.log("Initializing carousel...");
        
        const carousel = document.querySelector('.wins-carousel');
        
        if (!carousel) {
            console.warn("No carousel found - quick wins section might not be loaded yet");
            return;
        }
        
        const items = carousel.querySelectorAll('.win-item');
        const dots = carousel.querySelectorAll('.carousel-dots .dot');
        const prevButton = carousel.querySelector('.carousel-prev');
        const nextButton = carousel.querySelector('.carousel-next');
        
        if (!items.length) {
            console.warn("No carousel items found");
            return;
        }
        
        // Initialize state variables
        let currentIndex = 0;
        let autoPlayInterval;
        
        // Function to show a specific slide
        function showSlide(index) {
            // Ensure index is within bounds
            if (index >= items.length) {
                index = 0;
            } else if (index < 0) {
                index = items.length - 1;
            }
            
            // Update current index
            currentIndex = index;
            
            // Update carousel items
            items.forEach((item, i) => {
                // Hide all items first
                item.style.display = 'none';
                item.style.opacity = '0';
                
                // Show only the current item
                if (i === currentIndex) {
                    item.style.display = 'block';
                    setTimeout(() => {
                        item.style.opacity = '1';
                    }, 50);
                }
            });
            
            // Update dots if they exist
            if (dots && dots.length) {
                dots.forEach((dot, i) => {
                    dot.classList.toggle('active', i === currentIndex);
                });
            }
        }
        
        // Initialize first slide
        showSlide(0);
        
        // Set up event listeners for controls
        if (prevButton) {
            prevButton.addEventListener('click', () => {
                showSlide(currentIndex - 1);
            });
        }
        
        if (nextButton) {
            nextButton.addEventListener('click', () => {
                showSlide(currentIndex + 1);
            });
        }
        
        // Set up event listeners for dots
        if (dots && dots.length) {
            dots.forEach((dot, i) => {
                dot.addEventListener('click', () => {
                    showSlide(i);
                });
            });
        }
        
        // Function to start auto-play
        function startAutoPlay() {
            clearInterval(autoPlayInterval);
            autoPlayInterval = setInterval(() => {
                showSlide(currentIndex + 1);
            }, 5000);
        }
        
        // Start auto-play when page loads
        startAutoPlay();
        
        // Pause auto-play on hover
        carousel.addEventListener('mouseenter', () => {
            clearInterval(autoPlayInterval);
        });
        
        // Resume auto-play when mouse leaves
        carousel.addEventListener('mouseleave', () => {
            startAutoPlay();
        });
        
        console.log(`Carousel initialized with ${items.length} items`);
    }
    
    // Login button initialization
    function initializeLoginButton() {
        console.log("Initializing login button...");
        
        const loginButton = document.getElementById('loginButton');
        
        if (!loginButton) {
            console.warn("Login button not found - header might not be loaded yet");
            return;
        }
        
        loginButton.addEventListener('click', function() {
            console.log("Login button clicked, redirecting to login page");
            window.location.href = 'direct-login.html';
        });
        
        console.log("Login button initialized");
    }
    
    // Smooth scrolling initialization
    function initializeSmoothScrolling() {
        console.log("Initializing smooth scrolling...");
        
        const anchorLinks = document.querySelectorAll('a[href^="#"]');
        
        if (!anchorLinks.length) {
            console.warn("No anchor links found - components might still be loading");
            return;
        }
        
        anchorLinks.forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                e.preventDefault();
                
                const targetId = this.getAttribute('href');
                
                // Handle scroll to top
                if (targetId === '#') {
                    window.scrollTo({
                        top: 0,
                        behavior: 'smooth'
                    });
                    return;
                }
                
                // Find target element
                const targetElement = document.querySelector(targetId);
                
                if (targetElement) {
                    const headerOffset = 80; // Adjust based on your fixed header height
                    const elementPosition = targetElement.getBoundingClientRect().top;
                    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                    
                    window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                    });
                }
            });
        });
        
        console.log(`${anchorLinks.length} smooth scroll links initialized`);
    }
});
