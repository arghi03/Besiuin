import { createClient } from '@supabase/supabase-js';

// Retrieve environment variables in Vite
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if environment variables are defined to help developers troubleshoot
if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('your-project-id') || supabaseAnonKey.includes('your-anon-key')) {
  console.warn(
    'Warning: Supabase credentials are not configured properly. Please update your .env.local file with your Supabase URL and Anon Key.'
  );
}

// Create and export the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
