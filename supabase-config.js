// supabase-config.js
// Centralized Supabase configuration for the entire application

// Import Supabase client
import { createClient } from '@supabase/supabase-js';

// Your Supabase project credentials
// Replace these with your actual Supabase URL and anon key
const supabaseUrl = 'https://vyzsauyekanaxevgxkyh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5enNhdXlla2FuYXhldmd4a3loIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYzMjgzOTIsImV4cCI6MjA2MTkwNDM5Mn0.VPs_JhAkoCUediOP4_0flNF9AURcQDH-Hfj8T0vi5_c';

// Initialize the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper function to check if Supabase is available (for fallback mechanisms)
export const isSupabaseAvailable = async () => {
  try {
    const { data, error } = await supabase.from('users').select('count').limit(1);
    return !error;
  } catch (error) {
    console.error('Supabase availability check failed:', error);
    return false;
  }
};

// User authentication functions
export const authFunctions = {
  // Create a new user in Supabase Auth and add them to the users table
  createUser: async (email, password, customerName, isTestMode = false) => {
    try {
      // First, create the user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;
      
      // Add the user to our custom users table with additional information
      const { error: insertError } = await supabase.from('users').insert([
        {
          id: authData.user.id,
          email,
          name: customerName || email.split('@')[0],
          test_mode: isTestMode,
          created_at: new Date().toISOString(),
          course_access: true,
          access_expires_at: null // Null means unlimited access
        }
      ]);

      if (insertError) throw insertError;
      
      return {
        success: true,
        user: authData.user,
        userId: authData.user.id
      };
    } catch (error) {
      console.error('Error creating user in Supabase:', error);
      
      // Return the error for handling
      return {
        success: false,
        error
      };
    }
  },
  
  // Sign in a user
  signIn: async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      
      // Update last_login timestamp
      if (data.user) {
        await supabase
          .from('users')
          .update({ 
            last_login: new Date().toISOString() 
          })
          .eq('id', data.user.id);
      }
      
      return {
        success: true,
        user: data.user,
        session: data.session
      };
    } catch (error) {
      console.error('Error signing in user:', error);
      return {
        success: false,
        error
      };
    }
  },
  
  // Sign out the currently signed in user
  signOut: async () => {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) throw error;
      
      return { success: true };
    } catch (error) {
      console.error('Error signing out:', error);
      return {
        success: false,
        error
      };
    }
  },
  
  // Get the current user's session
  getCurrentSession: async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      
      if (error) throw error;
      
      return {
        success: true,
        session: data.session,
        user: data.session?.user || null
      };
    } catch (error) {
      console.error('Error getting current session:', error);
      return {
        success: false,
        error
      };
    }
  },
  
  // Check if a user has course access
  checkCourseAccess: async (userId) => {
    try {
      // If no userId is provided, get the current user
      if (!userId) {
        const { data: sessionData } = await supabase.auth.getSession();
        userId = sessionData.session?.user?.id;
        
        if (!userId) {
          return { hasAccess: false, reason: 'no-user' };
        }
      }
      
      // Check course access in the users table
      const { data, error } = await supabase
        .from('users')
        .select('course_access, access_expires_at, test_mode')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      
      // If the user doesn't have access or it's expired
      if (!data.course_access) {
        return { hasAccess: false, reason: 'access-revoked' };
      }
      
      // Check if access has expired (if there's an expiration date)
      if (data.access_expires_at && new Date(data.access_expires_at) < new Date()) {
        return { hasAccess: false, reason: 'access-expired' };
      }
      
      return { 
        hasAccess: true, 
        isTestMode: data.test_mode 
      };
    } catch (error) {
      console.error('Error checking course access:', error);
      return { 
        hasAccess: false, 
        error,
        reason: 'error'
      };
    }
  }
};

// Function to help migrate localStorage auth to Supabase
export const migrateLocalStorageAuth = async () => {
  // Check if user is authenticated in localStorage
  const isAuthenticated = localStorage.getItem('sleeptech_auth') === 'true' || 
                        localStorage.getItem('appfoundry_auth') === 'true';
  
  if (!isAuthenticated) return { migrated: false, reason: 'not-authenticated' };
  
  const authEmail = localStorage.getItem('sleeptech_email');
  if (!authEmail) return { migrated: false, reason: 'no-email' };
  
  // Get stored password for this email
  const storedPassword = localStorage.getItem('sleeptech_password_' + authEmail);
  if (!storedPassword) return { migrated: false, reason: 'no-password' };
  
  // Check if user already exists in Supabase
  try {
    // Try to sign in first to see if user exists
    const { success } = await authFunctions.signIn(authEmail, storedPassword);
    
    if (success) {
      return { migrated: true, action: 'signed-in' };
    }
    
    // If login fails, create the user
    const { success: createSuccess } = await authFunctions.createUser(
      authEmail,
      storedPassword,
      '', // No name available from localStorage
      localStorage.getItem('appfoundry_auth') === 'true' // Test mode if using appfoundry_auth
    );
    
    if (createSuccess) {
      // Now try to sign in
      const signInResult = await authFunctions.signIn(authEmail, storedPassword);
      
      return { 
        migrated: signInResult.success,
        action: 'created-and-signed-in'
      };
    }
    
    return { migrated: false, reason: 'creation-failed' };
  } catch (error) {
    console.error('Error migrating localStorage auth:', error);
    return { migrated: false, error };
  }
};
