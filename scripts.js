/**
 * AppFoundry - Core JavaScript Functionality
 * Handles interactive elements, authentication, and UI functionality
 */

document.addEventListener('DOMContentLoaded', function() {
    // Dark mode toggle - will be hooked up to a button in the UI
    function toggleDarkMode() {
        document.body.classList.toggle('dark-mode');
        
        // Save user preference to localStorage
        if (document.body.classList.contains('dark-mode')) {
            localStorage.setItem('appfoundry_darkmode', 'enabled');
        } else {
            localStorage.setItem('appfoundry_darkmode', 'disabled');
        }
    }
    
    // Check for saved dark mode preference
    if (localStorage.getItem('appfoundry_darkmode') === 'enabled') {
        document.body.classList.add('dark-mode');
    }
    
    // Set up login button
    const loginButton = document.getElementById('loginButton');
    if (loginButton) {
        loginButton.addEventListener('click', function() {
            window.location.href = 'direct-login.html';
        });
    }
    
    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 80, // Offset for header
                    behavior: 'smooth'
                });
                
                // Update URL hash without jumping
                history.pushState(null, null, targetId);
            }
        });
    });
    
    // Video player functionality
    const videoContainers = document.querySelectorAll('.video-container');
    videoContainers.forEach(container => {
        container.addEventListener('click', function() {
            const placeholder = this.querySelector('img');
            const playButton = this.querySelector('.play-button');
            
            // Create an iframe for the video (e.g., YouTube or Vimeo)
            // This is a simplified example - in production, you'd get the video URL from data attributes
            const iframe = document.createElement('iframe');
            iframe.src = 'https://www.youtube.com/embed/VIDEO_ID?autoplay=1';
            iframe.width = '100%';
            iframe.height = '100%';
            iframe.frameBorder = '0';
            iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
            iframe.allowFullscreen = true;
            
            // Replace the placeholder with the iframe
            placeholder.remove();
            playButton.remove();
            this.appendChild(iframe);
        });
    });
    
    // FAQ accordion functionality
    const faqQuestions = document.querySelectorAll('.faq-question');
    faqQuestions.forEach(question => {
        question.addEventListener('click', function() {
            const answer = this.nextElementSibling;
            const icon = this.querySelector('.toggle-icon');
            
            // Toggle answer visibility
            if (answer.style.display === 'block') {
                answer.style.display = 'none';
                icon.textContent = '+';
            } else {
                // Close all other answers first
                document.querySelectorAll('.faq-answer').forEach(item => {
                    if (item !== answer) {
                        item.style.display = 'none';
                        item.previousElementSibling.querySelector('.toggle-icon').textContent = '+';
                    }
                });
                
                answer.style.display = 'block';
                icon.textContent = '-';
            }
        });
    });
    
    // Module details toggle functionality
    const moduleExpands = document.querySelectorAll('.module-expand');
    moduleExpands.forEach(expand => {
        expand.addEventListener('click', function() {
            const moduleId = this.getAttribute('data-module');
            const details = document.getElementById(`module-details-${moduleId}`);
            
            if (details.style.display === 'block') {
                details.style.display = 'none';
                this.textContent = `See Lesson Details +`;
            } else {
                details.style.display = 'block';
                this.textContent = `Hide Lesson Details -`;
            }
        });
    });
    
    // ROI Calculator functionality
    const calculateButton = document.getElementById('calculate-roi');
    if (calculateButton) {
        calculateButton.addEventListener('click', function() {
            // This functionality is implemented inline in index.html
            // for simplified deployment
        });
    }
    
    // Carousel functionality
    const carouselInit = () => {
        const carousel = document.querySelector('.wins-carousel');
        if (!carousel) return;
        
        const items = carousel.querySelectorAll('.win-item');
        const dots = carousel.querySelectorAll('.carousel-dots .dot');
        const prevButton = carousel.querySelector('.carousel-prev');
        const nextButton = carousel.querySelector('.carousel-next');
        let currentIndex = 0;
        
        function showSlide(index) {
            // Reset current index if out of bounds
            if (index >= items.length) {
                index = 0;
            } else if (index < 0) {
                index = items.length - 1;
            }
            
            // Update current index
            currentIndex = index;
            
            // Update carousel position
            items.forEach((item, i) => {
                item.style.display = i === currentIndex ? 'block' : 'none';
            });
            
            // Update dots
            dots.forEach((dot, i) => {
                dot.classList.toggle('active', i === currentIndex);
            });
        }
        
        // Set up event listeners
        if (prevButton) {
            prevButton.addEventListener('click', () => showSlide(currentIndex - 1));
        }
        
        if (nextButton) {
            nextButton.addEventListener('click', () => showSlide(currentIndex + 1));
        }
        
        dots.forEach((dot, i) => {
            dot.addEventListener('click', () => showSlide(i));
        });
        
        // Initialize carousel
        showSlide(0);
        
        // Auto-advance carousel every 5 seconds
        setInterval(() => {
            showSlide(currentIndex + 1);
        }, 5000);
    };
    
    carouselInit();
    
    // Intersection Observer for animations
    if ('IntersectionObserver' in window) {
        const fadeElements = document.querySelectorAll('.fade-in');
        
        const fadeObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    fadeObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });
        
        fadeElements.forEach(element => {
            fadeObserver.observe(element);
        });
    }
    
    // Add scroll-based sticky behavior for CTAs
    const handleStickyElements = () => {
        const scrollPosition = window.scrollY;
        const windowHeight = window.innerHeight;
        const documentHeight = document.body.scrollHeight;
        
        // Show sticky CTA after scrolling 30% down the page
        // but hide near the footer
        const stickyCta = document.querySelector('.sticky-cta');
        if (stickyCta) {
            if (scrollPosition > windowHeight * 0.3 && 
                scrollPosition < documentHeight - windowHeight - 100) {
                stickyCta.classList.add('visible');
            } else {
                stickyCta.classList.remove('visible');
            }
        }
    };
    
    window.addEventListener('scroll', handleStickyElements);
    
    // Authentication status check
    const checkAuthStatus = () => {
        // This would normally communicate with your auth service
        // For now, we'll just check if there's a token in localStorage
        const isLoggedIn = localStorage.getItem('appfoundry_auth') === 'true';
        
        // Update UI based on auth status
        const authElements = document.querySelectorAll('[data-auth-required]');
        authElements.forEach(element => {
            if (isLoggedIn) {
                element.style.display = 'block';
            } else {
                element.style.display = 'none';
            }
        });
        
        // Update login button text
        if (loginButton) {
            loginButton.textContent = isLoggedIn ? 'My Account' : 'Log in';
        }
    };
    
    checkAuthStatus();
    
    // Add animated counting for metrics
    const animateCounter = (element, target, duration = 2000) => {
        if (!element) return;
        
        let start = 0;
        const startTime = performance.now();
        
        function updateCounter(currentTime) {
            const elapsedTime = currentTime - startTime;
            const progress = Math.min(elapsedTime / duration, 1);
            
            // Easing function for smooth animation
            const easedProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
            
            const value = Math.floor(easedProgress * target);
            element.textContent = value.toLocaleString();
            
            if (progress < 1) {
                requestAnimationFrame(updateCounter);
            } else {
                element.textContent = target.toLocaleString();
            }
        }
        
        requestAnimationFrame(updateCounter);
    };
    
    // Set up counter animations if elements exist
    if ('IntersectionObserver' in window) {
        const counterElements = document.querySelectorAll('[data-counter]');
        
        const counterObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const target = parseInt(entry.target.getAttribute('data-counter'), 10);
                    animateCounter(entry.target, target);
                    counterObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });
        
        counterElements.forEach(element => {
            counterObserver.observe(element);
        });
    }
});
