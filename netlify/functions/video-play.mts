import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

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
  const headers: Record<string, string> = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': '*',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  try {
    const queryParams = event.queryStringParameters || {};
    const key = queryParams.key || queryParams.r2Key;

    if (!key) {
      return {
        statusCode: 400,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing video object key' }),
      };
    }

    const command = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });

    const s3Response = await s3Client.send(command);

    if (!s3Response.Body) {
      return {
        statusCode: 404,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Video file not found in R2' }),
      };
    }

    const byteArray = await s3Response.Body.transformToByteArray();
    const base64Body = Buffer.from(byteArray).toString('base64');

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': s3Response.ContentType || 'video/mp4',
        'Content-Length': String(byteArray.byteLength),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=31536000',
      },
      body: base64Body,
      isBase64Encoded: true,
    };
  } catch (err: any) {
    console.error('[Netlify Function Video Play Error]:', err);
    return {
      statusCode: 500,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to stream video from Cloudflare R2' }),
    };
  }
};
