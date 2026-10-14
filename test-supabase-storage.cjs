const { createClient } = require('@supabase/supabase-js');

async function testSupabaseStorage() {
  console.log('Testing Supabase Storage upload...');

  const supabaseUrl = 'https://hzcrmjmtheybcsbaxzmt.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6Y3Jtam10aGV5YmNzYmF4em10Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5Mjk4NzcsImV4cCI6MjEwNzUwNTg3N30.9fSfCF2OAoTH-iEqT3EVXrJ5_lU-9CVwDVAb_h1FFTY';
  
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Test listing buckets
  const { data: buckets, error: bucketErr } = await supabase.storage.listBuckets();
  console.log('Existing buckets:', buckets, 'Error:', bucketErr);

  // Attempt uploading test file to packing-videos bucket
  const testFile = Buffer.from('test packing video content');
  const path = `test-${Date.now()}.txt`;

  const { data: uploadData, error: uploadErr } = await supabase.storage
    .from('packing-videos')
    .upload(path, testFile, { contentType: 'text/plain', upsert: true });

  console.log('Upload result:', uploadData, 'Error:', uploadErr);

  if (uploadData) {
    const { data: publicUrlData } = supabase.storage.from('packing-videos').getPublicUrl(path);
    console.log('Public URL:', publicUrlData.publicUrl);
  }
}

testSupabaseStorage();
