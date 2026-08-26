import React from 'react';
import { Video, Database, HardDrive, ShieldAlert, Settings, Code2 } from 'lucide-react';
import { AnomalyNotification, User } from '../types';

interface MobileBottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  anomalies: AnomalyNotification[];
  onOpenSettings: () => void;
  currentUser: User;
  onOpenSqlEditor: () => void;
  onOpenIndexedDBManager?: () => void;
  navPosition?: 'bottom' | 'sidebar';
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  anomalies,
  onOpenSettings,
  currentUser,
  onOpenSqlEditor,
  onOpenIndexedDBManager,
  navPosition = 'bottom',
}) => {
  if (navPosition === 'sidebar') return null;

  const unreadAnomalies = anomalies.filter(a => !a.read && !a.resolved);
  const allowed = currentUser?.allowedMenus || ['recorder', 'logs'];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-2 text-slate-700 shadow-lg">
      <div className="flex items-center justify-around">
        
        {allowed.includes('recorder') && (
          <button
            id="mobile-nav-recorder"
            onClick={() => setActiveTab('recorder')}
            className={`flex flex-col items-center py-1 px-3 rounded-lg text-[10px] font-medium transition-all ${
              activeTab === 'recorder' ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <div className={`p-1.5 rounded-full ${activeTab === 'recorder' ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-500' : ''}`}>
              <Video className="w-5 h-5" />
            </div>
            <span className="mt-1">Kamera</span>
          </button>
        )}

        {allowed.includes('logs') && (
          <button
            id="mobile-nav-logs"
            onClick={() => setActiveTab('logs')}
            className={`flex flex-col items-center py-1 px-3 rounded-lg text-[10px] font-medium transition-all ${
              activeTab === 'logs' ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <div className={`p-1.5 rounded-full ${activeTab === 'logs' ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-500' : ''}`}>
              <Database className="w-5 h-5" />
            </div>
            <span className="mt-1">Log Order</span>
          </button>
        )}

        {allowed.includes('analytics') && (
          <button
            id="mobile-nav-analytics"
            onClick={() => setActiveTab('analytics')}
            className={`flex flex-col items-center py-1 px-3 rounded-lg text-[10px] font-medium transition-all ${
              activeTab === 'analytics' ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <div className={`p-1.5 rounded-full ${activeTab === 'analytics' ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-500' : ''}`}>
              <HardDrive className="w-5 h-5" />
            </div>
            <span className="mt-1">Analitik</span>
          </button>
        )}

        {allowed.includes('anomalies') && (
          <button
            id="mobile-nav-anomaly"
            onClick={() => setActiveTab('anomaly')}
            className={`relative flex flex-col items-center py-1 px-3 rounded-lg text-[10px] font-medium transition-all ${
              activeTab === 'anomaly' ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <div className={`p-1.5 rounded-full ${activeTab === 'anomaly' ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-500' : ''}`}>
              <ShieldAlert className="w-5 h-5" />
            </div>
            <span className="mt-1">Anomali</span>
            {unreadAnomalies.length > 0 && (
              <span className="absolute top-1 right-2 w-4 h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-bounce">
                {unreadAnomalies.length}
              </span>
            )}
          </button>
        )}

        <button
          onClick={() => setActiveTab('indexeddb_queue')}
          className={`flex flex-col items-center py-1 px-3 rounded-lg text-[10px] font-medium transition-all ${
            activeTab === 'indexeddb_queue' ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <div className={`p-1.5 rounded-full ${activeTab === 'indexeddb_queue' ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-500' : ''}`}>
            <Database className="w-5 h-5" />
          </div>
          <span className="mt-1 font-bold">Antrean</span>
        </button>

        {allowed.includes('sql_editor') && (
          <button
            onClick={onOpenSqlEditor}
            className="flex flex-col items-center py-1 px-3 rounded-lg text-[10px] font-medium text-blue-600 hover:text-blue-800"
          >
            <div className="p-1.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200">
              <Code2 className="w-5 h-5" />
            </div>
            <span className="mt-1 font-bold">SQL</span>
          </button>
        )}

      </div>
    </div>
  );
};
