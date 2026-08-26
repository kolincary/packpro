const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

async function testR2Upload() {
  console.log('Testing direct PutObject to Cloudflare R2 bucket packing-video...');

  const accountId = 'd89c44120fd91b332dd07d4527d69ade';
  const accessKeyId = '3ee23b57c409595f1c26f7ae30cc86b6';
  const secretAccessKey = 'cbc1ddc8e0ec83688e9a43c1afe66f8474ade4fc573c8ce7a05de34468392577';
  const bucketName = 'packing-video';

  const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  const testKey = `test-video-${Date.now()}.txt`;
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: testKey,
    Body: 'PackGuard R2 Test Video Stream Content',
    ContentType: 'text/plain',
  });

  try {
    const res = await s3.send(command);
    console.log('Upload success! Result:', res);
  } catch (err) {
    console.error('R2 upload failed:', err);
  }
}

testR2Upload();
