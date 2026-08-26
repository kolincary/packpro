const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

async function testPresignedPut() {
  console.log('Testing Cloudflare R2 Presigned PUT Upload URL...');

  const accountId = 'd89c44120fd91b332dd07d4527d69ade';
  const accessKeyId = '3ee23b57c409595f1c26f7ae30cc86b6';
  const secretAccessKey = 'cbc1ddc8e0ec83688e9a43c1afe66f8474ade4fc573c8ce7a05de34468392577';
  const bucketName = 'packing-video';

  const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });

  const testKey = `presigned-put-${Date.now()}.mp4`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: testKey,
    ContentType: 'video/mp4',
  });

  const presignedPutUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
  console.log('Generated Presigned PUT URL:', presignedPutUrl);

  // Perform HTTP PUT request using fetch
  const videoBuffer = Buffer.from('test mp4 binary payload');
  const res = await fetch(presignedPutUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'video/mp4',
    },
    body: videoBuffer,
  });

  console.log('HTTP PUT Upload status:', res.status, res.statusText);
  if (res.ok) {
    console.log('PRESIGNED PUT UPLOAD SUCCESSFUL TO CLOUDFLARE R2!');
  } else {
    const text = await res.text();
    console.error('Upload failed body:', text);
  }
}

testPresignedPut();
