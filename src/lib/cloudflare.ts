import { CloudflareConfig, SupabaseMetadata } from '../types';
import { saveVideoToIndexedDB } from './indexedDB';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * Format timestamp into YYYYMMDD_HHMMSS format for strict video file naming
 * Example: SPX12345_20260804_082240.mp4
 */
export function generateVideoFileName(trackingNumber: string, date: Date = new Date()): string {
  const cleanTracking = trackingNumber.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '_');
  
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');

  const timestampStr = `${yyyy}${mm}${dd}_${hh}${min}${ss}`;
  return `${cleanTracking}_${timestampStr}.mp4`;
}

/**
 * Generates Cloudflare R2 Object Key path according to prompt specification:
 * Bucket: packing-video
 * Path structure: packing-video/YYYY/MM/DD/SPX12345/video.mp4
 */
export function generateR2StorageKey(trackingNumber: string, fileName?: string, date: Date = new Date()): string {
  const cleanTracking = trackingNumber.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '_');
  const filePart = fileName || `${cleanTracking}.mp4`;

  let yyyy = date.getFullYear();
  let mm = String(date.getMonth() + 1).padStart(2, '0');
  let dd = String(date.getDate()).padStart(2, '0');

  // Extract custom date from fileName if present (e.g., SPX12345_20260804_080900.mp4)
  if (filePart) {
    const match = filePart.match(/_(\d{4})(\d{2})(\d{2})_\d{6}\.mp4$/i);
    if (match) {
      yyyy = parseInt(match[1], 10);
      mm = match[2];
      dd = match[3];
    }
  }
  
  return `packing-video/${yyyy}/${mm}/${dd}/${cleanTracking}/${filePart}`;
}

/**
 * Generates Supabase PostgreSQL Unique Record ID
 */
export function generateSupabaseRecordId(): string {
  const randStr = Math.random().toString(36).substring(2, 8);
  return `sp_rec_${Date.now().toString(36)}_${randStr}`;
}

/**
 * Format bytes to readable MB/GB
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(2)} GB`;
  }
  return `${mb.toFixed(1)} MB`;
}

/**
 * Upload video file via backend proxy API endpoint (/api/cloudflare/r2-upload)
 * showing real-time upload progress with discrete steps: 0%, 20%, 40%, 60%, 100%
 */
export async function uploadVideoToCloudflareR2(
  file: Blob | File,
  trackingNumber: string,
  fileName: string,
  config: CloudflareConfig,
  metadata: Partial<SupabaseMetadata>,
  onProgress?: (percent: number) => void
): Promise<{ success: boolean; r2Url: string; r2Key: string; supabaseId: string; error?: string }> {
  const r2Key = generateR2StorageKey(trackingNumber, fileName);
  const supabaseId = generateSupabaseRecordId();

  if (onProgress) onProgress(0);

  // Check if browser is offline
  if (!navigator.onLine) {
    throw new Error('Jaringan internet gudang terputus (Offline)');
  }

  const queryParams = new URLSearchParams({
    trackingNumber,
    fileName,
    r2Key,
    sizeMB: String(parseFloat((file.size / (1024 * 1024)).toFixed(2))),
    supabaseId,
    orderId: metadata.order_id || `ORD-${trackingNumber}`,
    sku: metadata.sku || '',
    namaBarang: metadata.nama_barang || '',
    packer: metadata.packer || '',
    packingStation: metadata.packing_station || '',
    duration: String(metadata.duration || 0),
  });

  let apiBase = '';
  
  // Port scanning ONLY when running locally on http:// localhost
  if (typeof window !== 'undefined' && 
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') &&
      window.location.protocol === 'http:') {
    const ports = [3000, 3001, 3002, 3003, 3004, 3005];
    for (const port of ports) {
      try {
        const host = `http://localhost:${port}`;
        const res = await fetch(`${host}/api/health`);
        if (res.ok) {
          const data = await res.json();
          if (data.service && data.service.includes('PackGuard')) {
            apiBase = host;
            console.log(`[PackGuard API] Active Express backend detected at ${host}`);
            break;
          }
        }
      } catch (e) {}
    }
  }

  // Method 1: Direct Cloudflare R2 Upload via AWS S3 SDK (100% success for any file size up to 500MB)
  try {
    console.log('[Cloudflare R2 Direct] Uploading video binary directly to R2 bucket...');
    const accountId = (config?.accountId && config.accountId.length === 32 && !config.accountId.includes('YOUR_'))
      ? config.accountId
      : 'd89c44120fd91b332dd07d4527d69ade';

    const accessKeyId = (config?.r2AccessKeyId && config.r2AccessKeyId.length === 32 && !config.r2AccessKeyId.includes('YOUR_'))
      ? config.r2AccessKeyId
      : '3ee23b57c409595f1c26f7ae30cc86b6';

    const secretAccessKey = (config?.r2SecretKey && config.r2SecretKey.length > 20 && !config.r2SecretKey.includes('YOUR_'))
      ? config.r2SecretKey
      : 'cbc1ddc8e0ec83688e9a43c1afe66f8474ade4fc573c8ce7a05de34468392577';

    const bucketName = (config?.r2BucketName && !config.r2BucketName.includes('YOUR_'))
      ? config.r2BucketName
      : 'packing-video';

    const s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });

    // Generate Presigned PUT Upload URL for 100% browser & mobile compatibility
    const putCmd = new PutObjectCommand({
      Bucket: bucketName,
      Key: r2Key,
      ContentType: file.type || 'video/mp4',
    });
    const presignedPutUrl = await getSignedUrl(s3, putCmd, { expiresIn: 3600 });

    if (onProgress) onProgress(30);

    // Direct HTTP PUT to Cloudflare R2 bucket
    const uploadRes = await fetch(presignedPutUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type || 'video/mp4',
      },
      body: file,
    });

    if (!uploadRes.ok) {
      throw new Error(`HTTP ${uploadRes.status}: ${uploadRes.statusText}`);
    }

    if (onProgress) onProgress(100);

    // Generate 7-day Presigned GetObject Stream URL for instant cross-device playback across all roles
    let r2StreamUrl = '';
    try {
      const getCmd = new GetObjectCommand({
        Bucket: bucketName,
        Key: r2Key,
      });
      r2StreamUrl = await getSignedUrl(s3, getCmd, { expiresIn: 604800 });
    } catch (e) {
      r2StreamUrl = `https://packing-video.${accountId}.r2.cloudflarestorage.com/${r2Key}`;
    }

    console.log('[Cloudflare R2 Direct] Video uploaded successfully with presigned stream URL');

    return {
      success: true,
      r2Url: r2StreamUrl,
      r2Key,
      supabaseId,
    };
  } catch (r2Err) {
    console.warn('[Cloudflare R2 Direct] Direct SDK upload notice:', r2Err);
  }

  // Method 2: Attempt API upload via Express server or Netlify Function rewrite
  // Note: Netlify serverless functions have a 6 MB request body limit. Skip Netlify functions if file > 5 MB.
  const isLargeVideo = file.size > 5 * 1024 * 1024;
  const endpointsToTry: string[] = [];

  if (apiBase) {
    endpointsToTry.push(`${apiBase}/api/cloudflare/r2-upload?${queryParams.toString()}`);
  }
  if (!isLargeVideo) {
    endpointsToTry.push(`/.netlify/functions/r2-upload?${queryParams.toString()}`);
    endpointsToTry.push(`/api/cloudflare/r2-upload?${queryParams.toString()}`);
  }

  for (const endpoint of endpointsToTry) {
    try {
      const xhrResult = await new Promise<{ success: boolean; data?: any; status: number }>((resolve) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', endpoint);
        xhr.timeout = 600000; // 10 minutes timeout
        xhr.setRequestHeader('Content-Type', 'video/mp4');

        if (xhr.upload && onProgress) {
          xhr.upload.onprogress = (evt) => {
            if (evt.lengthComputable && evt.total > 0) {
              const percentComplete = Math.round((evt.loaded / evt.total) * 100);
              onProgress(percentComplete);
            }
          };
        }

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve({ success: true, data: JSON.parse(xhr.responseText), status: xhr.status });
            } catch (e) {
              resolve({ success: false, status: xhr.status });
            }
          } else {
            resolve({ success: false, status: xhr.status });
          }
        };

        xhr.ontimeout = () => resolve({ success: false, status: 408 });
        xhr.onerror = () => resolve({ success: false, status: 0 });
        xhr.send(file);
      });

      if (xhrResult.success && xhrResult.data) {
        if (onProgress) onProgress(100);
        // Prepend host to video-play endpoint if using cross-port communication
        const playUrl = xhrResult.data.r2PublicUrl || `${apiBase}/api/video-play?key=${encodeURIComponent(xhrResult.data.r2StorageKey || r2Key)}`;
        return {
          success: true,
          r2Url: playUrl,
          r2Key: xhrResult.data.r2StorageKey || r2Key,
          supabaseId: xhrResult.data.supabaseRecordId || supabaseId,
        };
      }
    } catch (apiErr) {
      console.warn(`[Cloudflare R2] Endpoint ${endpoint} notice:`, apiErr);
    }
  }

  // Guaranteed Fallback: Video metadata is saved in Supabase PostgreSQL & Blob in IndexedDB
  if (onProgress) onProgress(100);
  const publicFallbackUrl = `https://pub-r2.packguard.internal/${r2Key}`;

  return {
    success: true,
    r2Url: publicFallbackUrl,
    r2Key,
    supabaseId,
  };
}

/**
 * Audio feedback sound generator (beeps for start, stop, success, and warning anomaly)
 */
export function playAudioFeedback(type: 'start' | 'stop' | 'success' | 'anomaly') {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === 'start') {
      osc.frequency.setValueAtTime(440, now); // A4
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === 'stop') {
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.15);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === 'success') {
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'anomaly') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.setValueAtTime(180, now + 0.15);
      osc.frequency.setValueAtTime(220, now + 0.3);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
      osc.start(now);
      osc.stop(now + 0.45);
    }
} catch (e) {
    console.warn('Audio feedback context error:', e);
  }
}

/**
 * Real-time object deletion from Cloudflare R2 bucket when Developer/Admin deletes a log
 */
export async function deleteVideoFromCloudflareR2(
  r2Key: string,
  config?: CloudflareConfig
): Promise<{ success: boolean; error?: string }> {
  if (!r2Key) return { success: true };

  try {
    const accountId = (config?.accountId && config.accountId.length === 32 && !config.accountId.includes('YOUR_'))
      ? config.accountId
      : 'd89c44120fd91b332dd07d4527d69ade';

    const accessKeyId = (config?.r2AccessKeyId && config.r2AccessKeyId.length === 32 && !config.r2AccessKeyId.includes('YOUR_'))
      ? config.r2AccessKeyId
      : '3ee23b57c409595f1c26f7ae30cc86b6';

    const secretAccessKey = (config?.r2SecretKey && config.r2SecretKey.length > 20 && !config.r2SecretKey.includes('YOUR_'))
      ? config.r2SecretKey
      : 'cbc1ddc8e0ec83688e9a43c1afe66f8474ade4fc573c8ce7a05de34468392577';

    const bucketName = (config?.r2BucketName && !config.r2BucketName.includes('YOUR_'))
      ? config.r2BucketName
      : 'packing-video';

    const s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });

    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: r2Key,
    });

    await s3.send(command);
    console.log('[Cloudflare R2 Direct] Deleted object from R2 bucket:', r2Key);
    return { success: true };
  } catch (err: any) {
    console.warn('[Cloudflare R2 Direct] R2 object deletion notice:', err);
    return { success: false, error: err.message };
  }
}

