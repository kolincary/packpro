import { PackingVideoLog } from '../types';

const SUPABASE_URL = 'https://hzcrmjmtheybcsbaxzmt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6Y3Jtam10aGV5YmNzYmF4em10Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5Mjk4NzcsImV4cCI6MjEwNzUwNTg3N30.9fSfCF2OAoTH-iEqT3EVXrJ5_lU-9CVwDVAb_h1FFTY';

/**
 * Save a new packing video log to Supabase PostgreSQL (packing_logs table)
 */
export async function savePackingLogToSupabase(log: PackingVideoLog): Promise<boolean> {
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(log.id);
    const videoFileName = log.videoFileName || `${log.trackingNumber}.mp4`;

    // 1. DEDUPLICATION CHECK: Check if video_file_name already exists in Supabase
    if (videoFileName) {
      try {
        const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/packing_logs?video_file_name=eq.${encodeURIComponent(videoFileName)}&select=id`, {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          },
        });

        if (checkRes.ok) {
          const existing = await checkRes.json();
          if (Array.isArray(existing) && existing.length > 0) {
            console.log(`[Supabase Logs] Duplicate log for video '${videoFileName}' already exists in Supabase DB. Skipping duplicate insert.`);
            return true;
          }
        }
      } catch (checkErr) {
        console.warn('[Supabase Logs] Error checking duplicates:', checkErr);
      }
    }

    let createdAtIso: string | undefined = undefined;
    if (log.timestamp) {
      try {
        const d = new Date(log.timestamp);
        if (!isNaN(d.getTime())) {
          createdAtIso = d.toISOString();
        }
      } catch (e) {}
    }

    const payload: any = {
      order_id: log.orderNumber || `ORD-${log.trackingNumber}`,
      tracking_number: log.trackingNumber,
      sku: log.sku || 'SKU-GENERAL',
      nama_barang: log.namaBarang || 'Barang Paket',
      customer_name: log.customerName || 'Pelanggan',
      courier: log.courier || 'Ekspedisi',
      video_file_name: videoFileName,
      video_url: (log.videoUrl && !log.videoUrl.startsWith('blob:')) 
        ? log.videoUrl 
        : `/.netlify/functions/video-play?key=${encodeURIComponent(log.r2StorageKey || '')}`,
      r2_storage_key: log.r2StorageKey || `packing-video/${log.trackingNumber}/${log.videoFileName}`,
      duration_seconds: log.durationSeconds || 0,
      file_size_mb: log.fileSizeMB || 0,
      operator_name: log.operatorName || 'Operator Gudang',
      packing_station: log.packingStation || 'Stasiun 01',
      status: log.status || 'uploaded',
      anomaly_reason: log.anomalyReason || null,
      anomaly_severity: log.anomalySeverity || null,
      resolved: log.resolved || false,
      notes: log.notes || 'Tersimpan di Supabase PostgreSQL',
    };

    if (createdAtIso) {
      payload.created_at = createdAtIso;
    }

    if (isUuid) {
      payload.id = log.id;
    }

    const response = await fetch(`${SUPABASE_URL}/rest/v1/packing_logs`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify([payload]),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn('[Supabase Logs] Failed to save log to Supabase:', errText);
      return false;
    }

    console.log('[Supabase Logs] Successfully saved log to Supabase PostgreSQL!');
    return true;
  } catch (err) {
    console.error('[Supabase Logs] Error saving log to Supabase:', err);
    return false;
  }
}

/**
 * Fetch all packing logs from Supabase PostgreSQL (packing_logs table) with deduplication
 */
export async function fetchPackingLogsFromSupabase(): Promise<PackingVideoLog[]> {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/packing_logs?select=*&order=created_at.desc`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });

    if (!response.ok) {
      console.warn('[Supabase Logs] Failed to fetch logs from Supabase:', response.statusText);
      return [];
    }

    const data = await response.json();
    if (!Array.isArray(data)) return [];

    const seenVideoFileNames = new Set<string>();
    const uniqueLogs: PackingVideoLog[] = [];

    for (const row of data) {
      const videoFileName = row.video_file_name || `${row.tracking_number}.mp4`;
      
      // Filter out duplicate rows by video_file_name so frontend display is 100% clean
      if (seenVideoFileNames.has(videoFileName)) {
        continue;
      }
      seenVideoFileNames.add(videoFileName);

      uniqueLogs.push({
        id: row.id || `log-${Date.now()}`,
        orderNumber: row.order_id || `ORD-${row.tracking_number}`,
        trackingNumber: row.tracking_number || '',
        sku: row.sku || '',
        namaBarang: row.nama_barang || '',
        customerName: row.customer_name || 'Pelanggan',
        courier: row.courier || 'Ekspedisi',
        videoFileName: videoFileName,
        videoUrl: (row.video_url && !row.video_url.startsWith('blob:')) 
          ? row.video_url 
          : `/api/video-play?key=${encodeURIComponent(row.r2_storage_key || '')}`,
        r2StorageKey: row.r2_storage_key || '',
        d1RecordId: row.id,
        timestamp: row.created_at 
          ? new Date(row.created_at).toLocaleString('id-ID', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            }) + ' WIB'
          : new Date().toLocaleString('id-ID') + ' WIB',
        durationSeconds: row.duration_seconds || 0,
        fileSizeMB: row.file_size_mb || 0,
        operatorName: row.operator_name || 'Operator',
        packingStation: row.packing_station || 'Stasiun 01',
        checklist: {
          itemsChecked: true,
          bubbleWrapped: true,
          labelAttached: true,
          outerBoxSealed: true,
          fragileSticker: false,
        },
        items: [
          {
            id: `item-${row.id}`,
            name: row.nama_barang || 'Barang Paket',
            sku: row.sku || 'SKU',
            quantity: 1,
            verified: true,
          },
        ],
        status: row.status || 'uploaded',
        anomalyReason: row.anomaly_reason,
        anomalySeverity: row.anomaly_severity,
        resolved: row.resolved || false,
        notes: row.notes || 'Disinkronkan dari Supabase PostgreSQL',
      });
    }

    return uniqueLogs;
  } catch (err) {
    console.error('[Supabase Logs] Error fetching logs from Supabase:', err);
    return [];
  }
}

/**
 * Delete a single specific log from Supabase PostgreSQL by unique ID (developer role only)
 */
export async function deletePackingLogFromSupabase(logId: string): Promise<boolean> {
  try {
    console.log(`[Supabase Logs] Deleting single log ID ${logId} from Supabase...`);
    const resId = await fetch(`${SUPABASE_URL}/rest/v1/packing_logs?id=eq.${encodeURIComponent(logId)}`, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });

    return resId.ok;
  } catch (err) {
    console.error('[Supabase Logs] Error deleting log from Supabase:', err);
    return false;
  }
}
