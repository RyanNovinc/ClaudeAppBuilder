// Component loader script with enhanced error handling and path detection
document.addEventListener('DOMContentLoaded', function() {
    console.log("Component loader initializing...");
    
    // Check if we're in a subdirectory and adjust paths accordingly
    function getBasePath() {
        // Get the directory part of the current URL
        const pathParts = window.location.pathname.split('/');
        // Remove the file name part (if any)
        pathParts.pop();
        // Return the directory path (or empty string if at root)
        return pathParts.join('/') + (pathParts.length > 1 ? '/' : '');
    }
    
    const basePath = getBasePath();
    console.log("Base path detected as:", basePath);
    
    // Function to load HTML components with enhanced error handling
    function loadComponent(elementId, fileName) {
        // Determine if we need to look in an _includes directory or not
        const includePath = `${basePath}_includes/${fileName}`;
        const directPath = `${basePath}${fileName}`;
        
        console.log(`Attempting to load ${fileName} into ${elementId}...`);
        
        // Try loading from includes directory first
        fetch(includePath)
            .then(response => {
                if (!response.ok) {
                    console.log(`Component not found in _includes, trying direct path...`);
                    return fetch(directPath);
                }
                return response;
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to load component: ${response.status} ${response.statusText}`);
                }
                return response.text();
            })
            .then(html => {
                const container = document.getElementById(elementId);
                if (!container) {
                    throw new Error(`Container element #${elementId} not found`);
                }
                
                // Insert the HTML into the container
                container.innerHTML = html;
                
                // Find and re-execute any scripts in the loaded component
                const scripts = container.querySelectorAll('script');
                scripts.forEach(script => {
                    const newScript = document.createElement('script');
                    
                    // Copy attributes
                    Array.from(script.attributes).forEach(attr => {
                        newScript.setAttribute(attr.name, attr.value);
                    });
                    
                    // Copy content
                    newScript.textContent = script.textContent;
                    
                    // Replace the script to execute it
                    script.parentNode.replaceChild(newScript, script);
                });
                
                console.log(`Component ${fileName} loaded successfully`);
            })
            .catch(error => {
                console.error(`Error loading component ${fileName}:`, error);
                const container = document.getElementById(elementId);
                if (container) {
                    container.innerHTML = `
                        <div class="error-loading" style="padding: 20px; border: 1px solid #f8d7da; background-color: #fff3f3; color: #721c24; border-radius: 8px; margin: 10px 0;">
                            <h3 style="margin-top: 0;">Error Loading Component</h3>
                            <p>Unable to load ${fileName}. Details: ${error.message}</p>
                            <button onclick="location.reload()" style="background: #0070f3; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">Refresh Page</button>
                        </div>
                    `;
                }
            });
    }

    // Load all components with a slight delay between each
    function loadComponentWithDelay(elementId, fileName, delay) {
        setTimeout(() => loadComponent(elementId, fileName), delay);
    }

    // Load components with staggered timing to avoid overwhelming the server
    loadComponentWithDelay('header-container', 'header.html', 0);
    loadComponentWithDelay('hero-container', 'hero.html', 100);
    loadComponentWithDelay('problem-container', 'problem.html', 200);
    loadComponentWithDelay('solution-container', 'solution.html', 300);
    loadComponentWithDelay('quick-wins-container', 'quick-wins.html', 400);
    loadComponentWithDelay('roi-calculator-container', 'roi-calculator.html', 500);
    loadComponentWithDelay('proof-container', 'proof.html', 600);
    loadComponentWithDelay('curriculum-container', 'curriculum.html', 700);
    loadComponentWithDelay('comparison-container', 'comparison.html', 800);
    loadComponentWithDelay('pricing-container', 'pricing.html', 900);
    loadComponentWithDelay('guarantee-container', 'guarantee.html', 1000);
    loadComponentWithDelay('faq-container', 'faq.html', 1100);
    loadComponentWithDelay('cta-container', 'cta.html', 1200);
    loadComponentWithDelay('footer-container', 'footer.html', 1300);
    
    // Load scripts after components
    setTimeout(function() {
        console.log("Loading main scripts file...");
        const scriptElement = document.createElement('script');
        scriptElement.src = `${basePath}scripts.js`;
        scriptElement.onerror = function() {
            console.error("Failed to load scripts.js");
            // Try alternate location
            const altScript = document.createElement('script');
            altScript.src = `${basePath}_includes/scripts.js`;
            document.body.appendChild(altScript);
        };
        document.body.appendChild(scriptElement);
    }, 2000);
});
