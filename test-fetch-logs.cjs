const SUPABASE_URL = 'https://hzcrmjmtheybcsbaxzmt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6Y3Jtam10aGV5YmNzYmF4em10Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5Mjk4NzcsImV4cCI6MjEwNzUwNTg3N30.9fSfCF2OAoTH-iEqT3EVXrJ5_lU-9CVwDVAb_h1FFTY';

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
