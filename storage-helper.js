/**
 * Enhanced Storage Helper with Cloudinary Support
 * This script provides robust cross-domain storage management for the AppFoundry success stories
 * and includes support for Cloudinary image URLs
 */

// Create the StorageHelper namespace if it doesn't exist
window.StorageHelper = window.StorageHelper || {};

// The primary domain to use for storage
const PRIMARY_DOMAIN = 'claudeappbuilder.netlify.app';

// Check if we're on the primary domain
const isOnPrimaryDomain = window.location.hostname === PRIMARY_DOMAIN;
const isDeployPreview = window.location.hostname.includes('--claudeappbuilder.netlify.app');

// Storage keys
const SUBMISSIONS_KEY = 'appfoundry_submissions';
const BACKUP_KEY = 'appfoundry_approved_seed';
const LAST_SYNC_KEY = 'appfoundry_last_sync';

// Initialize storage system - run this immediately
(function initStorage() {
    console.log("📊 Enhanced StorageHelper initializing");
    console.log("📍 Current hostname:", window.location.hostname);
    console.log("📍 Is primary domain:", isOnPrimaryDomain);
    console.log("📍 Is deploy preview:", isDeployPreview);
    
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
 * Helper function to get image URL - handles both Cloudinary and base64 images
 * @param {string|Object} image - The image (either base64 string or Cloudinary object)
 * @param {Object} options - Optional sizing parameters
 * @returns {string} - URL to display the image
 */
StorageHelper.getImageSrc = function(image, options = {}) {
    // If it's a Cloudinary object
    if (image && typeof image === 'object' && image.url) {
        return image.url;
    }
    
    // If it's a Cloudinary URL string
    if (typeof image === 'string' && image.includes('res.cloudinary.com')) {
        return image;
    }
    
    // If it's a base64 string
    if (typeof image === 'string' && image.startsWith('data:')) {
        return image;
    }
    
    // If it's a regular URL
    if (typeof image === 'string' && (image.startsWith('http://') || image.startsWith('https://'))) {
        return image;
    }
    
    // Fallback to placeholder
    return 'https://placeholder.pics/svg/300x200/DEDEDE/555555/Image%20Not%20Available';
};

/**
 * Get all approved submissions
 * @returns {Array} Array of approved submissions
 */
StorageHelper.getApprovedSubmissions = function() {
    const allSubmissions = this.getSubmissions();
    const approved = allSubmissions.filter(submission => submission.status === 'approved');
    
    // If no approved submissions found, check if we can populate with sample data
    if (approved.length === 0) {
        console.log("⚠️ No approved submissions found, checking if we need sample data");
        
        // Try the backup key directly
        try {
            const backupData = localStorage.getItem(BACKUP_KEY);
            if (backupData) {
                const backup = JSON.parse(backupData);
                const approvedBackup = backup.filter(sub => sub.status === 'approved');
                
                if (approvedBackup.length > 0) {
                    console.log("✅ Found approved stories in backup:", approvedBackup.length);
                    return approvedBackup;
                }
            }
        } catch (e) {
            console.error("❌ Error checking backup for approved stories:", e);
        }
        
        // If needed and we're in the right context, provide sample data
        if (window.location.pathname.includes('success-stories')) {
            console.log("📝 Providing sample data for success stories page");
            return [
                {
                    id: 'sample_1',
                    name: 'Sarah Johnson',
                    appName: 'SleepTrack',
                    appType: 'Health & Fitness',
                    testimonial: '"I had zero coding experience but managed to build a sleep tracking app in just 3 weeks using the AppFoundry method. The step-by-step process made it so easy!"',
                    story: 'I\'ve always wanted to create an app to help with my sleep tracking, but I was intimidated by the coding required. When I found the AppFoundry course, I was skeptical that I could really build something without coding knowledge, but I decided to give it a try.\n\nThe step-by-step guidance was incredible. I followed each module, and within 3 weeks, I had a working app that tracks sleep patterns, sends reminders, and even generates reports. My friends were shocked when I told them I built it myself without writing code!\n\nThe most valuable part was learning how to communicate effectively with Claude AI to get exactly what I wanted. Now I can make changes and improvements whenever I need to, without being dependent on expensive developers.\n\nThanks to AppFoundry, I\'ve gone from having zero technical skills to being able to bring my ideas to life independently!',
                    images: ['https://placeholder.pics/svg/300x200/DEDEDE/555555/SleepTrack%20App'],
                    date: '2025-04-15T10:30:00Z',
                    status: 'approved'
                },
                {
                    id: 'sample_2',
                    name: 'Michael Chen',
                    appName: 'RecipeKeeper',
                    appType: 'Lifestyle',
                    testimonial: '"I\'ve been wanting to build this app for years but was intimidated by coding. The AppFoundry course made it possible for me to create exactly what I envisioned!"',
                    story: 'As someone who loves cooking, I\'ve always wanted a custom recipe app that works exactly how I want it to. I looked at existing apps, but none of them had the specific features I needed.\n\nI had no coding experience and quotes from developers were way out of my budget. When I discovered AppFoundry, it seemed too good to be true - build my own custom app without coding?\n\nBut it actually worked! Following the course, I was able to create a recipe app that lets me organize recipes by cuisine, dietary restrictions, and cooking time. It even has a meal planning feature that I designed myself!\n\nThe best part is that I can continue to improve it whenever I want. Last week I added a feature to automatically generate shopping lists from selected recipes, and it took me just a few hours!',
                    images: ['https://placeholder.pics/svg/300x200/DEDEDE/555555/RecipeKeeper%20App'],
                    date: '2025-04-22T14:45:00Z',
                    status: 'approved'
                }
            ];
        }
    }
    
    return approved;
};

/**
 * Helper function to convert legacy base64 images to Cloudinary URLs
 * For use in future migration, doesn't actually upload to Cloudinary (that must be done server-side)
 * @param {Object} submission - The submission object to check
 * @returns {Object} - Same submission with base64 image indicator if needed
 */
StorageHelper.checkLegacyImages = function(submission) {
    if (!submission || !submission.images || !Array.isArray(submission.images)) {
        return submission;
    }
    
    // Check if any images are base64 and flag them for migration
    let hasBase64Images = false;
    submission.images.forEach(image => {
        if (typeof image === 'string' && image.startsWith('data:')) {
            hasBase64Images = true;
        }
    });
    
    // Add a flag if needed
    if (hasBase64Images) {
        submission._needsMigration = true;
    }
    
    return submission;
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
