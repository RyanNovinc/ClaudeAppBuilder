// Load submissions from both API and localStorage
async function loadSubmissions() {
    const adminToken = localStorage.getItem('appfoundry_admin_token');
    
    if (!adminToken) {
        checkAdminLogin();
        return;
    }
    
    // Get elements
    const loadingIndicator = document.getElementById('loading-indicator');
    const storiesTable = document.getElementById('stories-table');
    const emptyState = document.getElementById('empty-state');
    
    // Show loading, hide others
    loadingIndicator.style.display = 'flex';
    storiesTable.style.display = 'none';
    emptyState.style.display = 'none';
    
    try {
        // Initialize all submissions array
        let apiSubmissions = [];
        let localSubmissions = [];
        
        // Try to fetch from the improved API endpoint
        try {
            console.log('Fetching submissions from API...');
            const response = await fetch('/.netlify/functions/get-all-submissions', {
                headers: {
                    'Authorization': `Bearer ${adminToken}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('Received submissions from API:', data.length);
                apiSubmissions = data;
            } else {
                console.warn('API returned non-OK response:', response.status);
                
                // Try fallback API endpoint
                const fallbackResponse = await fetch('/.netlify/functions/get-submissions', {
                    headers: {
                        'Authorization': `Bearer ${adminToken}`
                    }
                });
                
                if (fallbackResponse.ok) {
                    const fallbackData = await fallbackResponse.json();
                    console.log('Received submissions from fallback API:', fallbackData.length);
                    apiSubmissions = fallbackData;
                } else {
                    console.warn('Fallback API also failed:', fallbackResponse.status);
                }
            }
        } catch (apiError) {
            console.warn('Error fetching from API:', apiError);
            // Continue to try localStorage
        }
        
        // Get submissions from localStorage as a backup
        try {
            const storedSubmissions = localStorage.getItem('appfoundry_submissions');
            if (storedSubmissions) {
                localSubmissions = JSON.parse(storedSubmissions);
                console.log('Found submissions in localStorage:', localSubmissions.length);
            }
        } catch (localError) {
            console.warn('Error reading from localStorage:', localError);
        }
        
        // Combine submissions, prioritizing API results but including unique local submissions
        const combinedSubmissions = [...apiSubmissions];
        
        // Add local submissions that don't exist in the API data
        localSubmissions.forEach(localSub => {
            const exists = combinedSubmissions.some(apiSub => apiSub.id === localSub.id);
            if (!exists) {
                combinedSubmissions.push(localSub);
            }
        });
        
        console.log('Combined submissions total:', combinedSubmissions.length);
        
        // If we still have no submissions, use sample data
        if (combinedSubmissions.length === 0) {
            console.log('No submissions found, using sample data');
            allSubmissions = getSampleData();
        } else {
            allSubmissions = combinedSubmissions;
        }
        
        // Sort by date (newest first)
        allSubmissions.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // Check if we have submissions
        if (allSubmissions.length === 0) {
            // Show empty state
            loadingIndicator.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }
        
        // Display submissions
        loadingIndicator.style.display = 'none';
        storiesTable.style.display = 'table';
        
        // Reset pagination
        currentPage = 1;
        
        // Display submissions
        displaySubmissions();
    } catch (error) {
        console.error('Error loading submissions:', error);
        
        // Show error
        loadingIndicator.style.display = 'none';
        
        // Create error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'admin-empty-state';
        errorDiv.innerHTML = `
            <div class="admin-empty-state-icon">❌</div>
            <div class="admin-empty-state-title">Error Loading Submissions</div>
            <p>We encountered an issue loading the submissions. Please try again.</p>
            <button class="admin-button" onclick="loadSubmissions()">Retry</button>
        `;
        
        // Add to container
        document.getElementById('table-container').appendChild(errorDiv);
    }
}
