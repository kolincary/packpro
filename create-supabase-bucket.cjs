const SUPABASE_URL = 'https://hzcrmjmtheybcsbaxzmt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6Y3Jtam10aGV5YmNzYmF4em10Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5Mjk4NzcsImV4cCI6MjEwNzUwNTg3N30.9fSfCF2OAoTH-iEqT3EVXrJ5_lU-9CVwDVAb_h1FFTY';

async function createBucket() {
  console.log('Creating bucket packing-video in Supabase Storage...');
  const res = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      id: 'packing-video',
      name: 'packing-video',
      public: true
    })
  });
  console.log('Create bucket status:', res.status);
  console.log('Response:', await res.text());
}

createBucket();
