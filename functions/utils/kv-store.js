// functions/utils/kv-store.js
const { NetlifyKV } = require('@netlify/blobs');

/**
 * Stores a new success story submission
 * @param {Object} submission - The success story submission data
 * @returns {Promise<string>} - The submission ID
 */
async function storeSubmission(submission) {
  try {
    const store = new NetlifyKV({ name: 'success-stories' });
    await store.set(`submission-${submission.id}`, JSON.stringify(submission));
    return submission.id;
  } catch (error) {
    console.error('Error storing submission:', error);
    throw error;
  }
}

/**
 * Retrieves all success story submissions
 * @returns {Promise<Array>} - Array of submission objects
 */
async function getSubmissions() {
  try {
    const store = new NetlifyKV({ name: 'success-stories' });
    const keys = await store.list({ prefix: 'submission-' });
    
    const submissions = [];
    for (const key of keys) {
      const data = await store.get(key);
      try {
        const submission = JSON.parse(data);
        submissions.push(submission);
      } catch (e) {
        console.error(`Error parsing submission ${key}:`, e);
      }
    }
    
    return submissions;
  } catch (error) {
    console.error('Error getting submissions:', error);
    
    // Fallback to demo data if there's an error
    return getDemoSubmissions();
  }
}

/**
 * Retrieves approved success story submissions
 * @returns {Promise<Array>} - Array of approved submission objects
 */
async function getApprovedSubmissions() {
  try {
    const submissions = await getSubmissions();
    return submissions.filter(s => s.status === 'approved');
  } catch (error) {
    console.error('Error getting approved submissions:', error);
    return getDemoSubmissions().filter(s => s.status === 'approved');
  }
}

/**
 * Updates a submission's status
 * @param {string} id - The submission ID
 * @param {string} status - The new status (pending, approved, rejected)
 * @returns {Promise<Object|null>} - The updated submission or null if not found
 */
async function updateSubmissionStatus(id, status) {
  try {
    const store = new NetlifyKV({ name: 'success-stories' });
    const key = `submission-${id}`;
    const data = await store.get(key);
    
    if (!data) return null;
    
    const submission = JSON.parse(data);
    submission.status = status;
    await store.set(key, JSON.stringify(submission));
    
    return submission;
  } catch (error) {
    console.error(`Error updating submission status for ${id}:`, error);
    throw error;
  }
}

/**
 * Updates a submission
 * @param {Object} submission - The submission object with updates
 * @returns {Promise<Object|null>} - The updated submission or null if not found
 */
async function updateSubmission(submission) {
  try {
    const store = new NetlifyKV({ name: 'success-stories' });
    const key = `submission-${submission.id}`;
    
    // Check if the submission exists
    const exists = await store.get(key);
    if (!exists) return null;
    
    // Update the submission
    await store.set(key, JSON.stringify(submission));
    
    return submission;
  } catch (error) {
    console.error(`Error updating submission ${submission.id}:`, error);
    throw error;
  }
}

/**
 * Deletes a submission
 * @param {string} id - The submission ID
 * @returns {Promise<boolean>} - True if deleted, false if not found
 */
async function deleteSubmission(id) {
  try {
    const store = new NetlifyKV({ name: 'success-stories' });
    const key = `submission-${id}`;
    
    // Check if the submission exists
    const exists = await store.get(key);
    if (!exists) return false;
    
    // Delete the submission
    await store.delete(key);
    
    return true;
  } catch (error) {
    console.error(`Error deleting submission ${id}:`, error);
    throw error;
  }
}

/**
 * Returns demo submissions for testing
 * @returns {Array} - Array of demo submission objects
 */
function getDemoSubmissions() {
  return [
    {
      id: '1',
      name: 'Sarah Johnson',
      email: 'sarah@example.com',
      appName: 'SleepTrack',
      appType: 'Health & Fitness',
      date: '2025-04-15T10:30:00Z',
      status: 'approved',
      testimonial: '"I had zero coding experience but managed to build a sleep tracking app in just 3 weeks using the AppFoundry method. The step-by-step process made it so easy!"',
      story: 'I\'ve always wanted to create an app to help with my sleep tracking, but I was intimidated by the coding required. When I found the AppFoundry course, I was skeptical that I could really build something without coding knowledge, but I decided to give it a try.\n\nThe step-by-step guidance was incredible. I followed each module, and within 3 weeks, I had a working app that tracks sleep patterns, sends reminders, and even generates reports. My friends were shocked when I told them I built it myself without writing code!\n\nThe most valuable part was learning how to communicate effectively with Claude AI to get exactly what I wanted. Now I can make changes and improvements whenever I need to, without being dependent on expensive developers.\n\nThanks to AppFoundry, I\'ve gone from having zero technical skills to being able to bring my ideas to life independently!',
      images: ['https://placeholder.pics/svg/300x200', 'https://placeholder.pics/svg/300x200']
    },
    {
      id: '2',
      name: 'Michael Chen',
      email: 'michael@example.com',
      appName: 'RecipeKeeper',
      appType: 'Lifestyle',
      date: '2025-04-22T14:45:00Z',
      status: 'pending',
      testimonial: '"I\'ve been wanting to build this app for years but was intimidated by coding. The AppFoundry course made it possible for me to create exactly what I envisioned!"',
      story: 'As someone who loves cooking, I\'ve always wanted a custom recipe app that works exactly how I want it to. I looked at existing apps, but none of them had the specific features I needed.\n\nI had no coding experience and quotes from developers were way out of my budget. When I discovered AppFoundry, it seemed too good to be true - build my own custom app without coding?\n\nBut it actually worked! Following the course, I was able to create a recipe app that lets me organize recipes by cuisine, dietary restrictions, and cooking time. It even has a meal planning feature that I designed myself!\n\nThe best part is that I can continue to improve it whenever I want. Last week I added a feature to automatically generate shopping lists from selected recipes, and it took me just a few hours!',
      images: ['https://placeholder.pics/svg/300x200']
    }
  ];
}

module.exports = {
  storeSubmission,
  getSubmissions,
  getApprovedSubmissions,
  updateSubmissionStatus,
  updateSubmission,
  deleteSubmission
};
