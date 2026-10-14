import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hzcrmjmtheybcsbaxzmt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6Y3Jtam10aGV5YmNzYmF4em10Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5Mjk4NzcsImV4cCI6MjEwNzUwNTg3N30.9fSfCF2OAoTH-iEqT3EVXrJ5_lU-9CVwDVAb_h1FFTY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Trigger Supabase Google OAuth Login
 */
export async function loginWithGoogleSupabase() {
  const redirectUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) {
    console.error('Supabase Google OAuth Error:', error);
    throw error;
  }
  return data;
}

/**
 * Logout from Supabase session
 */
export async function logoutSupabase() {
  try {
    await supabase.auth.signOut();
  } catch (error) {
    console.error('Supabase SignOut Error:', error);
  }
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('packguard_user');
    localStorage.setItem('packguard_logged_out', 'true');
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth')) {
        localStorage.removeItem(key);
      }
    });
  }
}
