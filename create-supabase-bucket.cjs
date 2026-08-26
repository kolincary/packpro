const SUPABASE_URL = 'https://zlgscvsnhxgzkmvowzru.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsZ3NjdnNuaHhnemttdm93enJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU4NTM3MDgsImV4cCI6MjEwMTQyOTcwOH0.FzcSO8KFO9bRykUr63LhJSv-Ddd1cx4ObPU9x7Rhb1k';

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
