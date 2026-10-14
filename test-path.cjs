const SUPABASE_URL = 'https://hzcrmjmtheybcsbaxzmt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3OiOiJzdXBhYmFzZSIsInJlZiI6InpsZ3NjdnNuaHhnemttdm93enJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU4NTM3MDgsImV4cCI6MjEwMTQyOTcwOH0.FzcSO8KFO9bRykUr63LhJSv-Ddd1cx4ObPU9x7Rhb1k';

async function testPath() {
  const r2Key = 'packing-video/2026/08/05/JY1342673963/test.mp4';
  
  // Wrong path (duplicated bucket):
  const wrongPath = `packing-video/${r2Key}`;
  console.log('Testing wrong path:', wrongPath);
  const res1 = await fetch(`${SUPABASE_URL}/storage/v1/object/${wrongPath}`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'video/mp4',
      'x-upsert': 'true'
    },
    body: 'test content'
  });
  console.log('Wrong path status:', res1.status, await res1.text());

  // Correct path:
  const correctPath = r2Key;
  console.log('\nTesting correct path:', correctPath);
  const res2 = await fetch(`${SUPABASE_URL}/storage/v1/object/${correctPath}`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'video/mp4',
      'x-upsert': 'true'
    },
    body: 'test content'
  });
  console.log('Correct path status:', res2.status, await res2.text());
}

testPath();
