import React from 'react';
import { 
  X, Video, Database, HardDrive, ShieldAlert, Settings, Code2, 
  User as UserIcon, Layout, ChevronRight, LogOut, ShieldCheck,
  PanelBottom, PanelLeft
} from 'lucide-react';
import { AnomalyNotification, User } from '../types';

interface SidebarNavProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  anomalies: AnomalyNotification[];
  onOpenSettings: () => void;
  currentUser: User;
  onOpenSqlEditor: () => void;
  onOpenIndexedDBManager?: () => void;
  onLogout: () => void;
  navPosition: 'bottom' | 'sidebar';
  onChangeNavPosition: (pos: 'bottom' | 'sidebar') => void;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
  isOpen,
  onClose,
  activeTab,
  setActiveTab,
  anomalies,
  onOpenSettings,
  currentUser,
  onOpenSqlEditor,
  onOpenIndexedDBManager,
  onLogout,
  navPosition,
  onChangeNavPosition,
}) => {
  if (!isOpen) return null;

  const unreadAnomalies = anomalies.filter(a => !a.read && !a.resolved);
  const allowed = currentUser?.allowedMenus || ['recorder', 'logs'];

  const handleNavClick = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Dark Overlay Backdrop */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-fade-in"
      />

      {/* Left Off-Canvas Sidebar Container */}
      <div className="relative z-10 w-4/5 max-w-xs sm:max-w-sm bg-white h-full shadow-2xl flex flex-col justify-between border-r border-slate-200 animate-slide-in-left text-slate-800">
        
        <div>
          {/* Sidebar Top Header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
                <Video className="w-4.5 h-4.5 text-white" />
              </div>
              <div>
                <span className="font-bold text-base text-slate-900 tracking-tight">
                  PackGuard <span className="text-blue-600">Pro</span>
                </span>
                <p className="text-[10px] text-slate-500 font-semibold">Sidebar Menu (Garis 3)</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
              title="Tutup Menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User Profile Summary */}
          <div className="p-4 border-b border-slate-100 bg-white">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 font-bold flex items-center justify-center text-sm shadow-xs">
                {currentUser.fullName.charAt(0).toUpperCase()}
              </div>
              <div className="truncate">
                <span className="font-bold text-sm text-slate-900 block truncate leading-tight">
                  {currentUser.fullName}
                </span>
                <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded uppercase border border-blue-100 inline-block mt-0.5">
                  {currentUser.role} • {currentUser.station}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Items List */}
          <div className="p-3 space-y-1">
            
            {allowed.includes('recorder') && (
              <button
                onClick={() => handleNavClick(() => setActiveTab('recorder'))}
                className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'recorder'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Video className="w-4.5 h-4.5" />
                  <span>Kamera Rekam SOP</span>
                </div>
                <ChevronRight className={`w-4 h-4 ${activeTab === 'recorder' ? 'opacity-100' : 'opacity-40'}`} />
              </button>
            )}

            {allowed.includes('logs') && (
              <button
                onClick={() => handleNavClick(() => setActiveTab('logs'))}
                className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'logs'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Database className="w-4.5 h-4.5" />
                  <span>Log Inventaris & Video</span>
                </div>
                <ChevronRight className={`w-4 h-4 ${activeTab === 'logs' ? 'opacity-100' : 'opacity-40'}`} />
              </button>
            )}

            {allowed.includes('analytics') && (
              <button
                onClick={() => handleNavClick(() => setActiveTab('analytics'))}
                className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'analytics'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <HardDrive className="w-4.5 h-4.5" />
                  <span>Analitik Gudang</span>
                </div>
                <ChevronRight className={`w-4 h-4 ${activeTab === 'analytics' ? 'opacity-100' : 'opacity-40'}`} />
              </button>
            )}

            {allowed.includes('anomalies') && (
              <button
                onClick={() => handleNavClick(() => setActiveTab('anomaly'))}
                className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'anomaly'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <ShieldAlert className="w-4.5 h-4.5" />
                  <span>Anomali SOP</span>
                </div>
                {unreadAnomalies.length > 0 ? (
                  <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {unreadAnomalies.length}
                  </span>
                ) : (
                  <ChevronRight className={`w-4 h-4 ${activeTab === 'anomaly' ? 'opacity-100' : 'opacity-40'}`} />
                )}
              </button>
            )}

            <button
              onClick={() => handleNavClick(() => setActiveTab('indexeddb_queue'))}
              className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'indexeddb_queue'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Database className="w-4.5 h-4.5" />
                <span>Antrean IndexedDB HP</span>
              </div>
              <ChevronRight className={`w-4 h-4 ${activeTab === 'indexeddb_queue' ? 'opacity-100' : 'opacity-40'}`} />
            </button>

            {allowed.includes('sql_editor') && (
              <button
                onClick={() => handleNavClick(onOpenSqlEditor)}
                className="w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <Code2 className="w-4.5 h-4.5 text-blue-600" />
                  <span>SQL Editor Supabase</span>
                </div>
                <ChevronRight className="w-4 h-4 opacity-40" />
              </button>
            )}

            <button
              onClick={() => handleNavClick(onOpenSettings)}
              className="w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <div className="flex items-center space-x-3">
                <Settings className="w-4.5 h-4.5 text-blue-600" />
                <span>Pengaturan System</span>
              </div>
              <ChevronRight className="w-4 h-4 opacity-40" />
            </button>

          </div>
        </div>

        {/* Sidebar Footer: Position Switcher & Logout */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/80 space-y-3">
          
          <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
            <span className="text-[11px] font-bold text-slate-600 block">Posisi Menu Navigasi:</span>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => onChangeNavPosition('bottom')}
                className={`px-2 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                  navPosition === 'bottom'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <PanelBottom className="w-3.5 h-3.5" />
                <span>Bawah</span>
              </button>
              <button
                type="button"
                onClick={() => onChangeNavPosition('sidebar')}
                className={`px-2 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                  navPosition === 'sidebar'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <PanelLeft className="w-3.5 h-3.5" />
                <span>Sidebar</span>
              </button>
            </div>
          </div>

          <button
            onClick={() => handleNavClick(onLogout)}
            className="w-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 p-2.5 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4 rotate-180" />
            <span>Keluar dari Sesi</span>
          </button>

        </div>

      </div>
    </div>
  );
};
