const SUPABASE_URL = 'https://hzcrmjmtheybcsbaxzmt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3OiOiJzdXBhYmFzZSIsInJlZiI6InpsZ3NjdnNuaHhnemttdm93enJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU4NTM3MDgsImV4cCI6MjEwMTQyOTcwOH0.FzcSO8KFO9bRykUr63LhJSv-Ddd1cx4ObPU9x7Rhb1k';

async function updateUsers() {
  console.log('Updating users table in Supabase...');

  const updates = [
    { username: 'developer', full_name: 'Developer' },
    { username: 'admin', full_name: 'Admin' },
    { username: 'operator', full_name: 'Operator' },
  ];

  for (const item of updates) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/users?username=eq.${item.username}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ full_name: item.full_name })
    });

    console.log(`Update ${item.username} status:`, res.status, await res.text());
  }
}

updateUsers();
