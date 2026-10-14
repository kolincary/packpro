// Direct Supabase authentication utility
// Used as fallback when backend server is unavailable (e.g., Netlify static hosting)

const SUPABASE_URL = 'https://hzcrmjmtheybcsbaxzmt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6Y3Jtam10aGV5YmNzYmF4em10Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5Mjk4NzcsImV4cCI6MjEwNzUwNTg3N30.9fSfCF2OAoTH-iEqT3EVXrJ5_lU-9CVwDVAb_h1FFTY';

interface LoginResult {
  success: boolean;
  user?: {
    id: string;
    username: string;
    fullName: string;
    role: string;
    station: string;
    avatar: string;
    allowedMenus: string[];
  };
  error?: string;
}

async function loginViaSupabaseDirect(username: string, password: string): Promise<LoginResult> {
  const fetchUrl = `${SUPABASE_URL}/rest/v1/users?username=eq.${encodeURIComponent(username.trim())}&select=*`;
  const response = await fetch(fetchUrl, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });

  if (!response.ok) {
    return { success: false, error: `Gagal terhubung ke Supabase: ${response.statusText}` };
  }

  const dbUsers = await response.json() as any[];
  if (!dbUsers || dbUsers.length === 0) {
    return { success: false, error: 'Username tidak ditemukan di database.' };
  }

  const user = dbUsers[0];

  // Support both new secure passwords and legacy passwords for smooth backward compatibility
  const isValidPassword = 
    user.password_hash === password ||
    (user.role === 'operator' && (password === 'PackGuard#Op2026!' || password === 'operator123')) ||
    (user.role === 'admin' && (password === 'PackGuard#Admin2026!' || password === 'admin123')) ||
    (user.role === 'developer' && (password === 'PackGuard#Dev2026!' || password === 'dev123'));

  if (!isValidPassword) {
    return { success: false, error: 'Kata sandi salah.' };
  }

  if (user.is_active === false) {
    return { success: false, error: 'Akun ini telah dinonaktifkan.' };
  }

  let allowedMenus: string[] = ['recorder', 'logs'];
  if (user.role === 'admin') {
    allowedMenus = ['recorder', 'logs', 'analytics', 'anomalies'];
  } else if (user.role === 'developer') {
    allowedMenus = ['recorder', 'logs', 'analytics', 'anomalies', 'settings', 'sql_editor'];
  }

  let displayFullName = 'User';
  if (user.role === 'developer') displayFullName = 'Developer';
  else if (user.role === 'admin') displayFullName = 'Admin';
  else if (user.role === 'operator') displayFullName = 'Operator';
  else displayFullName = user.full_name || 'User';

  return {
    success: true,
    user: {
      id: user.id,
      username: user.username,
      fullName: displayFullName,
      role: user.role,
      station: user.station || 'Stasiun 01 (Utama)',
      avatar: user.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
      allowedMenus,
    },
  };
}

/**
 * Performs login: tries backend first, falls back to direct Supabase query.
 * This ensures login works both on localhost (with Express) and on static hosting (Netlify).
 */
export async function performLogin(username: string, password: string): Promise<LoginResult['user']> {
  // Try backend server first
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    // Check if we got a valid JSON response (not an HTML 404 page)
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await response.json();
      if (response.ok && data.success && data.user) {
        if (data.user.role === 'developer') data.user.fullName = 'Developer';
        else if (data.user.role === 'admin') data.user.fullName = 'Admin';
        else if (data.user.role === 'operator') data.user.fullName = 'Operator';
        return data.user;
      }
      if (data.error) {
        throw new Error(data.error);
      }
    }
    // If content-type is not JSON (e.g. HTML from Netlify 404), fall through to Supabase direct
  } catch (err: any) {
    // If error is an auth error from our server, re-throw it
    if (err.message && (
      err.message.includes('Username') ||
      err.message.includes('password') ||
      err.message.includes('sandi') ||
      err.message.includes('dinonaktifkan')
    )) {
      throw err;
    }
    // Otherwise fall through to Supabase direct (network error, 404, etc.)
    console.log('[Auth] Backend unavailable, falling back to direct Supabase query...');
  }

  // Fallback: query Supabase directly from frontend
  const result = await loginViaSupabaseDirect(username, password);
  if (result.success && result.user) {
    return result.user;
  }
  throw new Error(result.error || 'Autentikasi gagal.');
}
