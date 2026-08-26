const SUPABASE_URL = 'https://zlgscvsnhxgzkmvowzru.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsZ3NjdnNuaHhnemttdm93enJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU4NTM3MDgsImV4cCI6MjEwMTQyOTcwOH0.FzcSO8KFO9bRykUr63LhJSv-Ddd1cx4ObPU9x7Rhb1k';

async function testDeleteLog() {
  const targetId = '2b876b76-b00d-4d84-a6e7-f4e694e7c56b';

  console.log('1. Testing GET...');
  const getRes = await fetch(`${SUPABASE_URL}/rest/v1/packing_logs?select=id&limit=1`, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });
  console.log('GET status:', getRes.status);

  console.log('\n2. Testing PATCH status=deleted...');
  const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/packing_logs?id=eq.${encodeURIComponent(targetId)}`, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({ status: 'deleted', notes: 'DELETED' })
  });

  console.log('PATCH status:', patchRes.status);
  const text = await patchRes.text();
  console.log('PATCH response body:', text);
}

testDeleteLog();
