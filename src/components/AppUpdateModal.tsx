import React from 'react';
import { Sparkles, RefreshCw, ShieldCheck, CheckCircle } from 'lucide-react';

interface AppUpdateModalProps {
  isOpen: boolean;
  latestVersion: string;
  onUpdateNow: () => void;
}

export const AppUpdateModal: React.FC<AppUpdateModalProps> = ({
  isOpen,
  latestVersion,
  onUpdateNow,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-slate-900 space-y-5 transform transition-all animate-scale-up">
        
        <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30 mx-auto">
          <Sparkles className="w-8 h-8 animate-bounce" />
        </div>

        <div className="text-center space-y-1.5">
          <span className="bg-indigo-100 text-indigo-800 text-[11px] font-mono font-bold px-3 py-1 rounded-full border border-indigo-200">
            Pembaruan Versi {latestVersion}
          </span>
          <h2 className="text-xl font-black text-slate-900 tracking-tight pt-1">
            Versi Terbaru PackGuard Pro Tersedia!
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed max-w-xs mx-auto">
            Fitur **Antrean Berkas IndexedDB Latar Belakang** dan **Stempel Waktu Real-Time WIB** terbaru kini telah siap digunakan.
          </p>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 flex items-start space-x-3 text-emerald-900">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-0.5">
            <span className="font-bold text-emerald-950">Garansi Keamanan Data HP:</span>
            <p className="text-[11px] text-emerald-800 leading-normal">
              Seluruh berkas video rekaman yang tersimpan di IndexedDB HP **100% aman & tidak akan pernah terhapus** saat pembaruan versi.
            </p>
          </div>
        </div>

        <button
          onClick={onUpdateNow}
          className="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-sm py-3 px-4 rounded-xl flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
        >
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>Perbarui Sekarang (Muat Ulang Halaman)</span>
        </button>

      </div>
    </div>
  );
};
