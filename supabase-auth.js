// supabase-auth.js - Client-side authentication library
// This file provides a unified interface for authentication operations

// Initialize Supabase client
const supabaseUrl = 'https://vyzsauyekanaxevgxkyh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5enNhdXlla2FuYXhldmd4a3loIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYzMjgzOTIsImV4cCI6MjA2MTkwNDM5Mn0.VPs_JhAkoCUediOP4_0flNF9AURcQDH-Hfj8T0vi5_c';

// Create supabase client
const createSupabaseClient = () => {
  // Check if Supabase library is loaded
  if (typeof supabase === 'undefined') {
    console.error('Supabase client library not found. Make sure to include the Supabase script in your HTML.');
    return null;
  }
  
  try {
    return supabase.createClient(supabaseUrl, supabaseAnonKey);
  } catch (error) {
    console.error('Failed to create Supabase client:', error);
    return null;
  }
};

// Get the Supabase client - create once and reuse
let supabaseClient;
const getSupabaseClient = () => {
  if (!supabaseClient) {
    supabaseClient = createSupabaseClient();
  }
  return supabaseClient;
};

// Auth functions
const SupabaseAuth = {
  /**
   * Check if a user is currently authenticated
   * @returns {Promise<Object>} Auth status information
   */
  checkAuthStatus: async function() {
    try {
      const client = getSupabaseClient();
      if (!client) {
        return this.fallbackToLocalStorage();
      }
      
      // First try Supabase
      const { data } = await client.auth.getSession();
      
      if (data.session) {
        try {
          // Check if user has course access and test mode status
          const { data: userData, error: userError } = await client
            .from('users')
            .select('test_mode, course_access, access_expires_at')
            .eq('id', data.session.user.id)
            .single();
          
          if (userError) throw userError;
          
          const isTestModeUser = userData?.test_mode || false;
          let hasCourseAccess = userData?.course_access || false;
          
          // Check if access has expired
          if (userData?.access_expires_at && new Date(userData.access_expires_at) < new Date()) {
            hasCourseAccess = false;
          }
          
          // Set localStorage for backward compatibility
          if (isTestModeUser) {
            localStorage.setItem('appfoundry_auth', 'true');
          } else {
            localStorage.setItem('sleeptech_auth', 'true');
          }
          localStorage.setItem('sleeptech_email', data.session.user.email);
          localStorage.setItem('sleeptech_login_time', new Date().getTime());
          
          return {
            isAuthenticated: hasCourseAccess,
            authEmail: data.session.user.email,
            isTestModeUser,
            userId: data.session.user.id,
            source: 'supabase'
          };
        } catch (userDataError) {
          console.error('Error fetching user data:', userDataError);
          
          // Still consider authenticated even if we couldn't fetch user data
          return {
            isAuthenticated: true,
            authEmail: data.session.user.email,
            isTestModeUser: false,
            userId: data.session.user.id,
            source: 'supabase',
            error: userDataError
          };
        }
      }
    } catch (error) {
      console.error('Supabase auth check error:', error);
    }
    
    // Fall back to localStorage if Supabase fails or has no session
    return this.fallbackToLocalStorage();
  },
  
  /**
   * Fall back to localStorage authentication
   * @returns {Object} Auth status from localStorage
   */
  fallbackToLocalStorage: function() {
    console.log('Falling back to localStorage authentication');
    
    const isLocallyAuthenticated = localStorage.getItem('sleeptech_auth') === 'true' || 
                                  localStorage.getItem('appfoundry_auth') === 'true';
    const authEmail = localStorage.getItem('sleeptech_email');
    const isTestModeUser = localStorage.getItem('appfoundry_auth') === 'true';
    
    // Check if the auth is expired (24 hours)
    let isAuthValid = false;
    const authTime = localStorage.getItem('sleeptech_login_time');
    
    if (authTime) {
      const now = new Date().getTime();
      const oneDay = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
      isAuthValid = (now - parseInt(authTime)) < oneDay;
    }
    
    return {
      isAuthenticated: isLocallyAuthenticated && isAuthValid,
      authEmail: authEmail,
      isTestModeUser: isTestModeUser,
      userId: null,
      source: 'localStorage'
    };
  },
  
  /**
   * Sign in a user with email and password
   * @param {string} email User's email
   * @param {string} password User's password
   * @returns {Promise<Object>} Sign in result
   */
  signIn: async function(email, password) {
    try {
      const client = getSupabaseClient();
      if (!client) {
        return this.fallbackSignIn(email, password);
      }
      
      const { data, error } = await client.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        console.error('Supabase sign in error:', error);
        return this.fallbackSignIn(email, password);
      }
      
      // Update last_login timestamp
      try {
        await client
          .from('users')
          .update({ 
            last_login: new Date().toISOString() 
          })
          .eq('id', data.user.id);
      } catch (updateError) {
        console.error('Error updating last login:', updateError);
      }
      
      // Get user data including test mode status
      const { data: userData, error: userError } = await client
        .from('users')
        .select('test_mode, course_access')
        .eq('id', data.user.id)
        .single();
      
      const isTestModeUser = userData?.test_mode || false;
      const hasCourseAccess = userData?.course_access || false;
      
      // Set localStorage for backward compatibility
      if (isTestModeUser) {
        localStorage.setItem('appfoundry_auth', 'true');
      } else {
        localStorage.setItem('sleeptech_auth', 'true');
      }
      localStorage.setItem('sleeptech_email', email);
      localStorage.setItem('sleeptech_login_time', new Date().getTime());
      localStorage.setItem('sleeptech_password_' + email, password);
      
      return { 
        success: true,
        user: data.user,
        hasCourseAccess,
        isTestModeUser,
        source: 'supabase'
      };
    } catch (error) {
      console.error('Error in Supabase sign in:', error);
      return this.fallbackSignIn(email, password);
    }
  },
  
  /**
   * Fallback sign in using localStorage
   * @param {string} email User's email
   * @param {string} password User's password
   * @returns {Object} Sign in result
   */
  fallbackSignIn: function(email, password) {
    console.log('Using fallback localStorage authentication');
    
    // Get stored password for this email
    const storedPassword = localStorage.getItem('sleeptech_password_' + email);
    
    // Check if credentials are valid
    let isValid = false;
    const urlParams = new URLSearchParams(window.location.search);
    const isTestMode = urlParams.get('test_mode') === 'true';
    
    if (storedPassword) {
      // If we have a stored password, validate against it
      isValid = password === storedPassword;
    } else if (isTestMode) {
      // In test mode without stored password, check basic format
      isValid = this.checkCredentials(email, password);
    } else {
      // For regular login without stored password, check credentials format
      isValid = this.checkCredentials(email, password);
      
      // Store the password for this new user
      if (isValid) {
        localStorage.setItem('sleeptech_password_' + email, password);
      }
    }
    
    if (isValid) {
      // Set authentication in localStorage
      if (isTestMode) {
        localStorage.setItem('appfoundry_auth', 'true');
      } else {
        localStorage.setItem('sleeptech_auth', 'true');
      }
      localStorage.setItem('sleeptech_email', email);
      localStorage.setItem('sleeptech_login_time', new Date().getTime());
      
      // Try to create/migrate user to Supabase (async, doesn't block)
      this.migrateToSupabase(email, password, isTestMode);
      
      return { 
        success: true,
        email: email,
        isTestModeUser: isTestMode,
        hasCourseAccess: true,
        source: 'localStorage'
      };
    }
    
    return { success: false, source: 'localStorage' };
  },
  
  /**
   * Sign out the current user
   * @returns {Promise<Object>} Sign out result
   */
  signOut: async function() {
    try {
      // Clear localStorage auth data
      localStorage.removeItem('sleeptech_auth');
      localStorage.removeItem('sleeptech_email');
      localStorage.removeItem('sleeptech_login_time');
      localStorage.removeItem('appfoundry_auth');
      
      // Sign out from Supabase
      const client = getSupabaseClient();
      if (client) {
        await client.auth.signOut();
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error signing out:', error);
      return { success: false, error };
    }
  },
  
  /**
   * Request a password reset email
   * @param {string} email User's email
   * @returns {Promise<Object>} Reset request result
   */
  requestPasswordReset: async function(email) {
    try {
      const client = getSupabaseClient();
      if (!client) {
        return { success: false, error: 'Supabase client not available' };
      }
      
      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset-password.html',
      });
      
      if (error) throw error;
      
      return { success: true };
    } catch (error) {
      console.error('Error requesting password reset:', error);
      return { success: false, error };
    }
  },
  
  /**
   * Update a user's password
   * @param {string} newPassword New password
   * @returns {Promise<Object>} Password update result
   */
  updatePassword: async function(newPassword) {
    try {
      const client = getSupabaseClient();
      if (!client) {
        return { success: false, error: 'Supabase client not available' };
      }
      
      const { data, error } = await client.auth.updateUser({
        password: newPassword
      });
      
      if (error) throw error;
      
      // Update localStorage for backward compatibility
      if (data.user?.email) {
        localStorage.setItem('sleeptech_password_' + data.user.email, newPassword);
      }
      
      return { success: true, user: data.user };
    } catch (error) {
      console.error('Error updating password:', error);
      return { success: false, error };
    }
  },
  
  /**
   * Attempt to migrate a localStorage user to Supabase
   * @param {string} email User's email
   * @param {string} password User's password
   * @param {boolean} isTestMode Whether this is a test mode user
   * @returns {Promise<Object>} Migration result
   */
  migrateToSupabase: async function(email, password, isTestMode) {
    try {
      console.log('Attempting to migrate user to Supabase:', email);
      
      const client = getSupabaseClient();
      if (!client) {
        return { success: false, error: 'Supabase client not available' };
      }
      
      // First try to sign in to check if user exists
      const { error: signInError } = await client.auth.signInWithPassword({
        email,
        password
      });
      
      if (!signInError) {
        console.log('User already exists in Supabase');
        return { success: true, action: 'none' };
      }
      
      // Create the user in Supabase Auth
      const { data, error } = await client.auth.signUp({
        email,
        password,
      });
      
      if (error) {
        console.error('Error creating user in Supabase:', error);
        return { success: false, error };
      }
      
      console.log('User created in Supabase Auth');
      
      // Add user record to users table
      const { error: insertError } = await client
        .from('users')
        .insert([{
          id: data.user.id,
          email,
          name: email.split('@')[0],
          test_mode: isTestMode,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          course_access: true,
          last_login: new Date().toISOString()
        }]);
      
      if (insertError) {
        console.error('Error adding user record:', insertError);
        return { success: true, action: 'auth_only', error: insertError };
      }
      
      console.log('User migration to Supabase complete');
      return { success: true, action: 'full_migration' };
    } catch (error) {
      console.error('Error migrating user to Supabase:', error);
      return { success: false, error };
    }
  },
  
  /**
   * Validate email and password format
   * @param {string} email Email to validate
   * @param {string} password Password to validate
   * @returns {boolean} Whether credentials are valid
   */
  checkCredentials: function(email, password) {
    // Basic validation for email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const validEmail = emailRegex.test(email);
    
    // Basic validation for password length
    const validPassword = password && password.length >= 6;
    
    return validEmail && validPassword;
  }
};

// Export the auth library
window.SupabaseAuth = SupabaseAuth;
