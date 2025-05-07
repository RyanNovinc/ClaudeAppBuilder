document.addEventListener('DOMContentLoaded', function() {
    // Function to load HTML components
    function loadComponent(elementId, filePath) {
        fetch(filePath)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to load ${filePath}`);
                }
                return response.text();
            })
            .then(html => {
                document.getElementById(elementId).innerHTML = html;
            })
            .catch(error => {
                console.error(`Error loading component ${filePath}:`, error);
            });
    }

    // Load all components
    loadComponent('header-container', '_includes/header.html');
    loadComponent('hero-container', '_includes/hero.html');
    loadComponent('problem-container', '_includes/problem.html');
    loadComponent('solution-container', '_includes/solution.html');
    loadComponent('quick-wins-container', '_includes/quick-wins.html');
    loadComponent('roi-calculator-container', '_includes/roi-calculator.html');
    loadComponent('proof-container', '_includes/proof.html');
    loadComponent('curriculum-container', '_includes/curriculum.html');
    loadComponent('comparison-container', '_includes/comparison.html');
    loadComponent('pricing-container', '_includes/pricing.html');
    loadComponent('guarantee-container', '_includes/guarantee.html');
    loadComponent('faq-container', '_includes/faq.html');
    loadComponent('cta-container', '_includes/cta.html');
    loadComponent('footer-container', '_includes/footer.html');
});
