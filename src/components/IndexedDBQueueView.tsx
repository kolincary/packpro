import React, { useState, useEffect } from 'react';
import { 
  Database, RefreshCw, Upload, Download, CheckCircle, 
  AlertTriangle, HardDrive, ShieldCheck, Clock, Layers, Lock, Shield 
} from 'lucide-react';
import { getAllIndexedDBVideos, removeVideoFromIndexedDB, clearDraftBlob, DetailedIndexedDBItem } from '../lib/indexedDB';
import { uploadVideoToCloudflareR2 } from '../lib/cloudflare';
import { savePackingLogToSupabase } from '../lib/supabaseLogs';
import { CloudflareConfig, PackingVideoLog, User } from '../types';

interface IndexedDBQueueViewProps {
  config: CloudflareConfig;
  currentUser: User;
  onLogUploaded?: (log: PackingVideoLog) => void;
}

export const IndexedDBQueueView: React.FC<IndexedDBQueueViewProps> = ({
  config,
  currentUser,
  onLogUploaded,
}) => {
  const [items, setItems] = useState<DetailedIndexedDBItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fetchQueueItems = async () => {
    setLoading(true);
    const data = await getAllIndexedDBVideos();
    setItems(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchQueueItems();
    const interval = setInterval(fetchQueueItems, 3000);
    return () => clearInterval(interval);
  }, []);

  const totalSizeMB = items.reduce((acc, curr) => acc + curr.fileSizeMB, 0).toFixed(2);

  const handleForceUploadItem = async (item: DetailedIndexedDBItem) => {
    setUploadingId(item.id);
    setUploadProgress(10);
    setStatusMessage(`Mengunggah berkas ${item.trackingNumber} (${item.fileSizeMB} MB) ke Cloudflare R2...`);

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
        operatorName: currentUser.fullName || 'Operator 01',
        packingStation: currentUser.station || 'Stasiun 01 (Utama)',
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

      setStatusMessage(`✓ Berkas ${item.trackingNumber} berhasil terunggah ke Cloudflare R2!`);
      await fetchQueueItems();
    } catch (err: any) {
      console.error('Force upload error:', err);
      setStatusMessage(`Koneksi Kurang Stabil: ${err.message || 'Gagal terunggah'}`);
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
    <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Top Banner & Title */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-600/20 shrink-0">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">Antrean Berkas Video IndexedDB HP</h1>
              <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-0.5 rounded-full border border-amber-200 flex items-center space-x-1">
                <Clock className="w-3 h-3 text-amber-600" />
                <span>Antrean Latar Belakang</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Seluruh video rekaman packing otomatis masuk ke memori IndexedDB HP terlebih dahulu sebagai antrean aman sebelum terkirim ke Cloudflare R2.
            </p>
          </div>
        </div>

        {items.length > 0 && (
          <button
            onClick={handleForceUploadAll}
            disabled={!!uploadingId}
            className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md shadow-blue-600/20 flex items-center justify-center space-x-2 transition-all cursor-pointer disabled:opacity-50 shrink-0"
          >
            <Upload className="w-4 h-4" />
            <span>Unggah Semua Sekarang ({items.length})</span>
          </button>
        )}
      </div>

      {/* Real-time Status Message Toast */}
      {statusMessage && (
        <div className="bg-blue-900 text-white p-4 rounded-2xl shadow-lg border border-blue-700 flex flex-col space-y-2">
          <div className="flex items-center justify-between font-bold text-xs">
            <div className="flex items-center space-x-2">
              <RefreshCw className="w-4 h-4 text-blue-300 animate-spin" />
              <span>{statusMessage}</span>
            </div>
            {uploadProgress > 0 && <span className="font-mono text-blue-300">{uploadProgress}%</span>}
          </div>
          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="w-full bg-indigo-950 h-2 rounded-full overflow-hidden">
              <div className="bg-blue-400 h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
            </div>
          )}
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Total Antrean HP</span>
            <Layers className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{items.length} Berkas</div>
          <p className="text-[11px] text-slate-400 font-medium">Tersimpan di memori lokal HP</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Total Ukuran Memori</span>
            <HardDrive className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-blue-600 font-mono">{totalSizeMB} MB</div>
          <p className="text-[11px] text-slate-400 font-medium">Penggunaan IndexedDB saat ini</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Status Auto-Sync</span>
            <RefreshCw className="w-4 h-4 text-sky-600 animate-spin" />
          </div>
          <div className="text-base font-bold text-sky-700">Aktif Latar Belakang</div>
          <p className="text-[11px] text-slate-400 font-medium">Mengunggah bertahap tanpa korup</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Proteksi Berkas</span>
            <Lock className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-base font-bold text-rose-700">Tidak Bisa Dihapus</div>
          <p className="text-[11px] text-slate-400 font-medium">Aman dari ketidaksengajaan</p>
        </div>

      </div>

      {/* Main Queue List */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            <span className="font-bold text-sm text-slate-900">Daftar Berkas Video Terindeks di IndexedDB HP</span>
          </div>
          <button
            onClick={fetchQueueItems}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Segarkan</span>
          </button>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 text-slate-400 space-y-2">
              <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
              <span className="text-xs font-semibold">Membaca memori IndexedDB HP kantor...</span>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl space-y-3">
              <CheckCircle className="w-12 h-12 text-emerald-500" />
              <h3 className="font-bold text-slate-800 text-sm">IndexedDB HP Bersih (0 Berkas Tertahan)</h3>
              <p className="text-xs text-slate-500 max-w-md">
                Seluruh video rekaman packing dari HP kantor ini telah **100% sukses terunggah ke Cloudflare R2 & ter-index di Supabase PostgreSQL**!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={item.id} className="bg-white border border-slate-200 hover:border-indigo-300 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all shadow-xs">
                  
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="bg-slate-100 text-slate-700 font-mono text-[10px] font-bold px-2 py-0.5 rounded">
                        #{idx + 1}
                      </span>
                      <span className="font-mono font-black text-sm text-slate-900">{item.trackingNumber}</span>
                      <span className="bg-indigo-50 text-indigo-700 font-mono text-xs font-bold px-2.5 py-0.5 rounded-full border border-indigo-100">
                        {item.fileSizeMB} MB
                      </span>
                      
                      <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200 flex items-center space-x-1">
                        <Clock className="w-3 h-3 text-amber-600" />
                        <span>Dalam Antrean</span>
                      </span>
                    </div>

                    <div className="text-xs font-mono text-indigo-600 font-semibold truncate max-w-md">
                      {item.videoFileName}
                    </div>

                    <div className="flex items-center space-x-4 text-[11px] text-slate-500">
                      <span>Pesanan: <b className="text-slate-800 font-mono">{item.orderNumber}</b></span>
                      <span>Lokasi Store: <b className="text-slate-700">{item.sourceStore}</b></span>
                      <span>Dibuat: <b className="text-slate-700">{new Date(item.createdAt).toLocaleTimeString('id-ID')} WIB</b></span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                    <button
                      onClick={() => handleDownloadBlob(item)}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 border border-slate-200 transition-colors cursor-pointer"
                      title="Unduh berkas MP4 mentah ke HP/PC"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-600" />
                      <span>Unduh MP4</span>
                    </button>

                    <button
                      onClick={() => handleForceUploadItem(item)}
                      disabled={uploadingId === item.id}
                      className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {uploadingId === item.id ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4" />
                      )}
                      <span>Unggah Sekarang</span>
                    </button>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
