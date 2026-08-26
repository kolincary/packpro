import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, Database, Play, Download, Copy, Check, ExternalLink, 
  AlertTriangle, CheckCircle, RefreshCw, FileText, Calendar, HardDrive, ShieldAlert, Eye, X,
  Trash2, Upload, VideoOff
} from 'lucide-react';
import { PackingVideoLog, CloudflareConfig, User } from '../types';
import { getOfflineVideoQueue, getAllIndexedDBVideos } from '../lib/indexedDB';
import { uploadVideoToCloudflareR2 } from '../lib/cloudflare';
import { S3Client, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { CustomVideoPlayer } from './CustomVideoPlayer';

interface InventoryLogsProps {
  logs: PackingVideoLog[];
  config: CloudflareConfig;
  onRetryUpload: (logId: string) => void;
  onResolveAnomaly: (logId: string) => void;
  onDeleteLog: (logId: string) => void;
  currentUser: User;
}

// Helpers for date filtering
const getLogDateKey = (log: PackingVideoLog): string => {
  if (log.createdAt) {
    try {
      const d = new Date(log.createdAt);
      if (!isNaN(d.getTime())) {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      }
    } catch (e) {}
  }
  if (log.timestamp) {
    const match = log.timestamp.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (match) {
      return `${match[3]}-${match[2]}-${match[1]}`;
    }
  }
  return '';
};

const getTodayDateString = (): string => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const getYesterdayDateString = (): string => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export const InventoryLogs: React.FC<InventoryLogsProps> = ({
  logs,
  config,
  onRetryUpload,
  onResolveAnomaly,
  onDeleteLog,
  currentUser,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeLogModal, setActiveLogModal] = useState<PackingVideoLog | null>(null);
  const [deleteConfirmLog, setDeleteConfirmLog] = useState<PackingVideoLog | null>(null);
  const [modalVideoSrc, setModalVideoSrc] = useState<string>('');

  // Date Filtering & Pagination State (Default: Hari Ini / Realtime, 50 Data per Page)
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>(() => getTodayDateString());
  const [dateFilterMode, setDateFilterMode] = useState<'today' | 'custom' | 'all'>('today');
  const [itemsPerPage, setItemsPerPage] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const dateInputRef = React.useRef<HTMLInputElement>(null);

  const handleOpenCalendar = () => {
    try {
      if (dateInputRef.current && 'showPicker' in dateInputRef.current) {
        dateInputRef.current.showPicker();
      } else if (dateInputRef.current) {
        dateInputRef.current.focus();
        dateInputRef.current.click();
      }
    } catch (e) {}
  };

  const [missingR2LogIds, setMissingR2LogIds] = useState<Set<string>>(new Set());
  const checkedKeysRef = React.useRef<Set<string>>(new Set());

  // Background R2 Verification: Checks Cloudflare R2 bucket via HeadObjectCommand
  // to detect if video file actually exists or 404s on Cloudflare R2!
  useEffect(() => {
    if (!logs || logs.length === 0) return;

    let isMounted = true;
    const checkR2VideosAvailability = async () => {
      const accountId = config.accountId || 'd89c44120fd91b332dd07d4527d69ade';
      const accessKeyId = config.r2AccessKeyId || '3ee23b57c409595f1c26f7ae30cc86b6';
      const secretAccessKey = config.r2SecretKey || 'cbc1ddc8e0ec83688e9a43c1afe66f8474ade4fc573c8ce7a05de34468392577';
      const bucketName = config.r2BucketName || 'packing-video';

      const s3 = new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId, secretAccessKey },
      });

      // Filter logs that haven't been verified yet
      const unverifiedLogs = logs.filter(log => {
        if (!log.r2StorageKey) return false;
        return !checkedKeysRef.current.has(log.r2StorageKey);
      });

      if (unverifiedLogs.length === 0) return;

      // Check all unverified logs in parallel
      const checkPromises = unverifiedLogs.map(async (log) => {
        checkedKeysRef.current.add(log.r2StorageKey);
        try {
          await s3.send(new HeadObjectCommand({
            Bucket: bucketName,
            Key: log.r2StorageKey,
          }));
          return { id: log.id, exists: true };
        } catch (err: any) {
          // File 404s or does NOT exist on Cloudflare R2!
          return { id: log.id, exists: false };
        }
      });

      const results = await Promise.all(checkPromises);
      const missingIds = results.filter(r => !r.exists).map(r => r.id);

      if (isMounted && missingIds.length > 0) {
        console.log(`[PackGuard R2 Auditor] Verifikasi R2 Selesai: Ditemukan ${missingIds.length} berkas video 404 (Belum Ada Di R2). Otomatis masuk ke filter "Belum Ada Video R2".`);
        setMissingR2LogIds(prev => {
          const next = new Set(prev);
          missingIds.forEach(id => next.add(id));
          return next;
        });
      }
    };

    checkR2VideosAvailability();
  }, [logs, config]);

  // Helper to detect if a log metadata is missing its video file in Cloudflare R2
  const isMissingR2Video = (log: PackingVideoLog) => {
    if (!log.videoUrl || 
        log.videoUrl.trim() === '' || 
        log.videoUrl.includes('placeholder') || 
        log.status === 'failed' || 
        log.status === 'pending') {
      return true;
    }
    return missingR2LogIds.has(log.id);
  };

  const missingVideoCount = logs.filter(isMissingR2Video).length;

  useEffect(() => {
    if (!activeLogModal) return;

    let isMounted = true;
    const resolveVideoUrl = async () => {
      // 1. If activeLogModal already has a presigned HTTP/HTTPS URL with signature, use it directly!
      if (activeLogModal.videoUrl && 
          (activeLogModal.videoUrl.startsWith('http://') || activeLogModal.videoUrl.startsWith('https://')) &&
          activeLogModal.videoUrl.includes('X-Amz-Signature')) {
        if (isMounted) setModalVideoSrc(activeLogModal.videoUrl);
        return;
      }

      // 2. Generate Presigned Cloudflare R2 Stream URL (enables Admin/Dev on ANY device to stream Cloudflare R2 video)
      if (activeLogModal.r2StorageKey) {
        try {
          const accountId = config.accountId || 'd89c44120fd91b332dd07d4527d69ade';
          const accessKeyId = config.r2AccessKeyId || '3ee23b57c409595f1c26f7ae30cc86b6';
          const secretAccessKey = config.r2SecretKey || 'cbc1ddc8e0ec83688e9a43c1afe66f8474ade4fc573c8ce7a05de34468392577';
          const bucketName = config.r2BucketName || 'packing-video';

          const s3 = new S3Client({
            region: 'auto',
            endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
            credentials: { accessKeyId, secretAccessKey },
          });

          const command = new GetObjectCommand({
            Bucket: bucketName,
            Key: activeLogModal.r2StorageKey,
          });

          const presignedR2Url = await getSignedUrl(s3, command, { expiresIn: 604800 });
          if (isMounted) {
            setModalVideoSrc(presignedR2Url);
            console.log('[Video Player] Presigned Cloudflare R2 Stream URL generated for', activeLogModal.r2StorageKey);
            return;
          }
        } catch (r2Err) {
          console.warn('Failed to generate Cloudflare R2 presigned stream URL:', r2Err);
        }
      }

      // 3. Fallback to IndexedDB local blob if offline / local session
      try {
        const allIndexedVideos = await getAllIndexedDBVideos();
        const localItem = allIndexedVideos.find(
          (item) => (item.trackingNumber && activeLogModal.trackingNumber && (item.trackingNumber.includes(activeLogModal.trackingNumber) || activeLogModal.trackingNumber.includes(item.trackingNumber))) ||
                    (item.orderNumber && activeLogModal.orderNumber && (item.orderNumber.includes(activeLogModal.orderNumber) || activeLogModal.orderNumber.includes(item.orderNumber))) ||
                    (item.videoFileName && activeLogModal.videoFileName && item.videoFileName === activeLogModal.videoFileName)
        );
        if (localItem && localItem.blob && isMounted) {
          const localUrl = URL.createObjectURL(localItem.blob);
          setModalVideoSrc(localUrl);
          return;
        }
      } catch (e) {
        console.warn('IndexedDB fallback scan notice:', e);
      }

      if (isMounted) {
        setModalVideoSrc(activeLogModal.videoUrl || '');
      }
    };

    resolveVideoUrl();
    return () => { isMounted = false; };
  }, [activeLogModal]);

  const todayStr = getTodayDateString();
  const yesterdayStr = getYesterdayDateString();

  const todayLogCount = logs.filter(l => getLogDateKey(l) === todayStr).length;
  const yesterdayLogCount = logs.filter(l => getLogDateKey(l) === yesterdayStr).length;

  // Filter & sort logs by Date, Search, and Status (Newest records on top)
  const filteredLogs = logs
    .filter((log) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        log.orderNumber.toLowerCase().includes(q) ||
        (log.trackingNumber && log.trackingNumber.toLowerCase().includes(q)) ||
        (log.sku && log.sku.toLowerCase().includes(q)) ||
        (log.namaBarang && log.namaBarang.toLowerCase().includes(q)) ||
        log.customerName.toLowerCase().includes(q) ||
        log.videoFileName.toLowerCase().includes(q) ||
        log.operatorName.toLowerCase().includes(q) ||
        log.courier.toLowerCase().includes(q);

      const matchesStatus =
        selectedStatus === 'all' ||
        (selectedStatus === 'uploaded' && log.status === 'uploaded' && !isMissingR2Video(log)) ||
        (selectedStatus === 'missing_video' && isMissingR2Video(log)) ||
        (selectedStatus === 'failed' && log.status === 'failed') ||
        (selectedStatus === 'anomaly' && log.status === 'anomaly');

      const logDate = getLogDateKey(log);
      const matchesDate =
        selectedDateFilter === 'all' ||
        logDate === selectedDateFilter;

      return matchesSearch && matchesStatus && matchesDate;
    })
    .sort((a, b) => {
      const timeA = new Date(a.createdAt || a.timestamp).getTime();
      const timeB = new Date(b.createdAt || b.timestamp).getTime();
      if (!isNaN(timeA) && !isNaN(timeB)) {
        return timeB - timeA; // Descending: newest record on top!
      }
      return 0;
    });

  // Pagination Math
  const totalFilteredCount = filteredLogs.length;
  const totalPages = Math.max(1, Math.ceil(totalFilteredCount / itemsPerPage));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalFilteredCount);
  const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 text-white pb-24 md:pb-10">
      
      {/* Page Header & Stats Summary */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 p-4 rounded-2xl shadow-sm text-slate-900">
        <div>
          <div className="flex items-center space-x-2">
            <Database className="w-5 h-5 text-blue-600" />
            <h1 className="text-lg font-bold text-slate-900">Log Inventaris Supabase & Cloudflare R2 Archive</h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Database PostgreSQL terindeks secara real-time. Pencarian instan berdasarkan Nomor Resi.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 text-xs font-mono">
          <div className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <span className="text-slate-400 block text-[10px]">TOTAL RECORD</span>
            <span className="font-bold text-blue-700">{logs.length} Rekaman</span>
          </div>
          
          {missingVideoCount > 0 && (
            <div 
              onClick={() => setSelectedStatus('missing_video')}
              className="bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200 cursor-pointer hover:bg-amber-100 transition-colors"
              title="Klik untuk filter log yang belum ada video R2"
            >
              <span className="text-amber-700 block text-[10px] font-bold">BELUM ADA VIDEO R2</span>
              <span className="font-bold text-amber-700">{missingVideoCount} Pesanan</span>
            </div>
          )}

          <div className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <span className="text-slate-400 block text-[10px]">VOLUME TERAKUMULASI</span>
            <span className="font-bold text-blue-600">
              {logs.reduce((acc, curr) => acc + curr.fileSizeMB, 0).toFixed(1)} MB
            </span>
          </div>
        </div>
      </div>

      {/* TOP NOTIFICATION BANNER: MISSING R2 VIDEOS DETECTED (0ms Instant) */}
      {missingVideoCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-slate-900 shadow-xs">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-600 animate-pulse" />
            </div>
            <div>
              <h4 className="font-bold text-xs sm:text-sm text-slate-900">
                Ditemukan {missingVideoCount} Log Pesanan yang Berkas Videonya Belum Tersedia di Cloudflare R2
              </h4>
              <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                Catatan metadata tersimpan di database, tetapi berkas video belum diunggah. Filter langsung untuk mengunggah dari HP / Galeri.
              </p>
            </div>
          </div>

          <button
            onClick={() => setSelectedStatus('missing_video')}
            className="bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-xs shrink-0 flex items-center space-x-1.5 cursor-pointer whitespace-nowrap"
          >
            <VideoOff className="w-4 h-4" />
            <span>Filter {missingVideoCount} Video Belum Ada</span>
          </button>
        </div>
      )}

      {/* DATE FILTER & ROWS PER PAGE BAR */}
      <div className="bg-white border border-slate-200 p-3.5 rounded-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-slate-900 shadow-xs">
        {/* Left: Quick Date Filter Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center space-x-1.5 font-bold text-xs text-slate-700 mr-1">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span>Filter Waktu & Tanggal:</span>
          </div>

          {/* Button 1: Hari Ini / Realtime */}
          <button
            type="button"
            onClick={() => {
              setSelectedDateFilter(todayStr);
              setDateFilterMode('today');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1 ${
              selectedDateFilter === todayStr
                ? 'bg-blue-600 text-white shadow-xs ring-2 ring-blue-400/30'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
            }`}
          >
            <span>⚡ Hari Ini / Realtime</span>
            <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] ml-1">{todayLogCount}</span>
          </button>

          {/* Button 2: Kemarin */}
          <button
            type="button"
            onClick={() => {
              setSelectedDateFilter(yesterdayStr);
              setDateFilterMode('custom');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center space-x-1 ${
              selectedDateFilter === yesterdayStr
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
            }`}
          >
            <span>Kemarin</span>
            <span className="bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded text-[10px] ml-1">{yesterdayLogCount}</span>
          </button>

          {/* Button 3: Semua Tanggal */}
          <button
            type="button"
            onClick={() => {
              setSelectedDateFilter('all');
              setDateFilterMode('all');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center space-x-1 ${
              selectedDateFilter === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
            }`}
          >
            <span>Semua Tanggal</span>
            <span className="bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded text-[10px] ml-1">{logs.length}</span>
          </button>

          {/* Input Custom Date Pill with Invisible Overlay (100% Prevents Chrome segment blue highlight/blocking) */}
          <div
            onClick={handleOpenCalendar}
            className="relative flex items-center space-x-1.5 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border border-slate-200 rounded-xl px-3 py-1.5 cursor-pointer select-none transition-colors group"
            title="Klik untuk membuka kalender pilih tanggal"
          >
            <Calendar className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-600 shrink-0 pointer-events-none select-none" />
            <span className="text-[11px] font-semibold text-slate-600 pointer-events-none select-none whitespace-nowrap">Pilih Tanggal:</span>
            
            {/* Formatted Date Display Text - Clean, 100% Non-selectable, no blue segment blocks */}
            <span className="text-xs font-mono font-extrabold text-blue-700 pointer-events-none select-none bg-blue-50/80 px-2 py-0.5 rounded-lg border border-blue-100/60">
              {selectedDateFilter === 'all'
                ? 'Semua Tanggal'
                : selectedDateFilter.split('-').reverse().join('/')}
            </span>

            {/* Hidden Native Input Overlay positioned over the entire pill container */}
            <input
              ref={dateInputRef}
              type="date"
              value={selectedDateFilter === 'all' ? '' : selectedDateFilter}
              onChange={(e) => {
                if (e.target.value) {
                  setSelectedDateFilter(e.target.value);
                  setDateFilterMode('custom');
                  setCurrentPage(1);
                }
              }}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
            />
          </div>
        </div>

        {/* Right: Items Per Page Selector */}
        <div className="flex items-center justify-between md:justify-end space-x-2 border-t md:border-t-0 pt-2 md:pt-0 border-slate-100">
          <span className="text-xs font-semibold text-slate-600">Baris per Halaman:</span>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="bg-slate-100 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-2xs"
          >
            <option value={50}>50 Data / Page (Default)</option>
            <option value={100}>100 Data / Page</option>
            <option value={200}>200 Data / Page</option>
            <option value={500}>500 Data / Page</option>
            <option value={999999}>Semua Data (Tanpa Batas)</option>
          </select>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="w-4.5 h-4.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari Nomor Pesanan (ORD-...), Pembeli, atau File Video..."
            className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-9 py-2.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 shadow-sm font-medium"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
              title="Bersihkan kata kunci pencarian"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <Filter className="w-4 h-4 text-slate-400 shrink-0 hidden sm:block" />
          <button
            onClick={() => setSelectedStatus('all')}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
              selectedStatus === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
            }`}
          >
            Semua ({logs.length})
          </button>
          
          <button
            onClick={() => setSelectedStatus('missing_video')}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap flex items-center space-x-1.5 cursor-pointer ${
              selectedStatus === 'missing_video'
                ? 'bg-amber-600 text-white shadow-sm'
                : missingVideoCount > 0
                ? 'bg-amber-50 border border-amber-300 text-amber-800 hover:bg-amber-100'
                : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
            }`}
          >
            <VideoOff className="w-3.5 h-3.5 shrink-0" />
            <span>Belum Ada Video R2 ({missingVideoCount})</span>
          </button>

          <button
            onClick={() => setSelectedStatus('uploaded')}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
              selectedStatus === 'uploaded'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
            }`}
          >
            Berhasil R2 ({logs.filter((l) => l.status === 'uploaded' && !isMissingR2Video(l)).length})
          </button>

          <button
            onClick={() => setSelectedStatus('anomaly')}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
              selectedStatus === 'anomaly'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
            }`}
          >
            Anomali ({logs.filter((l) => l.status === 'anomaly').length})
          </button>

          <button
            onClick={() => setSelectedStatus('failed')}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
              selectedStatus === 'failed'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
            }`}
          >
            Gagal ({logs.filter((l) => l.status === 'failed').length})
          </button>
        </div>
      </div>

      {/* Logs Table (Desktop) & Cards (Mobile) */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm text-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm text-slate-700">
            <thead className="bg-slate-50 text-slate-700 uppercase text-xs tracking-wider border-b border-slate-200 font-mono font-bold">
              <tr>
                <th className="px-4 py-3.5">Nama File Video / Order</th>
                <th className="px-4 py-3.5">Pelanggan & Kurir</th>
                <th className="px-4 py-3.5">Waktu & Durasi</th>
                <th className="px-4 py-3.5">Operator / Stasiun</th>
                <th className="px-4 py-3.5">Status R2 & D1</th>
                <th className="px-4 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400 text-xs sm:text-sm font-medium">
                    Tidak ada rekaman log inventaris yang cocok dengan pencarian atau filter tanggal.
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    
                    {/* Order & Video File Name */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center space-x-3">
                        <div
                          onClick={() => setActiveLogModal(log)}
                          className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 cursor-pointer hover:bg-indigo-100 transition-colors shrink-0 shadow-2xs"
                        >
                          <Play className="w-4.5 h-4.5 fill-current ml-0.5" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-slate-900 font-mono text-xs sm:text-sm">{log.orderNumber}</span>
                          </div>
                          <span className="text-xs text-indigo-600 font-mono block truncate max-w-xs font-semibold" title={log.videoFileName}>
                            {log.videoFileName}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Customer & Courier */}
                    <td className="px-4 py-3.5">
                      <p className="font-bold text-slate-900 text-xs sm:text-sm">{log.customerName}</p>
                      <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded border border-slate-200 font-semibold inline-block mt-0.5">
                        {log.courier}
                      </span>
                    </td>

                    {/* Timestamp & Duration */}
                    <td className="px-4 py-3.5 font-mono">
                      <p className="text-slate-900 font-bold text-xs sm:text-sm">{log.timestamp}</p>
                      <span className="text-xs text-slate-500 font-medium">
                        {log.durationSeconds} detik • {log.fileSizeMB} MB
                      </span>
                    </td>

                    {/* Operator */}
                    <td className="px-4 py-3.5">
                      <p className="text-slate-900 font-bold text-xs sm:text-sm">{log.operatorName}</p>
                      <span className="text-xs text-slate-500 font-medium block">{log.packingStation}</span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5">
                      {isMissingR2Video(log) ? (
                        <span className="inline-flex items-center space-x-1.5 bg-amber-50 text-amber-800 border border-amber-300 px-2.5 py-1 rounded-full text-xs font-bold shadow-2xs" title="Berkas video belum diunggah ke Cloudflare R2">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 animate-pulse shrink-0" />
                          <span>Belum Ada Video R2</span>
                        </span>
                      ) : log.status === 'uploaded' ? (
                        <span className="inline-flex items-center space-x-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full text-xs font-bold">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Tersimpan R2</span>
                        </span>
                      ) : log.status === 'anomaly' ? (
                        <span className="inline-flex items-center space-x-1.5 bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full text-xs font-bold" title={log.anomalyReason}>
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>Anomali</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1.5 bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-1 rounded-full text-xs font-bold">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          <span>Gagal Unggah</span>
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {isMissingR2Video(log) && (
                          <button
                            onClick={() => setActiveLogModal(log)}
                            className="bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold text-xs px-2.5 py-1.5 rounded-lg transition-all shadow-2xs flex items-center space-x-1 cursor-pointer shrink-0"
                            title="Unggah berkas video dari HP / Galeri untuk pesanan ini"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Unggah Video</span>
                          </button>
                        )}

                        <button
                          onClick={() => setActiveLogModal(log)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-1.5 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                          title="Putar Video & Detail Metadata"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleCopy(log.videoFileName, log.id)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-1.5 rounded-lg border border-slate-200 transition-colors"
                          title="Salin Nama File Video R2"
                        >
                          {copiedKey === log.id ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                        </button>

                        {log.status === 'failed' && (
                          <button
                            onClick={() => onRetryUpload(log.id)}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-2 py-1 rounded-lg text-[10px] font-semibold flex items-center space-x-1"
                          >
                            <RefreshCw className="w-3 h-3 text-rose-600" />
                            <span>Unggah Ulang</span>
                          </button>
                        )}

                        {currentUser.role === 'developer' && (
                          <button
                            onClick={() => setDeleteConfirmLog(log)}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-600 p-1.5 rounded-lg border border-rose-200 transition-colors cursor-pointer btn-delete-log"
                            title="Hapus Record & Metadata Video (Khusus Developer)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION CONTROLS FOOTER */}
        <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 font-mono">
          <div>
            Menampilkan <span className="font-bold text-slate-900">{totalFilteredCount > 0 ? startIndex + 1 : 0}</span> - <span className="font-bold text-slate-900">{endIndex}</span> dari <span className="font-bold text-blue-700">{totalFilteredCount}</span> Rekaman Video
            {selectedDateFilter !== 'all' && (
              <span className="ml-1.5 text-slate-500 font-sans">
                (Filter Tanggal: <strong className="text-blue-800 font-mono">{selectedDateFilter.split('-').reverse().join('/')}</strong>)
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              disabled={validCurrentPage <= 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shadow-2xs"
            >
              &laquo; Sebelumnya
            </button>

            <div className="flex items-center space-x-1 px-2 font-bold text-slate-800 bg-white border border-slate-200 py-1.5 rounded-xl">
              <span>Halaman {validCurrentPage} / {totalPages}</span>
            </div>

            <button
              type="button"
              disabled={validCurrentPage >= totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shadow-2xs"
            >
              Berikutnya &raquo;
            </button>
          </div>
        </div>
      </div>

      {/* DETAIL VIDEO PLAYER MODAL */}
      {activeLogModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl text-slate-900">
            
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Database className="w-5 h-5 text-indigo-600" />
                <span className="font-bold text-sm text-slate-900">Pratinjau Video Packing & Metadata D1</span>
              </div>
              <button
                onClick={() => setActiveLogModal(null)}
                className="p-1 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              
              {/* Video Player */}
              <div className="relative bg-slate-950 rounded-xl overflow-hidden aspect-video border border-slate-800">
                {modalVideoSrc ? (
                  <CustomVideoPlayer
                    src={modalVideoSrc}
                    trackingNumber={activeLogModal?.trackingNumber}
                    timestamp={activeLogModal?.timestamp}
                    fallbackDurationSeconds={activeLogModal?.durationSeconds || 30}
                    onError={async () => {
                      try {
                        const offlineQueue = await getOfflineVideoQueue();
                        const localItem = offlineQueue.find(
                          (item) => item.trackingNumber === activeLogModal?.trackingNumber || item.orderId === activeLogModal?.orderNumber
                        );
                        if (localItem && localItem.videoBlob) {
                          setModalVideoSrc(URL.createObjectURL(localItem.videoBlob));
                        } else {
                          setModalVideoSrc('');
                        }
                      } catch (e) {
                        setModalVideoSrc('');
                      }
                    }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-300 space-y-3 p-6 text-center">
                    <AlertTriangle className="w-9 h-9 text-amber-400 animate-pulse" />
                    <span className="text-sm font-bold text-white">Berkas Video Belum Tersedia Di Cloudflare R2</span>
                    <p className="text-xs text-slate-400 max-w-md leading-relaxed">
                      Catatan metadata ({activeLogModal?.fileSizeMB} MB) sudah sah tersimpan di database. Jika Anda memiliki berkas video ini di Galeri HP/kamera, Anda dapat mengunggahnya langsung ke Cloudflare R2!
                    </p>
                    <label className="mt-1 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer shadow-md transition-all flex items-center space-x-2">
                      <Upload className="w-4 h-4" />
                      <span>📤 Unggah Berkas Video Dari HP / Galeri</span>
                      <input 
                        type="file" 
                        accept="video/*" 
                        className="hidden" 
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file && activeLogModal) {
                            try {
                              const fileUrl = URL.createObjectURL(file);
                              setModalVideoSrc(fileUrl);
                              await uploadVideoToCloudflareR2(
                                file,
                                activeLogModal.trackingNumber,
                                activeLogModal.videoFileName,
                                config,
                                {
                                  order_id: activeLogModal.orderNumber,
                                  tracking_number: activeLogModal.trackingNumber,
                                  video_size: activeLogModal.fileSizeMB,
                                }
                              );
                              alert('✓ Berkas video berhasil diunggah dan ditautkan ke Cloudflare R2!');
                            } catch (err) {
                              alert('Gagal mengunggah video. Pastikan koneksi internet stabil.');
                            }
                          }
                        }}
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* Metadata Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                
                <div className="space-y-1.5">
                  <div className="flex justify-between border-b border-slate-200/80 pb-1">
                    <span className="text-slate-500">Nomor Pesanan:</span>
                    <span className="font-mono font-bold text-slate-900">{activeLogModal.orderNumber}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/80 pb-1">
                    <span className="text-slate-500">Nama File R2:</span>
                    <span className="font-mono text-indigo-600 font-semibold">{activeLogModal.videoFileName}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/80 pb-1">
                    <span className="text-slate-500">R2 Object Key:</span>
                    <span className="font-mono text-slate-600 text-[10px] truncate max-w-[180px]">{activeLogModal.r2StorageKey}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">D1 Record ID:</span>
                    <span className="font-mono text-slate-600 text-[10px]">{activeLogModal.d1RecordId}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between border-b border-slate-200/80 pb-1">
                    <span className="text-slate-500">Operator Packing:</span>
                    <span className="text-slate-800 font-medium">{activeLogModal.operatorName} ({activeLogModal.packingStation})</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/80 pb-1">
                    <span className="text-slate-500">Waktu & Ukuran:</span>
                    <span className="text-slate-800">{activeLogModal.timestamp} • {activeLogModal.fileSizeMB} MB</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/80 pb-1">
                    <span className="text-slate-500">Status SOP Packing:</span>
                    <span className="text-emerald-600 font-semibold">
                      {activeLogModal.checklist.outerBoxSealed ? 'Tersegel Rapat' : 'Perlu Diperiksa'}
                    </span>
                  </div>
                  {activeLogModal.anomalyReason && (
                    <div className="pt-1 text-amber-600">
                      <span className="font-semibold block">Catatan Anomali:</span>
                      <span>{activeLogModal.anomalyReason}</span>
                    </div>
                  )}
                </div>

              </div>

              {/* Modal Actions */}
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  onClick={() => {
                    alert(`Bukti packing digital untuk ${activeLogModal.orderNumber} berhasil dicetak.`);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-xl text-xs flex items-center space-x-1.5 shadow-sm"
                >
                  <FileText className="w-4 h-4" />
                  <span>Cetak Sertifikat Bukti Packing</span>
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* CUSTOM CONFIRM DELETE MODAL */}
      {deleteConfirmLog && (
        <div 
          onClick={() => setDeleteConfirmLog(null)}
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl text-slate-900 space-y-4 animate-fade-in cursor-default"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-3 text-rose-600">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 leading-tight">Konfirmasi Hapus Record Video</h3>
                  <p className="text-[11px] text-rose-600 font-semibold mt-0.5">Tindakan ini permanen</p>
                </div>
              </div>
              <button
                onClick={() => setDeleteConfirmLog(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Nomor Pesanan:</span>
                <span className="font-mono font-bold text-slate-900">{deleteConfirmLog.orderNumber}</span>
              </div>
              {deleteConfirmLog.trackingNumber && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Nomor Resi:</span>
                  <span className="font-mono font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                    {deleteConfirmLog.trackingNumber}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Nama File Video:</span>
                <span className="font-mono text-[11px] text-slate-600 truncate max-w-[200px]" title={deleteConfirmLog.videoFileName}>
                  {deleteConfirmLog.videoFileName}
                </span>
              </div>
            </div>

            <div className="bg-rose-50 border border-rose-200 p-3 rounded-2xl flex items-start space-x-2.5 text-xs text-rose-800">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                Apakah Anda yakin ingin menghapus log video ini dari database? File video & data terkait tidak dapat dipulihkan kembali.
              </p>
            </div>

            <div className="flex space-x-3 pt-1">
              <button
                type="button"
                onClick={() => setDeleteConfirmLog(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-3 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteLog(deleteConfirmLog.id);
                  setDeleteConfirmLog(null);
                }}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-3 rounded-xl transition-all shadow-md shadow-rose-600/20 cursor-pointer flex items-center justify-center space-x-1.5"
                id="btn-confirm-delete"
              >
                <Trash2 className="w-4 h-4 text-white" />
                <span>Ya, Hapus Record</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
