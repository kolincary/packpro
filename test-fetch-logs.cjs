const SUPABASE_URL = 'https://zlgscvsnhxgzkmvowzru.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsZ3NjdnNuaHhnemttdm93enJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU4NTM3MDgsImV4cCI6MjEwMTQyOTcwOH0.FzcSO8KFO9bRykUr63LhJSv-Ddd1cx4ObPU9x7Rhb1k';

async function testFetchLogs() {
  console.log('Fetching packing_logs from Supabase PostgreSQL...');
  const res = await fetch(`${SUPABASE_URL}/rest/v1/packing_logs?select=*&order=created_at.desc`, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });

  console.log('Status code:', res.status, res.statusText);
  if (!res.ok) {
    console.error('Error body:', await res.text());
    return;
  }

  const logs = await res.json();
  console.log('Total rows returned from Supabase:', logs.length);
  console.log('Data:', JSON.stringify(logs, null, 2));
}

testFetchLogs();
