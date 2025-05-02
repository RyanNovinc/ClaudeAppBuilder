/**
 * Enhanced Storage Helper
 * This script provides robust cross-domain storage management for the AppFoundry success stories
 */

// Create the StorageHelper namespace if it doesn't exist
window.StorageHelper = window.StorageHelper || {};

// The primary domain to use for storage
const PRIMARY_DOMAIN = 'claudeappbuilder.netlify.app';

// Check if we're on the primary domain
const isOnPrimaryDomain = window.location.hostname === PRIMARY_DOMAIN;

// Storage keys
const SUBMISSIONS_KEY = 'appfoundry_submissions';
const BACKUP_KEY = 'appfoundry_approved_seed';
const LAST_SYNC_KEY = 'appfoundry_last_sync';

// Initialize storage system - run this immediately
(function initStorage() {
    console.log("📊 Enhanced StorageHelper initializing");
    
    // Try to seed from backup if main storage is empty
    if (!localStorage.getItem(SUBMISSIONS_KEY)) {
        console.log("🔍 No submissions found in localStorage, checking for backup data");
        
        const backupData = localStorage.getItem(BACKUP_KEY);
        if (backupData) {
            try {
                const seed = JSON.parse(backupData);
                localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(seed));
                console.log("✅ Successfully restored from backup seed:", seed.length, "stories");
            } catch (e) {
                console.error("❌ Error restoring from backup:", e);
            }
        }
    }
    
    // If we have submissions, always update the backup
    try {
        const storedSubmissions = localStorage.getItem(SUBMISSIONS_KEY);
        if (storedSubmissions) {
            localStorage.setItem(BACKUP_KEY, storedSubmissions);
            console.log("💾 Backup updated with current submissions data");
        }
    } catch (e) {
        console.error("❌ Error updating backup:", e);
    }
})();

/**
 * Get all submissions from localStorage
 * @returns {Array} Array of submissions or empty array if none found
 */
StorageHelper.getSubmissions = function() {
    try {
        const storedSubmissions = localStorage.getItem(SUBMISSIONS_KEY);
        if (storedSubmissions) {
            return JSON.parse(storedSubmissions);
        }
    } catch (error) {
        console.error('Error getting submissions from localStorage:', error);
    }
    return [];
};

/**
 * Add a new submission to localStorage
 * @param {Object} submission The submission object to add
 * @returns {boolean} Success status
 */
StorageHelper.addSubmission = function(submission) {
    try {
        // Get existing submissions
        const existingSubmissions = this.getSubmissions();
        
        // Add new submission to the beginning
        existingSubmissions.unshift(submission);
        
        // Save back to localStorage
        localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(existingSubmissions));
        
        // Update the backup
        localStorage.setItem(BACKUP_KEY, JSON.stringify(existingSubmissions));
        
        console.log('Successfully added submission:', submission.id);
        return true;
    } catch (error) {
        console.error('Error adding submission to localStorage:', error);
        return false;
    }
};

/**
 * Update an existing submission
 * @param {string} id The ID of the submission to update
 * @param {Object} updates The properties to update
 * @returns {boolean} Success status
 */
StorageHelper.updateSubmission = function(id, updates) {
    try {
        // Get existing submissions
        const existingSubmissions = this.getSubmissions();
        
        // Find the index of the submission to update
        const submissionIndex = existingSubmissions.findIndex(s => s.id === id);
        
        if (submissionIndex === -1) {
            console.error('Submission not found:', id);
            return false;
        }
        
        // Update the submission with the new properties
        existingSubmissions[submissionIndex] = {
            ...existingSubmissions[submissionIndex],
            ...updates
        };
        
        // Save back to localStorage
        localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(existingSubmissions));
        
        // Update the backup
        localStorage.setItem(BACKUP_KEY, JSON.stringify(existingSubmissions));
        
        console.log('Successfully updated submission:', id);
        return true;
    } catch (error) {
        console.error('Error updating submission in localStorage:', error);
        return false;
    }
};

/**
 * Get all approved submissions
 * @returns {Array} Array of approved submissions
 */
StorageHelper.getApprovedSubmissions = function() {
    const allSubmissions = this.getSubmissions();
    return allSubmissions.filter(submission => submission.status === 'approved');
};

// Make sure we load stories as soon as possible for maximum compatibility
document.addEventListener('DOMContentLoaded', function() {
    console.log("📄 DOM loaded, making sure storage is initialized");
    
    // Try to pre-load approved stories if we're on the success stories page
    if (window.location.pathname.includes('success-stories')) {
        console.log("🔍 Success stories page detected, pre-loading approved stories");
        const approvedStories = StorageHelper.getApprovedSubmissions();
        console.log("📊 Found", approvedStories.length, "approved stories");
    }
});

// Force initialization right away
console.log("🚀 StorageHelper initialized and ready to use");
