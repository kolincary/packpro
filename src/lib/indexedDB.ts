import { OfflineQueueItem, PackingVideoLog } from '../types';

const DB_NAME = 'PackGuardWarehouseDB';
const DB_VERSION = 1;
const STORE_OFFLINE_VIDEOS = 'offline_videos';
const STORE_LOGS_CACHE = 'logs_cache';

export function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB tidak didukung oleh browser ini'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORE_OFFLINE_VIDEOS)) {
        const videoStore = db.createObjectStore(STORE_OFFLINE_VIDEOS, { keyPath: 'id' });
        videoStore.createIndex('status', 'status', { unique: false });
        videoStore.createIndex('createdAt', 'createdAt', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORE_LOGS_CACHE)) {
        db.createObjectStore(STORE_LOGS_CACHE, { keyPath: 'id' });
      }
    };
  });
}

/**
 * Save video blob and metadata locally into IndexedDB when warehouse Wi-Fi drops
 */
export async function saveVideoToIndexedDB(item: OfflineQueueItem): Promise<boolean> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_OFFLINE_VIDEOS, 'readwrite');
      const store = tx.objectStore(STORE_OFFLINE_VIDEOS);
      const request = store.put(item);

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('IndexedDB save error:', err);
    return false;
  }
}

/**
 * Get all queued offline videos pending upload
 */
export async function getOfflineVideoQueue(): Promise<OfflineQueueItem[]> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_OFFLINE_VIDEOS, 'readonly');
      const store = tx.objectStore(STORE_OFFLINE_VIDEOS);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('IndexedDB get queue error:', err);
    return [];
  }
}

/**
 * Remove an item from IndexedDB after successful upload
 */
export async function removeVideoFromIndexedDB(id: string): Promise<boolean> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_OFFLINE_VIDEOS, 'readwrite');
      const store = tx.objectStore(STORE_OFFLINE_VIDEOS);
      const request = store.delete(id);

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('IndexedDB remove error:', err);
    return false;
  }
}

/**
 * Clear all processed offline items
 */
export async function clearAllOfflineQueue(): Promise<boolean> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_OFFLINE_VIDEOS, 'readwrite');
      const store = tx.objectStore(STORE_OFFLINE_VIDEOS);
      const request = store.clear();

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('IndexedDB clear error:', err);
    return false;
  }
}

export interface ActiveDraftRecord {
  id: string;
  blob: Blob;
  trackingNumber?: string;
  orderNumber?: string;
  sku?: string;
  namaBarang?: string;
  customerName?: string;
  courier?: string;
  durationSeconds?: number;
  updatedAt: string;
}

/**
 * Save current recording draft blob and metadata to IndexedDB
 */
export async function saveDraftBlob(blob: Blob, metadata?: Partial<ActiveDraftRecord>): Promise<boolean> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_LOGS_CACHE, 'readwrite');
      const store = tx.objectStore(STORE_LOGS_CACHE);
      const record: ActiveDraftRecord = {
        id: 'active_recording_draft_blob',
        blob,
        trackingNumber: metadata?.trackingNumber,
        orderNumber: metadata?.orderNumber,
        sku: metadata?.sku,
        namaBarang: metadata?.namaBarang,
        customerName: metadata?.customerName,
        courier: metadata?.courier,
        durationSeconds: metadata?.durationSeconds,
        updatedAt: new Date().toISOString(),
      };
      const request = store.put(record);

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('IndexedDB save draft blob error:', err);
    return false;
  }
}

/**
 * Get current recording draft record (blob + metadata) from IndexedDB
 */
export async function getDraftBlob(): Promise<ActiveDraftRecord | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_LOGS_CACHE, 'readonly');
      const store = tx.objectStore(STORE_LOGS_CACHE);
      const request = store.get('active_recording_draft_blob');

      request.onsuccess = () => {
        if (!request.result) return resolve(null);
        // Handle legacy items that were pure blob vs new object
        if (request.result.blob) {
          resolve(request.result as ActiveDraftRecord);
        } else if (request.result instanceof Blob) {
          resolve({ id: 'active_recording_draft_blob', blob: request.result, updatedAt: new Date().toISOString() });
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('IndexedDB get draft blob error:', err);
    return null;
  }
}

/**
 * Clear current recording draft blob from IndexedDB
 */
export async function clearDraftBlob(): Promise<boolean> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_LOGS_CACHE, 'readwrite');
      const store = tx.objectStore(STORE_LOGS_CACHE);
      const request = store.delete('active_recording_draft_blob');

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('IndexedDB clear draft blob error:', err);
    return false;
  }
}

export interface DetailedIndexedDBItem {
  id: string;
  sourceStore: 'offline_videos' | 'draft_blob';
  trackingNumber: string;
  orderNumber: string;
  fileSizeMB: number;
  blob: Blob;
  createdAt: string;
  videoFileName: string;
}

/**
 * Scan and return ALL video blobs stored in IndexedDB (both offline_videos and draft_blob)
 */
export async function getAllIndexedDBVideos(): Promise<DetailedIndexedDBItem[]> {
  const result: DetailedIndexedDBItem[] = [];

  try {
    const db = await openDatabase();

    // 1. Scan offline_videos store
    const offlineItems: OfflineQueueItem[] = await new Promise((resolve) => {
      const tx = db.transaction(STORE_OFFLINE_VIDEOS, 'readonly');
      const store = tx.objectStore(STORE_OFFLINE_VIDEOS);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });

    for (const item of offlineItems) {
      if (item.videoBlob) {
        result.push({
          id: item.id,
          sourceStore: 'offline_videos',
          trackingNumber: item.trackingNumber,
          orderNumber: item.orderId,
          fileSizeMB: item.fileSizeMB,
          blob: item.videoBlob,
          createdAt: item.createdAt,
          videoFileName: item.videoFileName,
        });
      }
    }

    // 2. Scan draft_blob in STORE_LOGS_CACHE
    const draftRecord = await getDraftBlob();
    if (draftRecord && draftRecord.blob) {
      const draftBlob = draftRecord.blob;
      const metaStr = localStorage.getItem('active_packing_draft_metadata');
      let meta: any = {};
      try { meta = metaStr ? JSON.parse(metaStr) : {}; } catch (e) { }

      const trackingNumber = meta.trackingNumber || draftRecord.trackingNumber || 'PACKING-DRAFT';
      const fileSizeMB = parseFloat((draftBlob.size / (1024 * 1024)).toFixed(2));

      result.push({
        id: meta.draftId || 'active_recording_draft_blob',
        sourceStore: 'draft_blob',
        trackingNumber,
        orderNumber: meta.orderNumber || draftRecord.orderNumber || `ORD-${trackingNumber}`,
        fileSizeMB,
        blob: draftBlob,
        createdAt: draftRecord.updatedAt || new Date().toISOString(),
        videoFileName: meta.videoFileName || `${trackingNumber}.mp4`,
      });
    }
  } catch (err) {
    console.error('getAllIndexedDBVideos error:', err);
  }

  return result;
}
