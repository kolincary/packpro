import React, { useState } from 'react';
import { Database, Copy, Check, Terminal, Code2, ShieldAlert, Server, CheckCircle2 } from 'lucide-react';
import { SUPABASE_SQL_SCHEMA } from '../data/mockData';

interface SqlEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  showToast: (msg: string) => void;
}

export const SqlEditorModal: React.FC<SqlEditorModalProps> = ({ isOpen, onClose, showToast }) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'tables' | 'sql' | 'rbac'>('sql');
  const [isExecuted, setIsExecuted] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopied(true);
    showToast('SQL Schema Supabase berhasil disalin ke clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSimulateExecute = () => {
    setIsExecuted(true);
    showToast('Tabel & Role Supabase PostgreSQL berhasil diinisialisasi!');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-bold text-base sm:text-lg">Supabase SQL Editor & Database Schema</h2>
                <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  PostgreSQL
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Skema tabel lengkap untuk Supabase PostgreSQL & Role Access Control (RBAC)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Sub-Navigation */}
        <div className="bg-slate-100 border-b border-slate-200 px-4 py-2 flex items-center justify-between text-xs font-semibold">
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab('sql')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 ${
                activeTab === 'sql' ? 'bg-white text-indigo-600 shadow-xs border border-slate-200 font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Code2 className="w-4 h-4" />
              <span>Full SQL DDL Script</span>
            </button>
            <button
              onClick={() => setActiveTab('tables')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 ${
                activeTab === 'tables' ? 'bg-white text-indigo-600 shadow-xs border border-slate-200 font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Server className="w-4 h-4" />
              <span>Daftar Tabel (6 Tabel)</span>
            </button>
            <button
              onClick={() => setActiveTab('rbac')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 ${
                activeTab === 'rbac' ? 'bg-white text-indigo-600 shadow-xs border border-slate-200 font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Role & Akses Menu</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center space-x-2">
            <button
              onClick={handleCopy}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all shadow-xs"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Tersalin!' : 'Salin SQL'}</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          
          {activeTab === 'sql' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-600 bg-amber-50 p-3 rounded-xl border border-amber-200">
                <div className="flex items-center space-x-2">
                  <Terminal className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Buka dashboard <strong>Supabase &gt; SQL Editor</strong>, lalu tempel kode SQL berikut dan klik <strong>Run</strong>.
                  </span>
                </div>
                <button
                  onClick={handleCopy}
                  className="bg-amber-600 hover:bg-amber-700 text-white px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0"
                >
                  {copied ? 'Tersalin' : 'Copy All'}
                </button>
              </div>

              <div className="relative bg-slate-950 text-slate-100 rounded-xl p-4 font-mono text-xs overflow-x-auto border border-slate-800 max-h-96">
                <pre className="whitespace-pre-wrap">{SUPABASE_SQL_SCHEMA}</pre>
              </div>
            </div>
          )}

          {activeTab === 'tables' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-600">
                Berikut adalah 6 tabel utama yang dibutuhkan oleh aplikasi PackGuard Pro untuk integrasi Supabase PostgreSQL:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-1">
                  <span className="font-mono font-bold text-indigo-600">1. public.users</span>
                  <p className="text-slate-600 text-[11px]">Menyimpan akun pengguna, username, password hash, role (operator, admin, developer), dan stasiun packing.</p>
                </div>
                <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-1">
                  <span className="font-mono font-bold text-indigo-600">2. public.user_roles</span>
                  <p className="text-slate-600 text-[11px]">Mendefinisikan hak akses RBAC dan daftar menu (`allowed_menus`) yang boleh diakses masing-masing role.</p>
                </div>
                <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-1">
                  <span className="font-mono font-bold text-indigo-600">3. public.packing_logs</span>
                  <p className="text-slate-600 text-[11px]">Tabel utama menyimpan metadata video packing, nomor resi, order ID, SKU, URL video R2, dan durasi.</p>
                </div>
                <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-1">
                  <span className="font-mono font-bold text-indigo-600">4. public.packing_items</span>
                  <p className="text-slate-600 text-[11px]">Detail item barang di dalam setiap resi paket beserta status verifikasi checklist.</p>
                </div>
                <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-1">
                  <span className="font-mono font-bold text-indigo-600">5. public.anomalies</span>
                  <p className="text-slate-600 text-[11px]">Log peringatan anomali (durasi singkat, upload gagal, lakban tidak tersegel, dll).</p>
                </div>
                <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-1">
                  <span className="font-mono font-bold text-indigo-600">6. public.r2_storage_audits</span>
                  <p className="text-slate-600 text-[11px]">Audit log penyimpanan Cloudflare R2 bucket, ukuran berkas video, dan MIME type.</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'rbac' && (
            <div className="space-y-4">
              <div className="bg-indigo-50 border border-indigo-200 p-3 rounded-xl text-xs text-indigo-900 space-y-1">
                <span className="font-bold block">Sistem Role-Based Access Control (RBAC)</span>
                <p>Setiap role membatasi menu yang muncul di navigasi header dan mobile bottom bar secara otomatis.</p>
              </div>

              <div className="space-y-3 text-xs">
                {/* Operator */}
                <div className="border border-slate-200 rounded-xl p-3.5 bg-white space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full text-xs">
                      Role: OPERATOR
                    </span>
                    <span className="text-slate-500 font-mono text-[11px]">Login: operator / operator123</span>
                  </div>
                  <p className="text-slate-600">
                    Akses fokus operasional sederhana. Hanya dapat membuka menu <strong>Kamera (Mulai Rekam)</strong> dan <strong>Log Order</strong>.
                  </p>
                  <div className="flex space-x-1.5 font-mono text-[11px]">
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-semibold">Kamera</span>
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-semibold">Log Order</span>
                    <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-400 line-through">Analitik</span>
                    <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-400 line-through">Anomali</span>
                    <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-400 line-through">Settings</span>
                  </div>
                </div>

                {/* Admin */}
                <div className="border border-slate-200 rounded-xl p-3.5 bg-white space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="bg-blue-100 text-blue-800 font-bold px-2.5 py-0.5 rounded-full text-xs">
                      Role: ADMIN / SUPERVISOR
                    </span>
                    <span className="text-slate-500 font-mono text-[11px]">Login: admin / admin123</span>
                  </div>
                  <p className="text-slate-600">
                    Akses pengawasan gudang. Diberikan menu <strong>Kamera</strong>, <strong>Log Order</strong>, <strong>Analitik</strong>, dan <strong>Anomali</strong>.
                  </p>
                  <div className="flex space-x-1.5 font-mono text-[11px]">
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-semibold">Kamera</span>
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-semibold">Log Order</span>
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-semibold">Analitik</span>
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-semibold">Anomali</span>
                    <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-400 line-through">Settings</span>
                  </div>
                </div>

                {/* Developer */}
                <div className="border border-slate-200 rounded-xl p-3.5 bg-white space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="bg-purple-100 text-purple-800 font-bold px-2.5 py-0.5 rounded-full text-xs">
                      Role: DEVELOPER
                    </span>
                    <span className="text-slate-500 font-mono text-[11px]">Login: developer / dev123</span>
                  </div>
                  <p className="text-slate-600">
                    Akses penuh (Full Access). Memiliki seluruh menu termasuk <strong>Cloudflare R2 & Supabase Settings</strong> dan <strong>SQL Editor</strong>.
                  </p>
                  <div className="flex space-x-1.5 font-mono text-[11px]">
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-semibold">Kamera</span>
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-semibold">Log Order</span>
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-semibold">Analitik</span>
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-semibold">Anomali</span>
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-semibold">Settings & SQL</span>
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs text-slate-500">
            {isExecuted && (
              <span className="text-emerald-600 font-semibold flex items-center space-x-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>Simulasi DDL Berhasil Dijalankan</span>
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleSimulateExecute}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center space-x-1.5 transition-all shadow-xs"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Jalankan Inisialisasi</span>
            </button>
            <button
              onClick={onClose}
              className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold px-4 py-2 rounded-xl text-xs transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
