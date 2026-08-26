const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

async function testPresignedUrl() {
  console.log('Generating S3 Presigned GetObject URL for Cloudflare R2...');

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

  const key = 'packing-video/2026/08/05/test.mp4';
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  try {
    const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
    console.log('Presigned URL generated successfully!');
    console.log('URL:', url);
  } catch (err) {
    console.error('Failed to generate presigned URL:', err);
  }
}

testPresignedUrl();
