const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');

async function checkR2Bucket() {
  const s3 = new S3Client({
    region: 'auto',
    endpoint: 'https://d89c44120fd91b332dd07d4527d69ade.r2.cloudflarestorage.com',
    credentials: {
      accessKeyId: '3ee23b57c409595f1c26f7ae30cc86b6',
      secretAccessKey: 'cbc1ddc8e0ec83688e9a43c1afe66f8474ade4fc573c8ce7a05de34468392577',
    },
  });

  const command = new ListObjectsV2Command({
    Bucket: 'packing-video',
  });

  try {
    const res = await s3.send(command);
    console.log('Objects in R2 bucket:');
    if (res.Contents) {
      res.Contents.forEach(obj => {
        console.log(`- Key: ${obj.Key}, Size: ${(obj.Size / (1024 * 1024)).toFixed(2)} MB, Modified: ${obj.LastModified}`);
      });
    } else {
      console.log('No objects found in bucket.');
    }
  } catch (err) {
    console.error('R2 list error:', err);
  }
}

checkR2Bucket();
