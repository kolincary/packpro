import React from 'react';
import { Video, HardDrive, Database, Bell, ShieldAlert, User as UserIcon, CheckCircle2, Cloud, Shield, Code2, LogIn, Fingerprint, Settings, Menu } from 'lucide-react';
import { CloudflareConfig, Operator, AnomalyNotification, User } from '../types';
import { UserAvatar } from './UserAvatar';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  config: CloudflareConfig;
  operators: Operator[];
  selectedOperator: Operator;
  setSelectedOperator: (op: Operator) => void;
  anomalies: AnomalyNotification[];
  onOpenSettings: () => void;
  currentUser: User;
  onLogout: () => void;
  onOpenSqlEditor: () => void;
  isBiometricRegistered: boolean;
  onOpenBiometricSetup: () => void;
  onOpenIndexedDBManager?: () => void;
  navPosition?: 'bottom' | 'sidebar';
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  config,
  operators,
  selectedOperator,
  setSelectedOperator,
  anomalies,
  onOpenSettings,
  currentUser,
  onLogout,
  onOpenSqlEditor,
  isBiometricRegistered,
  onOpenBiometricSetup,
  onOpenIndexedDBManager,
  navPosition = 'bottom',
  onToggleSidebar,
}) => {
  const unreadAnomalies = anomalies.filter(a => !a.read && !a.resolved);
  const allowed = currentUser?.allowedMenus || ['recorder', 'logs'];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 text-slate-900 shadow-sm">
      <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 h-[68px] flex items-center justify-between gap-3 sm:gap-4">
        
        {/* Brand & Logo + Left Sidebar Hamburger Trigger (Garis 3 ☰) */}
        <div className="flex items-center space-x-3 sm:space-x-4 shrink-0 min-w-max">
          
          {/* Hamburger Garis 3 Sidebar Trigger (Only visible when navPosition === 'sidebar') */}
          {navPosition === 'sidebar' && onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="p-2 sm:p-2.5 rounded-xl border bg-blue-50 border-blue-200 text-blue-700 shadow-xs hover:bg-blue-100 transition-all cursor-pointer mr-2 sm:mr-3 shrink-0"
              title="Buka Side Menu (Garis 3 ☰)"
            >
              <Menu className="w-5 h-5 text-current" />
            </button>
          )}

          <div className="flex items-center space-x-2.5 sm:space-x-3.5 cursor-pointer shrink-0" onClick={() => setActiveTab('recorder')}>
            <div className="w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-lg bg-blue-600 flex items-center justify-center shadow-xs text-white shrink-0">
              <Video className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="shrink-0">
              <div className="flex items-center space-x-1.5 sm:space-x-2 whitespace-nowrap">
                <span className="font-bold text-sm sm:text-base lg:text-lg tracking-tight text-slate-900 whitespace-nowrap">
                  PackGuard <span className="text-blue-600">Pro</span>
                </span>
                <span className="text-[9px] sm:text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-1.5 sm:px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center space-x-1 shrink-0 whitespace-nowrap">
                  <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                  <span className="hidden xs:inline">R2 + Supabase</span>
                  <span className="xs:hidden">R2</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden 2xl:block whitespace-nowrap">
                Sistem Rekam Packing Video & Log Metadata Real-Time
              </p>
            </div>
          </div>
        </div>

        {/* Desktop Navigation - RBAC Filtered with Equal Width & Precise Tabs */}
        {navPosition === 'bottom' && (
          <nav className="hidden md:flex items-center gap-1 sm:gap-1.5 bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200/80 flex-initial justify-center max-w-3xl overflow-x-auto">
            {allowed.includes('recorder') && (
              <button
                id="nav-btn-recorder"
                onClick={() => setActiveTab('recorder')}
                className={`flex-1 flex items-center justify-center space-x-1.5 px-2.5 sm:px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all text-center whitespace-nowrap min-w-0 ${
                  activeTab === 'recorder'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                }`}
              >
                <Video className="w-4 h-4 shrink-0" />
                <span className="truncate">Kamera Rekam</span>
              </button>
            )}

            {allowed.includes('logs') && (
              <button
                id="nav-btn-logs"
                onClick={() => setActiveTab('logs')}
                className={`flex-1 flex items-center justify-center space-x-1.5 px-2.5 sm:px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all text-center whitespace-nowrap min-w-0 ${
                  activeTab === 'logs'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                }`}
              >
                <Database className="w-4 h-4 shrink-0" />
                <span className="truncate">Log Order</span>
              </button>
            )}

            {allowed.includes('analytics') && (
              <button
                id="nav-btn-analytics"
                onClick={() => setActiveTab('analytics')}
                className={`flex-1 flex items-center justify-center space-x-1.5 px-2.5 sm:px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all text-center whitespace-nowrap min-w-0 ${
                  activeTab === 'analytics'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                }`}
              >
                <HardDrive className="w-4 h-4 shrink-0" />
                <span className="truncate">Analitik</span>
              </button>
            )}

            {allowed.includes('anomalies') && (
              <button
                id="nav-btn-anomaly"
                onClick={() => setActiveTab('anomaly')}
                className={`flex-1 flex items-center justify-center space-x-1.5 px-2.5 sm:px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all text-center whitespace-nowrap min-w-0 relative ${
                  activeTab === 'anomaly'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                }`}
              >
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span className="truncate">Anomali</span>
                {unreadAnomalies.length > 0 && (
                  <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full animate-pulse ml-1">
                    {unreadAnomalies.length}
                  </span>
                )}
              </button>
            )}

            {allowed.includes('sql_editor') && (
              <button
                onClick={onOpenSqlEditor}
                className="flex-1 flex items-center justify-center space-x-1.5 px-2.5 sm:px-3 py-2 rounded-xl text-xs sm:text-sm font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-all text-center whitespace-nowrap min-w-0"
              >
                <Code2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="truncate">SQL Editor</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('indexeddb_queue')}
              className={`flex-1 flex items-center justify-center space-x-1.5 px-2.5 sm:px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all text-center whitespace-nowrap min-w-0 ${
                activeTab === 'indexeddb_queue'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
              }`}
            >
              <Database className="w-4 h-4 shrink-0" />
              <span className="truncate">Antrean IndexedDB</span>
            </button>
          </nav>
        )}

        {/* Right Section: Role User Badge, Login Switcher, Notifications */}
        <div className="flex items-center space-x-1.5 sm:space-x-2.5 shrink-0">
          

          
          {/* SQL Editor Icon Button (For Dev/Admin) */}
          {allowed.includes('sql_editor') && (
            <button
              onClick={onOpenSqlEditor}
              className="md:hidden p-1.5 sm:p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-all"
              title="Supabase SQL Editor DDL"
            >
              <Code2 className="w-4 h-4" />
            </button>
          )}

          {/* Settings Icon Button & Logout */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 bg-slate-50 p-1 sm:p-1.5 rounded-xl border border-slate-200">
            <button
              id="btn-header-settings"
              onClick={onOpenSettings}
              className="w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200/80 flex items-center justify-center transition-all cursor-pointer shadow-2xs group"
              title="Buka Menu Pengaturan (Settings)"
            >
              <Settings className="w-4 h-4 text-blue-600 group-hover:rotate-45 transition-transform duration-300" />
            </button>

            <div className="text-left hidden sm:block px-1">
              <span className="text-xs font-bold text-slate-850 leading-tight">
                {currentUser.fullName.split(' ')[0]}
              </span>
            </div>

            <button
              id="btn-header-logout"
              onClick={onLogout}
              className="w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/80 flex items-center justify-center transition-all cursor-pointer shadow-2xs group"
              title="Keluar / Logout dari Sesi"
            >
              <LogIn className="w-3.5 h-3.5 text-rose-600 rotate-180 group-hover:-translate-x-0.5 transition-transform" />
            </button>
          </div>

          {/* Anomaly Notification Bell */}
          {allowed.includes('anomalies') && (
            <button
              id="btn-bell-notifications"
              onClick={() => setActiveTab('anomaly')}
              className="relative p-1.5 sm:p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              title="Notifikasi Anomali"
            >
              <Bell className="w-4 h-4" />
              {unreadAnomalies.length > 0 && (
                <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {unreadAnomalies.length}
                </span>
              )}
            </button>
          )}

        </div>

      </div>
    </header>
  );
};
