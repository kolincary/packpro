import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Fingerprint, Check, X, Shield, Trash2, Key, AlertCircle, Plus, Users, ShieldCheck } from 'lucide-react';
import { PasskeyUser } from '../types';
import { UserAvatar } from './UserAvatar';

interface BiometricSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: {
    id: string;
    username: string;
    fullName: string;
    role: 'operator' | 'admin' | 'developer';
    station: string;
    avatar: string;
  };
  registeredPasskeys: PasskeyUser[];
  onRegisterPasskey: (id: string) => void;
  onUnregisterPasskey: (id: string) => void;
  onAddPasskeyUser: (name: string, role: 'operator' | 'admin' | 'developer', station: string) => void;
  onDeletePasskeyUser: (id: string) => void;
  showToast: (msg: string) => void;
}

export const BiometricSetupModal: React.FC<BiometricSetupModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  registeredPasskeys,
  onRegisterPasskey,
  onUnregisterPasskey,
  onAddPasskeyUser,
  onDeletePasskeyUser,
  showToast,
}) => {
  // Local state for adding user
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<'operator' | 'admin' | 'developer'>('operator');

  // Scanning simulation states
  const [scanningUser, setScanningUser] = useState<PasskeyUser | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatus, setScanStatus] = useState('');

  // Confirmation state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleStartRegister = (user: PasskeyUser) => {
    setScanningUser(user);
    setIsScanning(true);
    setScanProgress(0);
    setScanStatus('Menginisialisasi Enclave Keamanan...');

    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += 10;
      if (currentProgress > 100) currentProgress = 100;
      setScanProgress(currentProgress);

      if (currentProgress === 20) {
        setScanStatus('Mempersiapkan Pemindai Sidik Jari...');
      } else if (currentProgress === 50) {
        setScanStatus('Menganalisis Alur Sidik Jari...');
      } else if (currentProgress === 80) {
        setScanStatus('Menyimpan Pasangan Kunci Privat WebAuthn...');
      } else if (currentProgress === 100) {
        clearInterval(interval);
        setScanStatus('Registrasi Berhasil!');
        
        setTimeout(() => {
          onRegisterPasskey(user.id);
          setIsScanning(false);
          setScanningUser(null);
          showToast(`Passkey berhasil didaftarkan untuk ${user.name}!`);
        }, 800);
      }
    }, 120);
  };

  const handleAddNewUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim()) {
      showToast('Masukkan nama terlebih dahulu!');
      return;
    }
    
    // Check if name already exists
    const exists = registeredPasskeys.some(u => u.name.toLowerCase() === newUserName.trim().toLowerCase());
    if (exists) {
      showToast(`User dengan nama "${newUserName.trim()}" sudah terdaftar.`);
      return;
    }

    const defaultStation = newUserRole === 'operator' ? 'Stasiun 01' : newUserRole === 'admin' ? 'Pusat Kontrol' : 'System Ops Center';
    onAddPasskeyUser(newUserName.trim(), newUserRole, defaultStation);
    setNewUserName('');
  };

  const handleConfirmDelete = (id: string) => {
    onUnregisterPasskey(id);
    setConfirmDeleteId(null);
    showToast('Passkey berhasil dihapus.');
  };

  const handleFullDeleteUser = (id: string) => {
    onDeletePasskeyUser(id);
    showToast('Profil user berhasil dihapus.');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-white rounded-3xl p-6 max-w-2xl w-full border border-slate-200 shadow-2xl relative my-8"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isScanning}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3 pb-4 border-b border-slate-100 mb-5">
          <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Fingerprint className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-950">Multi-User Biometrik & Passkey</h3>
            <p className="text-xs text-slate-500">Daftarkan dan kelola satu passkey unik untuk masing-masing staff secara terpisah.</p>
          </div>
        </div>

        {/* Scanning Simulation overlay */}
        <AnimatePresence>
          {isScanning && scanningUser && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-5 bg-indigo-950 text-white rounded-2xl p-6 text-center space-y-4 shadow-inner"
            >
              <div className="relative flex items-center justify-center">
                <div className="h-16 w-16 rounded-full border-2 border-indigo-500 border-t-indigo-300 animate-spin flex items-center justify-center"></div>
                <div className="absolute">
                  <Fingerprint className="h-8 w-8 text-indigo-400 animate-pulse" />
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-indigo-200">
                  Pendaftaran Passkey: <span className="text-white font-bold">{scanningUser.name}</span>
                </p>
                <p className="text-sm font-bold text-white">{scanStatus}</p>
                <div className="max-w-xs mx-auto bg-indigo-900/40 h-2 rounded-full overflow-hidden mt-2">
                  <div
                    className="bg-indigo-400 h-full transition-all duration-150"
                    style={{ width: `${scanProgress}%` }}
                  ></div>
                </div>
                <span className="inline-block text-[10px] text-indigo-300 font-mono">{scanProgress}% Terenkripsi</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Left Column: Form Add User */}
          <div className="md:col-span-5 space-y-4">
            <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/60">
              <h4 className="text-xs font-bold text-slate-850 flex items-center space-x-1.5 mb-3 uppercase tracking-wider">
                <Plus className="w-4 h-4 text-indigo-600" />
                <span>Tambah Staff / User</span>
              </h4>

              <form onSubmit={handleAddNewUser} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600">Nama Lengkap Staff</label>
                  <input
                    type="text"
                    required
                    placeholder="Nama operator/staff..."
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600">Hak Akses / Peran</label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="operator">Operator (Hanya Kamera & Logs)</option>
                    <option value="admin">Admin (Kamera, Logs, Analytics, Anomaly)</option>
                    <option value="developer">Developer (Akses Sistem Penuh)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={isScanning}
                  className="w-full flex items-center justify-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 rounded-xl transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambahkan User</span>
                </button>
              </form>
            </div>

            <div className="bg-amber-50/50 border border-amber-100 p-4 rounded-2xl text-xs text-slate-600 space-y-2">
              <h5 className="font-bold text-amber-800 flex items-center space-x-1">
                <Shield className="w-3.5 h-3.5 text-amber-600" />
                <span>Aturan Passkey</span>
              </h5>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600 pl-0.5">
                <li>Setiap user hanya dapat memiliki maksimal 1 passkey aktif.</li>
                <li>Passkey mengidentifikasi perangkat secure enclave lokal Anda.</li>
                <li>Gunakan passkey untuk login instan tanpa mengetik sandi.</li>
              </ul>
            </div>
          </div>

          {/* Right Column: User Passkeys List */}
          <div className="md:col-span-7 flex flex-col min-h-[300px]">
            <h4 className="text-xs font-bold text-slate-800 flex items-center space-x-1.5 mb-2.5 uppercase tracking-wider">
              <Users className="w-4 h-4 text-slate-500" />
              <span>Daftar Passkey Semua Staff</span>
            </h4>

            <div className="flex-1 border border-slate-100 rounded-2xl overflow-hidden max-h-[350px] overflow-y-auto">
              {registeredPasskeys.length === 0 ? (
                <div className="p-8 text-center text-slate-400 space-y-1.5">
                  <Users className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="text-xs font-semibold">Belum ada staff terdaftar</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {registeredPasskeys.map((user) => {
                    const isCurrentUser = user.name.toLowerCase() === currentUser.fullName.toLowerCase();
                    const isCoreUser = ['pk-operator', 'pk-admin', 'pk-developer'].includes(user.id);
                    
                    return (
                      <div key={user.id} className={`p-3 flex items-center justify-between transition-colors ${
                        isCurrentUser ? 'bg-slate-50' : 'bg-white hover:bg-slate-50/40'
                      }`}>
                        <div className="flex items-center space-x-2.5 min-w-0 flex-1 mr-2">
                          <UserAvatar role={user.role} size="xs" />
                          <div className="min-w-0 text-left">
                            <div className="flex items-center space-x-1">
                              <span className="text-xs font-bold text-slate-900 truncate block max-w-[120px] sm:max-w-[150px]">
                                {user.name}
                              </span>
                              {isCurrentUser && (
                                <span className="bg-slate-200 text-slate-700 text-[8px] font-bold px-1.5 py-0.2 rounded-full uppercase shrink-0">
                                  Anda
                                </span>
                              )}
                            </div>
                            <div className="flex items-center space-x-1 mt-0.5">
                              <span className="text-[9px] uppercase font-bold text-slate-400">
                                {user.role}
                              </span>
                              <span className="text-slate-300">•</span>
                              <span className="text-[9px] font-mono text-slate-400 truncate">
                                {user.station}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Action buttons / Registration indicator */}
                        <div className="flex items-center space-x-1.5 shrink-0">
                          {user.isRegistered ? (
                            <div className="flex items-center space-x-1">
                              <span className="inline-flex items-center bg-emerald-50 text-emerald-700 border border-emerald-100 px-1.5 py-0.5 rounded-full text-[9px] font-bold">
                                <Check className="w-2.5 h-2.5 mr-0.5 text-emerald-600" />
                                Aktif
                              </span>
                              
                              {/* Option to confirm deleting this passkey */}
                              {confirmDeleteId === user.id ? (
                                <button
                                  onClick={() => handleConfirmDelete(user.id)}
                                  className="p-1 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition-colors"
                                  title="Konfirmasi Hapus Passkey"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => setConfirmDeleteId(user.id)}
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  title="Hapus Passkey"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={() => handleStartRegister(user)}
                              disabled={isScanning}
                              className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 hover:border-amber-300 rounded-lg text-[9.5px] font-bold flex items-center space-x-0.5 transition cursor-pointer"
                              title="Daftarkan sidik jari untuk staff ini"
                            >
                              <Fingerprint className="w-3 h-3 text-amber-600" />
                              <span>Daftar</span>
                            </button>
                          )}

                          {/* Delete custom user profile option if NOT a core default account */}
                          {!isCoreUser && (
                            <button
                              onClick={() => handleFullDeleteUser(user.id)}
                              disabled={isScanning}
                              className="p-1 text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="Hapus Profil Staff"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 pt-3 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            disabled={isScanning}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs px-4 py-2 rounded-xl transition-colors cursor-pointer"
          >
            Selesai & Tutup
          </button>
        </div>
      </motion.div>
    </div>
  );
};
