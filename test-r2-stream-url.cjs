const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

async function testR2Stream() {
  console.log('Testing Cloudflare R2 PutObject + Presigned GetObject Stream URL...');

  const accountId = 'd89c44120fd91b332dd07d4527d69ade';
  const accessKeyId = '3ee23b57c409595f1c26f7ae30cc86b6';
  const secretAccessKey = 'cbc1ddc8e0ec83688e9a43c1afe66f8474ade4fc573c8ce7a05de34468392577';
  const bucketName = 'packing-video';

  const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });

  const testKey = `test-stream-${Date.now()}.mp4`;
  
  // PutObject
  await s3.send(new PutObjectCommand({
    Bucket: bucketName,
    Key: testKey,
    Body: Buffer.from('test mp4 content stream'),
    ContentType: 'video/mp4'
  }));
  console.log('Uploaded test file:', testKey);

  // Generate 7-day Presigned URL
  const getCmd = new GetObjectCommand({
    Bucket: bucketName,
    Key: testKey,
  });
  const presignedUrl = await getSignedUrl(s3, getCmd, { expiresIn: 604800 });
  console.log('\nPresigned Stream URL:', presignedUrl);

  // Test fetching presigned URL using standard HTTP GET (simulating video player fetch)
  const res = await fetch(presignedUrl);
  console.log('\nStream fetch HTTP status:', res.status, res.statusText);
  console.log('Content-Type header:', res.headers.get('content-type'));
  console.log('Content-Length header:', res.headers.get('content-length'));
}

testR2Stream();
