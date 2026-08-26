import React, { useState, useEffect } from 'react';
import { 
  Database, X, Upload, Download, CheckCircle, 
  RefreshCw, HardDrive, ShieldCheck 
} from 'lucide-react';
import { getAllIndexedDBVideos, removeVideoFromIndexedDB, clearDraftBlob, DetailedIndexedDBItem } from '../lib/indexedDB';
import { uploadVideoToCloudflareR2 } from '../lib/cloudflare';
import { savePackingLogToSupabase } from '../lib/supabaseLogs';
import { CloudflareConfig, PackingVideoLog } from '../types';

interface IndexedDBManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: CloudflareConfig;
  onLogUploaded?: (log: PackingVideoLog) => void;
}

export const IndexedDBManagerModal: React.FC<IndexedDBManagerModalProps> = ({
  isOpen,
  onClose,
  config,
  onLogUploaded,
}) => {
  const [items, setItems] = useState<DetailedIndexedDBItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fetchItems = async () => {
    setLoading(true);
    const data = await getAllIndexedDBVideos();
    setItems(data);
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      fetchItems();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleForceUploadItem = async (item: DetailedIndexedDBItem) => {
    setUploadingId(item.id);
    setUploadProgress(10);
    setStatusMessage(`Mengunggah berkas ${item.trackingNumber} (${item.fileSizeMB} MB) ke R2...`);

    try {
      const uploadRes = await uploadVideoToCloudflareR2(
        item.blob,
        item.trackingNumber || 'PACKING-MANUAL',
        item.videoFileName || `${item.trackingNumber}.mp4`,
        config,
        {
          order_id: item.orderNumber,
          tracking_number: item.trackingNumber,
          video_size: item.fileSizeMB,
        },
        (progress) => setUploadProgress(progress)
      );

      const newLog: PackingVideoLog = {
        id: item.id,
        orderNumber: item.orderNumber || `ORD-${item.trackingNumber}`,
        trackingNumber: item.trackingNumber,
        sku: 'SKU-GENERAL',
        namaBarang: 'Barang Paket',
        customerName: 'Pelanggan',
        courier: 'Ekspedisi',
        videoFileName: item.videoFileName,
        videoUrl: uploadRes.r2Url,
        r2StorageKey: uploadRes.r2Key,
        d1RecordId: uploadRes.supabaseId,
        timestamp: new Date().toLocaleTimeString('id-ID'),
        durationSeconds: 60,
        fileSizeMB: item.fileSizeMB,
        operatorName: 'Operator 01',
        packingStation: 'Stasiun 01 (Utama)',
        checklist: { itemsChecked: true, bubbleWrapped: true, labelAttached: true, outerBoxSealed: true, fragileSticker: false },
        items: [],
        status: 'uploaded',
      };

      savePackingLogToSupabase(newLog);
      if (onLogUploaded) onLogUploaded(newLog);

      if (item.sourceStore === 'offline_videos') {
        await removeVideoFromIndexedDB(item.id);
      } else {
        localStorage.removeItem('active_packing_draft_metadata');
        await clearDraftBlob();
      }

      setStatusMessage(`✓ Berkas ${item.trackingNumber} berhasil diunggah ke Cloudflare R2!`);
      await fetchItems();
    } catch (err: any) {
      console.error('Force upload error:', err);
      setStatusMessage(`Gagal mengunggah: ${err.message}`);
    } finally {
      setUploadingId(null);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  const handleForceUploadAll = async () => {
    for (const item of items) {
      await handleForceUploadItem(item);
    }
  };

  const handleDownloadBlob = (item: DetailedIndexedDBItem) => {
    const url = URL.createObjectURL(item.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = item.videoFileName || `${item.trackingNumber || 'packing'}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl text-slate-900 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-indigo-100 rounded-xl text-indigo-600">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Manajer Berkas IndexedDB HP</h3>
              <p className="text-[11px] text-slate-500 font-medium">Paksa Unggah / Unduh berkas video tersimpan di HP kantor</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">

          {statusMessage && (
            <div className="bg-indigo-900 text-white p-3 rounded-xl text-xs flex flex-col space-y-1.5 shadow-sm">
              <div className="flex items-center justify-between font-bold">
                <span>{statusMessage}</span>
                {uploadProgress > 0 && <span>{uploadProgress}%</span>}
              </div>
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="w-full bg-indigo-950 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-400 h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between bg-slate-100 p-3 rounded-xl border border-slate-200">
            <div className="flex items-center space-x-2">
              <HardDrive className="w-4 h-4 text-slate-600" />
              <span className="text-xs font-bold text-slate-800">
                Total Berkas Tersimpan di HP: <span className="text-indigo-600">{items.length} Video</span>
              </span>
            </div>
            
            {items.length > 0 && (
              <button
                onClick={handleForceUploadAll}
                disabled={!!uploadingId}
                className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs px-3 py-1.5 rounded-lg font-bold flex items-center space-x-1.5 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Paksa Unggah Semua ({items.length})</span>
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center p-8 space-y-2 text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
              <span className="text-xs">Membaca memori IndexedDB HP...</span>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-slate-400 text-center space-y-2">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
              <span className="text-xs font-bold text-slate-700">IndexedDB HP Bersih (0 Berkas Tertahan)</span>
              <span className="text-[11px] text-slate-500">Seluruh berkas video rekaman HP kantor telah sukses terunggah ke Cloudflare R2!</span>
            </div>
          ) : (
            <div className="space-y-2.5">
              {items.map((item) => (
                <div key={item.id} className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs hover:border-indigo-300 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span className="font-mono font-bold text-xs text-slate-900">{item.trackingNumber}</span>
                      <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded border border-indigo-100">
                        {item.fileSizeMB} MB
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-mono">{item.videoFileName}</p>
                    <p className="text-[10px] text-slate-400">Penyimpanan: {item.sourceStore}</p>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      onClick={() => handleDownloadBlob(item)}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 border border-slate-200 transition-colors cursor-pointer"
                      title="Unduh berkas video asli ke HP/PC"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-600" />
                      <span>Unduh MP4</span>
                    </button>

                    <button
                      onClick={() => handleForceUploadItem(item)}
                      disabled={uploadingId === item.id}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {uploadingId === item.id ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Upload className="w-3.5 h-3.5" />
                      )}
                      <span>Paksa Unggah ke R2</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs px-4 py-2 rounded-xl font-bold transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
