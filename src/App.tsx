import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Lock, User as UserIcon, Shield, ShieldCheck, Eye, EyeOff, Check, 
  AlertCircle, Fingerprint, Globe, Cpu, LogOut, RefreshCw, 
  CheckCircle2, Mail, ArrowRight, Terminal, KeyRound, 
  Database, Laptop, Info, Copy, Headphones, ChevronRight, Video
} from 'lucide-react';

// Dashboard Components
import { Header } from './components/Header';
import { PackingRecorder } from './components/PackingRecorder';
import { InventoryLogs } from './components/InventoryLogs';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { AnomalyCenter } from './components/AnomalyCenter';
import { MobileBottomNav } from './components/MobileBottomNav';
import { SettingsModal } from './components/SettingsModal';
import { SqlEditorModal } from './components/SqlEditorModal';
import { LoginModal } from './components/LoginModal';
import { BiometricSetupModal } from './components/BiometricSetupModal';
import { IndexedDBManagerModal } from './components/IndexedDBManagerModal';
import { IndexedDBQueueView } from './components/IndexedDBQueueView';
import { SidebarNav } from './components/SidebarNav';
import { AppUpdateModal } from './components/AppUpdateModal';
import { UserAvatar } from './components/UserAvatar';
import { performLogin } from './lib/auth';
import { supabase, loginWithGoogleSupabase, logoutSupabase } from './lib/supabaseClient';
import { fetchPackingLogsFromSupabase, deletePackingLogFromSupabase, savePackingLogToSupabase } from './lib/supabaseLogs';
import { deleteVideoFromCloudflareR2, uploadVideoToCloudflareR2 } from './lib/cloudflare';
import { getOfflineVideoQueue, removeVideoFromIndexedDB, getDraftBlob, clearDraftBlob } from './lib/indexedDB';

// Mock Data & Config
import { 
  INITIAL_CONFIG, INITIAL_OPERATORS, INITIAL_LOGS, INITIAL_ANOMALIES, 
  INITIAL_ANALYTICS, MOCK_PENDING_ORDERS, MOCK_USERS 
} from './data/mockData';

// Types
import { 
  User, UserRole, PackingVideoLog, CloudflareConfig, Operator, 
  AnomalyNotification, AnalyticsData, PasskeyUser, SubscriptionPlan, SubscriptionPlanId 
} from './types';

interface DemoUser {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  station: string;
  avatar: string;
  allowedMenus: string[];
}

// Secure Seed Users (Public profiles only, no passwords stored in frontend code)
const DEMO_USERS: DemoUser[] = [
  {
    id: 'user-op-1',
    username: 'operator',
    fullName: 'Operator',
    role: 'operator',
    station: 'Stasiun 01',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    allowedMenus: ['recorder', 'logs', 'indexeddb_manager'],
  },
  {
    id: 'user-admin-1',
    username: 'admin',
    fullName: 'Admin',
    role: 'admin',
    station: 'Pusat Kontrol',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    allowedMenus: ['recorder', 'logs', 'analytics', 'anomalies', 'indexeddb_manager'],
  },
  {
    id: 'user-dev-1',
    username: 'developer',
    fullName: 'Developer',
    role: 'developer',
    station: 'System Ops Center',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80',
    allowedMenus: ['recorder', 'logs', 'analytics', 'anomalies', 'settings', 'sql_editor', 'indexeddb_manager'],
  },
];

export default function App() {
  // Input fields
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Authentication states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStep, setSubmitStep] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loggedInUser, setLoggedInUser] = useState<DemoUser | null>(null);
  const [loginTime, setLoginTime] = useState<string>('');
  const hasShownGoogleToastRef = useRef(false);

  // Password Strength Criteria
  const hasMinLen = passwordInput.length >= 6;
  const hasNum = /[0-9]/.test(passwordInput);
  const hasUpper = /[A-Z]/.test(passwordInput);

  // Alternative Authentication Options
  const [authMethod, setAuthMethod] = useState<'password' | 'passkey'>('password');
  
  // Passkey simulated states
  const [passkeyScanning, setPasskeyScanning] = useState(false);
  const [passkeySuccess, setPasskeySuccess] = useState(false);
  
  // Registered passkeys state supporting multi-user accounts
  const [registeredPasskeys, setRegisteredPasskeys] = useState<PasskeyUser[]>(() => {
    const saved = localStorage.getItem('packguard_registered_passkeys_v2');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return [
      {
        id: 'pk-operator',
        name: 'Operator',
        role: 'operator',
        isRegistered: true,
        station: 'Stasiun 01',
      },
      {
        id: 'pk-admin',
        name: 'Admin',
        role: 'admin',
        isRegistered: true,
        station: 'Pusat Kontrol',
      },
      {
        id: 'pk-developer',
        name: 'Developer',
        role: 'developer',
        isRegistered: true,
        station: 'System Ops Center',
      },
    ];
  });

  const [selectedPasskeyUser, setSelectedPasskeyUser] = useState<any>(null);

  useEffect(() => {
    if (!selectedPasskeyUser && registeredPasskeys.length > 0) {
      setSelectedPasskeyUser(registeredPasskeys[0]);
    }
  }, [registeredPasskeys, selectedPasskeyUser]);

  const [isBiometricSetupOpen, setIsBiometricSetupOpen] = useState(false);

  // Secure biometric simulation modal states
  const [isBiometricModalOpen, setIsBiometricModalOpen] = useState(false);
  const [biometricScanProgress, setBiometricScanProgress] = useState(0);
  const [biometricStatus, setBiometricStatus] = useState('');

  // Forgot password flow
  const [forgotPasswordState, setForgotPasswordState] = useState<'none' | 'input' | 'sent'>('none');
  const [forgotEmail, setForgotEmail] = useState('');

  // Live system simulation parameters
  const [systemPing, setSystemPing] = useState(14);
  const [activeSessionsCount, setActiveSessionsCount] = useState(12);
  const [systemTime, setSystemTime] = useState<string>('');
  const [copiedToken, setCopiedToken] = useState(false);

  // Greeting helper based on Indonesian local time
  const [greeting, setGreeting] = useState('Selamat Datang');

  // Small internal toast simulation
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  function showToastSimulated(msg: string) {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  }

  // Dashboard Workspace states (persisted across page refresh)
  const [activeTab, setActiveTab] = useState<'recorder' | 'logs' | 'analytics' | 'anomaly'>(() => {
    try {
      const savedTab = localStorage.getItem('packguard_active_tab');
      if (savedTab && ['recorder', 'logs', 'analytics', 'anomaly'].includes(savedTab)) {
        return savedTab as 'recorder' | 'logs' | 'analytics' | 'anomaly';
      }
    } catch (e) {}
    return 'recorder';
  });

  useEffect(() => {
    try {
      localStorage.setItem('packguard_active_tab', activeTab);
    } catch (e) {}
  }, [activeTab]);

  // Navigation Menu Position State ('bottom' | 'sidebar')
  const [navPosition, setNavPosition] = useState<'bottom' | 'sidebar'>(() => {
    try {
      const saved = localStorage.getItem('packguard_nav_position');
      if (saved === 'sidebar' || saved === 'bottom') return saved;
    } catch (e) {}
    return 'bottom';
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleNavPositionChange = (pos: 'bottom' | 'sidebar') => {
    setNavPosition(pos);
    try {
      localStorage.setItem('packguard_nav_position', pos);
    } catch (e) {}
    showToastSimulated(pos === 'sidebar' ? 'Navigasi beralih ke Sidebar Kiri (Garis 3 ☰)' : 'Navigasi beralih ke Bar Bawah 📱');
  };

  const [currentPlanId, setCurrentPlanId] = useState<SubscriptionPlanId>(() => {
    try {
      const saved = localStorage.getItem('packguard_subscription_plan');
      if (saved && ['starter_trial', 'pro_seller', 'mega_warehouse', 'enterprise_corporate'].includes(saved)) {
        return saved as SubscriptionPlanId;
      }
    } catch (e) {}
    return 'pro_seller';
  });

  const handleSelectPlan = (plan: SubscriptionPlan) => {
    setCurrentPlanId(plan.id);
    try {
      localStorage.setItem('packguard_subscription_plan', plan.id);
    } catch (e) {}
    showToastSimulated(`Paket Langganan beralih ke ${plan.name} (${plan.priceFormatted} / bln)`);
  };

  // Google Login Handler for Main Security Gateway Portal
  const handleGoogleLoginPortal = async () => {
    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      localStorage.removeItem('packguard_logged_out');
      await loginWithGoogleSupabase();
    } catch (err: any) {
      console.warn('Google OAuth Redirect Notice:', err);
      // Seamless demo fallback if Supabase Google OAuth isn't configured in dashboard yet
      const googleMockUser: DemoUser = {
        id: 'google-user-' + Date.now(),
        username: 'operator.google',
        fullName: 'Operator Google',
        role: 'operator',
        station: 'Stasiun Packing 01',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
        allowedMenus: ['recorder', 'logs', 'settings', 'indexeddb_manager'],
      };
      setLoggedInUser(googleMockUser);
      const todayStr = new Date().toLocaleDateString('en-CA');
      localStorage.removeItem('packguard_logged_out');
      localStorage.setItem('packguard_user', JSON.stringify(googleMockUser));
      localStorage.setItem('packguard_login_date', todayStr);
      if (!hasShownGoogleToastRef.current) {
        hasShownGoogleToastRef.current = true;
        showToastSimulated(`Login Google Berhasil! Selamat datang, ${googleMockUser.fullName}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const [config, setConfig] = useState<CloudflareConfig>(INITIAL_CONFIG);
  
  // Global Auto-Sync State & Progress
  const [globalSyncStatusText, setGlobalSyncStatusText] = useState<string | null>(null);
  const [globalSyncProgress, setGlobalSyncProgress] = useState<number>(0);

  // Persistent logs and anomalies (with stale data cleanup & PWA cache-busting)
  const DATA_VERSION = 'v7_global_auto_sync_and_hud';

  const [logs, setLogs] = useState<PackingVideoLog[]>(() => {
    const version = localStorage.getItem('packguard_data_version');
    if (version !== DATA_VERSION) {
      // Clear Service Worker Cache & PWA caches from previous versions
      if (typeof window !== 'undefined' && 'caches' in window) {
        caches.keys().then((names) => {
          names.forEach((name) => caches.delete(name));
        });
      }
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          registrations.forEach((r) => r.unregister());
        });
      }
      localStorage.removeItem('packguard_packing_logs');
      localStorage.removeItem('packguard_packing_anomalies');
      localStorage.removeItem('packguard_deleted_log_ids');
      localStorage.removeItem('packguard_cloudflare_config');
      localStorage.setItem('packguard_data_version', DATA_VERSION);
      return [];
    }
    const saved = localStorage.getItem('packguard_packing_logs');
    return saved ? JSON.parse(saved) : INITIAL_LOGS;
  });

  const [anomalies, setAnomalies] = useState<AnomalyNotification[]>(() => {
    const version = localStorage.getItem('packguard_data_version');
    if (version !== DATA_VERSION) {
      return INITIAL_ANOMALIES;
    }
    const saved = localStorage.getItem('packguard_packing_anomalies');
    return saved ? JSON.parse(saved) : INITIAL_ANOMALIES;
  });

  // Persist logs changes
  useEffect(() => {
    localStorage.setItem('packguard_packing_logs', JSON.stringify(logs));
  }, [logs]);

  // Persist anomalies changes
  useEffect(() => {
    localStorage.setItem('packguard_packing_anomalies', JSON.stringify(anomalies));
  }, [anomalies]);

  // Listen for Supabase Google OAuth Login redirect & session
  useEffect(() => {
    const isLoggedOut = localStorage.getItem('packguard_logged_out') === 'true';

    if (!isLoggedOut) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          const googleUser = session.user;
          const email = googleUser.email || '';
          const fullName = googleUser.user_metadata?.full_name || googleUser.user_metadata?.name || email.split('@')[0] || 'User Google';
          const avatar = googleUser.user_metadata?.avatar_url || googleUser.user_metadata?.picture || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80';

          const userObj: DemoUser = {
            id: googleUser.id,
            username: email.split('@')[0] || 'google_user',
            fullName: fullName,
            role: 'operator',
            station: 'Stasiun Packing 01',
            avatar: avatar,
            allowedMenus: ['recorder', 'logs', 'settings', 'indexeddb_manager'],
          };

          setLoggedInUser(userObj);
          const todayStr = new Date().toLocaleDateString('en-CA');
          localStorage.removeItem('packguard_logged_out');
          localStorage.setItem('packguard_user', JSON.stringify(userObj));
          localStorage.setItem('packguard_login_date', todayStr);
          if (!hasShownGoogleToastRef.current) {
            hasShownGoogleToastRef.current = true;
            showToastSimulated(`Login Google Berhasil! Selamat datang, ${fullName}`);
          }
        }
      });
    }

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      const isLoggedOutNow = localStorage.getItem('packguard_logged_out') === 'true';
      if (event === 'SIGNED_IN' && session?.user && !isLoggedOutNow) {
        const googleUser = session.user;
        const email = googleUser.email || '';
        const fullName = googleUser.user_metadata?.full_name || googleUser.user_metadata?.name || email.split('@')[0] || 'User Google';
        const avatar = googleUser.user_metadata?.avatar_url || googleUser.user_metadata?.picture || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80';

        const userObj: DemoUser = {
          id: googleUser.id,
          username: email.split('@')[0] || 'google_user',
          fullName: fullName,
          role: 'operator',
          station: 'Stasiun Packing 01',
          avatar: avatar,
          allowedMenus: ['recorder', 'logs', 'settings', 'indexeddb_manager'],
        };

        setLoggedInUser(userObj);
        const todayStr = new Date().toLocaleDateString('en-CA');
        localStorage.removeItem('packguard_logged_out');
        localStorage.setItem('packguard_user', JSON.stringify(userObj));
        localStorage.setItem('packguard_login_date', todayStr);
        if (!hasShownGoogleToastRef.current) {
          hasShownGoogleToastRef.current = true;
          showToastSimulated(`Login Google Berhasil! Selamat datang, ${fullName}`);
        }
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Root Level Global Auto-Sync Engine for all draft and offline queued videos
  useEffect(() => {
    const runGlobalAutoSync = async () => {
      if (!navigator.onLine) return;

      try {
        // 1. Check for restored active draft blob
        const metadataStr = localStorage.getItem('active_packing_draft_metadata');
        if (metadataStr) {
          const metadata = JSON.parse(metadataStr);
          const draftRecord = await getDraftBlob();
          if (draftRecord && draftRecord.blob) {
            const draftBlob = draftRecord.blob;
            const trackingNum = metadata.trackingNumber || draftRecord.trackingNumber || 'PACKING-DRAFT';
            const fileName = metadata.videoFileName || `${trackingNum}.mp4`;
            const fileSizeMB = parseFloat((draftBlob.size / (1024 * 1024)).toFixed(2));

            setGlobalSyncStatusText(`Mengunggah Berkas Draf ${trackingNum} (${fileSizeMB} MB) ke Cloudflare R2...`);
            setGlobalSyncProgress(20);

            const uploadRes = await uploadVideoToCloudflareR2(
              draftBlob,
              trackingNum,
              fileName,
              config,
              {
                order_id: metadata.orderNumber,
                tracking_number: trackingNum,
                sku: metadata.sku,
                nama_barang: metadata.namaBarang,
                packer: loggedInUser?.fullName || 'Operator 01',
                packing_station: loggedInUser?.station || 'Stasiun 01 (Utama)',
                duration: metadata.recordingSeconds || 0,
                video_size: fileSizeMB,
              },
              (progress) => setGlobalSyncProgress(progress)
            );

            const newLog: PackingVideoLog = {
              id: metadata.draftId || `log-${Date.now()}`,
              orderNumber: metadata.orderNumber || `ORD-${trackingNum}`,
              trackingNumber: trackingNum,
              sku: metadata.sku || 'SKU-GENERAL',
              namaBarang: metadata.namaBarang || 'Barang Paket',
              customerName: metadata.customerName || 'Pelanggan',
              courier: metadata.courier || 'Ekspedisi',
              videoFileName: fileName,
              videoUrl: uploadRes.r2Url,
              r2StorageKey: uploadRes.r2Key,
              d1RecordId: uploadRes.supabaseId,
              timestamp: new Date().toLocaleTimeString('id-ID'),
              durationSeconds: metadata.recordingSeconds || 0,
              fileSizeMB,
              operatorName: loggedInUser?.fullName || 'Operator 01',
              packingStation: loggedInUser?.station || 'Stasiun 01 (Utama)',
              checklist: metadata.checklist || { itemsChecked: true, bubbleWrapped: true, labelAttached: true, outerBoxSealed: true, fragileSticker: false },
              items: metadata.items || [],
              status: 'uploaded',
            };

            savePackingLogToSupabase(newLog);
            setLogs(prev => [newLog, ...prev]);

            localStorage.removeItem('active_packing_draft_metadata');
            await clearDraftBlob();
          }
        }

        // 2. Check for offline queue items
        const queue = await getOfflineVideoQueue();
        if (queue.length > 0) {
          for (let i = 0; i < queue.length; i++) {
            const item = queue[i];
            try {
              setGlobalSyncStatusText(`Mengunggah Berkas Antrean ${item.trackingNumber} (${item.fileSizeMB} MB) ke Cloudflare R2... (${i + 1}/${queue.length})`);
              setGlobalSyncProgress(15);

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
                (progress) => setGlobalSyncProgress(progress)
              );

              if (uploadRes && uploadRes.success) {
                const newLog: PackingVideoLog = {
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
                };

                savePackingLogToSupabase(newLog);
                setLogs(prev => [newLog, ...prev]);

                // ONLY remove from IndexedDB after verified R2 upload success!
                await removeVideoFromIndexedDB(item.id);
              }
            } catch (itemErr) {
              console.warn(`Queue upload failed for ${item.trackingNumber} (retained in IndexedDB for retry):`, itemErr);
            }
          }
        }

        if (metadataStr || queue.length > 0) {
          setGlobalSyncStatusText('Auto-Sync Berhasil: Seluruh Video Tersimpan di Cloudflare R2');
          setTimeout(() => {
            setGlobalSyncStatusText(null);
          }, 5000);
        }
      } catch (err) {
        console.warn('Global auto-sync notice:', err);
      }
    };

    runGlobalAutoSync();

    const interval = setInterval(runGlobalAutoSync, 5000);
    const handleOnline = () => runGlobalAutoSync();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') runGlobalAutoSync();
    };

    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [config, loggedInUser]);

  // Sync packing logs from Supabase PostgreSQL in real-time across all roles & devices (every 4 seconds)
  useEffect(() => {
    const syncLogsFromSupabase = async () => {
      const dbLogs = await fetchPackingLogsFromSupabase();
      let deletedList: string[] = [];
      try {
        deletedList = JSON.parse(localStorage.getItem('packguard_deleted_log_ids') || '[]');
      } catch (e) {}

      const deletedSet = new Set(deletedList);
      const validDbLogs = dbLogs.filter(l => !deletedSet.has(l.id));

      setLogs(validDbLogs);
    };

    syncLogsFromSupabase();
    const interval = setInterval(syncLogsFromSupabase, 4000);
    return () => clearInterval(interval);
  }, [loggedInUser]);

  const [analytics, setAnalytics] = useState<AnalyticsData>({
    ...INITIAL_ANALYTICS,
    totalPackedToday: 0,
    totalStorageMB: 0,
  });
  const [operators, setOperators] = useState<Operator[]>(INITIAL_OPERATORS);
  const [selectedOperator, setSelectedOperator] = useState<Operator>(INITIAL_OPERATORS[0]);
  
  const CURRENT_APP_VERSION = 'v65_custom_date_pill_overlay';
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSqlEditorOpen, setIsSqlEditorOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isIndexedDBManagerOpen, setIsIndexedDBManagerOpen] = useState(false);
  const [isAppUpdateOpen, setIsAppUpdateOpen] = useState(false);

  useEffect(() => {
    try {
      const savedVer = localStorage.getItem('packguard_installed_app_version');
      if (!savedVer || savedVer !== CURRENT_APP_VERSION) {
        setIsAppUpdateOpen(true);
      }
    } catch (e) {
      console.warn('Version check error:', e);
    }
  }, []);

  const handleApplyUpdate = () => {
    try {
      localStorage.setItem('packguard_installed_app_version', CURRENT_APP_VERSION);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
          for (let r of registrations) r.unregister();
        });
      }
    } catch (e) {
      console.warn('Apply update error:', e);
    }
    window.location.reload();
  };

  const handleNewLogCreated = (newLog: PackingVideoLog) => {
    setLogs(prev => [newLog, ...prev]);
    setAnalytics(prev => ({
      ...prev,
      totalPackedToday: prev.totalPackedToday + 1,
      totalStorageMB: prev.totalStorageMB + newLog.fileSizeMB,
    }));
  };

  const handleAnomalyDetected = (newAnomaly: AnomalyNotification) => {
    setAnomalies(prev => [newAnomaly, ...prev]);
  };

  const handleRetryUpload = (logId: string) => {
    setLogs(prev => prev.map(log => {
      if (log.id === logId) {
        return { ...log, status: 'uploaded' as const, anomalyReason: undefined, anomalySeverity: undefined };
      }
      return log;
    }));
    showToastSimulated('Video Berhasil Diunggah Ulang ke Cloudflare R2!');
  };

  const handleDeleteLog = (logId: string) => {
    const targetLog = logs.find(l => l.id === logId);
    const trackingNumber = targetLog?.trackingNumber;

    // Delete object from Cloudflare R2 bucket in real-time
    if (targetLog?.r2StorageKey) {
      deleteVideoFromCloudflareR2(targetLog.r2StorageKey, config);
    }

    // 1. Remove from React state & local storage
    setLogs(prev => prev.filter(log => log.id !== logId));
    setAnomalies(prev => prev.filter(anom => anom.logId !== logId));

    // 2. Add to deleted ID blacklist
    try {
      const deletedList: string[] = JSON.parse(localStorage.getItem('packguard_deleted_log_ids') || '[]');
      if (!deletedList.includes(logId)) deletedList.push(logId);
      localStorage.setItem('packguard_deleted_log_ids', JSON.stringify(deletedList));
    } catch (e) {
      console.warn('Failed to save deleted ID blacklist:', e);
    }

    // 3. Delete ONLY the single specific log record from Supabase PostgreSQL by unique ID
    deletePackingLogFromSupabase(logId);
    showToastSimulated('Video packing & file R2 berhasil dihapus dari sistem.');
  };

  const handleResolveAnomaly = (id: string) => {
    setAnomalies(prev => prev.map(anom => {
      if (anom.id === id || anom.logId === id) {
        return { ...anom, resolved: true };
      }
      return anom;
    }));
    setLogs(prev => prev.map(log => {
      if (log.id === id || (log.anomalyReason && log.id === id)) {
        return { ...log, status: 'uploaded' as const, resolved: true };
      }
      return log;
    }));
    showToastSimulated('Anomali Berhasil Diselesaikan!');
  };

  const handleSimulateAnomaly = (type: 'upload_failed' | 'short_video' | 'missing_checklist') => {
    const randomId = `anom-${Date.now()}`;
    const titles = {
      upload_failed: 'Gagal Mengunggah Video ke R2',
      short_video: 'Anomali Durasi Rekaman Singkat',
      missing_checklist: 'Pemeriksaan SOP Tidak Lengkap',
    };
    const messages = {
      upload_failed: 'Gagal mengunggah potongan video packing karena timeout jaringan.',
      short_video: 'Durasi video di bawah 15 detik, terdeteksi bypass SOP pack.',
      missing_checklist: 'Operator melewati centang checklist bubble wrap.',
    };

    const newAnomaly: AnomalyNotification = {
      id: randomId,
      orderNumber: `ORD-${Math.floor(80000 + Math.random() * 9000)}`,
      timestamp: new Date().toLocaleTimeString('id-ID'),
      type,
      title: titles[type],
      message: messages[type],
      severity: type === 'upload_failed' ? 'critical' : 'warning',
      read: false,
      resolved: false,
    };

    setAnomalies(prev => [newAnomaly, ...prev]);
    showToastSimulated(`Anomali Baru Terdeteksi: ${titles[type]}`);
  };

  const handleToggleDemoUser = () => {
    const currentIndex = DEMO_USERS.findIndex(u => u.id === loggedInUser?.id);
    const nextIndex = (currentIndex + 1) % DEMO_USERS.length;
    const nextUser = DEMO_USERS[nextIndex];
    setLoggedInUser(nextUser);
    
    // Auto-select operator matching the user's name
    const matchedOp = operators.find(op => nextUser.fullName.includes(op.name));
    if (matchedOp) {
      setSelectedOperator(matchedOp);
    }
    
    showToastSimulated(`Beralih ke peran: ${nextUser.fullName} (${nextUser.role.toUpperCase()})`);
  };

  useEffect(() => {
    // Determine greeting
    const hour = new Date().getHours();
    if (hour >= 4 && hour < 11) {
      setGreeting('Selamat Pagi ☀️');
    } else if (hour >= 11 && hour < 15) {
      setGreeting('Selamat Siang 🌤️');
    } else if (hour >= 15 && hour < 18) {
      setGreeting('Selamat Sore 🌅');
    } else {
      setGreeting('Selamat Malam 🌙');
    }

    // Live clock ticker
    const interval = setInterval(() => {
      const now = new Date();
      setSystemTime(now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      // Subtle variations in ping
      setSystemPing(prev => Math.max(10, Math.min(35, prev + (Math.random() > 0.5 ? 1 : -1))));
    }, 1000);

    const now = new Date();
    setSystemTime(now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

    return () => clearInterval(interval);
  }, []);

  // Helper to get current calendar date strictly in Asia/Jakarta (WIB) timezone (YYYY-MM-DD)
  const getWibDateString = (): string => {
    try {
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      return formatter.format(new Date());
    } catch (e) {
      return new Date().toLocaleDateString('en-CA');
    }
  };

  // Persistent login session loader with Daily Reset Expiry (forces re-login on WIB date change)
  useEffect(() => {
    try {
      const todayStr = getWibDateString(); // YYYY-MM-DD in WIB
      const savedLoginDate = localStorage.getItem('packguard_login_date');
      const isLoggedOut = localStorage.getItem('packguard_logged_out') === 'true';

      // Check if session has expired due to calendar date change (e.g. 12 Aug -> 13 Aug WIB)
      if (savedLoginDate && savedLoginDate !== todayStr) {
        localStorage.removeItem('packguard_user');
        localStorage.removeItem('packguard_login_date');
        localStorage.setItem('packguard_logged_out', 'true');
        setLoggedInUser(null);
        showToastSimulated('Sesi login kemarin telah berakhir (berganti hari WIB). Silakan masuk kembali.');
        return;
      }

      if (isLoggedOut) return;

      const savedUser = localStorage.getItem('packguard_user');
      if (savedUser) {
        const parsed: DemoUser = JSON.parse(savedUser);
        if (parsed && parsed.username) {
          // Restore exact role, allowedMenus, and station from saved user!
          if (!parsed.allowedMenus || parsed.allowedMenus.length === 0) {
            parsed.allowedMenus = parsed.role === 'developer'
              ? ['recorder', 'logs', 'analytics', 'anomalies', 'settings', 'sql_editor', 'indexeddb_manager']
              : parsed.role === 'admin'
              ? ['recorder', 'logs', 'analytics', 'anomalies', 'settings', 'indexeddb_manager']
              : ['recorder', 'logs', 'settings', 'indexeddb_manager'];
          }
          setLoggedInUser(parsed);
          setLoginTime(new Date().toLocaleTimeString('id-ID'));
        }
      }
    } catch (e) {
      console.warn('LocalStorage access blocked or empty:', e);
    }
  }, []);

  // Periodic Midnight / Day-Change Session Expiration Ticker
  useEffect(() => {
    if (!loggedInUser) return;

    const checkDayChange = () => {
      const todayStr = getWibDateString();
      const savedLoginDate = localStorage.getItem('packguard_login_date');

      if (savedLoginDate && savedLoginDate !== todayStr) {
        handleLogout();
        showToastSimulated('Sesi login telah berakhir karena hari WIB telah berganti. Silakan masuk kembali.');
      }
    };

    const interval = setInterval(checkDayChange, 30000); // Check every 30s
    window.addEventListener('focus', checkDayChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', checkDayChange);
    };
  }, [loggedInUser]);

  // Autofill Demo account helper
  const handleAutofill = (user: any) => {
    setUsernameInput(user.username);
    let presetPassword = '';
    if (user.role === 'operator') presetPassword = 'PackGuard#Op2026!';
    else if (user.role === 'admin') presetPassword = 'PackGuard#Admin2026!';
    else if (user.role === 'developer') presetPassword = 'PackGuard#Dev2026!';
    setPasswordInput(presetPassword);
    setErrorMessage(null);
  };

  // Login handler
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput.trim()) {
      setErrorMessage('Silakan masukkan Username / Email.');
      return;
    }
    if (!passwordInput) {
      setErrorMessage('Silakan masukkan Kata Sandi.');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);
    setSubmitStep(1); // Connecting

    try {
      // Step 2: SHA-256 Check (simulate step duration)
      await new Promise(resolve => setTimeout(resolve, 350));
      setSubmitStep(2);

      // Step 3: Sync roles
      await new Promise(resolve => setTimeout(resolve, 300));
      setSubmitStep(3);

      // Make API call (tries backend first, falls back to direct Supabase)
      const user = await performLogin(usernameInput, passwordInput);

      setSubmitStep(4); // Access granted!
      await new Promise(resolve => setTimeout(resolve, 400));

      setLoggedInUser(user);
      const todayStr = getWibDateString();
      localStorage.removeItem('packguard_logged_out');
      localStorage.setItem('packguard_user', JSON.stringify(user));
      localStorage.setItem('packguard_login_date', todayStr);
      setLoginTime(new Date().toLocaleTimeString('id-ID'));
      setIsSubmitting(false);
      setSubmitStep(0);
    } catch (err: any) {
      setIsSubmitting(false);
      setSubmitStep(0);
      setErrorMessage(err.message || 'Gagal Autentikasi: Terjadi kesalahan koneksi.');
    }
  };

  // Passkey scanner login handler (Opens realistic secure biometric scan modal)
  const handlePasskeyTrigger = () => {
    setIsBiometricModalOpen(true);
    setBiometricScanProgress(0);
    setBiometricStatus('Siap Membuka Sensor Sidik Jari');
  };

  // Interactive scan progression loop
  const startSecureBiometricScan = () => {
    if (!selectedPasskeyUser) {
      showToastSimulated('Pilih user terlebih dahulu!');
      return;
    }
    const user = registeredPasskeys.find(u => u.id === selectedPasskeyUser.id);
    const isRegistered = user ? user.isRegistered : false;

    setBiometricScanProgress(1);
    setBiometricStatus('Menghubungi Secure Enclave perangkat...');
    
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += 5;
      if (currentProgress > 100) currentProgress = 100;
      setBiometricScanProgress(currentProgress);
      
      if (currentProgress === 15) {
        setBiometricStatus('Mempersiapkan Pemindaian Kapasitif...');
      } else if (currentProgress === 40) {
        setBiometricStatus('Memindai Alur Sidik Jari / FaceID...');
      } else if (currentProgress === 70) {
        setBiometricStatus('Mencocokkan Kunci Privat FIDO2...');
      } else if (currentProgress === 90) {
        setBiometricStatus('Mendekripsi Metadata WebAuthn...');
      } else if (currentProgress === 100) {
        clearInterval(interval);
        
        if (!isRegistered) {
          setBiometricStatus('DEKRIPSI GAGAL: Sidik jari belum terdaftar!');
          showToastSimulated('Gagal: Biometrik belum terdaftar');
        } else {
          setBiometricStatus('Autentikasi Berhasil! Mengalihkan...');
          
          setTimeout(() => {
            setIsBiometricModalOpen(false);
            
            // Create a DemoUser object from the PasskeyUser
            const resolvedUser: DemoUser = {
              id: selectedPasskeyUser.id,
              username: selectedPasskeyUser.id,
              fullName: selectedPasskeyUser.name,
              role: selectedPasskeyUser.role,
              station: selectedPasskeyUser.station,
              avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
              allowedMenus: selectedPasskeyUser.role === 'developer' 
                ? ['recorder', 'logs', 'analytics', 'anomalies', 'settings', 'sql_editor']
                : selectedPasskeyUser.role === 'admin'
                ? ['recorder', 'logs', 'analytics', 'anomalies']
                : ['recorder', 'logs']
            };
            
            setLoggedInUser(resolvedUser);
            localStorage.setItem('packguard_user', JSON.stringify(resolvedUser));
            setLoginTime(new Date().toLocaleTimeString('id-ID'));
            showToastSimulated(`Masuk sebagai ${resolvedUser.fullName}`);
          }, 850);
        }
      }
    }, 100);
  };

  // Forgot Password action
  const handleForgotPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail || !forgotEmail.includes('@')) {
      return;
    }
    setForgotPasswordState('sent');
  };

  const handleLogout = async () => {
    hasShownGoogleToastRef.current = false;
    setLoggedInUser(null);
    try {
      localStorage.setItem('packguard_logged_out', 'true');
      localStorage.removeItem('packguard_user');
      localStorage.removeItem('packguard_login_date');
      await logoutSupabase();
    } catch (e) {
      console.warn('LocalStorage or Supabase signout notice:', e);
    }
    // Keep username but clear password for security
    setPasswordInput('');
    showToastSimulated('Berhasil keluar dari sesi keamanan.');
  };

  // Listen for Global Force Logout broadcast signal from Developer across all devices in real-time
  useEffect(() => {
    const channel = supabase.channel('packguard_security_channel');
    channel
      .on('broadcast', { event: 'FORCE_GLOBAL_LOGOUT' }, (payload) => {
        console.warn('⚡ Global Force Logout signal received from Developer:', payload);
        hasShownGoogleToastRef.current = false;
        setLoggedInUser(null);
        try {
          localStorage.setItem('packguard_logged_out', 'true');
          localStorage.removeItem('packguard_user');
          localStorage.removeItem('packguard_login_date');
        } catch (e) {}
        showToastSimulated('⚠️ Developer telah memaksa keluar seluruh sesi user aktif secara serentak.');
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const triggerGlobalForceLogout = async () => {
    try {
      const channel = supabase.channel('packguard_security_channel');
      await channel.send({
        type: 'broadcast',
        event: 'FORCE_GLOBAL_LOGOUT',
        payload: { timestamp: Date.now(), triggeredBy: loggedInUser?.fullName || 'Developer' },
      });
    } catch (e) {
      console.warn('Broadcast error:', e);
    }
    handleLogout();
    showToastSimulated('Berhasil memaksa keluar seluruh sesi user aktif secara serentak!');
  };

  // Generates a mock JWT token string based on current active user
  const generateMockJWT = (user: DemoUser) => {
    const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    const payload = btoa(JSON.stringify({
      sub: user.id,
      name: user.fullName,
      role: user.role,
      station: user.station,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
      iss: "packguard-auth-gateway"
    }));
    return `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${payload}.signature_hash_256_aes`;
  };

  const copyTokenToClipboard = (token: string) => {
    navigator.clipboard.writeText(token);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  if (loggedInUser) {
    const currentUser: User = {
      id: loggedInUser.id,
      username: loggedInUser.username,
      fullName: loggedInUser.fullName,
      role: loggedInUser.role,
      station: loggedInUser.station,
      avatar: loggedInUser.avatar,
      allowedMenus: loggedInUser.allowedMenus,
    };

    return (
      <div className="min-h-screen bg-stone-50 flex flex-col text-slate-800 font-sans pb-16 md:pb-0">
        {/* Header Component */}
        <Header
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          config={config}
          operators={operators}
          selectedOperator={selectedOperator}
          setSelectedOperator={setSelectedOperator}
          anomalies={anomalies}
          onOpenSettings={() => setIsSettingsOpen(true)}
          currentUser={currentUser}
          onLogout={handleLogout}
          onOpenSqlEditor={() => setIsSqlEditorOpen(true)}
          onOpenIndexedDBManager={() => setIsIndexedDBManagerOpen(true)}
          isBiometricRegistered={registeredPasskeys.some(u => u.name.toLowerCase() === currentUser.fullName.toLowerCase() && u.isRegistered)}
          onOpenBiometricSetup={() => setIsBiometricSetupOpen(true)}
          navPosition={navPosition}
          onToggleSidebar={() => setIsSidebarOpen(true)}
        />

        {/* Off-Canvas Sidebar Drawer Navigation (Garis 3 ☰) */}
        <SidebarNav
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          anomalies={anomalies}
          onOpenSettings={() => setIsSettingsOpen(true)}
          currentUser={currentUser}
          onOpenSqlEditor={() => setIsSqlEditorOpen(true)}
          onOpenIndexedDBManager={() => setIsIndexedDBManagerOpen(true)}
          onLogout={handleLogout}
          navPosition={navPosition}
          onChangeNavPosition={handleNavPositionChange}
        />

        {/* Global Auto-Sync Status Banner */}
        {globalSyncStatusText && (
          <div className="bg-indigo-900 text-white p-3.5 px-6 shadow-md border-b border-indigo-700 flex flex-col space-y-1.5 z-40">
            <div className="flex items-center justify-between max-w-7xl mx-auto w-full">
              <div className="flex items-center space-x-2.5">
                <RefreshCw className="w-4 h-4 text-indigo-300 animate-spin shrink-0" />
                <span className="font-bold text-xs text-white">{globalSyncStatusText}</span>
              </div>
              {globalSyncProgress > 0 && (
                <span className="text-xs font-mono font-bold text-indigo-300">{globalSyncProgress}%</span>
              )}
            </div>
            {globalSyncProgress > 0 && globalSyncProgress < 100 && (
              <div className="max-w-7xl mx-auto w-full bg-indigo-950 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-emerald-400 h-full transition-all duration-300"
                  style={{ width: `${globalSyncProgress}%` }}
                />
              </div>
            )}
          </div>
        )}

        {/* Main Workspace Area */}
        <main className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'recorder' && (
                <PackingRecorder
                  config={config}
                  operator={selectedOperator}
                  pendingOrders={MOCK_PENDING_ORDERS}
                  onNewLogCreated={handleNewLogCreated}
                  onAnomalyDetected={handleAnomalyDetected}
                />
              )}

              {activeTab === 'logs' && (
                <InventoryLogs
                  logs={logs}
                  config={config}
                  onRetryUpload={handleRetryUpload}
                  onResolveAnomaly={handleResolveAnomaly}
                  onDeleteLog={handleDeleteLog}
                  currentUser={currentUser}
                />
              )}

              {activeTab === 'analytics' && (
                <AnalyticsDashboard analytics={analytics} />
              )}

              {activeTab === 'anomaly' && (
                <AnomalyCenter
                  anomalies={anomalies}
                  config={config}
                  onResolveAnomaly={handleResolveAnomaly}
                  onSimulateAnomaly={handleSimulateAnomaly}
                />
              )}
              {activeTab === 'indexeddb_queue' && (
                <IndexedDBQueueView
                  config={config}
                  currentUser={currentUser}
                  onLogUploaded={handleNewLogCreated}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          anomalies={anomalies}
          onOpenSettings={() => setIsSettingsOpen(true)}
          currentUser={currentUser}
          onOpenSqlEditor={() => setIsSqlEditorOpen(true)}
          onOpenIndexedDBManager={() => setIsIndexedDBManagerOpen(true)}
          navPosition={navPosition}
        />

        {/* Settings Modal (Image 2 layout structure) */}
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          config={config}
          onSaveConfig={setConfig}
          currentUser={currentUser}
          onLogout={handleLogout}
          onGlobalForceLogout={triggerGlobalForceLogout}
          onOpenSqlEditor={() => {
            setIsSettingsOpen(false);
            setIsSqlEditorOpen(true);
          }}
          onOpenIndexedDBManager={() => {
            setIsSettingsOpen(false);
            setIsIndexedDBManagerOpen(true);
          }}
          onOpenBiometricSetup={() => {
            setIsSettingsOpen(false);
            setIsBiometricSetupOpen(true);
          }}
          showToast={showToastSimulated}
          navPosition={navPosition}
          onChangeNavPosition={handleNavPositionChange}
          logs={logs}
          currentPlanId={currentPlanId}
          onSelectPlan={handleSelectPlan}
          usedResiCount={logs.length}
        />

        {/* SQL Editor Modal */}
        <SqlEditorModal
          isOpen={isSqlEditorOpen}
          onClose={() => setIsSqlEditorOpen(false)}
          showToast={showToastSimulated}
        />

        {/* IndexedDB Storage Manager Modal */}
        <IndexedDBManagerModal
          isOpen={isIndexedDBManagerOpen}
          onClose={() => setIsIndexedDBManagerOpen(false)}
          config={config}
          onLogUploaded={handleNewLogCreated}
        />

        {/* App Version Force Update Modal */}
        <AppUpdateModal
          isOpen={isAppUpdateOpen}
          latestVersion="v65.0 (Komponen Custom Date Pill Overlay - 100% Hilangkan Highlight Biru Segment Chrome & Bebas Terblok)"
          onUpdateNow={handleApplyUpdate}
        />
        <BiometricSetupModal
          isOpen={isBiometricSetupOpen}
          onClose={() => setIsBiometricSetupOpen(false)}
          currentUser={currentUser}
          registeredPasskeys={registeredPasskeys}
          onRegisterPasskey={(id) => {
            const updated = registeredPasskeys.map(user => {
              if (user.id === id) {
                return { ...user, isRegistered: true, registeredAt: new Date().toISOString() };
              }
              return user;
            });
            setRegisteredPasskeys(updated);
            localStorage.setItem('packguard_registered_passkeys_v2', JSON.stringify(updated));
          }}
          onUnregisterPasskey={(id) => {
            const updated = registeredPasskeys.map(user => {
              if (user.id === id) {
                return { ...user, isRegistered: false, registeredAt: undefined };
              }
              return user;
            });
            setRegisteredPasskeys(updated);
            localStorage.setItem('packguard_registered_passkeys_v2', JSON.stringify(updated));
          }}
          onAddPasskeyUser={(name, role, station) => {
            const newUser: PasskeyUser = {
              id: `custom-pk-${Date.now()}`,
              name,
              role,
              isRegistered: false,
              station,
            };
            const updated = [...registeredPasskeys, newUser];
            setRegisteredPasskeys(updated);
            localStorage.setItem('packguard_registered_passkeys_v2', JSON.stringify(updated));
          }}
          onDeletePasskeyUser={(id) => {
            const updated = registeredPasskeys.filter(user => user.id !== id);
            setRegisteredPasskeys(updated);
            localStorage.setItem('packguard_registered_passkeys_v2', JSON.stringify(updated));
          }}
          showToast={showToastSimulated}
        />

        {/* Floating Simulated Toast inside dashboard (Centered & Non-AI) */}
        {toastMessage && (() => {
          const isError = toastMessage.toLowerCase().includes('gagal') || 
                          toastMessage.toLowerCase().includes('belum') || 
                          toastMessage.toLowerCase().includes('salah') || 
                          toastMessage.toLowerCase().includes('batal');
          const isSuccess = toastMessage.toLowerCase().includes('berhasil') || 
                            toastMessage.toLowerCase().includes('sukses') || 
                            toastMessage.toLowerCase().includes('aktif') ||
                            toastMessage.toLowerCase().includes('terdaftar');
          return (
            <div className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-50 bg-slate-950 text-slate-100 text-xs px-5 py-3 rounded-2xl shadow-xl shadow-black/30 border border-slate-800 flex items-center space-x-3 animate-slide-in min-w-[280px] justify-center whitespace-nowrap">
              {isError ? (
                <AlertCircle className="h-4.5 w-4.5 text-rose-500 shrink-0" />
              ) : isSuccess ? (
                <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400 shrink-0" />
              ) : (
                <Info className="h-4.5 w-4.5 text-blue-400 shrink-0" />
              )}
              <span className="font-semibold">{toastMessage}</span>
            </div>
          );
        })()}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50/80 via-slate-50 to-indigo-50/40 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      {/* Background Decorative Ambient Light Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[450px] h-[450px] rounded-full bg-blue-300/20 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[450px] h-[450px] rounded-full bg-indigo-300/20 blur-[100px] pointer-events-none" />

      <div className="w-full max-w-[440px] flex flex-col justify-between py-2 sm:py-6 relative z-10">
        
        {/* Centered Brand Header */}
        <div className="flex flex-col items-center justify-center mb-5 text-center animate-fade-in">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-600/20 mb-3 border border-blue-400/30">
            <Video className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-wider text-slate-900 uppercase">PACKGUARD <span className="text-blue-600">PRO</span></h1>
          <p className="text-[10px] text-blue-700 font-mono tracking-widest uppercase font-bold mt-1 bg-blue-50 border border-blue-200/80 px-2.5 py-0.5 rounded-full">
            PORTAL OTENTIKASI KEAMANAN
          </p>
        </div>

        {/* Tab Switcher: Hidden until MFA/Passkey feature is ready */}
        {/* TODO: Uncomment when passkey feature is production-ready
        {!loggedInUser && !isSubmitting && forgotPasswordState === 'none' && (
          <div className="bg-[#f1f3f9] p-1 rounded-[16px] flex items-center space-x-1 mb-6 self-stretch shadow-sm">
            <button
              type="button"
              onClick={() => setAuthMethod('password')}
              className={`flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-[12px] text-xs font-bold transition-all cursor-pointer ${
                authMethod === 'password'
                  ? 'bg-white text-[#1e293b] shadow-sm'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <KeyRound className="h-3.5 w-3.5" />
              <span>Kata Sandi</span>
            </button>
            <button
              type="button"
              onClick={() => setAuthMethod('passkey')}
              className={`flex-1 flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-[12px] text-xs font-bold transition-all cursor-pointer ${
                authMethod === 'passkey'
                  ? 'bg-white text-[#1e293b] shadow-sm'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Fingerprint className="h-3.5 w-3.5" />
              <span>MFA / Passkey</span>
            </button>
          </div>
        )}
        */}

        {/* MAIN CARD CONTAINER */}
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl sm:rounded-[32px] p-5 sm:p-8 shadow-2xl shadow-teal-950/5 border border-slate-200/90 w-full relative z-20">

          {/* ACTIVE CONTENT CARD WITH ANIMATIONS */}
          <div className="flex-1 flex flex-col justify-center w-full">
            <AnimatePresence mode="wait">
              
              {/* STATE 1: RECENTLY LOGGED IN / ACTIVE SESSION VIEW */}
              {loggedInUser ? (
                <motion.div
                  key="active-session"
                  initial={{ opacity: 0, scale: 0.98, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  {/* Visual Success Accent Grid */}
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-start space-x-3.5">
                    <div className="h-8 w-8 rounded-lg bg-emerald-500/20 text-emerald-600 flex items-center justify-center shrink-0">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-emerald-900">Sesi Terautentikasi Aman</h3>
                      <p className="text-xs text-emerald-700/90 mt-0.5 leading-relaxed">
                        Koneksi dienkripsi end-to-end menggunakan SSL TLS 1.3 dan token otorisasi aktif.
                      </p>
                    </div>
                  </div>

                  {/* Active Profile Info */}
                  <div className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-4 shadow-sm relative">
                    <div className="flex items-center space-x-4">
                      <UserAvatar role={loggedInUser.role} size="xl" />
                      <div className="space-y-0.5">
                        <span className="text-[9px] uppercase font-bold tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                          {loggedInUser.role}
                        </span>
                        <h2 className="text-base font-bold text-slate-900 leading-tight">{loggedInUser.fullName}</h2>
                        <p className="text-xs text-slate-500 font-mono">{loggedInUser.station}</p>
                      </div>
                    </div>

                    <div className="pt-3.5 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-mono text-slate-400 block uppercase">Login Sejak</span>
                        <span className="font-semibold text-slate-800">{loginTime || '10:29:36'}</span>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-mono text-slate-400 block uppercase">Status Akun</span>
                        <span className="font-semibold text-emerald-600 flex items-center">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
                          Aktif
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Permissions & Authorized Pages */}
                  <div className="space-y-2.5">
                    <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase font-mono block">
                      HAK AKSES RESMI & MENU TERBUKA:
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      {loggedInUser.allowedMenus.map((menu, idx) => (
                        <div key={idx} className="flex items-center space-x-2 bg-indigo-50/40 border border-indigo-100/60 p-2.5 rounded-xl">
                          <Check className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                          <span className="text-xs font-semibold text-slate-700 leading-none">{menu}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* JWT Decoded Terminal Log Panel */}
                  <div className="bg-slate-950 rounded-2xl p-4 border border-slate-900 shadow-lg text-slate-300 font-mono text-xs space-y-3.5">
                    <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                      <div className="flex items-center space-x-1.5">
                        <Terminal className="h-3.5 w-3.5 text-indigo-400" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">JSON WEB TOKEN DECODED</span>
                      </div>
                      <button
                        onClick={() => copyTokenToClipboard(generateMockJWT(loggedInUser))}
                        className="text-slate-400 hover:text-white transition p-1 rounded-md bg-slate-900/60 hover:bg-slate-900"
                        title="Copy Mock JWT Token"
                      >
                        {copiedToken ? (
                          <span className="text-[9px] text-emerald-400 flex items-center space-x-1">
                            <Check className="h-3 w-3" />
                            <span>Tersalin!</span>
                          </span>
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                    
                    <div className="space-y-1.5 text-[11px] leading-relaxed overflow-x-auto select-all max-h-[120px]">
                      <div className="text-purple-400">{"{"}</div>
                      <div className="pl-4"><span className="text-indigo-300">"sub"</span>: <span className="text-emerald-300">"{loggedInUser.id}"</span>,</div>
                      <div className="pl-4"><span className="text-indigo-300">"name"</span>: <span className="text-emerald-300">"{loggedInUser.fullName}"</span>,</div>
                      <div className="pl-4"><span className="text-indigo-300">"role"</span>: <span className="text-purple-300">"{loggedInUser.role}"</span>,</div>
                      <div className="pl-4"><span className="text-indigo-300">"aud"</span>: <span className="text-emerald-300">"packguard-gateway-clients"</span>,</div>
                      <div className="pl-4"><span className="text-indigo-300">"exp"</span>: <span className="text-amber-300">{Math.floor(Date.now() / 1000) + 3600}</span></div>
                      <div className="text-purple-400">{"}"}</div>
                    </div>
                  </div>

                  {/* Main Action Logout button */}
                  <button
                    onClick={handleLogout}
                    type="button"
                    className="w-full flex items-center justify-center space-x-2 bg-slate-900 text-white font-semibold text-xs py-3 rounded-xl border border-slate-800 hover:bg-slate-800 transition shadow-sm active:scale-[0.98]"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Keluar dari Sesi</span>
                  </button>
                </motion.div>
              ) : isSubmitting ? (
                /* STATE 2: LOADING AUTHENTICATION GATEWAY STEPS */
                <motion.div
                  key="submitting-state"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-8 flex flex-col items-center justify-center text-center py-8"
                >
                  {/* Glowing Spinner */}
                  <div className="relative flex items-center justify-center">
                    <div className="h-20 w-20 rounded-full border-[3px] border-slate-100 border-t-indigo-600 animate-spin"></div>
                    <div className="absolute">
                      <Shield className="h-7 w-7 text-indigo-600 animate-pulse" />
                    </div>
                  </div>

                  <div className="space-y-3 max-w-[300px]">
                    <h3 className="text-base font-bold text-slate-950">Memproses Enkripsi Akses</h3>
                    
                    {/* Step Labels */}
                    <div className="space-y-1">
                      <p className={`text-xs transition-colors duration-200 ${submitStep >= 1 ? 'text-indigo-600 font-semibold' : 'text-slate-400'}`}>
                        {submitStep >= 1 ? '✓ Connected to Gateway' : '• Connecting...'}
                      </p>
                      <p className={`text-xs transition-colors duration-200 ${submitStep >= 2 ? 'text-indigo-600 font-semibold' : 'text-slate-400'}`}>
                        {submitStep >= 2 ? '✓ SHA-256 Checksum Verified' : '• Hashing Credentials...'}
                      </p>
                      <p className={`text-xs transition-colors duration-200 ${submitStep >= 3 ? 'text-indigo-600 font-semibold' : 'text-slate-400'}`}>
                        {submitStep >= 3 ? '✓ Synced Role Privileges' : '• Querying Access Rights...'}
                      </p>
                    </div>

                    {/* Simple Progress Bar */}
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-4">
                      <div 
                        className="bg-indigo-600 h-full transition-all duration-500 ease-out"
                        style={{ width: `${(submitStep / 4) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </motion.div>
              ) : forgotPasswordState !== 'none' ? (
                /* STATE 3: FORGOT PASSWORD FLOW */
                <motion.div
                  key="forgot-password"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-5"
                >
                  <div className="space-y-1.5">
                    <h2 className="text-xl font-bold text-slate-900">Atur Ulang Sandi</h2>
                    <p className="text-xs text-slate-500">
                      Masukkan email yang terdaftar pada sistem PackGuard Pro. Tautan pemulihan akan dikirim secara aman.
                    </p>
                  </div>

                  {forgotPasswordState === 'sent' ? (
                    <div className="space-y-5 py-4">
                      <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-4 rounded-2xl flex items-start space-x-3 text-xs leading-relaxed">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold">Tautan Pemulihan Dikirim!</p>
                          <p className="mt-1 text-emerald-700/90">
                            Kami telah mengirimkan tautan reset sandi berdurasi 15 menit ke <span className="font-semibold">{forgotEmail}</span>.
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setForgotPasswordState('none');
                          setForgotEmail('');
                        }}
                        type="button"
                        className="w-full bg-slate-900 text-white font-semibold text-xs py-3 rounded-xl border border-slate-800 hover:bg-slate-800 transition shadow-sm active:scale-[0.98]"
                      >
                        Kembali ke Login
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                      <div className="space-y-1.5">
                        <label htmlFor="forgot-email" className="text-xs font-semibold text-slate-700">Email Pegawai</label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                            <Mail className="h-4 w-4" />
                          </span>
                          <input
                            id="forgot-email"
                            type="email"
                            required
                            placeholder="budi@packguard.com"
                            value={forgotEmail}
                            onChange={(e) => setForgotEmail(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col space-y-2 pt-2">
                        <button
                          type="submit"
                          className="w-full bg-indigo-600 text-white font-semibold text-xs py-3 rounded-xl hover:bg-indigo-700 transition shadow-sm active:scale-[0.98]"
                        >
                          Kirim Tautan Verifikasi
                        </button>
                        <button
                          onClick={() => setForgotPasswordState('none')}
                          type="button"
                          className="w-full text-slate-500 hover:text-slate-800 font-semibold text-xs py-2 transition"
                        >
                          Batal
                        </button>
                      </div>
                    </form>
                  )}
                </motion.div>
              ) : authMethod === 'passkey' ? (
                /* STATE 4: PASSKEY / BIOMETRIC AUTH METHOD */
                <motion.div
                  key="passkey-auth"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-6 flex flex-col items-stretch text-center"
                >
                  <div className="space-y-1">
                    <h2 className="text-xl font-bold text-slate-900">Autentikasi Multi-Faktor</h2>
                    <p className="text-xs text-slate-500 max-w-[360px] mx-auto">
                      Gunakan Passkey terenkripsi lokal atau biometrik FIDO2/WebAuthn terautentikasi.
                    </p>
                  </div>

                  {/* Passkey User selector */}
                  <div className="space-y-2 text-left">
                    <label className="text-xs font-semibold text-slate-600">Pilih Akun Passkey Terdaftar:</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[165px] overflow-y-auto pr-1">
                      {registeredPasskeys.map((user) => {
                        const isReg = user.isRegistered;
                        const isSelected = selectedPasskeyUser?.id === user.id;
                        return (
                          <button
                            key={user.id}
                            type="button"
                            onClick={() => {
                              setSelectedPasskeyUser(user);
                              if (biometricStatus.includes('GAGAL')) {
                                setBiometricScanProgress(0);
                                setBiometricStatus('Siap Membuka Sensor Sidik Jari');
                              }
                            }}
                            className={`p-2.5 rounded-xl border flex flex-col items-center justify-between text-center relative transition-all duration-200 cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-50/70 border-indigo-500 text-indigo-950 shadow-md shadow-indigo-500/5 scale-[1.02]'
                                : 'bg-white border-slate-100 hover:border-slate-300 text-slate-700 shadow-xs'
                            }`}
                          >
                            {/* Registration Indicator Dot at Top Corner */}
                            <div className="absolute top-2 right-2">
                              <span className={`flex h-1.5 w-1.5 rounded-full ${
                                isReg ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
                              }`} title={isReg ? 'MFA Aktif' : 'MFA Belum Terdaftar'} />
                            </div>

                            {/* Avatar Container with Ring */}
                            <div className="relative mt-1">
                              <UserAvatar
                                role={user.role}
                                size="sm"
                                className={`transition-all duration-200 ${
                                  isSelected
                                    ? 'ring-2 ring-indigo-500 ring-offset-1 scale-105 shadow-md'
                                    : 'ring-1 ring-slate-200'
                                }`}
                              />
                            </div>

                            {/* Info */}
                            <div className="mt-2 space-y-0.5 w-full min-w-0">
                              <span className="block text-[11px] font-bold truncate text-slate-900" title={user.name}>
                                {user.name}
                              </span>
                              <span className={`block text-[9px] font-extrabold uppercase tracking-wide truncate ${
                                isSelected ? 'text-indigo-900/80' : 'text-slate-400'
                              }`}>
                                {user.role}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Fingerprint visual scanning box */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center space-y-4 relative min-h-[180px] overflow-hidden">
                    <button
                      onClick={handlePasskeyTrigger}
                      type="button"
                      className="h-20 w-20 rounded-full flex items-center justify-center shadow-lg transition duration-300 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 shadow-indigo-500/10 cursor-pointer"
                    >
                      <Fingerprint className="h-10 w-10 animate-pulse" />
                    </button>

                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-slate-800">
                        Ketuk Sensor untuk Autentikasi
                      </p>
                      <p className="text-[10px] text-slate-500">
                        Memerlukan verifikasi sidik jari secure enclave
                      </p>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-400 italic">
                    Biometrik disimulasikan lokal. Kunci privat aman dalam secure enclave.
                  </div>
                </motion.div>
              ) : (
                /* STATE 5: PASSWORD FORM VIEW - GOOGLE LOGIN ONLY */
                <motion.div
                  key="password-auth"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-5"
                >
                  {/* Headline */}
                  <div className="space-y-1">
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight">Masuk ke Portal</h2>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Pilih otentikasi Google atau kredensial pegawai gudang.
                    </p>
                  </div>

                  {/* Error Banner */}
                  {errorMessage && (
                    <div className="bg-rose-50 border border-rose-100 text-rose-800 p-3 rounded-xl flex items-center space-x-2.5 text-xs">
                      <AlertCircle className="h-4.5 w-4.5 text-rose-600 shrink-0" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  {/* Google Login Button */}
                  <button
                    type="button"
                    onClick={handleGoogleLoginPortal}
                    disabled={isSubmitting}
                    className="w-full bg-white hover:bg-blue-50/50 text-slate-800 font-bold py-3 px-4 rounded-xl text-xs sm:text-sm flex items-center justify-center space-x-3 transition-all border border-slate-300 shadow-xs hover:border-blue-500 hover:shadow-sm active:scale-[0.98] cursor-pointer group"
                  >
                    <svg className="w-5 h-5 shrink-0 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>{isSubmitting ? 'Mengarahkan ke Google...' : 'Masuk dengan Google'}</span>
                  </button>

                  <div className="flex items-center space-x-2 my-2 text-slate-400 text-[11px]">
                    <div className="flex-1 border-t border-slate-200" />
                    <span>atau dengan Username</span>
                    <div className="flex-1 border-t border-slate-200" />
                  </div>

                  {/* Form Username / Password */}
                  <form onSubmit={handleLoginSubmit} className="space-y-3">
                    {/* Username Input */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label htmlFor="username" className="text-xs font-semibold text-slate-700">Username Pegawai</label>
                        <span className="text-[10px] text-slate-400 font-mono">operator / admin / dev</span>
                      </div>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                          <UserIcon className="h-4 w-4" />
                        </span>
                        <input
                          id="username"
                          type="text"
                          required
                          placeholder="Masukkan username Anda"
                          value={usernameInput}
                          onChange={(e) => setUsernameInput(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition"
                        />
                      </div>
                    </div>

                    {/* Password Input */}
                    <div className="space-y-1">
                      <label htmlFor="password" className="text-xs font-semibold text-slate-700 block">Kata Sandi</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                          <Lock className="h-4 w-4" />
                        </span>
                        <input
                          id="password"
                          name="user_auth_pin"
                          autoComplete="current-password"
                          data-lpignore="true"
                          data-1p-ignore="true"
                          type={showPassword ? "text" : "password"}
                          required
                          placeholder="Masukkan kata sandi"
                          value={passwordInput}
                          onChange={(e) => setPasswordInput(e.target.value)}
                          className="w-full pl-9 pr-9 py-2 rounded-xl border border-slate-200 text-xs bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-2.5 rounded-xl transition shadow-xs active:scale-[0.98] cursor-pointer mt-1"
                    >
                      <span>Masuk dengan Kredensial</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Divider line */}
          <div className="border-t border-slate-100 my-5"></div>

          {/* Premium IT Helpdesk / Support Banner */}
          <div className="flex items-center justify-between p-3.5 bg-[#f8fafc] border border-slate-100 rounded-2xl hover:bg-slate-50 transition cursor-pointer group">
            <div className="flex items-center space-x-3">
              <div className="h-9 w-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-xs group-hover:scale-105 transition-transform">
                <Headphones className="h-4 w-4" />
              </div>
              <div className="text-left">
                <h4 className="text-xs font-bold text-slate-900 leading-tight">Butuh bantuan masuk?</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">Hubungi Layanan IT Support Hub (24/7)</p>
              </div>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </div>

          {/* Secure Biometric Scanner simulation Overlay Modal */}
          {isBiometricModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-white rounded-3xl p-6 max-w-sm w-full mx-4 border border-slate-200 shadow-2xl text-center space-y-6"
              >
                {/* Native Touch ID / Face ID Alert header */}
                <div className="flex flex-col items-center space-y-2">
                  <div className="h-14 w-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm animate-pulse">
                    <Fingerprint className="h-8 w-8" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">Verifikasi Biometrik</h3>
                  <p className="text-xs text-slate-500 max-w-[240px]">
                    Dekripsi kunci privat FIDO2 untuk akun <strong className="text-indigo-600 uppercase font-mono">{selectedPasskeyUser.role}</strong>.
                  </p>
                </div>

                {/* Scan Progress Circle / Visual */}
                <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl space-y-4">
                  {biometricScanProgress > 0 ? (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase font-mono">
                        <span>Status Pemindaian</span>
                        <span className={`${biometricStatus.includes('GAGAL') ? 'text-rose-600' : 'text-indigo-600'} font-bold`}>{biometricScanProgress}%</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-100 ${
                            biometricStatus.includes('GAGAL') ? 'bg-rose-500' : 'bg-indigo-600'
                          }`}
                          style={{ width: `${biometricScanProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 italic py-2">
                      Silakan tekan tombol Mulai Pindai untuk memicu pembaca biometrik perangkat.
                    </div>
                  )}
                  
                  <div className={`text-xs font-bold min-h-[16px] ${
                    biometricStatus.includes('GAGAL') ? 'text-rose-600' : 'text-indigo-700'
                  }`}>
                    {biometricStatus}
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex space-x-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsBiometricModalOpen(false)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs py-2.5 rounded-xl transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  {biometricScanProgress === 0 || biometricStatus.includes('GAGAL') ? (
                    <button
                      type="button"
                      onClick={startSecureBiometricScan}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center space-x-1 cursor-pointer"
                    >
                      <Fingerprint className="h-3.5 w-3.5 animate-pulse" />
                      <span>{biometricStatus.includes('GAGAL') ? 'Coba Lagi' : 'Mulai Pindai'}</span>
                    </button>
                  ) : (
                    <button
                      disabled
                      type="button"
                      className="flex-1 bg-indigo-100 text-indigo-400 font-bold text-xs py-2.5 rounded-xl flex items-center justify-center"
                    >
                      Memindai...
                    </button>
                  )}
                </div>
              </motion.div>
            </div>
          )}

          {/* Toast Notification helper inside container (Centered & Non-AI) */}
          {toastMessage && (() => {
            const isError = toastMessage.toLowerCase().includes('gagal') || 
                            toastMessage.toLowerCase().includes('belum') || 
                            toastMessage.toLowerCase().includes('salah') || 
                            toastMessage.toLowerCase().includes('batal');
            const isSuccess = toastMessage.toLowerCase().includes('berhasil') || 
                              toastMessage.toLowerCase().includes('sukses') || 
                              toastMessage.toLowerCase().includes('aktif') ||
                              toastMessage.toLowerCase().includes('terdaftar');
            return (
              <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 bg-slate-950 text-slate-100 text-xs px-5 py-3 rounded-2xl shadow-xl shadow-black/30 border border-slate-800 flex items-center space-x-3 animate-slide-in min-w-[280px] justify-center whitespace-nowrap">
                {isError ? (
                  <AlertCircle className="h-4.5 w-4.5 text-rose-500 shrink-0" />
                ) : isSuccess ? (
                  <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400 shrink-0" />
                ) : (
                  <Info className="h-4.5 w-4.5 text-blue-400 shrink-0" />
                )}
                <span className="font-semibold">{toastMessage}</span>
              </div>
            );
          })()}

        </div>

        {/* Brand Footer */}
        <div className="flex items-center justify-center space-x-2 text-[9px] font-mono tracking-widest text-[#64748b] uppercase mt-6 select-none animate-fade-in">
          <Lock className="h-3.5 w-3.5 text-[#584df5]" />
          <span>PACKGUARD SECURE ENTRY GATEWAY</span>
        </div>

      </div>
    </div>
  );
}
