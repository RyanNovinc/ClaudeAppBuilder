/**
 * Enhanced Storage Helper - Improved for AppFoundry success stories
 * This script ensures stories are loaded reliably across all pages
 */

// Create the StorageHelper namespace if it doesn't exist
window.StorageHelper = window.StorageHelper || {};

// Constants - storage keys
const SUBMISSIONS_KEY = 'appfoundry_submissions';
const BACKUP_KEY = 'appfoundry_approved_seed';
const LAST_SYNC_KEY = 'appfoundry_last_sync';

// Default seed data - sample success stories that will always be available
const DEFAULT_SEED_DATA = [
  {
    id: 'seed_1',
    name: 'Sarah Johnson',
    email: 'sarah@example.com',
    appName: 'SleepTrack',
    appType: 'Health & Fitness',
    experienceLevel: 'No experience',
    testimonial: '"I had zero coding experience but managed to build a sleep tracking app in just 3 weeks using the AppFoundry method. The step-by-step process made it so easy!"',
    story: 'I\'ve always wanted to create an app to help with my sleep tracking, but I was intimidated by the coding required. When I found the AppFoundry course, I was skeptical that I could really build something without coding knowledge, but I decided to give it a try.\n\nThe step-by-step guidance was incredible. I followed each module, and within 3 weeks, I had a working app that tracks sleep patterns, sends reminders, and even generates reports. My friends were shocked when I told them I built it myself without writing code!\n\nThe most valuable part was learning how to communicate effectively with Claude AI to get exactly what I wanted. Now I can make changes and improvements whenever I need to, without being dependent on expensive developers.\n\nThanks to AppFoundry, I\'ve gone from having zero technical skills to being able to bring my ideas to life independently!',
    images: ['https://placeholder.pics/svg/300x200', 'https://placeholder.pics/svg/300x200'],
    date: '2025-04-15T10:30:00Z',
    status: 'approved'
  },
  {
    id: 'seed_2',
    name: 'Michael Chen',
    email: 'michael@example.com',
    appName: 'RecipeKeeper',
    appType: 'Lifestyle',
    experienceLevel: 'Beginner',
    testimonial: '"I\'ve been wanting to build this app for years but was intimidated by coding. The AppFoundry course made it possible for me to create exactly what I envisioned!"',
    story: 'As someone who loves cooking, I\'ve always wanted a custom recipe app that works exactly how I want it to. I looked at existing apps, but none of them had the specific features I needed.\n\nI had no coding experience and quotes from developers were way out of my budget. When I discovered AppFoundry, it seemed too good to be true - build my own custom app without coding?\n\nBut it actually worked! Following the course, I was able to create a recipe app that lets me organize recipes by cuisine, dietary restrictions, and cooking time. It even has a meal planning feature that I designed myself!\n\nThe best part is that I can continue to improve it whenever I want. Last week I added a feature to automatically generate shopping lists from selected recipes, and it took me just a few hours!',
    images: ['https://placeholder.pics/svg/300x200'],
    date: '2025-04-22T14:45:00Z',
    status: 'approved'
  }
];

// Initialize storage system - run this immediately
(function initStorage() {
  console.log("📊 Enhanced StorageHelper initializing (v2)");
  
  // Check if we need to restore from backup or use seed data
  ensureSubmissionsExist();
  
  // Also run initialization when DOM is loaded
  document.addEventListener('DOMContentLoaded', function() {
    console.log("🌟 DOM loaded, ensuring submissions exist");
    ensureSubmissionsExist();
    
    // Special handling for success stories page - force refresh display if we're on that page
    if (window.location.pathname.includes('success-stories')) {
      console.log("📋 Success stories page detected, ensuring stories display");
      
      // If we already have a refreshDisplay function (defined in success-stories.html), call it
      if (typeof refreshStoriesDisplay === 'function') {
        console.log("🔄 Calling refreshStoriesDisplay function");
        setTimeout(refreshStoriesDisplay, 100);
      }
    }
  });
})();

/**
 * Core function to ensure submissions exist in localStorage
 * This handles initialization, restoration from backup, and seeding with default data
 */
function ensureSubmissionsExist() {
  try {
    // First check if submissions exist
    const hasSubmissions = checkSubmissionsExist();
    
    if (!hasSubmissions) {
      console.log("🔍 No submissions found, attempting to restore");
      
      // Try to restore from backup
      const restoredFromBackup = restoreFromBackup();
      
      // If we couldn't restore from backup, use seed data
      if (!restoredFromBackup) {
        console.log("🌱 Using default seed data");
        localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(DEFAULT_SEED_DATA));
        
        // Also update backup with seed data
        localStorage.setItem(BACKUP_KEY, JSON.stringify(DEFAULT_SEED_DATA));
        console.log("✅ Default seed data applied with", DEFAULT_SEED_DATA.length, "stories");
        
        return true;
      }
      
      return true;
    } else {
      // Make sure backup is up to date
      updateBackup();
      return true;
    }
  } catch (error) {
    console.error("❌ Error in ensureSubmissionsExist:", error);
    return false;
  }
}

/**
 * Check if submissions exist in localStorage
 * @returns {boolean} True if submissions exist
 */
function checkSubmissionsExist() {
  try {
    const storedSubmissions = localStorage.getItem(SUBMISSIONS_KEY);
    
    if (!storedSubmissions) {
      return false;
    }
    
    const submissions = JSON.parse(storedSubmissions);
    return Array.isArray(submissions) && submissions.length > 0;
  } catch (error) {
    console.error("❌ Error checking submissions:", error);
    return false;
  }
}

/**
 * Attempt to restore submissions from backup
 * @returns {boolean} True if successfully restored
 */
function restoreFromBackup() {
  try {
    const backupData = localStorage.getItem(BACKUP_KEY);
    
    if (!backupData) {
      console.log("⚠️ No backup data found");
      return false;
    }
    
    const backup = JSON.parse(backupData);
    
    if (!Array.isArray(backup) || backup.length === 0) {
      console.log("⚠️ Backup data is invalid or empty");
      return false;
    }
    
    localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(backup));
    console.log("✅ Successfully restored from backup:", backup.length, "stories");
    return true;
  } catch (error) {
    console.error("❌ Error restoring from backup:", error);
    return false;
  }
}

/**
 * Update backup with current submissions
 */
function updateBackup() {
  try {
    const storedSubmissions = localStorage.getItem(SUBMISSIONS_KEY);
    
    if (storedSubmissions) {
      localStorage.setItem(BACKUP_KEY, storedSubmissions);
      console.log("💾 Backup updated with current submissions");
    }
  } catch (error) {
    console.error("❌ Error updating backup:", error);
  }
}

/**
 * Get all submissions from localStorage
 * @returns {Array} Array of submissions or empty array if none found
 */
StorageHelper.getSubmissions = function() {
  try {
    // Ensure submissions exist first
    ensureSubmissionsExist();
    
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
 * Get all approved submissions
 * @returns {Array} Array of approved submissions
 */
StorageHelper.getApprovedSubmissions = function() {
  try {
    // Ensure submissions exist first
    ensureSubmissionsExist();
    
    const allSubmissions = this.getSubmissions();
    return allSubmissions.filter(submission => submission.status === 'approved');
  } catch (error) {
    console.error('Error getting approved submissions:', error);
    return [];
  }
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

// Additional function to manually trigger a refresh of story displays
function refreshStoriesDisplay() {
  // This function will be called on the success stories page
  console.log("🔄 Manual refresh of stories display triggered");
  
  // If we're on the success-stories page
  if (window.location.pathname.includes('success-stories')) {
    console.log("📋 On success stories page, attempting display refresh");
    
    // Check if specific page functions exist and call them
    if (typeof displayStories === 'function') {
      console.log("🔄 Found displayStories function, calling it");
      
      // We need to give a parameter to this function
      // Get approved stories
      const approvedStories = StorageHelper.getApprovedSubmissions();
      displayStories(approvedStories);
      return true;
    }
    
    // For the admin page
    if (typeof displaySubmissions === 'function') {
      console.log("🔄 Found displaySubmissions function, calling it");
      displaySubmissions();
      return true;
    }
  }
  
  return false;
}

// Make refreshStoriesDisplay globally available
window.refreshStoriesDisplay = refreshStoriesDisplay;

// Log that we're ready
console.log("🚀 Enhanced StorageHelper initialized and ready to use");
