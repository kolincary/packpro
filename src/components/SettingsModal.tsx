import React, { useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Cloud, 
  HardDrive, 
  FileSpreadsheet, 
  Crown, 
  BookOpen,
  ShieldCheck,
  Layout,
  PanelBottom,
  PanelLeft,
  Check,
  Video,
  LogOut,
  Clock,
  Zap
} from 'lucide-react';
import { CloudflareConfig, User, PackingVideoLog, SubscriptionPlan, SubscriptionPlanId } from '../types';
import { UpgradePlanView, SAAS_PLANS } from './UpgradePlanModal';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: CloudflareConfig;
  onSaveConfig: (updated: CloudflareConfig) => void;
  currentUser: User;
  onLogout: () => void;
  onGlobalForceLogout?: () => void;
  onOpenSqlEditor?: () => void;
  onOpenIndexedDBManager?: () => void;
  onOpenBiometricSetup?: () => void;
  showToast?: (msg: string) => void;
  navPosition?: 'bottom' | 'sidebar';
  onChangeNavPosition?: (pos: 'bottom' | 'sidebar') => void;
  logs?: PackingVideoLog[];
  currentPlanId?: SubscriptionPlanId;
  onSelectPlan?: (plan: SubscriptionPlan) => void;
  usedResiCount?: number;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  currentUser,
  onLogout,
  onGlobalForceLogout,
  onOpenSqlEditor,
  onOpenIndexedDBManager,
  onOpenBiometricSetup,
  showToast,
  navPosition = 'bottom',
  onChangeNavPosition,
  logs = [],
  currentPlanId = 'pro_seller',
  onSelectPlan,
  usedResiCount = 450,
}) => {
  const [activeSubView, setActiveSubView] = useState<'main' | 'help' | 'plans'>('main');
  const [isNavPosExpandOpen, setIsNavPosExpandOpen] = useState(false);
  const [isRecordingModeExpandOpen, setIsRecordingModeExpandOpen] = useState(false);

  if (!isOpen) return null;

  const activePlan = SAAS_PLANS.find(p => p.id === currentPlanId) || SAAS_PLANS[1];

  const handleExportCSV = () => {
    if (!logs || logs.length === 0) {
      if (showToast) showToast('Export CSV: Tidak ada data log order untuk diexport.');
      return;
    }
    if (showToast) showToast(`Export CSV: Berhasil mengeksport ${logs.length} data log order ke file CSV!`);

    const headers = [
      'ID Log',
      'Nomor Resi',
      'ID Order',
      'Nama Pelanggan',
      'Ekspedisi',
      'Operator',
      'Stasiun Packing',
      'Waktu Rekam',
      'Durasi (Detik)',
      'Ukuran File (MB)',
      'Nama File Video',
      'Status Upload'
    ];

    const csvRows = logs.map(log => [
      `"${log.id}"`,
      `"${log.trackingNumber}"`,
      `"${log.orderNumber}"`,
      `"${(log.customerName || '').replace(/"/g, '""')}"`,
      `"${log.courier || ''}"`,
      `"${(log.operatorName || '').replace(/"/g, '""')}"`,
      `"${log.packingStation || ''}"`,
      `"${log.timestamp}"`,
      log.durationSeconds,
      log.fileSizeMB,
      `"${log.videoFileName}"`,
      `"${log.status}"`
    ].join(','));

    const csvContent = '\uFEFF' + [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `packguard_log_order_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4 md:p-6 overflow-y-auto cursor-pointer"
    >
      {/* Full Screen on Mobile, Wide Responsive Floating Card on Tablet & Desktop */}
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-50 border-0 sm:border border-slate-200/90 rounded-none sm:rounded-3xl w-full h-full sm:h-auto max-w-none sm:max-w-2xl md:max-w-4xl lg:max-w-5xl overflow-hidden shadow-2xl text-slate-800 my-0 sm:my-auto flex flex-col transition-all animate-fade-in cursor-default"
      >
        
        {/* Top Header Bar */}
        <div className="bg-white px-4 sm:px-5 py-3.5 sm:py-4 border-b border-slate-200/80 flex items-center justify-between sticky top-0 z-10 shrink-0">
          <button
            onClick={() => {
              if (activeSubView !== 'main') {
                setActiveSubView('main');
              } else {
                onClose();
              }
            }}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors border border-slate-200/80 cursor-pointer"
            title="Kembali"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <h2 className="font-bold text-base sm:text-lg text-slate-900 tracking-tight">
            {activeSubView === 'help' 
              ? 'Pusat Bantuan & Panduan' 
              : activeSubView === 'plans' 
              ? 'PackGuard Subscription Plans' 
              : 'Settings'}
          </h2>

          <button
            onClick={() => {
              if (activeSubView === 'help') {
                setActiveSubView('main');
              } else {
                setActiveSubView('help');
              }
            }}
            className={`px-4 py-1.5 rounded-full font-bold text-xs transition-all shadow-xs cursor-pointer ${
              activeSubView === 'help' 
                ? 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
                : 'bg-slate-900 hover:bg-slate-800 text-white'
            }`}
          >
            {activeSubView === 'help' ? 'Tutup Help' : 'Help'}
          </button>
        </div>

        {/* Modal Scroll Body */}
        <div className="p-4 sm:p-6 space-y-5 flex-1 overflow-y-auto sm:max-h-[82vh]">

          {activeSubView === 'main' ? (
            <>
              {/* TOP GRAPHIC CARD: Connection & Connected User Status */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs">
                
                {/* Visual Connected Graphic Illustration - Modern Dual Node Tech Card */}
                <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-2xl p-4 sm:p-6 border border-blue-500/30 relative overflow-hidden flex items-center justify-between mb-3 shadow-md text-white">
                  {/* Ambient background glow */}
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-500/15 via-transparent to-transparent pointer-events-none" />
                  
                  {/* Left Node: PWA Video Camera */}
                  <div className="relative z-10 flex items-center space-x-2.5 sm:space-x-3 bg-slate-800/80 backdrop-blur-md border border-blue-500/40 px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-xl shadow-inner">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-500/20 text-blue-300 flex items-center justify-center shrink-0">
                      <Video className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                    </div>
                    <div className="hidden sm:block">
                      <span className="text-[10px] font-bold text-blue-300 block uppercase tracking-wider">Kamera PWA</span>
                      <span className="text-[11px] font-medium text-slate-200">800 Kbps Encoder</span>
                    </div>
                  </div>

                  {/* Center Animated Connection Pulse Line */}
                  <div className="flex-1 px-3 sm:px-6 relative z-10 flex flex-col items-center justify-center space-y-1">
                    <div className="flex items-center space-x-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping"></span>
                      <span className="text-[9px] sm:text-[10px] font-mono text-blue-400 font-bold uppercase tracking-wider">TERHUBUNG REAL-TIME</span>
                    </div>
                    <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden relative">
                      <div className="w-1/2 h-full bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full animate-pulse"></div>
                    </div>
                  </div>

                  {/* Right Node: Cloudflare R2 + Supabase */}
                  <div className="relative z-10 flex items-center space-x-2.5 sm:space-x-3 bg-slate-800/80 backdrop-blur-md border border-blue-500/40 px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-xl shadow-inner">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0">
                      <Cloud className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                    </div>
                    <div className="hidden sm:block">
                      <span className="text-[10px] font-bold text-indigo-300 block uppercase tracking-wider">Cloud Vault</span>
                      <span className="text-[11px] font-medium text-slate-200">R2 + PostgreSQL</span>
                    </div>
                  </div>
                </div>

                {/* Connected User Identity Line */}
                <div className="flex items-center justify-between text-xs sm:text-sm py-1">
                  <div className="flex items-center space-x-1.5 text-slate-600 font-medium truncate">
                    <span>Connected to:</span>
                    <span className="font-bold text-slate-900 truncate">
                      {currentUser.fullName}
                    </span>
                  </div>
                </div>

                {/* Active Target Selector Badge */}
                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center text-xs sm:text-sm text-blue-700 font-bold bg-blue-50/80 px-3.5 py-2 rounded-xl border border-blue-200/80">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                    <span>Cloudflare R2 + Supabase PostgreSQL</span>
                  </div>
                </div>

              </div>

              {/* RESPONSIVE GRID ON TABLET/DESKTOP */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* MIDDLE SECTION: System Settings List Card */}
                <div>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-1">
                    System Settings
                  </h3>

                  <div className="bg-white rounded-2xl border border-slate-200/80 divide-y divide-slate-100 overflow-hidden shadow-xs">
                    
                    {/* List Item 1: Clear Scan History & IndexedDB */}
                    {onOpenIndexedDBManager && (
                      <button
                        onClick={() => {
                          onClose();
                          onOpenIndexedDBManager();
                        }}
                        className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-blue-50/50 transition-colors text-left group cursor-pointer"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200/80 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                            <HardDrive className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="font-bold text-sm text-slate-900 block leading-tight">
                              Clear Scan History & IndexedDB
                            </span>
                            <span className="text-[11px] text-slate-500 block mt-0.5">
                              Kelola Antrean Lokal Offline & Log Video
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                      </button>
                    )}

                    {/* List Item 2: Export as CSV */}
                    <button
                      onClick={handleExportCSV}
                      className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-blue-50/50 transition-colors text-left group cursor-pointer"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200/80 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          <FileSpreadsheet className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="font-bold text-sm text-slate-900 block leading-tight">
                            Export as CSV
                          </span>
                          <span className="text-[11px] text-slate-500 block mt-0.5">
                            Unduh Laporan Metadata Video Packing
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                    </button>

                    {/* List Item 3: Force Logout SEMUA User Aktif (Khusus Developer) */}
                    {currentUser.role === 'developer' && (
                      <button
                        onClick={() => {
                          onClose();
                          if (onGlobalForceLogout) onGlobalForceLogout();
                          else onLogout();
                        }}
                        className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-rose-50/70 transition-colors text-left group cursor-pointer border-t border-slate-100"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                            <LogOut className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="font-bold text-sm text-rose-700 block leading-tight">
                              Paksa Logout SEMUA User Aktif
                            </span>
                            <span className="text-[11px] text-slate-500 block mt-0.5">
                              Kirim sinyal logout serentak ke SELURUH HP & Perangkat Gudang (Khusus Developer)
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-rose-400 group-hover:text-rose-600 group-hover:translate-x-0.5 transition-all" />
                      </button>
                    )}

                    {/* List Item 3: Navigation Layout Position */}
                    {onChangeNavPosition && (
                      <div className="border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setIsNavPosExpandOpen(!isNavPosExpandOpen)}
                          className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-blue-50/50 transition-colors text-left group cursor-pointer select-none"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200/80 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                              <Layout className="w-5 h-5" />
                            </div>
                            <div>
                              <span className="font-bold text-sm text-slate-900 block leading-tight">
                                Posisi Menu Navigasi
                              </span>
                              <span className="text-[11px] text-slate-500 block mt-0.5">
                                {navPosition === 'bottom' ? 'Aktif: Navigasi Bawah (Bar Bawah)' : 'Aktif: Sidebar Kiri (Garis 3 ☰)'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 hidden sm:inline-block">
                              {navPosition === 'bottom' ? 'Navigasi Bawah' : 'Sidebar Kiri'}
                            </span>
                            <ChevronRight className={`w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-transform ${isNavPosExpandOpen ? 'rotate-90 text-blue-600' : ''}`} />
                          </div>
                        </button>

                        {/* Expandable Options Selector */}
                        {isNavPosExpandOpen && (
                          <div className="p-3 bg-slate-100/70 border-t border-slate-200/60 space-y-2 animate-fade-in">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block px-1">
                              Pilih Mode Tata Letak Menu Navigasi:
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              
                              <button
                                type="button"
                                onClick={() => {
                                  onChangeNavPosition('bottom');
                                  setIsNavPosExpandOpen(false);
                                }}
                                className={`p-3 rounded-xl border flex items-center justify-between text-left transition-all cursor-pointer ${
                                  navPosition === 'bottom'
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-md font-bold'
                                    : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'
                                }`}
                              >
                                <div className="flex items-center space-x-2.5">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                    navPosition === 'bottom' ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-600'
                                  }`}>
                                    <PanelBottom className="w-4.5 h-4.5" />
                                  </div>
                                  <div>
                                    <span className="text-xs font-bold block leading-tight">Navigasi Bawah</span>
                                    <span className={`text-[10px] block ${navPosition === 'bottom' ? 'text-blue-100' : 'text-slate-500'}`}>
                                      Menu tampil di bawah layar
                                    </span>
                                  </div>
                                </div>
                                {navPosition === 'bottom' && <Check className="w-4 h-4 text-white" />}
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  onChangeNavPosition('sidebar');
                                  setIsNavPosExpandOpen(false);
                                }}
                                className={`p-3 rounded-xl border flex items-center justify-between text-left transition-all cursor-pointer ${
                                  navPosition === 'sidebar'
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-md font-bold'
                                    : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'
                                }`}
                              >
                                <div className="flex items-center space-x-2.5">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                    navPosition === 'sidebar' ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-600'
                                  }`}>
                                    <PanelLeft className="w-4.5 h-4.5" />
                                  </div>
                                  <div>
                                    <span className="text-xs font-bold block leading-tight">Sidebar Kiri (Garis 3)</span>
                                    <span className={`text-[10px] block ${navPosition === 'sidebar' ? 'text-blue-100' : 'text-slate-500'}`}>
                                      Menu di tombol Garis 3
                                    </span>
                                  </div>
                                </div>
                                {navPosition === 'sidebar' && <Check className="w-4 h-4 text-white" />}
                              </button>

                            </div>
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                </div>

                {/* BOTTOM SECTION: Usage Statistics & Upgrade Plan */}
                <div>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-1">
                    Storage & Plan
                  </h3>

                  <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                      <span>Penggunaan Kuota Resi Bulanan:</span>
                      <span className="text-blue-700 font-mono">
                        {usedResiCount.toLocaleString('id-ID')} / {activePlan.monthlyResiLimitFormatted}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-200/80 h-2.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-blue-600 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${Math.min(100, Math.max(1, (usedResiCount / activePlan.monthlyResiLimit) * 100))}%` }} 
                      />
                    </div>

                    {/* Upgrade Plan Card */}
                    <div 
                      onClick={() => setActiveSubView('plans')}
                      className="mt-2 bg-slate-50/80 rounded-xl border border-slate-200/80 p-3.5 flex items-center justify-between hover:bg-blue-50/50 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-9.5 h-9.5 rounded-lg bg-blue-50 border border-blue-200/80 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          <Crown className="w-5 h-5 text-amber-500" />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-xs sm:text-sm text-slate-900 leading-tight">
                              Upgrade Plan & Storage
                            </span>
                            <span className="text-[10px] font-extrabold bg-blue-600 text-white px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-2xs">
                              {activePlan.name}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500 block mt-1">
                            Batas Kuota: {activePlan.monthlyResiLimitFormatted} ({activePlan.priceFormatted}/bulan)
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-4.5 h-4.5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                    </div>
                  </div>
                </div>

              </div>

            </>
          ) : activeSubView === 'plans' ? (
            /* STANDALONE NON-MODAL SUBSCRIPTION PLANS VIEW */
            <UpgradePlanView
              currentPlanId={currentPlanId}
              usedResiCount={usedResiCount}
              onSelectPlan={(newPlan) => {
                if (onSelectPlan) onSelectPlan(newPlan);
                if (showToast) showToast(`Berhasil beralih ke paket ${newPlan.name} (${newPlan.priceFormatted} / bulan)!`);
                setActiveSubView('main');
              }}
              onBack={() => setActiveSubView('main')}
            />
          ) : (
            /* HELP CENTER CONTENT VIEW */
            <div className="space-y-4 text-xs sm:text-sm">
              
              {/* Help Banner Header */}
              <div className="bg-blue-600 text-white rounded-2xl p-4 sm:p-5 shadow-sm">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm text-white">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-white">Pusat Bantuan & Panduan PackGuard</h3>
                    <p className="text-xs text-blue-100 mt-0.5">
                      Panduan operasional perekaman video packing & sinkronisasi cloud real-time.
                    </p>
                  </div>
                </div>
              </div>

              {/* Guide Cards */}
              <div className="space-y-3">
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
                  <h4 className="font-bold text-slate-900 flex items-center space-x-2 text-xs sm:text-sm">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 text-xs font-bold flex items-center justify-center">1</span>
                    <span>Prosedur Perekaman Video Packing SOP</span>
                  </h4>
                  <p className="text-xs text-slate-600 pl-8 leading-relaxed">
                    Pastikan resi discan terlebih dahulu. Kamera akan mengunci metadata resi dan secara otomatis menyalakan waktu WIB real-time yang langsung terbakar (burn-in) di dalam video.
                  </p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
                  <h4 className="font-bold text-slate-900 flex items-center space-x-2 text-xs sm:text-sm">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 text-xs font-bold flex items-center justify-center">2</span>
                    <span>Pembatas Bitrate 800 Kbps & Maksimal 5 Menit</span>
                  </h4>
                  <p className="text-xs text-slate-650 pl-8 leading-relaxed">
                    Sistem memaksa bitrate video pada **800 Kbps (720p 15 FPS)** dengan durasi maksimal **5 Menit (300 detik)**. Ukuran file tertahan hemat di **~28 MB hingga 30 MB** per video. Video akan terhenti dan terunggah otomatis saat timer menyentuh 5 menit.
                  </p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
                  <h4 className="font-bold text-slate-900 flex items-center space-x-2 text-xs sm:text-sm">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 text-xs font-bold flex items-center justify-center">3</span>
                    <span>Mode Offline & Antrean IndexedDB</span>
                  </h4>
                  <p className="text-xs text-slate-600 pl-8 leading-relaxed">
                    Jika koneksi internet terputus saat di gudang, video akan tersimpan sementara di penyimpanan lokal browser (**IndexedDB**). Begitu koneksi kembali online, sistem akan otomatis melakukan auto-sync ke cloud.
                  </p>
                </div>
              </div>

              {/* Support Info Box */}
              <div className="bg-blue-50 border border-blue-200 p-3.5 rounded-2xl flex items-center justify-between text-xs text-blue-900">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-4.5 h-4.5 text-blue-600 shrink-0" />
                  <span className="font-semibold">Butuh Bantuan Lebih Lanjut? Hubungi Tim IT Warehouse Support.</span>
                </div>
              </div>

            </div>
          )}

        </div>

      </div>

    </div>
  );
};
