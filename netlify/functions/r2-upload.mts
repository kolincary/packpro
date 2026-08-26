import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const R2_ACCOUNT_ID = process.env.CLOUDFLARE_R2_ACCOUNT_ID || 'd89c44120fd91b332dd07d4527d69ade';
const R2_ACCESS_KEY_ID = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || '3ee23b57c409595f1c26f7ae30cc86b6';
const R2_SECRET_ACCESS_KEY = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || 'cbc1ddc8e0ec83688e9a43c1afe66f8474ade4fc573c8ce7a05de34468392577';
const R2_BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'packing-video';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

export const handler = async (event: any) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const queryParams = event.queryStringParameters || {};
    const trackingNumber = queryParams.trackingNumber || 'UNKNOWN';
    const fileName = queryParams.fileName || `${trackingNumber}.mp4`;
    const r2Key = queryParams.r2Key || `packing-video/${trackingNumber}/${fileName}`;

    let bodyBuffer: Buffer;
    if (event.isBase64Encoded) {
      bodyBuffer = Buffer.from(event.body, 'base64');
    } else {
      bodyBuffer = Buffer.from(event.body || '');
    }

    if (!bodyBuffer || bodyBuffer.length === 0) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Empty video payload' }) };
    }

    await s3Client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: r2Key,
        Body: bodyBuffer,
        ContentType: 'video/mp4',
      })
    );

    console.log(`[Netlify Function R2] Successfully uploaded ${r2Key} to Cloudflare R2 bucket!`);
    const videoPlayUrl = `/.netlify/functions/video-play?key=${encodeURIComponent(r2Key)}`;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        r2StorageKey: r2Key,
        r2PublicUrl: videoPlayUrl,
        message: 'Video successfully uploaded to Cloudflare R2',
      }),
    };
  } catch (err: any) {
    console.error('[Netlify Function R2 Error]:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: err.message || 'Cloudflare R2 upload failed' }),
    };
  }
};
