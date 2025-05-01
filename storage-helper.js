// AppFoundry Storage Helper
// This script provides consistent methods for working with localStorage
// It should be included in both the submission form and admin panel

// Define the storage namespace to avoid conflicts
const STORAGE_KEY = 'appfoundry_submissions';

// Storage Helper Object
const StorageHelper = {
    /**
     * Get all submissions from localStorage
     * @returns {Array} Array of submission objects
     */
    getSubmissions: function() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            if (data) {
                return JSON.parse(data);
            }
        } catch (error) {
            console.error('Error reading submissions from localStorage:', error);
        }
        return [];
    },

    /**
     * Save a new submission to localStorage
     * @param {Object} submission The submission object to save
     * @returns {Boolean} Success or failure
     */
    addSubmission: function(submission) {
        try {
            // Get existing submissions
            const submissions = this.getSubmissions();
            
            // Add new submission to the beginning
            submissions.unshift(submission);
            
            // Save back to localStorage
            localStorage.setItem(STORAGE_KEY, JSON.stringify(submissions));
            
            console.log('Successfully saved submission to localStorage:', submission.id);
            return true;
        } catch (error) {
            console.error('Error saving submission to localStorage:', error);
            return false;
        }
    },

    /**
     * Update an existing submission
     * @param {String} id The submission ID to update
     * @param {Object} updates The updates to apply
     * @returns {Boolean} Success or failure
     */
    updateSubmission: function(id, updates) {
        try {
            const submissions = this.getSubmissions();
            const index = submissions.findIndex(s => s.id === id);
            
            if (index === -1) {
                console.error('Submission not found:', id);
                return false;
            }
            
            // Apply updates
            submissions[index] = {...submissions[index], ...updates};
            
            // Save back to localStorage
            localStorage.setItem(STORAGE_KEY, JSON.stringify(submissions));
            
            console.log('Successfully updated submission:', id);
            return true;
        } catch (error) {
            console.error('Error updating submission:', error);
            return false;
        }
    },

    /**
     * Delete a submission
     * @param {String} id The submission ID to delete
     * @returns {Boolean} Success or failure
     */
    deleteSubmission: function(id) {
        try {
            const submissions = this.getSubmissions();
            const index = submissions.findIndex(s => s.id === id);
            
            if (index === -1) {
                console.error('Submission not found:', id);
                return false;
            }
            
            // Remove the submission
            submissions.splice(index, 1);
            
            // Save back to localStorage
            localStorage.setItem(STORAGE_KEY, JSON.stringify(submissions));
            
            console.log('Successfully deleted submission:', id);
            return true;
        } catch (error) {
            console.error('Error deleting submission:', error);
            return false;
        }
    },

    /**
     * Clear all submissions
     * @returns {Boolean} Success or failure
     */
    clearSubmissions: function() {
        try {
            localStorage.removeItem(STORAGE_KEY);
            console.log('Successfully cleared all submissions');
            return true;
        } catch (error) {
            console.error('Error clearing submissions:', error);
            return false;
        }
    },

    /**
     * Export submissions as JSON
     * @returns {String} JSON string
     */
    exportSubmissions: function() {
        return JSON.stringify(this.getSubmissions(), null, 2);
    },

    /**
     * Import submissions from JSON
     * @param {String} json JSON string of submissions
     * @returns {Boolean} Success or failure
     */
    importSubmissions: function(json) {
        try {
            const submissions = JSON.parse(json);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(submissions));
            console.log('Successfully imported submissions');
            return true;
        } catch (error) {
            console.error('Error importing submissions:', error);
            return false;
        }
    }
};
