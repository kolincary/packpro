import React, { useState } from 'react';
import { 
  ShieldCheck, User as UserIcon, Lock, KeyRound, CheckCircle2, 
  UserCheck, LogOut, Eye, EyeOff, Sparkles, AlertCircle, RefreshCw, X, ChevronRight, Globe
} from 'lucide-react';
import { User, UserRole } from '../types';
import { UserAvatar } from './UserAvatar';
import { performLogin } from '../lib/auth';
import { loginWithGoogleSupabase } from '../lib/supabaseClient';

interface LoginModalProps {
  isOpen: boolean;
  currentUser: User;
  onClose: () => void;
  onLogin: (user: User) => void;
  showToast: (msg: string) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  currentUser,
  onClose,
  onLogin,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<'google' | 'demo' | 'manual'>('google');
  const [username, setUsername] = useState(currentUser.username);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  // Real Supabase Google OAuth Login
  const handleGoogleLogin = async () => {
    try {
      setIsGoogleLoading(true);
      setErrorMsg('');
      await loginWithGoogleSupabase();
    } catch (err: any) {
      console.warn('Google OAuth Redirect Fallback:', err);
      setErrorMsg(err.message || 'Gagal terhubung ke Google OAuth. Menggunakan simulasi login Google...');
      setIsGoogleLoading(false);
    }
  };

  // Instant Simulated Google Login (Works offline or without Google Console setup)
  const handleSimulatedGoogleLogin = () => {
    setErrorMsg('');
    const googleMockUser: User = {
      id: 'google-user-' + Date.now(),
      username: 'operator.google',
      fullName: 'Operator Google',
      role: 'operator',
      station: 'Stasiun Packing 01',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      allowedMenus: ['recorder', 'logs', 'analytics', 'anomalies', 'settings', 'indexeddb_manager'],
    };
    onLogin(googleMockUser);
    showToast(`Login Google Berhasil! Selamat datang, ${googleMockUser.fullName}`);
    onClose();
  };

  // Preset Role Switcher
  const handleSelectPreset = async (role: UserRole) => {
    let presetPassword = '';
    if (role === 'operator') presetPassword = 'PackGuard#Op2026!';
    else if (role === 'admin') presetPassword = 'PackGuard#Admin2026!';
    else if (role === 'developer') presetPassword = 'PackGuard#Dev2026!';

    try {
      setErrorMsg('');
      setIsSubmitting(true);
      const user = await performLogin(role, presetPassword);
      setUsername(role);
      setPassword(presetPassword);
      onLogin(user);
      showToast(`Login Berhasil! Role: ${user.role.toUpperCase()} (${user.fullName})`);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal login preset.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Manual Form Login
  const handleCustomLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setErrorMsg('Silakan masukkan username Anda.');
      return;
    }
    try {
      setErrorMsg('');
      setIsSubmitting(true);
      const user = await performLogin(username, password);
      onLogin(user);
      showToast(`Selamat datang ${user.fullName}! (${user.role.toUpperCase()})`);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Username atau password tidak cocok.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto cursor-pointer"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-white border border-slate-200/80 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden space-y-0 text-slate-800 transition-all animate-scale-in cursor-default"
      >
        
        {/* HEADER WITH RICH GRADIENT & GLOW */}
        <div className="relative bg-gradient-to-r from-teal-900 via-slate-900 to-teal-950 text-white p-5 sm:p-6 flex items-center justify-between overflow-hidden">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-teal-500/20 rounded-full blur-2xl pointer-events-none"></div>
          
          <div className="flex items-center space-x-3.5 relative z-10">
            <div className="w-11 h-11 rounded-2xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300 shadow-md backdrop-blur-xs shrink-0">
              <ShieldCheck className="w-6 h-6 text-teal-400" />
            </div>
            <div>
              <h2 className="font-extrabold text-base sm:text-lg tracking-tight text-white leading-tight">
                Autentikasi & Akun
              </h2>
              <p className="text-xs text-teal-200/80 mt-0.5">
                Masuk via Google, Demo Role, atau Akun Manual
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all border border-white/20 cursor-pointer z-10 shrink-0"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">

          {/* CURRENT ACTIVE USER BANNER */}
          <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 flex items-center justify-between shadow-2xs">
            <div className="flex items-center space-x-3">
              <UserAvatar
                role={currentUser.role}
                size="md"
              />
              <div className="text-xs">
                <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block">Akun Aktif Sekarang</span>
                <span className="font-extrabold text-slate-900 block leading-tight text-xs sm:text-sm">{currentUser.fullName}</span>
                <span className="text-teal-700 font-mono font-bold text-[10px] uppercase">
                  Role: {currentUser.role} • {currentUser.station || 'Warehouse'}
                </span>
              </div>
            </div>
            <span className="bg-teal-50 text-teal-700 text-[10.5px] font-extrabold px-2.5 py-1 rounded-full border border-teal-200 flex items-center space-x-1 shrink-0">
              <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>
              <span>Aktif</span>
            </span>
          </div>

          {/* SEGMENTED TAB SWITCHER */}
          <div className="grid grid-cols-3 gap-1 bg-slate-100/80 p-1 rounded-2xl border border-slate-200/60 text-xs font-bold">
            <button
              type="button"
              onClick={() => { setActiveTab('google'); setErrorMsg(''); }}
              className={`py-2 px-1 rounded-xl transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                activeTab === 'google'
                  ? 'bg-white text-teal-800 shadow-sm border border-slate-200/80'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-teal-600 shrink-0" />
              <span>Google</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab('demo'); setErrorMsg(''); }}
              className={`py-2 px-1 rounded-xl transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                activeTab === 'demo'
                  ? 'bg-white text-teal-800 shadow-sm border border-slate-200/80'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span>Demo Role</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab('manual'); setErrorMsg(''); }}
              className={`py-2 px-1 rounded-xl transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                activeTab === 'manual'
                  ? 'bg-white text-teal-800 shadow-sm border border-slate-200/80'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5 text-slate-700 shrink-0" />
              <span>Manual</span>
            </button>
          </div>

          {/* TAB 1: GOOGLE OAUTH LOGIN */}
          {activeTab === 'google' && (
            <div className="space-y-3.5 pt-1">
              <div className="text-center space-y-1">
                <h3 className="font-bold text-slate-900 text-sm">Masuk Cepat dengan Akun Google</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Gunakan Single Sign-On (SSO) Supabase untuk otentikasi aman tanpa perlu mengingat kata sandi.
                </p>
              </div>

              {/* Main Google OAuth Button */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isGoogleLoading}
                className="w-full bg-white hover:bg-slate-50 text-slate-800 font-extrabold py-3 px-4 rounded-2xl text-xs sm:text-sm flex items-center justify-center space-x-3 transition-all border border-slate-300 shadow-sm hover:border-teal-500 hover:shadow-md active:scale-[0.98] cursor-pointer group"
              >
                <svg className="w-5 h-5 shrink-0 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>{isGoogleLoading ? 'Mengarahkan ke Google...' : 'Masuk dengan Google'}</span>
              </button>

              {/* Instant Demo Google Button */}
              <button
                type="button"
                onClick={handleSimulatedGoogleLogin}
                className="w-full bg-teal-50/80 hover:bg-teal-100/80 text-teal-800 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center space-x-2 transition-all border border-teal-200/80 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-teal-600 shrink-0 animate-pulse" />
                <span>Simulasi Login Google Demo (Instan)</span>
              </button>

              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 text-[11px] text-slate-500 space-y-1 text-center">
                <span className="font-semibold text-slate-700 block">Catatan Keamanan SSO:</span>
                <span>Data profil & email disinkronkan secara aman melalui enkripsi 256-bit Supabase Auth.</span>
              </div>
            </div>
          )}

          {/* TAB 2: DEMO ROLE PRESETS */}
          {activeTab === 'demo' && (
            <div className="space-y-3 pt-1">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>Pilih Akun Demo Berdasarkan Role:</span>
                <span className="text-[10px] text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200 font-mono font-semibold">1-Click Login</span>
              </label>

              <div className="grid grid-cols-1 gap-2.5">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleSelectPreset('operator')}
                  className={`p-3 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer group ${
                    currentUser.role === 'operator'
                      ? 'bg-emerald-50/90 border-emerald-300 ring-2 ring-emerald-500 shadow-xs'
                      : 'bg-white border-slate-200/90 hover:border-emerald-300 hover:bg-emerald-50/40'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 border border-emerald-200 text-emerald-700 font-bold flex items-center justify-center text-xs shrink-0 group-hover:scale-105 transition-transform">
                      OP
                    </div>
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="font-extrabold text-xs text-slate-900 block">Operator Warehouse</span>
                        {currentUser.role === 'operator' && <span className="text-[9px] bg-emerald-600 text-white font-bold px-1.5 py-0.2 rounded-full">Aktif</span>}
                      </div>
                      <span className="text-[11px] text-slate-500 block mt-0.5">Akses Perekaman Kamera & Log Order</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleSelectPreset('admin')}
                  className={`p-3 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer group ${
                    currentUser.role === 'admin'
                      ? 'bg-blue-50/90 border-blue-300 ring-2 ring-blue-500 shadow-xs'
                      : 'bg-white border-slate-200/90 hover:border-blue-300 hover:bg-blue-50/40'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-100 border border-blue-200 text-blue-700 font-bold flex items-center justify-center text-xs shrink-0 group-hover:scale-105 transition-transform">
                      AD
                    </div>
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="font-extrabold text-xs text-slate-900 block">Admin Gudang</span>
                        {currentUser.role === 'admin' && <span className="text-[9px] bg-blue-600 text-white font-bold px-1.5 py-0.2 rounded-full">Aktif</span>}
                      </div>
                      <span className="text-[11px] text-slate-500 block mt-0.5">Analitik Performa & Pusat Anomali</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleSelectPreset('developer')}
                  className={`p-3 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer group ${
                    currentUser.role === 'developer'
                      ? 'bg-purple-50/90 border-purple-300 ring-2 ring-purple-500 shadow-xs'
                      : 'bg-white border-slate-200/90 hover:border-purple-300 hover:bg-purple-50/40'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-100 border border-purple-200 text-purple-700 font-bold flex items-center justify-center text-xs shrink-0 group-hover:scale-105 transition-transform">
                      DEV
                    </div>
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="font-extrabold text-xs text-slate-900 block">Developer / System Admin</span>
                        {currentUser.role === 'developer' && <span className="text-[9px] bg-purple-600 text-white font-bold px-1.5 py-0.2 rounded-full">Aktif</span>}
                      </div>
                      <span className="text-[11px] text-slate-500 block mt-0.5">Akses Penuh + SQL Editor & IndexedDB Manager</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 transition-colors" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: MANUAL FORM LOGIN */}
          {activeTab === 'manual' && (
            <form onSubmit={handleCustomLogin} className="space-y-3.5 pt-1">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">Username</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs font-mono font-semibold focus:outline-none focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-600 transition-all"
                    placeholder="operator / admin / developer"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    name="user_auth_pin"
                    autoComplete="current-password"
                    data-lpignore="true"
                    data-1p-ignore="true"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-10 py-2.5 text-xs font-mono font-semibold focus:outline-none focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-600 transition-all"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 p-1"
                    title={showPassword ? 'Sembunyikan' : 'Tampilkan'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white font-extrabold py-3 rounded-2xl text-xs sm:text-sm flex items-center justify-center space-x-2 transition-all shadow-sm active:scale-[0.98] cursor-pointer mt-2"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Memverifikasi Akun...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Login Masuk Akun</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* ERROR ALERT BOX */}
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200/90 text-rose-700 text-xs flex items-start space-x-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="leading-tight font-medium">{errorMsg}</div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
