// Component loader script for AppFoundry landing page
document.addEventListener('DOMContentLoaded', function() {
    console.log("Component loader initialized");
    
    // Function to load HTML components
    function loadComponent(elementId, filePath) {
        console.log(`Loading component ${filePath} into ${elementId}...`);
        
        fetch(filePath)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to load ${filePath}: ${response.status} ${response.statusText}`);
                }
                return response.text();
            })
            .then(html => {
                // Insert the HTML into the container
                document.getElementById(elementId).innerHTML = html;
                
                // Find and re-execute any scripts in the loaded component
                // This is crucial for functionality like the ROI calculator
                const scripts = document.getElementById(elementId).querySelectorAll('script');
                scripts.forEach(script => {
                    // Create a new script element
                    const newScript = document.createElement('script');
                    
                    // Copy all attributes from the original script
                    Array.from(script.attributes).forEach(attr => {
                        newScript.setAttribute(attr.name, attr.value);
                    });
                    
                    // Copy the script content
                    newScript.textContent = script.textContent;
                    
                    // Replace the original script with the new one to trigger execution
                    script.parentNode.replaceChild(newScript, script);
                });
                
                console.log(`Component ${filePath} loaded successfully`);
            })
            .catch(error => {
                console.error(`Error loading component ${filePath}:`, error);
                document.getElementById(elementId).innerHTML = `<div class="error-loading">
                    <p>Error loading component. Please refresh the page or try again later.</p>
                </div>`;
            });
    }

    // Load all components
    loadComponent('header-container', 'header.html');
    loadComponent('hero-container', 'hero.html');
    loadComponent('problem-container', 'problem.html');
    loadComponent('solution-container', 'solution.html');
    loadComponent('quick-wins-container', 'quick-wins.html');
    loadComponent('roi-calculator-container', 'roi-calculator.html');
    loadComponent('proof-container', 'proof.html');
    loadComponent('curriculum-container', 'curriculum.html');
    loadComponent('comparison-container', 'comparison.html');
    loadComponent('pricing-container', 'pricing.html');
    loadComponent('guarantee-container', 'guarantee.html');
    loadComponent('faq-container', 'faq.html');
    loadComponent('cta-container', 'cta.html');
    loadComponent('footer-container', 'footer.html');
    
    // Wait for all components to load, then initialize scripts
    console.log("Components loading, scheduling scripts initialization...");
    
    setTimeout(function() {
        // Load the main scripts file separately to ensure all interactive functionality works
        const scriptElement = document.createElement('script');
        scriptElement.src = 'scripts.js';
        document.body.appendChild(scriptElement);
        
        console.log('Scripts initialization scheduled');
    }, 1500);
});
