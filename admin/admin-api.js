/**
 * admin-api.js - API integration for AppFoundry Admin Panel
 * 
 * This file adds server-side storage capabilities to the admin panel.
 * It overrides the existing localStorage-based functions with ones that
 * use both the Netlify Functions API and localStorage as a backup.
 */

// ============================================================
// MAIN LOADING FUNCTION
// ============================================================

/**
 * Load submissions from both API and localStorage
 * This overrides the existing loadSubmissions function
 */
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
                try {
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
                } catch (fallbackError) {
                    console.warn('Fallback API error:', fallbackError);
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
        const tableContainer = document.getElementById('table-container');
        // Clear any existing error messages
        const existingError = tableContainer.querySelector('.admin-empty-state');
        if (existingError) {
            tableContainer.removeChild(existingError);
        }
        tableContainer.appendChild(errorDiv);
    }
}

// ============================================================
// STATUS UPDATE FUNCTIONS
// ============================================================

/**
 * Approve a story
 * This overrides the existing approveStory function
 */
async function approveStory() {
    if (!currentStoryId) return;
    
    const adminToken = localStorage.getItem('appfoundry_admin_token');
    if (!adminToken) {
        alert('You must be logged in to approve stories.');
        return;
    }
    
    // Show loading state
    const approveButton = document.getElementById('approve-button');
    const originalText = approveButton.textContent;
    approveButton.disabled = true;
    approveButton.textContent = 'Processing...';
    
    try {
        // First try to update via API
        let apiUpdateSuccessful = false;
        
        try {
            const response = await fetch('/.netlify/functions/update-submission-status', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${adminToken}`
                },
                body: JSON.stringify({
                    id: currentStoryId,
                    status: 'approved'
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('API status update successful:', result);
                apiUpdateSuccessful = true;
                
                // If API returns updated submission, update our local copy
                if (result.submission) {
                    const storyIndex = allSubmissions.findIndex(s => s.id === currentStoryId);
                    if (storyIndex !== -1) {
                        allSubmissions[storyIndex] = result.submission;
                    }
                }
            } else {
                console.warn('API status update failed:', await response.text());
                // Fall back to localStorage update
            }
        } catch (apiError) {
            console.warn('Error updating status via API:', apiError);
            // Continue with localStorage update
        }
        
        // If API update failed, update localStorage as a fallback
        if (!apiUpdateSuccessful) {
            // Find the story in our current submissions
            const storyIndex = allSubmissions.findIndex(s => s.id === currentStoryId);
            
            if (storyIndex === -1) {
                throw new Error('Story not found in local submissions.');
            }
            
            // Update status
            allSubmissions[storyIndex].status = 'approved';
            
            // Save to localStorage
            saveSubmissionsToLocalStorage();
            console.log('Updated status in localStorage as fallback');
        }
        
        // Close modal and refresh display
        closeModal('view-story-modal');
        displaySubmissions();
        
        // Show success message
        alert('Story approved successfully!');
    } catch (error) {
        console.error('Error approving story:', error);
        alert('An error occurred while approving the story. Please try again.');
    } finally {
        // Reset button state
        approveButton.disabled = false;
        approveButton.textContent = originalText;
    }
}

/**
 * Reject a story
 * This overrides the existing rejectStory function
 */
async function rejectStory() {
    if (!currentStoryId) return;
    
    const adminToken = localStorage.getItem('appfoundry_admin_token');
    if (!adminToken) {
        alert('You must be logged in to reject stories.');
        return;
    }
    
    // Show loading state
    const rejectButton = document.getElementById('reject-button');
    const originalText = rejectButton.textContent;
    rejectButton.disabled = true;
    rejectButton.textContent = 'Processing...';
    
    try {
        // First try to update via API
        let apiUpdateSuccessful = false;
        
        try {
            const response = await fetch('/.netlify/functions/update-submission-status', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${adminToken}`
                },
                body: JSON.stringify({
                    id: currentStoryId,
                    status: 'rejected'
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('API status update successful:', result);
                apiUpdateSuccessful = true;
                
                // If API returns updated submission, update our local copy
                if (result.submission) {
                    const storyIndex = allSubmissions.findIndex(s => s.id === currentStoryId);
                    if (storyIndex !== -1) {
                        allSubmissions[storyIndex] = result.submission;
                    }
                }
            } else {
                console.warn('API status update failed:', await response.text());
                // Fall back to localStorage update
            }
        } catch (apiError) {
            console.warn('Error updating status via API:', apiError);
            // Continue with localStorage update
        }
        
        // If API update failed, update localStorage as a fallback
        if (!apiUpdateSuccessful) {
            // Find the story in our current submissions
            const storyIndex = allSubmissions.findIndex(s => s.id === currentStoryId);
            
            if (storyIndex === -1) {
                throw new Error('Story not found in local submissions.');
            }
            
            // Update status
            allSubmissions[storyIndex].status = 'rejected';
            
            // Save to localStorage
            saveSubmissionsToLocalStorage();
            console.log('Updated status in localStorage as fallback');
        }
        
        // Close modal and refresh display
        closeModal('view-story-modal');
        displaySubmissions();
        
        // Show success message
        alert('Story rejected successfully!');
    } catch (error) {
        console.error('Error rejecting story:', error);
        alert('An error occurred while rejecting the story. Please try again.');
    } finally {
        // Reset button state
        rejectButton.disabled = false;
        rejectButton.textContent = originalText;
    }
}

/**
 * Save edited story
 * This overrides the existing saveStory function
 */
async function saveStory() {
    if (!currentStoryId) return;
    
    const adminToken = localStorage.getItem('appfoundry_admin_token');
    if (!adminToken) {
        alert('You must be logged in to save stories.');
        return;
    }
    
    try {
        // Get values from form
        const name = document.getElementById('edit-name').value;
        const appName = document.getElementById('edit-app-name').value;
        const appType = document.getElementById('edit-app-type').value;
        const testimonial = document.getElementById('edit-testimonial').value;
        const story = document.getElementById('edit-story').value;
        
        // Get status
        let status = 'pending';
        const statusRadios = document.getElementsByName('status');
        for (let i = 0; i < statusRadios.length; i++) {
            if (statusRadios[i].checked) {
                status = statusRadios[i].value;
                break;
            }
        }
        
        // Find the story
        const storyIndex = allSubmissions.findIndex(s => s.id === currentStoryId);
        
        if (storyIndex === -1) {
            throw new Error('Story not found.');
        }
        
        // Create updated submission
        const updatedSubmission = {
            ...allSubmissions[storyIndex],
            name,
            appName,
            appType,
            testimonial,
            story,
            status
        };
        
        // Try to update via API first
        let apiUpdateSuccessful = false;
        
        try {
            const response = await fetch('/.netlify/functions/update-submission-status', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${adminToken}`
                },
                body: JSON.stringify(updatedSubmission)
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('API story update successful:', result);
                apiUpdateSuccessful = true;
                
                // If API returns updated submission, use that
                if (result.submission) {
                    allSubmissions[storyIndex] = result.submission;
                } else {
                    allSubmissions[storyIndex] = updatedSubmission;
                }
            } else {
                console.warn('API story update failed:', await response.text());
                // Fall back to localStorage update
            }
        } catch (apiError) {
            console.warn('Error updating story via API:', apiError);
            // Continue with localStorage update
        }
        
        // If API update failed, update localStorage
        if (!apiUpdateSuccessful) {
            // Update story in our data
            allSubmissions[storyIndex] = updatedSubmission;
            
            // Save to localStorage
            saveSubmissionsToLocalStorage();
            console.log('Updated story in localStorage as fallback');
        }
        
        // Close modal and refresh display
        closeModal('edit-story-modal');
        displaySubmissions();
        
        // Show success message
        alert('Story updated successfully!');
    } catch (error) {
        console.error('Error saving story:', error);
        alert('An error occurred while saving the story. Please try again.');
    }
}

/**
 * Delete a story
 * This overrides the existing deleteStory function
 */
async function deleteStory() {
    if (!currentStoryId) return;
    
    const adminToken = localStorage.getItem('appfoundry_admin_token');
    if (!adminToken) {
        alert('You must be logged in to delete stories.');
        return;
    }
    
    try {
        // First try to delete via API
        let apiDeleteSuccessful = false;
        
        try {
            const response = await fetch('/.netlify/functions/delete-submission', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${adminToken}`
                },
                body: JSON.stringify({ id: currentStoryId })
            });
            
            if (response.ok) {
                console.log('API delete successful');
                apiDeleteSuccessful = true;
            } else {
                console.warn('API delete failed:', await response.text());
                // Fall back to localStorage delete
            }
        } catch (apiError) {
            console.warn('Error deleting story via API:', apiError);
            // Continue with localStorage delete
        }
        
        // Always update localStorage whether API succeeded or not
        // Find the story index
        const storyIndex = allSubmissions.findIndex(s => s.id === currentStoryId);
        
        if (storyIndex === -1) {
            throw new Error('Story not found in local submissions.');
        }
        
        // Remove the story
        allSubmissions.splice(storyIndex, 1);
        
        // Save to localStorage
        saveSubmissionsToLocalStorage();
        
        // Close modal and refresh display
        closeModal('delete-modal');
        displaySubmissions();
        
        // Show success message
        if (apiDeleteSuccessful) {
            alert('Story deleted successfully from both API and localStorage!');
        } else {
            alert('Story removed from admin panel. API delete failed.');
        }
    } catch (error) {
        console.error('Error deleting story:', error);
        alert('An error occurred while deleting the story. Please try again.');
    }
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Save submissions to localStorage
 * This is a helper function used by several other functions
 */
function saveSubmissionsToLocalStorage() {
    try {
        localStorage.setItem('appfoundry_submissions', JSON.stringify(allSubmissions));
        console.log('Saved submissions to localStorage:', allSubmissions.length);
        return true;
    } catch (error) {
        console.error('Error saving to localStorage:', error);
        return false;
    }
}
