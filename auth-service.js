// auth-service.js - Central authentication service for AppFoundry
// This handles all authentication-related functions in one place

/**
 * Authentication Service
 * 
 * This service handles all authentication-related functionality:
 * - User sign-in/sign-out
 * - Session management
 * - Course access verification
 * - Password reset
 * - Test mode handling
 */

// Supabase configuration
const SUPABASE_URL = 'https://vyzsauyekanaxevgxkyh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5enNhdXlla2FuYXhldmd4a3loIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYzMjgzOTIsImV4cCI6MjA2MTkwNDM5Mn0.VPs_JhAkoCUediOP4_0flNF9AURcQDH-Hfj8T0vi5_c';

class AuthService {
  constructor() {
    this.supabase = null;
    this.currentUser = null;
    this.isTestMode = false;
    this.initialized = false;
    this.initPromise = null; // Promise for initialization
    
    // Initialize the service
    this.initPromise = this._initialize();
  }
  
  /**
   * Initialize the authentication service
   * @private
   * @returns {Promise} Initialization promise
   */
  async _initialize() {
    try {
      console.log('[AuthService] Initializing...');
      
      // Check if test mode is enabled via URL parameter
      const urlParams = new URLSearchParams(window.location.search);
      this.isTestMode = urlParams.get('test_mode') === 'true';
      console.log('[AuthService] Test mode:', this.isTestMode);
      
      // Load Supabase client if not already loaded
      if (typeof supabase === 'undefined') {
        console.log('[AuthService] Loading Supabase client...');
        await this._loadSupabaseClient();
      }
      
      // Initialize Supabase client
      this.supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      
      // Check current session
      await this.refreshSession();
      
      this.initialized = true;
      console.log('[AuthService] Initialization complete');
      return true;
    } catch (error) {
      console.error('[AuthService] Initialization failed:', error);
      this.initialized = false;
      throw error;
    }
  }
  
  /**
   * Load the Supabase client library
   * @private
   * @returns {Promise} Resolves when library is loaded
   */
  _loadSupabaseClient() {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/@supabase/supabase-js@2';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
  
  /**
   * Ensure the service is initialized before performing operations
   * @private
   * @returns {Promise} Resolves when initialized
   */
  async _ensureInitialized() {
    if (!this.initialized) {
      return this.initPromise;
    }
    return Promise.resolve();
  }
  
  /**
   * Refresh the current session and user data
   * @returns {Promise<boolean>} Whether user is authenticated
   */
  async refreshSession() {
    await this._ensureInitialized();
    
    try {
      // Get current session
      const { data, error } = await this.supabase.auth.getSession();
      
      if (error) {
        throw error;
      }
      
      if (!data.session) {
        console.log('[AuthService] No active session found');
        this.currentUser = null;
        return false;
      }
      
      this.currentUser = data.session.user;
      console.log('[AuthService] Session found for user:', this.currentUser.email);
      
      // Check and update user data in users table
      await this._ensureUserData();
      
      return true;
    } catch (error) {
      console.error('[AuthService] Error refreshing session:', error);
      this.currentUser = null;
      return false;
    }
  }
  
  /**
   * Ensure user data exists and is up to date in the users table
   * @private
   * @returns {Promise} Resolves when data is verified
   */
  async _ensureUserData() {
    if (!this.currentUser) {
      return;
    }
    
    try {
      // Check if user exists in users table
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('id', this.currentUser.id)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 is "No rows found"
        console.error('[AuthService] Error fetching user data:', error);
        return;
      }
      
      if (!data) {
        // User doesn't exist in users table, create record
        console.log('[AuthService] Creating user record in users table');
        
        const { error: insertError } = await this.supabase
          .from('users')
          .insert([{
            id: this.currentUser.id,
            email: this.currentUser.email,
            name: this.currentUser.email.split('@')[0],
            test_mode: this.isTestMode,
            course_access: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]);
          
        if (insertError) {
          console.error('[AuthService] Error creating user record:', insertError);
        }
      } else if (!data.course_access) {
        // User exists but doesn't have course access, update it
        console.log('[AuthService] Updating course access for user');
        
        const { error: updateError } = await this.supabase
          .from('users')
          .update({
            course_access: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', this.currentUser.id);
          
        if (updateError) {
          console.error('[AuthService] Error updating course access:', updateError);
        }
      }
      
      // Update last login time
      const { error: loginError } = await this.supabase
        .from('users')
        .update({
          last_login: new Date().toISOString()
        })
        .eq('id', this.currentUser.id);
        
      if (loginError) {
        console.error('[AuthService] Error updating last login:', loginError);
      }
    } catch (error) {
      console.error('[AuthService] Error in _ensureUserData:', error);
    }
  }
  
  /**
   * Sign in a user with email and password
   * @param {string} email - User's email
   * @param {string} password - User's password
   * @returns {Promise<Object>} Result object with success status and user data
   */
  async signIn(email, password) {
    await this._ensureInitialized();
    
    try {
      console.log('[AuthService] Attempting to sign in user:', email);
      
      // First, clear any existing session to prevent conflicts
      await this.supabase.auth.signOut();
      
      // Attempt to sign in
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        console.error('[AuthService] Sign in error:', error);
        return {
          success: false,
          error: error.message
        };
      }
      
      this.currentUser = data.user;
      
      // Ensure user data exists and has course access
      await this._ensureUserData();
      
      // For backward compatibility
      const { data: userData } = await this.supabase
        .from('users')
        .select('test_mode')
        .eq('id', data.user.id)
        .single();
        
      // Set localStorage for backward compatibility
      if (userData?.test_mode || this.isTestMode) {
        localStorage.setItem('appfoundry_auth', 'true');
      } else {
        localStorage.setItem('sleeptech_auth', 'true');
      }
      localStorage.setItem('sleeptech_email', email);
      localStorage.setItem('sleeptech_login_time', new Date().getTime());
      localStorage.setItem('sleeptech_password_' + email, password);
      
      console.log('[AuthService] User signed in successfully:', email);
      
      return {
        success: true,
        user: data.user,
        testMode: userData?.test_mode || this.isTestMode
      };
    } catch (error) {
      console.error('[AuthService] Unexpected error during sign in:', error);
      return {
        success: false,
        error: 'An unexpected error occurred. Please try again.'
      };
    }
  }
  
  /**
   * Sign out the current user
   * @returns {Promise<Object>} Result object with success status
   */
  async signOut() {
    await this._ensureInitialized();
    
    try {
      console.log('[AuthService] Signing out user');
      
      // Sign out from Supabase
      const { error } = await this.supabase.auth.signOut();
      
      if (error) {
        console.error('[AuthService] Sign out error:', error);
        return {
          success: false,
          error: error.message
        };
      }
      
      // Clear current user
      this.currentUser = null;
      
      // Clear localStorage for backward compatibility
      localStorage.removeItem('sleeptech_auth');
      localStorage.removeItem('appfoundry_auth');
      localStorage.removeItem('sleeptech_email');
      localStorage.removeItem('sleeptech_login_time');
      
      console.log('[AuthService] User signed out successfully');
      
      return {
        success: true
      };
    } catch (error) {
      console.error('[AuthService] Unexpected error during sign out:', error);
      return {
        success: false,
        error: 'An unexpected error occurred. Please try again.'
      };
    }
  }
  
  /**
   * Request a password reset for a user
   * @param {string} email - User's email
   * @returns {Promise<Object>} Result object with success status
   */
  async requestPasswordReset(email) {
    await this._ensureInitialized();
    
    try {
      console.log('[AuthService] Requesting password reset for:', email);
      
      const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/index.html',
      });
      
      if (error) {
        console.error('[AuthService] Password reset request error:', error);
        return {
          success: false,
          error: error.message
        };
      }
      
      console.log('[AuthService] Password reset email sent successfully');
      
      return {
        success: true
      };
    } catch (error) {
      console.error('[AuthService] Unexpected error during password reset request:', error);
      return {
        success: false,
        error: 'An unexpected error occurred. Please try again.'
      };
    }
  }
  
  /**
   * Update the current user's password
   * @param {string} password - New password
   * @returns {Promise<Object>} Result object with success status
   */
  async updatePassword(password) {
    await this._ensureInitialized();
    
    try {
      console.log('[AuthService] Updating user password');
      
      const { data, error } = await this.supabase.auth.updateUser({
        password
      });
      
      if (error) {
        console.error('[AuthService] Password update error:', error);
        return {
          success: false,
          error: error.message
        };
      }
      
      // For backward compatibility
      if (data.user.email) {
        localStorage.setItem('sleeptech_password_' + data.user.email, password);
      }
      
      console.log('[AuthService] Password updated successfully');
      
      return {
        success: true,
        user: data.user
      };
    } catch (error) {
      console.error('[AuthService] Unexpected error during password update:', error);
      return {
        success: false,
        error: 'An unexpected error occurred. Please try again.'
      };
    }
  }
  
  /**
   * Check if the current user has course access
   * @returns {Promise<Object>} Result object with access status
   */
  async checkCourseAccess() {
    await this._ensureInitialized();
    
    // If in test mode, always grant access
    if (this.isTestMode) {
      return {
        hasAccess: true,
        isTestMode: true
      };
    }
    
    // If no user is logged in, no access
    if (!this.currentUser) {
      return {
        hasAccess: false,
        reason: 'not_authenticated'
      };
    }
    
    try {
      // Check course access in users table
      const { data, error } = await this.supabase
        .from('users')
        .select('course_access, test_mode')
        .eq('id', this.currentUser.id)
        .single();
      
      if (error) {
        console.error('[AuthService] Error checking course access:', error);
        // If error, assume access (better user experience)
        return {
          hasAccess: true,
          isTestMode: this.isTestMode
        };
      }
      
      // If no explicit course_access or it's false, update it to true
      if (!data || !data.course_access) {
        console.log('[AuthService] Granting course access to user');
        
        // Ensure user exists and has course access
        await this._ensureUserData();
        
        // Grant access anyway
        return {
          hasAccess: true,
          isTestMode: data?.test_mode || this.isTestMode
        };
      }
      
      return {
        hasAccess: true,
        isTestMode: data.test_mode || this.isTestMode
      };
    } catch (error) {
      console.error('[AuthService] Unexpected error checking course access:', error);
      // If error, assume access (better user experience)
      return {
        hasAccess: true,
        isTestMode: this.isTestMode
      };
    }
  }
  
  /**
   * Get the current user
   * @returns {Object|null} Current user object or null if not authenticated
   */
  getCurrentUser() {
    return this.currentUser;
  }
  
  /**
   * Check if a user is authenticated
   * @returns {boolean} Whether a user is authenticated
   */
  isAuthenticated() {
    return !!this.currentUser;
  }
  
  /**
   * Check if test mode is enabled
   * @returns {boolean} Whether test mode is enabled
   */
  isInTestMode() {
    return this.isTestMode;
  }
}

// Export a single instance to use throughout the application
const authService = new AuthService();
window.AuthService = authService; // Make available globally

// Export the service
export default authService;
