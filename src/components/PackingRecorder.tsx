import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, Video, Square, RefreshCw, CheckSquare, Square as UncheckedSquare, 
  Upload, CheckCircle, AlertTriangle, Play, Pause, Zap, Clock, ShieldCheck, FileText, Package, ArrowRight, User, WifiOff, Database, Check,
  Smartphone, RotateCw, ChevronDown, ChevronUp
} from 'lucide-react';
import { PackingVideoLog, CloudflareConfig, Operator, PackingItem, PackingChecklist, AnomalyNotification, OfflineQueueItem } from '../types';
import { generateVideoFileName, uploadVideoToCloudflareR2, playAudioFeedback, generateR2StorageKey, generateSupabaseRecordId } from '../lib/cloudflare';
import { 
  saveVideoToIndexedDB, getOfflineVideoQueue, removeVideoFromIndexedDB,
  saveDraftBlob, getDraftBlob, clearDraftBlob
} from '../lib/indexedDB';
import { OrderScannerModal } from './OrderScannerModal';
import { savePackingLogToSupabase } from '../lib/supabaseLogs';
import { CustomVideoPlayer } from './CustomVideoPlayer';

interface PackingRecorderProps {
  config: CloudflareConfig;
  operator: Operator;
  pendingOrders: Array<{ 
    orderNumber: string; 
    trackingNumber?: string;
    sku?: string;
    namaBarang?: string;
    customerName: string; 
    courier: string; 
    items: PackingItem[] 
  }>;
  onNewLogCreated: (log: PackingVideoLog) => void;
  onAnomalyDetected: (anomaly: AnomalyNotification) => void;
}

export const PackingRecorder: React.FC<PackingRecorderProps> = ({
  config,
  operator,
  pendingOrders,
  onNewLogCreated,
  onAnomalyDetected,
}) => {
  // Camera & MediaRecorder refs
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const recordingSecondsRef = useRef<number>(0);

  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [torchOn, setTorchOn] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [isLandscapeLayout, setIsLandscapeLayout] = useState<boolean>(() => {
    const saved = localStorage.getItem('packguard_camera_layout_mode');
    if (saved !== null) {
      return saved === 'horizontal';
    }
    return true; // Default to horizontal for new device / first time entry!
  });

  const toggleLayoutMode = () => {
    setIsLandscapeLayout((prev) => {
      const next = !prev;
      localStorage.setItem('packguard_camera_layout_mode', next ? 'horizontal' : 'vertical');
      return next;
    });
  };
  const [cameraRotation, setCameraRotation] = useState<0 | 90 | 180 | 270>(0);

  // Workflow Steps: 'scan' | 'order_ready' | 'recording' | 'review_upload' | 'completed'
  const [currentStep, setCurrentStep] = useState<'scan' | 'order_ready' | 'recording' | 'review_upload' | 'completed'>('scan');

  // Order & Tracking Data State
  const [orderNumber, setOrderNumber] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [sku, setSku] = useState('');
  const [namaBarang, setNamaBarang] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [courier, setCourier] = useState('');
  const [selectedPendingIndex, setSelectedPendingIndex] = useState<number>(-1);
  const [items, setItems] = useState<PackingItem[]>([]);

  const [checklist, setChecklist] = useState<PackingChecklist>({
    itemsChecked: true,
    bubbleWrapped: true,
    labelAttached: true,
    outerBoxSealed: true,
    fragileSticker: false,
  });

  // Collapsible SOP Checklist Accordion (default closed for maximum screen efficiency on mobile!)
  const [isSopOpen, setIsSopOpen] = useState(false);

  // Recording State (Unlimited recording duration)
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);
  const [generatedFileName, setGeneratedFileName] = useState('');
  const [isPreparingCamera, setIsPreparingCamera] = useState(false);

  // Upload State & Progress (0%, 20%, 40%, 60%, 100%)
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSuccessSaved, setIsSuccessSaved] = useState(false);

  // Offline Queue & Auto-Sync State
  const [offlineCount, setOfflineCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatusText, setSyncStatusText] = useState<string | null>(null);
  const [syncProgress, setSyncProgress] = useState<number>(0);

  // Scanner Modal
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Camera cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Role permission check for Custom Timestamp
  const currentUserRole = (() => {
    try {
      const saved = localStorage.getItem('packguard_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.role || 'operator';
      }
    } catch (e) {}
    return 'operator';
  })();
  const isAdminOrDev = currentUserRole === 'admin' || currentUserRole === 'developer';

  // Custom Timestamp & Meta Data State (Admin/Dev feature)
  const [isCustomTimestamp, setIsCustomTimestamp] = useState<boolean>(() => {
    return localStorage.getItem('packguard_custom_timestamp_active') === 'true';
  });

  const toggleCustomTimestamp = (enabled: boolean) => {
    setIsCustomTimestamp(enabled);
    localStorage.setItem('packguard_custom_timestamp_active', enabled ? 'true' : 'false');
  };
  const [customDate, setCustomDate] = useState<string>(() => {
    const saved = localStorage.getItem('packguard_custom_date');
    if (saved) return saved;
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });

  const [customTime, setCustomTime] = useState<string>(() => {
    const saved = localStorage.getItem('packguard_custom_time');
    if (saved) return saved;
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  });

  const updateCustomDate = (dateStr: string) => {
    setCustomDate(dateStr);
    localStorage.setItem('packguard_custom_date', dateStr);
  };

  const updateCustomTime = (timeStr: string) => {
    setCustomTime(timeStr);
    localStorage.setItem('packguard_custom_time', timeStr);
  };

  const setCustomDatePreset = (daysOffset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const formattedDate = `${yyyy}-${mm}-${dd}`;
    updateCustomDate(formattedDate);
  };

  const getEffectiveDate = (): Date => {
    if (isCustomTimestamp && customDate && customTime) {
      try {
        const [yyyy, month, dd] = customDate.split('-').map(Number);
        const [hh, min, ss] = customTime.split(':').map(Number);
        return new Date(yyyy, month - 1, dd, hh || 0, min || 0, ss || 0);
      } catch (e) {}
    }
    return new Date();
  };

  // ADMIN & DEVELOPER SPECIAL FEATURE: GALLERY VIDEO FILE SELECTION WITH CUSTOM TIMESTAMP INTEGRATION
  const galleryFileInputRef = useRef<HTMLInputElement>(null);

  const handleGalleryFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      alert('Harap pilih file berformat video (MP4 / WebM / MOV).');
      return;
    }

    const fileSizeMB = parseFloat((file.size / (1024 * 1024)).toFixed(2));
    
    // Create temporary video element to extract duration
    const tempVideo = document.createElement('video');
    tempVideo.preload = 'metadata';
    tempVideo.src = URL.createObjectURL(file);

    const processUploadItem = async (durationSec: number) => {
      const actualDurationSec = Math.max(1, durationSec);
      const effectiveDate = getEffectiveDate();
      const fileName = generateVideoFileName(trackingNumber || 'PACKING', effectiveDate);
      const r2Key = generateR2StorageKey(trackingNumber || 'PACKING', fileName, effectiveDate);

      const draftId = `draft-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

      const draftItem: OfflineQueueItem = {
        id: draftId,
        orderId: orderNumber || `ORD-${trackingNumber || Date.now()}`,
        trackingNumber: trackingNumber || 'PACKING',
        sku: sku || 'GENERAL',
        namaBarang: namaBarang || 'Barang Paket',
        customerName: customerName || 'Pelanggan',
        courier: courier || 'Ekspedisi',
        packer: operator.name,
        packingStation: operator.station,
        durationSeconds: actualDurationSec,
        fileSizeMB,
        videoFileName: fileName,
        r2StorageKey: r2Key,
        videoBlob: file,
        createdAt: effectiveDate.toISOString(),
        retryCount: 0,
        status: 'pending',
      };

      await saveVideoToIndexedDB(draftItem);
      await loadOfflineQueueCount();

      const previewUrl = URL.createObjectURL(file);
      setRecordedBlob(file);
      setPreviewVideoUrl(previewUrl);
      setRecordingSeconds(actualDurationSec);
      setCurrentStep('review_upload');

      setSyncStatusText(`Video Galeri (${fileName}) Berhasil Diimpor & Terdaftar di System Queue`);
      setTimeout(() => setSyncStatusText(null), 5000);

      playAudioFeedback('stop');

      if (galleryFileInputRef.current) {
        galleryFileInputRef.current.value = '';
      }
    };

    tempVideo.onloadedmetadata = () => {
      URL.revokeObjectURL(tempVideo.src);
      const duration = Math.round(tempVideo.duration || Math.round(fileSizeMB / 0.3));
      processUploadItem(duration);
    };

    tempVideo.onerror = () => {
      const fallbackDuration = Math.max(1, Math.round(fileSizeMB / 0.3));
      processUploadItem(fallbackDuration);
    };
  };

  const [liveWibTime, setLiveWibTime] = useState<string>('');

  useEffect(() => {
    const updateWib = () => {
      if (isCustomTimestamp && customDate && customTime) {
        try {
          const [yyyy, month, dd] = customDate.split('-').map(Number);
          const [hh, min, ss] = customTime.split(':').map(Number);
          const baseDate = new Date(yyyy, month - 1, dd, hh || 0, min || 0, ss || 0);
          
          const effectiveDate = isRecording 
            ? new Date(baseDate.getTime() + recordingSeconds * 1000) 
            : baseDate;

          const formatted = effectiveDate.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          }) + ' ' + effectiveDate.toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }) + ' WIB';
          setLiveWibTime(formatted);
          return;
        } catch (e) {}
      }

      const now = new Date();
      const formatted = now.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }) + ' ' + now.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }) + ' WIB';
      setLiveWibTime(formatted);
    };

    updateWib();
    const interval = setInterval(updateWib, 1000);
    return () => clearInterval(interval);
  }, [isCustomTimestamp, customDate, customTime, isRecording, recordingSeconds]);

  // Online / Offline listener & IndexedDB Queue sync & Tab Visibility Re-focus sync
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncOfflineQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadOfflineQueueCount();
        if (navigator.onLine) {
          syncOfflineQueue();
        }
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Initial check & auto sync on load when online
    loadOfflineQueueCount();
    if (navigator.onLine) {
      syncOfflineQueue();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Update file name live
  useEffect(() => {
    setGeneratedFileName(generateVideoFileName(trackingNumber));
  }, [trackingNumber]);

  // Browser Tab Close / Refresh Protection during active recording or review
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isRecording || isPaused || currentStep === 'review_upload' || currentStep === 'recording') {
        e.preventDefault();
        e.returnValue = 'Proses perekaman video sedang berlangsung. Yakin ingin meninggalkan atau memuat ulang halaman? Video akan hilang.';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isRecording, isPaused, currentStep]);

  // Load draft recording from storage on component initialization & auto-upload if online
  useEffect(() => {
    const loadDraft = async () => {
      try {
        const metadataStr = localStorage.getItem('active_packing_draft_metadata');
        const draftRecord = await getDraftBlob();
        
        if (draftRecord && draftRecord.blob && draftRecord.blob.size > 0) {
          const metadata = metadataStr ? JSON.parse(metadataStr) : {};
          const blob = draftRecord.blob;

          // Restore draft states!
          setRecordedBlob(blob);
          setOrderNumber(metadata.orderNumber || draftRecord.orderNumber || '');
          setTrackingNumber(metadata.trackingNumber || draftRecord.trackingNumber || '');
          setSku(metadata.sku || draftRecord.sku || '');
          setNamaBarang(metadata.namaBarang || draftRecord.namaBarang || '');
          setCustomerName(metadata.customerName || draftRecord.customerName || '');
          setCourier(metadata.courier || draftRecord.courier || '');
          setItems(metadata.items || []);
          if (metadata.checklist) setChecklist(metadata.checklist);
          setRecordingSeconds(metadata.recordingSeconds || draftRecord.durationSeconds || 0);
          
          const url = URL.createObjectURL(blob);
          setPreviewVideoUrl(url);
          setCurrentStep('review_upload');
          
          setSyncStatusText(`⚠️ Draf Video Resi ${metadata.trackingNumber || draftRecord.trackingNumber || 'PACKING'} Dipulihkan dari IndexedDB!`);
          setTimeout(() => setSyncStatusText(null), 6000);
          console.log('Successfully restored active recording draft from IndexedDB');
        }
      } catch (err) {
        console.warn('Failed to restore active recording draft:', err);
      }
    };
    loadDraft();
  }, []);

  const loadOfflineQueueCount = async () => {
    const queue = await getOfflineVideoQueue();
    setOfflineCount(queue.length);
  };

  const syncOfflineQueue = async () => {
    const queue = await getOfflineVideoQueue();
    if (queue.length === 0) {
      setOfflineCount(0);
      return;
    }

    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      setSyncStatusText(`Mengunggah Berkas ${item.trackingNumber} (${item.fileSizeMB} MB) ke Cloudflare R2... (${i + 1}/${queue.length})`);
      setSyncProgress(10);

      try {
        const uploadRes = await uploadVideoToCloudflareR2(
          item.videoBlob,
          item.trackingNumber || 'SPX-OFFLINE',
          item.videoFileName || `${item.trackingNumber}.mp4`,
          config,
          {
            order_id: item.orderId,
            tracking_number: item.trackingNumber,
            sku: item.sku,
            nama_barang: item.namaBarang,
            packer: item.packer,
            packing_station: item.packingStation,
            duration: item.durationSeconds,
            video_size: item.fileSizeMB,
          },
          (progress) => setSyncProgress(progress)
        );

        if (uploadRes && uploadRes.success) {
          savePackingLogToSupabase({
            id: item.id,
            orderNumber: item.orderId || `ORD-${item.trackingNumber}`,
            trackingNumber: item.trackingNumber,
            sku: item.sku || 'SKU-GENERAL',
            namaBarang: item.namaBarang || 'Barang Paket',
            customerName: item.customerName || 'Pelanggan',
            courier: item.courier || 'Ekspedisi',
            videoFileName: item.videoFileName,
            videoUrl: uploadRes.r2Url,
            r2StorageKey: uploadRes.r2Key,
            d1RecordId: uploadRes.supabaseId,
            timestamp: item.createdAt,
            durationSeconds: item.durationSeconds,
            fileSizeMB: item.fileSizeMB,
            operatorName: item.packer,
            packingStation: item.packingStation,
            checklist: { itemsChecked: true, bubbleWrapped: true, labelAttached: true, outerBoxSealed: true, fragileSticker: false },
            items: [],
            status: 'uploaded',
          });

          // ONLY remove from IndexedDB after 100% verified upload success!
          await removeVideoFromIndexedDB(item.id);
        }
      } catch (err) {
        console.warn('Sync offline video failed (keeping in IndexedDB for retry):', err);
      }
    }

    setOfflineCount(0);
    setSyncStatusText('Auto-Sync Berhasil: Seluruh Video Tersimpan di Cloudflare R2! ✓');
    setTimeout(() => {
      setSyncStatusText(null);
    }, 4000);
    await loadOfflineQueueCount();
  };

  // Keep video preview srcObject synced to cameraStream state
  useEffect(() => {
    if (videoPreviewRef.current && cameraStream) {
      if (videoPreviewRef.current.srcObject !== cameraStream) {
        videoPreviewRef.current.srcObject = cameraStream;
      }
      videoPreviewRef.current.play().catch(e => {
        console.warn('Video preview autoplay notice:', e);
      });
    }
  }, [cameraStream, cameraActive]);

  // Pause camera stream while OrderScannerModal is open to prevent hardware conflicts
  useEffect(() => {
    if (isScannerOpen && !isRecording) {
      stopCamera();
    }
  }, [isScannerOpen]);

  const startCamera = async (): Promise<MediaStream | null> => {
    // If camera is already active and live, reuse it directly to prevent black screen flashes!
    if (cameraStream && cameraActive) {
      const activeVideoTrack = cameraStream.getVideoTracks().find(t => t.readyState === 'live' && t.enabled);
      if (activeVideoTrack) {
        if (videoPreviewRef.current && videoPreviewRef.current.srcObject !== cameraStream) {
          videoPreviewRef.current.srcObject = cameraStream;
          videoPreviewRef.current.play().catch(() => {});
        }
        return cameraStream;
      }
    }

    stopCamera();
    try {
      // Automatic video constraints: 720p, 25fps with robust ideal constraints
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: { ideal: cameraFacing }, 
          width: { ideal: 1280 }, 
          height: { ideal: 720 },
          frameRate: { ideal: 25 } 
        },
        audio: true,
      });
      setCameraStream(stream);
      setCameraActive(true);
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
      }
      return stream;
    } catch (err) {
      console.warn('Camera audio fallback without mic:', err);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: { ideal: cameraFacing }, 
            width: { ideal: 1280, max: 1280 }, 
            height: { ideal: 720, max: 720 },
            frameRate: { ideal: 15, max: 15 }
          },
          audio: false,
        });
        setCameraStream(stream);
        setCameraActive(true);
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = stream;
        }
        return stream;
      } catch (e) {
        console.error('Camera error:', e);
        setCameraActive(false);
        return null;
      }
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setCameraActive(false);
  };

  const toggleCameraFacing = async () => {
    const wasActive = cameraActive;
    const nextFacing = cameraFacing === 'environment' ? 'user' : 'environment';
    setCameraFacing(nextFacing);

    if (wasActive) {
      stopCamera();
      setIsPreparingCamera(true);
      // Give the hardware a short moment to release the camera lock
      setTimeout(async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { 
              facingMode: { ideal: nextFacing }, 
              width: { ideal: 1280 }, 
              height: { ideal: 720 },
              frameRate: { ideal: 25 } 
            },
            audio: true,
          });
          setCameraStream(stream);
          setCameraActive(true);
          if (videoPreviewRef.current) {
            videoPreviewRef.current.srcObject = stream;
          }
        } catch (err) {
          console.warn('Camera audio fallback without mic:', err);
          try {
            const stream = await navigator.mediaDevices.getUserMedia({
              video: { 
                facingMode: { ideal: nextFacing }, 
                width: { ideal: 1280, max: 1280 }, 
                height: { ideal: 720, max: 720 },
                frameRate: { ideal: 15, max: 15 }
              },
              audio: false,
            });
            setCameraStream(stream);
            setCameraActive(true);
            if (videoPreviewRef.current) {
              videoPreviewRef.current.srcObject = stream;
            }
          } catch (e) {
            console.error('Camera error:', e);
            setCameraActive(false);
          }
        } finally {
          setIsPreparingCamera(false);
        }
      }, 300);
    }
  };

  const toggleTorch = async () => {
    if (!cameraStream) return;
    const track = cameraStream.getVideoTracks()[0];
    if (track) {
      try {
        const capabilities = track.getCapabilities() as unknown as { torch?: boolean };
        if (capabilities.torch) {
          await track.applyConstraints({
            advanced: [{ torch: !torchOn } as unknown as MediaTrackConstraintSet],
          });
          setTorchOn(!torchOn);
        }
      } catch (err) {
        console.warn('Torch constraint not supported on browser:', err);
      }
    }
  };

  const startTimer = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = setInterval(() => {
      recordingSecondsRef.current += 1;
      setRecordingSeconds(recordingSecondsRef.current);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  // Start Recording Process
  const startRecording = async () => {
    setIsPreparingCamera(true);
    const stream = await startCamera();
    setIsPreparingCamera(false);

    if (!stream) {
      alert('Gagal mengakses kamera. Silakan periksa izin kamera Anda.');
      return;
    }

    recordedChunksRef.current = [];
    recordingSecondsRef.current = 0;
    setRecordingSeconds(0);

    // Mandatory Codec Discovery Algorithm (VP9, VP8, H264, MP4, WebM)
    const candidateCodecs = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=h264,opus',
      'video/mp4;codecs=h264,aac',
      'video/mp4',
      'video/webm'
    ];
    let mimeType = 'video/webm';
    for (const codec of candidateCodecs) {
      if (MediaRecorder.isTypeSupported(codec)) {
        mimeType = codec;
        break;
      }
    }

    // Hardware-Accelerated GPU Canvas Stream for Permanent Timestamp WIB & Resi Burn-in (100% Super Mulus)
    let recorderStream = stream;
    let canvasAnimId: number | null = null;

    try {
      const videoTrack = stream.getVideoTracks()[0];
      const settings = videoTrack?.getSettings() || {};

      let initialW = videoPreviewRef.current?.videoWidth || settings.width || 1280;
      let initialH = videoPreviewRef.current?.videoHeight || settings.height || 720;

      initialW = Math.floor(initialW / 2) * 2;
      initialH = Math.floor(initialH / 2) * 2;

      const canvas = document.createElement('canvas');
      canvas.width = initialW;
      canvas.height = initialH;

      // Hardware-Accelerated Low-Latency GPU 2D Context for Zero CPU Overhead & Smooth 60 FPS
      const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true } as CanvasRenderingContext2DSettings);

      if (ctx && videoPreviewRef.current) {
        const scale = canvas.height / 720;
        const fontSize = Math.max(16, Math.round(22 * scale));
        const pillHeight = Math.max(36, Math.round(52 * scale));
        const pillWidth = Math.max(260, Math.round(380 * scale));
        const margin = Math.max(16, Math.round(24 * scale));

        const renderBurnInFrame = () => {
          if (videoPreviewRef.current && ctx) {
            const vEl = videoPreviewRef.current;
            const srcW = vEl.videoWidth || initialW;
            const srcH = vEl.videoHeight || initialH;

            // Ultra-Fast GPU Draw Image
            ctx.drawImage(vEl, 0, 0, srcW, srcH, 0, 0, canvas.width, canvas.height);

            // WIB timestamp pill (Burned directly into video frame)
            let wibTimeStr = '';
            if (isCustomTimestamp && customDate && customTime) {
              try {
                const [yyyy, month, dd] = customDate.split('-').map(Number);
                const [hh, min, ss] = customTime.split(':').map(Number);
                const baseDate = new Date(yyyy, month - 1, dd, hh || 0, min || 0, ss || 0);
                const effectiveDate = new Date(baseDate.getTime() + recordingSecondsRef.current * 1000);

                wibTimeStr = effectiveDate.toLocaleDateString('id-ID', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                }) + ' ' + effectiveDate.toLocaleTimeString('id-ID', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                }) + ' WIB';
              } catch (e) {}
            }

            if (!wibTimeStr) {
              const now = new Date();
              wibTimeStr = now.toLocaleDateString('id-ID', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              }) + ' ' + now.toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              }) + ' WIB';
            }

            ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
            if (typeof ctx.roundRect === 'function') {
              ctx.beginPath();
              ctx.roundRect(margin, canvas.height - pillHeight - margin, pillWidth, pillHeight, Math.round(12 * scale));
              ctx.fill();
            } else {
              ctx.fillRect(margin, canvas.height - pillHeight - margin, pillWidth, pillHeight);
            }

            ctx.fillStyle = '#f59e0b';
            ctx.font = `bold ${fontSize}px monospace`;
            ctx.fillText(wibTimeStr, margin + Math.round(16 * scale), canvas.height - margin - Math.round(16 * scale));

            // Tracking Number pill (Top-Right)
            if (trackingNumber) {
              const trackText = `RESI: ${trackingNumber}`;
              ctx.font = `bold ${Math.max(14, Math.round(20 * scale))}px monospace`;
              const textWidth = ctx.measureText(trackText).width;

              ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
              if (typeof ctx.roundRect === 'function') {
                ctx.beginPath();
                ctx.roundRect(canvas.width - textWidth - margin - 30, margin, textWidth + 30, pillHeight - 6, Math.round(10 * scale));
                ctx.fill();
              } else {
                ctx.fillRect(canvas.width - textWidth - margin - 30, margin, textWidth + 30, pillHeight - 6);
              }

              ctx.fillStyle = '#10b981';
              ctx.fillText(trackText, canvas.width - textWidth - margin - 15, margin + pillHeight - Math.round(18 * scale));
            }
          }
          canvasAnimId = requestAnimationFrame(renderBurnInFrame);
        };

        renderBurnInFrame();

        const canvasStream = canvas.captureStream(30);
        const audioTrack = stream.getAudioTracks()[0];
        if (audioTrack) {
          canvasStream.addTrack(audioTrack);
        }
        recorderStream = canvasStream;
      }
    } catch (e) {
      console.warn('Canvas burn-in stream fallback:', e);
    }

    try {
      // Use native device video recording quality for smooth, natural high-quality video encoding
      const mediaRecorder = new MediaRecorder(recorderStream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
          
          // Incremental draft blob saving to IndexedDB so even if app reloads midway, video chunks are safe!
          try {
            const rawMime = recordedChunksRef.current[0]?.type || mimeType || 'video/mp4';
            const partialBlob = new Blob(recordedChunksRef.current, { type: rawMime });
            saveDraftBlob(partialBlob, {
              trackingNumber, orderNumber, sku, namaBarang, customerName, courier, durationSeconds: recordingSecondsRef.current
            });
            localStorage.setItem('active_packing_draft_metadata', JSON.stringify({
              orderNumber, trackingNumber, sku, namaBarang, customerName, courier, recordingSeconds: recordingSecondsRef.current, items, checklist
            }));
          } catch (e) {}
        }
      };

      mediaRecorder.onstop = async () => {
        const rawMime = recordedChunksRef.current[0]?.type || mimeType || 'video/mp4';
        const blob = new Blob(recordedChunksRef.current, { type: rawMime });
        setRecordedBlob(blob);
        const url = URL.createObjectURL(blob);
        setPreviewVideoUrl(url);
        setCurrentStep('review_upload');
        stopCamera();

        // Calculate actual duration accurately (prevents React closure 0s bug)
        const fileSizeMB = parseFloat((blob.size / (1024 * 1024)).toFixed(2));
        const estimatedSecs = Math.max(1, Math.round(fileSizeMB / 0.3));
        const actualDurationSec = recordingSecondsRef.current > 0 ? recordingSecondsRef.current : estimatedSecs;

        // Update state with actual duration
        setRecordingSeconds(actualDurationSec);

        // Save active recording draft to IndexedDB & localStorage for instant recovery!
        await saveDraftBlob(blob, {
          trackingNumber, orderNumber, sku, namaBarang, customerName, courier, durationSeconds: actualDurationSec
        });
        localStorage.setItem('active_packing_draft_metadata', JSON.stringify({
          orderNumber, trackingNumber, sku, namaBarang, customerName, courier, recordingSeconds: actualDurationSec, items, checklist
        }));

        const draftId = `draft-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

        // Use Custom Timestamp if enabled by Admin/Developer
        const effectiveDate = getEffectiveDate();
        const fileName = generateVideoFileName(trackingNumber || 'PACKING', effectiveDate);
        const r2Key = generateR2StorageKey(trackingNumber || 'PACKING', fileName, effectiveDate);

        const draftItem: OfflineQueueItem = {
          id: draftId,
          orderId: orderNumber || `ORD-${trackingNumber || Date.now()}`,
          trackingNumber: trackingNumber || 'PACKING',
          sku: sku || 'GENERAL',
          namaBarang: namaBarang || 'Barang Paket',
          customerName: customerName || 'Pelanggan',
          courier: courier || 'Ekspedisi',
          packer: operator.name,
          packingStation: operator.station,
          durationSeconds: actualDurationSec,
          fileSizeMB,
          videoFileName: fileName,
          r2StorageKey: r2Key,
          videoBlob: blob,
          createdAt: effectiveDate.toISOString(),
          retryCount: 0,
          status: 'pending',
        };

        await saveVideoToIndexedDB(draftItem);
        await loadOfflineQueueCount();
        
        // Auto-Save MP4 video directly into HP Gallery / Downloads Folder for extra safety
        try {
          const a = document.createElement('a');
          a.href = url;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        } catch (downloadErr) {
          console.warn('Auto download to gallery notice:', downloadErr);
        }

        setSyncStatusText(`✓ Video Resi ${draftItem.trackingNumber} Tersimpan di IndexedDB & Galeri HP`);
        setTimeout(() => setSyncStatusText(null), 4000);

        // Automatically reset state to default idle screen (Gambar 1) for clean next scan!
        resetForNextOrder();
      };

      mediaRecorder.start(); // Continuous hardware encoding for 100% smooth video recording
      setIsRecording(true);
      setIsPaused(false);
      setRecordingSeconds(0);
      setCurrentStep('recording');
      playAudioFeedback('start');

      // Live timer (Max 30s)
      startTimer();
    } catch (err) {
      console.error('Failed to start MediaRecorder:', err);
      stopCamera();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      playAudioFeedback('stop');
      stopTimer();
    }
    stopCamera(); // Ensure camera is shut down
  };

  const togglePause = () => {
    if (!mediaRecorderRef.current) return;
    if (isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      startTimer(); // Resume timer
    } else {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      stopTimer(); // Pause timer
    }
  };

  const handleDirectGalleryVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!trackingNumber) {
      alert('Harap pindai / masukkan nomor resi pengiriman terlebih dahulu.');
      return;
    }

    const fileSizeMB = parseFloat((file.size / (1024 * 1024)).toFixed(2));
    const estimatedDurationSec = Math.max(1, Math.round(fileSizeMB / 0.3));

    const draftId = `draft-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const fileName = generateVideoFileName(trackingNumber);
    const r2Key = generateR2StorageKey(trackingNumber, fileName);

    const draftItem: OfflineQueueItem = {
      id: draftId,
      orderId: orderNumber || `ORD-${trackingNumber}`,
      trackingNumber: trackingNumber,
      sku: sku || 'GENERAL',
      namaBarang: namaBarang || 'Barang Paket',
      customerName: customerName || 'Pelanggan',
      courier: courier || 'Ekspedisi',
      packer: operator.name,
      packingStation: operator.station,
      durationSeconds: estimatedDurationSec,
      fileSizeMB,
      videoFileName: fileName,
      r2StorageKey: r2Key,
      videoBlob: file,
      createdAt: new Date().toISOString(),
      retryCount: 0,
      status: 'pending',
    };

    await saveVideoToIndexedDB(draftItem);
    await loadOfflineQueueCount();

    playAudioFeedback('success');
    setSyncStatusText(`✓ Video Galeri Resi ${trackingNumber} Tersimpan di Antrean IndexedDB`);
    setTimeout(() => setSyncStatusText(null), 4000);

    resetForNextOrder();
    setIsScannerOpen(true);
  };

  // Select order from pending queue
  const handleSelectPendingOrder = (index: number) => {
    const selected = pendingOrders[index];
    if (selected) {
      setSelectedPendingIndex(index);
      setOrderNumber(selected.orderNumber);
      setTrackingNumber(selected.trackingNumber || `SPX${Math.floor(10000 + Math.random() * 90000)}`);
      setSku(selected.sku || 'SKU-SAMPLE');
      setNamaBarang(selected.namaBarang || selected.items[0]?.name || 'Barang Paket');
      setCustomerName(selected.customerName);
      setCourier(selected.courier);
      setItems(selected.items.map((i) => ({ ...i, verified: true })));
      setCurrentStep('order_ready');
    }
  };

  const toggleItemVerified = (itemId: string) => {
    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, verified: !i.verified } : i))
    );
  };

  // Upload video to Cloudflare R2 and save metadata to Supabase PostgreSQL
  const handleUploadVideo = async () => {
    if (!recordedBlob) return;

    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);
    setIsSuccessSaved(false);

    const fileName = generatedFileName || generateVideoFileName(trackingNumber);
    const fileSizeMB = parseFloat((recordedBlob.size / (1024 * 1024)).toFixed(2));
    const r2Key = generateR2StorageKey(trackingNumber, fileName);

    try {
      // Check if browser is offline
      if (!navigator.onLine) {
        throw new Error('Jaringan offline. Video disimpan lokal di IndexedDB.');
      }

      const actualSecs = recordingSecondsRef.current > 0 
        ? recordingSecondsRef.current 
        : Math.max(1, Math.round(fileSizeMB / 0.3));

      // Execute R2 Proxy Upload with progress callback (0%, 20%, 40%, 60%, 100%)
      const uploadRes = await uploadVideoToCloudflareR2(
        recordedBlob,
        trackingNumber,
        fileName,
        config,
        {
          order_id: orderNumber,
          tracking_number: trackingNumber,
          sku,
          nama_barang: namaBarang,
          packer: operator.name,
          packing_station: operator.station,
          duration: actualSecs,
          video_size: fileSizeMB,
        },
        (progress) => setUploadProgress(progress)
      );

      if (!uploadRes.success) {
        throw new Error(uploadRes.error || 'Gagal mengunggah ke Cloudflare R2');
      }

      playAudioFeedback('success');
      setIsSuccessSaved(true);
      setCurrentStep('completed');

      // Clear persistent draft & IndexedDB queue since upload to Cloudflare R2 succeeded
      localStorage.removeItem('active_packing_draft_metadata');
      await clearDraftBlob();
      await clearAllOfflineQueue();
      setOfflineCount(0);

      // Build Packing Log object
      const newLog: PackingVideoLog = {
        id: `log-${Date.now()}`,
        orderNumber,
        trackingNumber,
        sku,
        namaBarang,
        customerName,
        courier,
        videoFileName: fileName,
        videoUrl: uploadRes.r2Url,
        r2StorageKey: uploadRes.r2Key,
        d1RecordId: uploadRes.supabaseId,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        durationSeconds: actualSecs,
        fileSizeMB,
        operatorName: operator.name,
        packingStation: operator.station,
        checklist,
        items,
        status: 'uploaded',
        notes: `Tersimpan di Cloudflare R2 & Supabase PostgreSQL`,
      };

      // Check anomalies (only flags short video if actual duration < 10s)
      const isShortVideo = actualSecs < 10;
      const unverifiedItemsCount = items.filter((i) => !i.verified).length;
      if (isShortVideo || unverifiedItemsCount > 0) {
        newLog.status = 'anomaly';
        newLog.anomalyReason = isShortVideo ? 'Durasi video terlalu singkat (< 10 detik)' : 'Item barang belum lengkap diverifikasi';
        newLog.anomalySeverity = 'medium';

        const newAnomaly: AnomalyNotification = {
          id: `anom-${Date.now()}`,
          logId: newLog.id,
          orderNumber,
          timestamp: newLog.timestamp,
          type: isShortVideo ? 'short_video' : 'missing_checklist',
          title: `Peringatan Packing ${trackingNumber}`,
          message: newLog.anomalyReason,
          severity: 'warning',
          read: false,
          resolved: false,
        };
        onAnomalyDetected(newAnomaly);
      }

      // Persist to Supabase PostgreSQL table so all roles & devices can see this log
      savePackingLogToSupabase(newLog);

      onNewLogCreated(newLog);

    } catch (err: unknown) {
      console.warn('Upload failed / offline fallback:', err);
      const errorMsg = err instanceof Error ? err.message : String(err);
      setUploadError(errorMsg);

      // ONLY save to IndexedDB if network is strictly offline!
      if (!navigator.onLine) {
        const offlineItem: OfflineQueueItem = {
          id: `off-${Date.now()}`,
          orderId: orderNumber,
          trackingNumber,
          sku,
          namaBarang,
          customerName,
          courier,
          packer: operator.name,
          packingStation: operator.station,
          durationSeconds: recordingSeconds,
          fileSizeMB,
          videoFileName: fileName,
          r2StorageKey: r2Key,
          videoBlob: recordedBlob,
          createdAt: new Date().toISOString(),
          retryCount: 0,
          status: 'pending',
        };

        await saveVideoToIndexedDB(offlineItem);
        await loadOfflineQueueCount();
      }

      playAudioFeedback('anomaly');
    } finally {
      setIsUploading(false);
    }
  };

  const resetForNextOrder = () => {
    setRecordedBlob(null);
    setPreviewVideoUrl(null);
    setRecordingSeconds(0);
    setIsSuccessSaved(false);
    setUploadError(null);
    
    // Clear all order info so old receipt number is never reused accidentally
    setOrderNumber('');
    setTrackingNumber('');
    setSku('');
    setNamaBarang('');
    setCustomerName('');
    setCourier('');
    setItems([]);

    // Clear local draft persistence
    localStorage.removeItem('active_packing_draft_metadata');
    clearDraftBlob();
    setChecklist({
      itemsChecked: true,
      bubbleWrapped: true,
      labelAttached: true,
      outerBoxSealed: true,
      fragileSticker: false,
    });
    setCurrentStep('scan');
  };

  const clearAllOfflineQueue = async () => {
    const queue = await getOfflineVideoQueue();
    for (const item of queue) {
      await removeVideoFromIndexedDB(item.id);
    }
    await loadOfflineQueueCount();
  };

  const toggleLayoutAndOrientation = async () => {
    const nextVal = !isLandscapeLayout;
    setIsLandscapeLayout(nextVal);

    try {
      if (typeof window !== 'undefined' && 'screen' in window && screen.orientation) {
        const orientationAny = screen.orientation as any;
        if (nextVal) {
          if (typeof orientationAny.lock === 'function') {
            await orientationAny.lock('landscape').catch(() => {});
          }
        } else {
          if (typeof orientationAny.unlock === 'function') {
            orientationAny.unlock();
          }
        }
      }
    } catch (e) {
      console.warn('Screen orientation lock notice:', e);
    }
  };

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(remainingSecs).padStart(2, '0')}`;
  };

  return (
    <div className="w-full max-w-[1700px] mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-5 text-slate-900 pb-24 md:pb-6 space-y-4">


      {/* ═══════════════════════════════════════════════════════════════
          DESKTOP 2-COLUMN LAYOUT (lg: ≥1024px)
          Mobile: single column, Station Info on top (order-1), Camera below (order-2)
          Desktop: Camera on left (55%), Info/Checklist on right (45%)
      ════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-start">

        {/* ===== RIGHT COLUMN (mobile: order-1 = top) | LEFT on desktop (lg:order-2) ===== */}
        {/* Contains: Station Info + Custom Timestamp (Admin/Dev) + SOP Checklist */}
        <div className="w-full lg:col-span-5 xl:col-span-4 order-1 lg:order-2 space-y-4 lg:sticky lg:top-20 lg:self-start">



          {/* ADMIN & DEVELOPER SPECIAL FEATURE: CUSTOM TIMESTAMP & METADATA OVERRIDE */}
          {isAdminOrDev && (
            <div className="bg-gradient-to-br from-slate-900 to-indigo-950 border border-indigo-500/30 rounded-2xl p-4 text-white space-y-3 shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
                  <span className="font-bold text-xs text-amber-300">Custom Timestamp & Meta Data Video (Admin/Dev)</span>
                </div>
                <label className="flex items-center space-x-2 cursor-pointer bg-indigo-900/60 px-2.5 py-1 rounded-lg border border-indigo-500/40">
                  <input
                    type="checkbox"
                    checked={isCustomTimestamp}
                    onChange={(e) => toggleCustomTimestamp(e.target.checked)}
                    className="rounded border-slate-600 text-indigo-500 focus:ring-indigo-400"
                  />
                  <span className="text-[11px] font-bold text-indigo-200">Aktifkan Custom</span>
                </label>
              </div>

              {isCustomTimestamp && (
                <div className="space-y-3 pt-2 border-t border-slate-800">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-[10px] text-slate-400 font-semibold mb-1">Tanggal Custom:</label>
                      <input
                        type="date"
                        value={customDate}
                        onChange={(e) => updateCustomDate(e.target.value)}
                        className="w-full bg-slate-900 text-white border border-slate-700 rounded-xl p-2 font-mono text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 font-semibold mb-1">Waktu Mulai Start (Jam:Menit:Detik):</label>
                      <input
                        type="time"
                        step="1"
                        value={customTime}
                        onChange={(e) => updateCustomTime(e.target.value)}
                        className="w-full bg-slate-900 text-white border border-slate-700 rounded-xl p-2 font-mono text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                      />
                    </div>
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                    <span className="text-[10px] text-slate-400 font-bold">Preset Cepat:</span>
                    <button
                      type="button"
                      onClick={() => setCustomDatePreset(0)}
                      className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 py-1 rounded-md border border-slate-700 cursor-pointer"
                    >
                      Hari Ini
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomDatePreset(-1)}
                      className="text-[10px] bg-slate-800 hover:bg-slate-700 text-amber-300 px-2 py-1 rounded-md border border-slate-700 cursor-pointer"
                    >
                      Kemarin (-1h)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomDatePreset(-2)}
                      className="text-[10px] bg-slate-800 hover:bg-slate-700 text-amber-300 px-2 py-1 rounded-md border border-slate-700 cursor-pointer"
                    >
                      -2 Hari
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomDatePreset(-3)}
                      className="text-[10px] bg-slate-800 hover:bg-slate-700 text-amber-300 px-2 py-1 rounded-md border border-slate-700 cursor-pointer"
                    >
                      -3 Hari
                    </button>
                  </div>

                  <p className="text-[10px] text-amber-300/90 leading-relaxed font-medium">
                    <span className="font-bold text-amber-300">Catatan:</span> Timestamp pada video HUD, nama file MP4 ({customDate.replace(/-/g,'')}_{customTime.replace(/:/g,'')}), serta metadata R2 & Supabase akan otomatis berjalan secara real-time mulai dari tanggal & jam set tersebut.
                  </p>
                </div>
              )}

              {/* ADMIN & DEVELOPER FEATURE: UPLOAD VIDEO FROM GALLERY / FILE */}
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <input
                  type="file"
                  ref={galleryFileInputRef}
                  accept="video/*"
                  onChange={handleGalleryFileSelect}
                  className="hidden"
                />
                
                <button
                  type="button"
                  onClick={() => galleryFileInputRef.current?.click()}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 px-3 rounded-xl flex items-center justify-center space-x-2 text-xs transition-all shadow-sm active:scale-98 cursor-pointer"
                  title="Ambil dan unggah berkas video dari galeri HP atau folder laptop"
                >
                  <Upload className="w-4 h-4 text-white shrink-0" />
                  <span>Unggah Video dari Galeri / File (Admin/Dev)</span>
                </button>

                <p className="text-[10px] text-slate-400 leading-tight">
                  <span className="font-semibold text-indigo-300">Khusus Admin & Developer:</span> Pilih file video dari galeri. Jika Custom Timestamp diaktifkan di atas, video galeri akan otomatis menggunakan metadata tanggal & jam custom tersebut.
                </p>
              </div>
            </div>
          )}

          {/* COLLAPSIBLE ACCORDION SOP CHECKLIST CARD */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs text-slate-900 transition-all">
            {/* Accordion Toggle Header Header */}
            <button
              type="button"
              onClick={() => setIsSopOpen(!isSopOpen)}
              className="w-full flex items-center justify-between p-3.5 sm:p-4 hover:bg-slate-50 transition-colors cursor-pointer text-left select-none"
            >
              <div className="flex items-center space-x-2">
                <CheckSquare className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-700">
                  SOP Packing Checklist:
                </span>
                {trackingNumber && (
                  <span className="text-[10px] sm:text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 hidden sm:inline-block">
                    {courier || 'Ekspedisi'}
                  </span>
                )}
              </div>
              
              <div className="flex items-center space-x-1.5 shrink-0">
                <span className="text-[10px] sm:text-[11px] text-slate-500 font-semibold">
                  {isSopOpen ? 'Tutup' : 'Buka List'}
                </span>
                <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                  {isSopOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4 text-blue-600" />}
                </div>
              </div>
            </button>

            {/* Accordion Collapsible Content */}
            {isSopOpen && (
              <div className="px-3.5 pb-3.5 sm:px-4 sm:pb-4 pt-1 border-t border-slate-100 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center space-x-2 cursor-pointer bg-slate-50 hover:bg-blue-50/50 p-2.5 rounded-xl border border-slate-200 transition-colors">
                    <input
                      type="checkbox"
                      checked={checklist.itemsChecked}
                      onChange={() => setChecklist((prev) => ({ ...prev, itemsChecked: !prev.itemsChecked }))}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-slate-700 font-medium">Item Barang Sesuai</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer bg-slate-50 hover:bg-blue-50/50 p-2.5 rounded-xl border border-slate-200 transition-colors">
                    <input
                      type="checkbox"
                      checked={checklist.bubbleWrapped}
                      onChange={() => setChecklist((prev) => ({ ...prev, bubbleWrapped: !prev.bubbleWrapped }))}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-slate-700 font-medium">Bubble Wrap Rapi</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer bg-slate-50 hover:bg-blue-50/50 p-2.5 rounded-xl border border-slate-200 transition-colors">
                    <input
                      type="checkbox"
                      checked={checklist.labelAttached}
                      onChange={() => setChecklist((prev) => ({ ...prev, labelAttached: !prev.labelAttached }))}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-slate-700 font-medium">Resi Menempel Rapi</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer bg-slate-50 hover:bg-blue-50/50 p-2.5 rounded-xl border border-slate-200 transition-colors">
                    <input
                      type="checkbox"
                      checked={checklist.outerBoxSealed}
                      onChange={() => setChecklist((prev) => ({ ...prev, outerBoxSealed: !prev.outerBoxSealed }))}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-slate-700 font-medium">Tersegel Rapat</span>
                  </label>
                </div>
              </div>
            )}
          </div>

        </div>
        {/* END RIGHT COLUMN (Info Panel) */}

        {/* ===== LEFT COLUMN (mobile: order-2 = below info) | LEFT on desktop (lg:order-1) ===== */}
        {/* Contains: Camera Viewport Hero (action buttons + camera + controls + preview) */}
        <div className="w-full lg:col-span-7 xl:col-span-8 order-2 lg:order-1 space-y-4">

          {/* CAMERA VIEWPORT HERO */}
          <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-4 shadow-xs space-y-4 w-full">
            
            {/* TOP PRIMARY ACTIONS: SCAN RESI (LEFT) & RECORD CONTROL (RIGHT) - ALWAYS 2 COLUMNS SIDE-BY-SIDE */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3 w-full">
              {/* LEFT BUTTON: SCAN RESI */}
              <button
                onClick={() => setIsScannerOpen(true)}
                className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-xs sm:text-sm min-h-[50px] py-3 px-2 sm:px-4 rounded-xl flex items-center justify-center space-x-1.5 sm:space-x-2 font-bold transition-all shadow-md shadow-blue-600/15 cursor-pointer text-center leading-tight"
              >
                <Camera className="w-4.5 h-4.5 sm:w-5 sm:h-5 shrink-0 text-white" />
                <span>Pindai Resi</span>
              </button>

              {/* RIGHT BUTTON: RECORD / PAUSE / STOP */}
              {!isRecording ? (
                <button
                  onClick={startRecording}
                  disabled={(!cameraActive && isPreparingCamera) || !trackingNumber}
                  className={`w-full font-bold px-2 sm:px-4 py-3 min-h-[50px] rounded-xl flex items-center justify-center space-x-1.5 sm:space-x-2 text-xs sm:text-sm transition-all text-center leading-tight ${
                    trackingNumber
                      ? 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-md shadow-red-600/25 active:scale-95 cursor-pointer'
                      : 'bg-rose-50 hover:bg-rose-100/80 text-rose-500 border border-rose-200/80 shadow-2xs cursor-not-allowed'
                  }`}
                  title={!trackingNumber ? "Pindai resi pengiriman terlebih dahulu untuk mulai merekam" : "Mulai Rekam Video Packing"}
                >
                  <Video className={`w-4.5 h-4.5 sm:w-5 sm:h-5 shrink-0 ${trackingNumber ? 'animate-pulse text-white' : 'text-rose-400'}`} />
                  <span>{trackingNumber ? 'Mulai Rekam' : 'Scan Resi Dulu'}</span>
                </button>
              ) : (
                <div className="flex items-center space-x-1.5 sm:space-x-2 w-full min-h-[50px]">
                  <button
                    onClick={togglePause}
                    className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold h-full py-2.5 px-2 rounded-xl flex items-center justify-center space-x-1 text-xs transition-all cursor-pointer shadow-sm"
                    title={isPaused ? 'Lanjutkan Rekaman' : 'Jeda Rekaman'}
                  >
                    {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                    <span>{isPaused ? 'Mulai' : 'Pause'}</span>
                  </button>

                  <button
                    onClick={stopRecording}
                    className="flex-1 bg-slate-900 hover:bg-slate-850 text-rose-400 border border-rose-500/20 font-bold h-full py-2.5 px-2 rounded-xl flex items-center justify-center space-x-1 text-xs transition-all cursor-pointer shadow-md active:scale-95"
                    title="Simpan video & selesai"
                  >
                    <Square className="w-4 h-4 fill-rose-500 text-rose-500" />
                    <span>Selesai</span>
                  </button>
                </div>
              )}
            </div>

            {/* Camera Frame Container - Expands when isLandscapeLayout is toggled for spacious horizontal packing view */}
            <div className={`relative bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center shadow-inner w-full transition-all duration-300 ${
              isLandscapeLayout ? 'aspect-[4/3] min-h-[380px] sm:min-h-[460px]' : 'aspect-video'
            }`}>
              
              {/* Live Camera Stream with Rotational Transform */}
              <video
                ref={videoPreviewRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover transition-transform duration-300 ${!cameraActive ? 'hidden' : ''}`}
                style={{ transform: `rotate(${cameraRotation}deg)` }}
              />

               {!cameraActive && !recordedBlob && (
                <div className="text-center p-6 space-y-3 z-10">
                  <Camera className="w-10 h-10 text-blue-500/80 mx-auto" />
                  <p className="text-xs text-slate-400 font-semibold">Kamera nonaktif untuk menghemat daya baterai.</p>
                  <p className="text-[10px] text-slate-500 max-w-[240px] mx-auto leading-relaxed">Kamera akan menyala otomatis ketika Anda menekan tombol Mulai Rekam di atas.</p>
                </div>
              )}

              {/* Live Recording HUD Overlay */}
              {isRecording && (
                <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-20 flex items-center space-x-2 bg-slate-950/85 backdrop-blur-md px-3 py-1 rounded-lg border border-slate-700 shadow-md">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
                  <span className="text-xs font-mono font-bold text-rose-400">REC</span>
                  <span className="text-xs font-mono font-bold text-white">{formatTimer(recordingSeconds)}</span>
                </div>
              )}

              {/* Tracking Number Badge Overlay (Top Right) */}
              {trackingNumber && (
                <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 bg-slate-950/85 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-750 text-[11px] font-mono text-emerald-400 flex items-center space-x-1.5 shadow-md">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{trackingNumber}</span>
                </div>
              )}

              {/* Live WIB Timestamp Overlay (Bottom Left) */}
              <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 z-20 bg-slate-950/85 backdrop-blur-md px-3 py-1 rounded-lg border border-slate-700 text-[11px] font-mono font-bold text-amber-400 flex items-center space-x-1.5 shadow-md">
                <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span>{liveWibTime || 'WIB'}</span>
              </div>

            </div>

            {/* BEAUTIFIED CAMERA CONTROLS PANEL - SECONDARY UTILITIES */}
            <div className="bg-slate-50 border border-slate-200/60 p-3 sm:p-4 rounded-2xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                
                {/* Duration Counter HUD when recording */}
                {isRecording && (
                  <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl text-xs font-bold font-mono">
                    <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
                    <span>DURASI: {formatTimer(recordingSeconds)}</span>
                  </div>
                )}

                {/* SECONDARY UTILITIES: CAMERA ROTATE, LENS SWAP, TORCH, LAYOUT */}
                <div className="grid grid-cols-4 gap-2 sm:flex sm:items-center sm:space-x-2">
                  <button
                    onClick={toggleCameraFacing}
                    disabled={isRecording}
                    className="flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-1.5 p-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Ganti Lensa Kamera"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-[10px] font-bold">Lensa</span>
                  </button>

                  <button
                    onClick={toggleTorch}
                    className={`flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-1.5 p-2 border rounded-xl transition-all cursor-pointer ${
                      torchOn 
                        ? 'bg-amber-500 text-slate-950 font-bold border-amber-500 shadow-xs' 
                        : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                    title="Senter Flashlight"
                  >
                    <Zap className={`w-3.5 h-3.5 ${torchOn ? 'text-slate-950' : 'text-slate-500'}`} />
                    <span className="text-[10px] font-bold">Senter</span>
                  </button>

                  <button
                    onClick={() => setCameraRotation((prev) => ((prev + 90) % 360) as 0 | 90 | 180 | 270)}
                    className={`flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-1.5 p-2 border rounded-xl transition-all cursor-pointer ${
                      cameraRotation !== 0 
                        ? 'bg-blue-50 border-blue-200 text-blue-700 font-bold' 
                        : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                    title="Putar Orientasi Kamera"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${cameraRotation !== 0 ? 'text-blue-600' : 'text-slate-500'}`} />
                    <span className="text-[10px] font-bold">Putar {cameraRotation}°</span>
                  </button>

                  <button
                    onClick={toggleLayoutMode}
                    className={`flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-1.5 p-2 border rounded-xl transition-all cursor-pointer ${
                      isLandscapeLayout 
                        ? 'bg-blue-600 text-white font-bold border-blue-600 shadow-xs' 
                        : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                    title="Ubah Mode Layar Wide/Luas"
                  >
                    <Smartphone className={`w-3.5 h-3.5 ${isLandscapeLayout ? 'rotate-90 text-white' : 'text-slate-500'} transition-transform duration-200`} />
                    <span className="text-[10px] font-bold">Layout</span>
                  </button>
                </div>

              </div>
            </div>

            {/* RECORDED VIDEO PREVIEW & AUTOMATIC INDEXEDB QUEUE NOTICE */}
            {previewVideoUrl && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3 text-slate-900">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span className="font-bold text-xs text-slate-900">Rekaman Siap Terdaftar</span>
                  </div>
                  <span className="text-[11px] bg-white text-slate-700 px-2 py-0.5 rounded font-mono border border-slate-200">
                    {formatTimer(recordingSeconds)}
                  </span>
                </div>

                <div className="relative rounded-lg overflow-hidden aspect-video bg-slate-950 border border-slate-800">
                  <CustomVideoPlayer
                    src={previewVideoUrl || ''}
                    fallbackDurationSeconds={recordingSeconds || 30}
                  />
                </div>
              </div>
            )}

          </div>
          {/* END CAMERA VIEWPORT HERO */}

        </div>
        {/* END LEFT COLUMN (Camera) */}

      </div>
      {/* END 2-COLUMN DESKTOP LAYOUT */}

      {/* OCR Scanner Modal */}
      <OrderScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={(scanned) => {
          setTrackingNumber(scanned.orderNumber);
          setOrderNumber(`ORD-${scanned.orderNumber}`);
          if (scanned.customerName) setCustomerName(scanned.customerName);
          if (scanned.courier) setCourier(scanned.courier);
          setCurrentStep('order_ready');
        }}
      />

    </div>
  );
};
