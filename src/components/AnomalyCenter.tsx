import React, { useState } from 'react';
import { 
  ShieldAlert, Bell, CheckCircle2, AlertTriangle, RefreshCw, Volume2, 
  Send, WifiOff, Clock, AlertCircle, XCircle, Check 
} from 'lucide-react';
import { AnomalyNotification, CloudflareConfig } from '../types';
import { requestNotificationPermission, sendPushNotification } from '../lib/notifications';
import { playAudioFeedback } from '../lib/cloudflare';

interface AnomalyCenterProps {
  anomalies: AnomalyNotification[];
  config: CloudflareConfig;
  onResolveAnomaly: (id: string) => void;
  onSimulateAnomaly: (type: 'upload_failed' | 'short_video' | 'missing_checklist') => void;
}

export const AnomalyCenter: React.FC<AnomalyCenterProps> = ({
  anomalies,
  config,
  onResolveAnomaly,
  onSimulateAnomaly,
}) => {
  const [pushGranted, setPushGranted] = useState<boolean>(
    'Notification' in window && Notification.permission === 'granted'
  );

  const handleRequestPush = async () => {
    const granted = await requestNotificationPermission();
    setPushGranted(granted);
    if (granted) {
      playAudioFeedback('success');
      alert('Izin Push Notification Browser Berhasil Diaktifkan!');
    } else {
      alert('Izin Push Notification ditolak atau tidak didukung oleh browser Anda.');
    }
  };

  const handleTestPush = () => {
    const testNotif: AnomalyNotification = {
      id: `test-${Date.now()}`,
      orderNumber: 'ORD-88392',
      timestamp: new Date().toLocaleTimeString(),
      type: 'upload_failed',
      title: 'Uji Coba Push Notification PackGuard',
      message: 'Notifikasi push otomatis berfungsi baik untuk memantau anomali video packing.',
      severity: 'warning',
      read: false,
      resolved: false,
    };

    sendPushNotification(testNotif);
    playAudioFeedback('anomaly');
  };

  return (
    <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 text-white pb-24 md:pb-10">
      
      {/* Header & Push Permission Card */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm text-slate-900 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
              <h1 className="text-lg font-bold text-slate-900">Pusat Pemantauan Anomali & Push Notification</h1>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Mendeteksi kegagalan jaringan, durasi video mencurigakan, dan pengunggahan terputus secara otomatis.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            {!pushGranted ? (
              <button
                onClick={handleRequestPush}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center space-x-2 shadow-sm transition-all"
              >
                <Bell className="w-4 h-4 animate-bounce" />
                <span>Aktifkan Push Notification HP / Browser</span>
              </button>
            ) : (
              <button
                onClick={handleTestPush}
                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs px-3.5 py-2 rounded-xl flex items-center space-x-1.5 transition-colors font-semibold shadow-sm"
              >
                <Bell className="w-4 h-4 text-emerald-600" />
                <span>Tes Kirim Push Notif (Alarm Audio)</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Simulator Buttons for Testing Anomaly Triggers */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
          <span className="text-[11px] text-slate-500 font-semibold block uppercase tracking-wider">
            Simulasi Pemicu Anomali (Skenario Lapangan):
          </span>
          <div className="flex flex-wrap gap-2 text-xs">
            <button
              onClick={() => onSimulateAnomaly('upload_failed')}
              className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-colors font-medium"
            >
              <WifiOff className="w-3.5 h-3.5 text-rose-600" />
              <span>Simulasi Koneksi Terputus R2</span>
            </button>

            <button
              onClick={() => onSimulateAnomaly('short_video')}
              className="bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-colors font-medium"
            >
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>Simulasi Video Terlalu Singkat (&lt;15s)</span>
            </button>

            <button
              onClick={() => onSimulateAnomaly('missing_checklist')}
              className="bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-colors font-medium"
            >
              <AlertCircle className="w-3.5 h-3.5 text-purple-600" />
              <span>Simulasi Dus Belum Tersegel Lakban</span>
            </button>
          </div>
        </div>
      </div>

      {/* ANOMALY ALERTS LIST */}
      <div className="space-y-4">
        <h2 className="font-bold text-sm text-slate-800 uppercase tracking-wider flex items-center space-x-2">
          <span>Daftar Laporan Anomali Aktif</span>
          <span className="bg-slate-100 text-slate-700 border border-slate-200 text-xs px-2 py-0.5 rounded-full font-mono">
            {anomalies.length} Laporan
          </span>
        </h2>

        <div className="space-y-3">
          {anomalies.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-2 shadow-sm">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <p className="text-sm font-semibold text-slate-900">Tidak Ada Anomali Aktif</p>
              <p className="text-xs text-slate-500">Seluruh proses pengunggahan video dan log packing berjalan normal.</p>
            </div>
          ) : (
            anomalies.map((anom) => (
              <div
                key={anom.id}
                className={`p-4 rounded-2xl border transition-all shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                  anom.resolved
                    ? 'bg-slate-50 border-slate-200 opacity-60'
                    : anom.severity === 'critical'
                    ? 'bg-rose-50/80 border-rose-200'
                    : 'bg-amber-50/80 border-amber-200'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      anom.severity === 'critical' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'
                    }`}
                  >
                    <AlertTriangle className="w-5 h-5" />
                  </div>

                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-sm text-slate-900">{anom.title}</span>
                      <span className="font-mono text-xs text-indigo-600 font-semibold bg-white px-2 py-0.5 rounded border border-slate-200 shadow-xs">
                        {anom.orderNumber}
                      </span>
                      {anom.resolved && (
                        <span className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full font-semibold border border-emerald-200">
                          Selesai Ditangani
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-700 mt-1">{anom.message}</p>
                    <span className="text-[10px] text-slate-400 font-mono mt-1 block">{anom.timestamp}</span>
                  </div>
                </div>

                {!anom.resolved && (
                  <button
                    onClick={() => onResolveAnomaly(anom.id)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-xl flex items-center space-x-1.5 transition-all shrink-0 self-end md:self-auto shadow-sm"
                  >
                    <Check className="w-4 h-4" />
                    <span>Tandai Selesai / Teratasi</span>
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
};
