const { S3Client, PutBucketCorsCommand, GetBucketCorsCommand } = require('@aws-sdk/client-s3');

async function setCors() {
  console.log('Configuring Cloudflare R2 CORS for bucket packing-video...');

  const accountId = 'd89c44120fd91b332dd07d4527d69ade';
  const accessKeyId = '3ee23b57c409595f1c26f7ae30cc86b6';
  const secretAccessKey = 'cbc1ddc8e0ec83688e9a43c1afe66f8474ade4fc573c8ce7a05de34468392577';
  const bucketName = 'packing-video';

  const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });

  const corsRule = {
    CORSRules: [
      {
        AllowedHeaders: ['*'],
        AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
        AllowedOrigins: ['*'],
        ExposeHeaders: ['ETag'],
        MaxAgeSeconds: 3600,
      },
    ],
  };

  try {
    await s3.send(new PutBucketCorsCommand({
      Bucket: bucketName,
      CORSConfiguration: corsRule,
    }));
    console.log('CORS configured successfully on Cloudflare R2 bucket:', bucketName);

    try {
      const getCors = await s3.send(new GetBucketCorsCommand({ Bucket: bucketName }));
      console.log('Verified Bucket CORS:', JSON.stringify(getCors.CORSRules, null, 2));
    } catch (e) {
      console.log('CORS set successfully!');
    }
  } catch (err) {
    console.error('Failed to set CORS:', err);
  }
}

setCors();
