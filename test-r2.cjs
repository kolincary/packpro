const { S3Client, PutObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');

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

async function runTest() {
  console.log('Testing connection to Cloudflare R2...');
  try {
    // 1. Try listing objects
    console.log('Listing objects in bucket:', bucketName);
    const listRes = await s3.send(new ListObjectsV2Command({ Bucket: bucketName }));
    console.log('Success! Found objects count:', listRes.KeyCount);

    // 2. Try uploading a test file
    console.log('Uploading test file...');
    const uploadRes = await s3.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: 'test-connection-file.txt',
      Body: 'Hello from PackGuard R2 Connection Test!',
      ContentType: 'text/plain',
    }));
    console.log('Success! Upload complete:', uploadRes);
  } catch (err) {
    console.error('Error connecting to Cloudflare R2:', err);
  }
}

runTest();
