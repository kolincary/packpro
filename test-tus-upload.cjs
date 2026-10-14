const SUPABASE_URL = 'https://hzcrmjmtheybcsbaxzmt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3OiOiJzdXBhYmFzZSIsInJlZiI6InpsZ3NjdnNuaHhnemttdm93enJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU4NTM3MDgsImV4cCI6MjEwMTQyOTcwOH0.FzcSO8KFO9bRykUr63LhJSv-Ddd1cx4ObPU9x7Rhb1k';

async function testTus() {
  console.log('Testing TUS resumable upload on Supabase Storage...');
  
  const b64Bucket = Buffer.from('packing-video').toString('base64');
  const b64Object = Buffer.from('test-tus-file.txt').toString('base64');
  const b64ContentType = Buffer.from('text/plain').toString('base64');
  const metadata = `bucketName ${b64Bucket},objectName ${b64Object},contentType ${b64ContentType}`;

  const res = await fetch(`${SUPABASE_URL}/storage/v1/upload/resumable`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Upload-Length': '26',
      'Upload-Metadata': metadata,
      'x-upsert': 'true'
    }
  });

  console.log('TUS POST status:', res.status, res.statusText);
  console.log('Location header:', res.headers.get('location'));
  const text = await res.text();
  console.log('Response body:', text);
}

testTus();
