/**
 * Enhanced Storage Helper with Supabase & Cloudinary Support
 * This script provides robust cross-domain storage management for the AppFoundry success stories
 * with Supabase as the primary data store and fallback to localStorage
 */

// Create the StorageHelper namespace if it doesn't exist
window.StorageHelper = window.StorageHelper || {};

// Initialize Supabase client
const SUPABASE_URL = 'https://your-project-id.supabase.co';
const SUPABASE_ANON_KEY = 'your-supabase-anon-key';

// Create the Supabase client
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// The primary domain to use for storage
const PRIMARY_DOMAIN = 'claudeappbuilder.netlify.app';

// Check if we're on the primary domain
const isOnPrimaryDomain = window.location.hostname === PRIMARY_DOMAIN;
const isDeployPreview = window.location.hostname.includes('--claudeappbuilder.netlify.app');

// Storage keys for localStorage fallback
const SUBMISSIONS_KEY = 'appfoundry_submissions';
const BACKUP_KEY = 'appfoundry_approved_seed';
const LAST_SYNC_KEY = 'appfoundry_last_sync';

// Initialize storage system - run this immediately
(function initStorage() {
    console.log("📊 Enhanced StorageHelper initializing with Supabase");
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
    
    // Sync with Supabase to ensure we have the latest data
    StorageHelper.syncFromSupabase().then(() => {
        console.log("🔄 Initial Supabase sync completed");
    }).catch(error => {
        console.error("❌ Error during initial Supabase sync:", error);
    });
})();

/**
 * Get all submissions from Supabase with fallback to localStorage
 * @param {string} status Optional filter by status (approved, pending, rejected)
 * @returns {Promise<Array>} Array of submissions
 */
StorageHelper.getSubmissions = async function(status = null) {
    try {
        // Try to get submissions from Supabase first
        let query = supabase.from('submissions')
            .select('*')
            .order('created_at', { ascending: false });
            
        if (status && status !== 'all') {
            query = query.eq('status', status);
        }
            
        const { data, error } = await query;
            
        if (error) throw error;
            
        // Format submissions to match the expected structure
        const formattedSubmissions = data.map(submission => ({
            id: submission.id,
            name: submission.name,
            email: submission.email,
            appName: submission.app_name,
            appType: submission.app_type,
            experienceLevel: submission.experience_level,
            testimonial: submission.testimonial,
            story: submission.story,
            status: submission.status,
            date: submission.created_at,
            images: this.processCloudinaryImages(submission.cloudinary_images)
        }));
            
        // Update localStorage as a fallback
        localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(formattedSubmissions));
            
        return formattedSubmissions;
    } catch (error) {
        console.error('Error getting submissions from Supabase:', error);
        
        // Fallback to localStorage if Supabase fails
        return this.getSubmissionsFromLocalStorage(status);
    }
};

/**
 * Helper to get submissions from localStorage
 * @param {string} status Optional filter by status
 * @returns {Array} Array of submissions
 */
StorageHelper.getSubmissionsFromLocalStorage = function(status = null) {
    try {
        const storedSubmissions = localStorage.getItem(SUBMISSIONS_KEY);
        if (storedSubmissions) {
            const submissions = JSON.parse(storedSubmissions);
            
            // Filter by status if provided
            if (status && status !== 'all') {
                return submissions.filter(sub => sub.status === status);
            }
            
            return submissions;
        }
    } catch (error) {
        console.error('Error getting submissions from localStorage:', error);
    }
    return [];
};

/**
 * Process Cloudinary images from Supabase
 * @param {Array|string} cloudinaryImages Array or JSON string of Cloudinary URLs
 * @returns {Array} Array of image URLs
 */
StorageHelper.processCloudinaryImages = function(cloudinaryImages) {
    if (!cloudinaryImages) return [];
    
    try {
        // If it's a string (JSON), parse it
        if (typeof cloudinaryImages === 'string') {
            return JSON.parse(cloudinaryImages);
        }
        
        // If it's already an array, return it
        if (Array.isArray(cloudinaryImages)) {
            return cloudinaryImages;
        }
    } catch (error) {
        console.error('Error processing Cloudinary images:', error);
    }
    
    return [];
};

/**
 * Add a new submission to Supabase
 * @param {Object} submission The submission object to add
 * @returns {Promise<boolean>} Success status
 */
StorageHelper.addSubmission = async function(submission) {
    try {
        // Format the submission for Supabase
        const supabaseSubmission = {
            id: submission.id,
            name: submission.name,
            email: submission.email,
            app_name: submission.appName,
            app_type: submission.appType,
            experience_level: submission.experienceLevel,
            testimonial: submission.testimonial,
            story: submission.story,
            status: 'pending', // Always start as pending
            cloudinary_images: JSON.stringify(submission.images || []),
            created_at: new Date().toISOString()
        };
        
        // Insert into Supabase
        const { data, error } = await supabase
            .from('submissions')
            .insert([supabaseSubmission])
            .select();
            
        if (error) throw error;
        
        // Add to localStorage as a fallback
        const existingSubmissions = this.getSubmissionsFromLocalStorage();
        existingSubmissions.unshift(submission);
        localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(existingSubmissions));
        
        console.log('Successfully added submission to Supabase:', submission.id);
        return true;
    } catch (error) {
        console.error('Error adding submission to Supabase:', error);
        
        // Try to add to localStorage as a fallback
        try {
            const existingSubmissions = this.getSubmissionsFromLocalStorage();
            existingSubmissions.unshift(submission);
            localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(existingSubmissions));
            console.log('Added submission to localStorage as fallback:', submission.id);
            return true;
        } catch (localError) {
            console.error('Error adding to localStorage fallback:', localError);
            return false;
        }
    }
};

/**
 * Update an existing submission in Supabase
 * @param {string} id The ID of the submission to update
 * @param {Object} updates The properties to update
 * @returns {Promise<boolean>} Success status
 */
StorageHelper.updateSubmission = async function(id, updates) {
    try {
        // Format the updates for Supabase
        const supabaseUpdates = {};
        
        if (updates.name) supabaseUpdates.name = updates.name;
        if (updates.email) supabaseUpdates.email = updates.email;
        if (updates.appName) supabaseUpdates.app_name = updates.appName;
        if (updates.appType) supabaseUpdates.app_type = updates.appType;
        if (updates.experienceLevel) supabaseUpdates.experience_level = updates.experienceLevel;
        if (updates.testimonial) supabaseUpdates.testimonial = updates.testimonial;
        if (updates.story) supabaseUpdates.story = updates.story;
        if (updates.status) supabaseUpdates.status = updates.status;
        if (updates.images) supabaseUpdates.cloudinary_images = JSON.stringify(updates.images);
        
        // Update in Supabase
        const { data, error } = await supabase
            .from('submissions')
            .update(supabaseUpdates)
            .eq('id', id)
            .select();
            
        if (error) throw error;
        
        // Update in localStorage as a fallback
        this.updateSubmissionInLocalStorage(id, updates);
        
        console.log('Successfully updated submission in Supabase:', id);
        return true;
    } catch (error) {
        console.error('Error updating submission in Supabase:', error);
        
        // Try to update in localStorage as a fallback
        const success = this.updateSubmissionInLocalStorage(id, updates);
        return success;
    }
};

/**
 * Update submission in localStorage as a fallback
 * @param {string} id The ID of the submission to update
 * @param {Object} updates The properties to update
 * @returns {boolean} Success status
 */
StorageHelper.updateSubmissionInLocalStorage = function(id, updates) {
    try {
        // Get existing submissions
        const existingSubmissions = this.getSubmissionsFromLocalStorage();
        
        // Find the index of the submission to update
        const submissionIndex = existingSubmissions.findIndex(s => s.id === id);
        
        if (submissionIndex === -1) {
            console.error('Submission not found in localStorage:', id);
            return false;
        }
        
        // Update the submission with the new properties
        existingSubmissions[submissionIndex] = {
            ...existingSubmissions[submissionIndex],
            ...updates
        };
        
        // Save back to localStorage
        localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(existingSubmissions));
        
        // Update the backup too
        localStorage.setItem(BACKUP_KEY, JSON.stringify(
            existingSubmissions.filter(s => s.status === 'approved')
        ));
        
        console.log('Successfully updated submission in localStorage:', id);
        return true;
    } catch (error) {
        console.error('Error updating submission in localStorage:', error);
        return false;
    }
};

/**
 * Helper function to get image URL - handles both Cloudinary and base64 images
 * @param {string|Object} image - The image (either base64 string or Cloudinary object/URL)
 * @param {Object} options - Optional sizing parameters
 * @returns {string} - URL to display the image
 */
StorageHelper.getImageSrc = function(image, options = {}) {
    // If it's a Cloudinary object
    if (image && typeof image === 'object' && image.url) {
        console.log("Using Cloudinary object URL:", image.url);
        return image.url;
    }
    
    // If it's a Cloudinary URL string
    if (typeof image === 'string' && image.includes('res.cloudinary.com')) {
        console.log("Using Cloudinary string URL:", image);
        return image;
    }
    
    // If it's a base64 string
    if (typeof image === 'string' && image.startsWith('data:')) {
        console.log("Using base64 image (should be migrated)");
        return image;
    }
    
    // If it's a regular URL
    if (typeof image === 'string' && (image.startsWith('http://') || image.startsWith('https://'))) {
        console.log("Using standard image URL:", image);
        return image;
    }
    
    // Fallback to placeholder
    console.log("No valid image found, using placeholder");
    return 'https://placeholder.pics/svg/300x200/DEDEDE/555555/Image%20Not%20Available';
};

/**
 * Get all approved submissions from Supabase
 * @returns {Promise<Array>} Array of approved submissions
 */
StorageHelper.getApprovedSubmissions = async function() {
    try {
        const { data, error } = await supabase
            .from('submissions')
            .select('*')
            .eq('status', 'approved')
            .order('created_at', { ascending: false });
            
        if (error) throw error;
        
        // Format submissions to match the expected structure
        const formattedSubmissions = data.map(submission => ({
            id: submission.id,
            name: submission.name,
            email: submission.email,
            appName: submission.app_name,
            appType: submission.app_type,
            experienceLevel: submission.experience_level,
            testimonial: submission.testimonial,
            story: submission.story,
            status: submission.status,
            date: submission.created_at,
            images: this.processCloudinaryImages(submission.cloudinary_images)
        }));
        
        if (formattedSubmissions.length === 0) {
            // If no approved submissions, fall back to localStorage or provide sample data
            return this.getApprovedSubmissionsFromLocalStorage();
        }
        
        return formattedSubmissions;
    } catch (error) {
        console.error('Error getting approved submissions from Supabase:', error);
        
        // Fallback to localStorage
        return this.getApprovedSubmissionsFromLocalStorage();
    }
};

/**
 * Get approved submissions from localStorage as a fallback
 * @returns {Array} Array of approved submissions
 */
StorageHelper.getApprovedSubmissionsFromLocalStorage = function() {
    const allSubmissions = this.getSubmissionsFromLocalStorage();
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
 * Helper function to check legacy base64 images
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

/**
 * Sync submissions from Supabase to localStorage
 * @returns {Promise<boolean>} Success status
 */
StorageHelper.syncFromSupabase = async function() {
    try {
        console.log("🔄 Starting Supabase sync...");
        
        // Fetch all submissions from Supabase
        const { data, error } = await supabase
            .from('submissions')
            .select('*')
            .order('created_at', { ascending: false });
            
        if (error) throw error;
        
        if (Array.isArray(data) && data.length > 0) {
            console.log(`📦 Received ${data.length} submissions from Supabase`);
            
            // Format submissions to match the expected structure
            const formattedSubmissions = data.map(submission => ({
                id: submission.id,
                name: submission.name,
                email: submission.email,
                appName: submission.app_name,
                appType: submission.app_type,
                experienceLevel: submission.experience_level,
                testimonial: submission.testimonial,
                story: submission.story,
                status: submission.status,
                date: submission.created_at,
                images: this.processCloudinaryImages(submission.cloudinary_images)
            }));
            
            // Save to localStorage
            localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(formattedSubmissions));
            
            // Update the backup as well
            localStorage.setItem(BACKUP_KEY, JSON.stringify(
                formattedSubmissions.filter(s => s.status === 'approved')
            ));
            
            // Update last sync timestamp
            localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
            
            console.log(`✅ Successfully synced ${formattedSubmissions.length} submissions from Supabase`);
            return true;
        } else {
            console.warn("⚠️ Supabase returned empty or invalid submissions array");
            return false;
        }
    } catch (error) {
        console.error("❌ Error syncing from Supabase:", error);
        return false;
    }
};

// Periodic check for Supabase updates
(async function checkForUpdates() {
    // Only run on success stories page
    if (window.location.pathname.includes('success-stories')) {
        try {
            await StorageHelper.syncFromSupabase();
            
            // Reload approved stories if we're on the success stories page
            if (typeof loadApprovedStories === 'function') {
                setTimeout(() => {
                    loadApprovedStories();
                }, 500);
            }
        } catch (error) {
            console.warn("⚠️ Error during update check:", error);
        }
    }
})();

// Make sure we load stories as soon as possible for maximum compatibility
document.addEventListener('DOMContentLoaded', function() {
    console.log("📄 DOM loaded, making sure storage is initialized");
    
    // Try to pre-load approved stories if we're on the success stories page
    if (window.location.pathname.includes('success-stories')) {
        console.log("🔍 Success stories page detected, pre-loading approved stories");
        StorageHelper.getApprovedSubmissions().then(approvedStories => {
            console.log("📊 Found", approvedStories.length, "approved stories");
        }).catch(error => {
            console.error("❌ Error pre-loading approved stories:", error);
        });
    }
});

// Force initialization right away
console.log("🚀 StorageHelper initialized with Supabase integration and ready to use");
