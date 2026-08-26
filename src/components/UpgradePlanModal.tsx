import React, { useState } from 'react';
import { Check, Crown, Zap, Sparkles, CheckCircle2, ChevronLeft } from 'lucide-react';
import { SubscriptionPlan, SubscriptionPlanId } from '../types';

export const SAAS_PLANS: SubscriptionPlan[] = [
  {
    id: 'starter_trial',
    name: 'Starter Trial',
    priceFormatted: 'Rp 49.000',
    priceMonthly: 49000,
    monthlyResiLimit: 1000,
    monthlyResiLimitFormatted: '1.000 Resi / bulan',
    tag: 'STARTER',
    features: [
      'Durasi maks 5 Menit (Support Pretelan)',
      'Smart Compression 800 Kbps (~28-30MB)',
      'Masa simpan 30 Hari di Cloud',
      'Support via Email',
    ],
  },
  {
    id: 'pro_seller',
    name: 'Pro Seller',
    priceFormatted: 'Rp 750.000',
    priceMonthly: 750000,
    monthlyResiLimit: 30000,
    monthlyResiLimitFormatted: '30.000 Resi / bulan',
    isPopular: true,
    tag: 'PALING IDEAL',
    features: [
      'Durasi maks 5 Menit (Support Pretelan)',
      'Sistem Scan Batch Cepat',
      'Smart Compression 800 Kbps (~28-30MB)',
      'Masa simpan 30 Hari di Cloud',
      'Support via WhatsApp 24/7',
    ],
  },
  {
    id: 'mega_warehouse',
    name: 'Mega Warehouse',
    priceFormatted: 'Rp 3.500.000',
    priceMonthly: 3500000,
    monthlyResiLimit: 150000,
    monthlyResiLimitFormatted: '150.000 Resi / bulan',
    tag: 'SCALE UP',
    features: [
      'Durasi maks 5 Menit (Support Kartonan Besar)',
      'Offline Fallback System (Anti Down)',
      'Smart Compression 800 Kbps (~28-30MB)',
      'Masa simpan 30 Hari di Cloud',
      'Priority Support 24/7',
    ],
  },
  {
    id: 'enterprise_corporate',
    name: 'Enterprise Corporate',
    priceFormatted: 'Rp 18.000.000',
    priceMonthly: 18000000,
    monthlyResiLimit: 1000000,
    monthlyResiLimitFormatted: '1.000.000 Resi / bulan',
    tag: 'ENTERPRISE',
    features: [
      'Durasi maks 5 Menit (Support Kartonan Besar)',
      'Custom Watermark Toko & Logo Branding',
      'Smart Compression 800 Kbps (~28-30MB)',
      'Masa simpan 30 Hari di Cloud',
      'Dedicated Account Manager',
    ],
  },
];

interface UpgradePlanViewProps {
  isOpen?: boolean;
  onClose?: () => void;
  currentPlanId?: SubscriptionPlanId;
  onSelectPlan: (plan: SubscriptionPlan) => void;
  usedResiCount?: number;
  onBack?: () => void;
}

export const UpgradePlanView: React.FC<UpgradePlanViewProps> = ({
  currentPlanId = 'pro_seller',
  onSelectPlan,
  usedResiCount = 450,
  onBack,
  onClose,
}) => {
  const [selectedPlanId, setSelectedPlanId] = useState<SubscriptionPlanId>(currentPlanId);

  const activeSelectedPlan = SAAS_PLANS.find(p => p.id === selectedPlanId) || SAAS_PLANS[1];

  const handleConfirmUpgrade = () => {
    onSelectPlan(activeSelectedPlan);
    if (onBack) onBack();
    else if (onClose) onClose();
  };

  return (
    <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 text-slate-800 pb-24 md:pb-10 animate-fade-in">
      
      {/* TOP HERO HEADER WITH WAREHOUSE BACKGROUND ILLUSION */}
      <div className="relative bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white p-5 sm:p-8 rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm border border-blue-500/20">
        
        {/* Subtle Grid / Overlay Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:16px_16px] opacity-15 pointer-events-none"></div>

        {/* Floating Glow Accents */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="inline-flex items-center space-x-2 bg-blue-500/20 border border-blue-400/30 px-3 py-1 rounded-full text-blue-300 font-bold text-xs uppercase tracking-wider">
              <Crown className="w-4 h-4 text-amber-400" />
              <span>PACKGUARD SAAS SUBSCRIPTION PLANS</span>
            </div>
            {(onBack || onClose) && (
              <button
                type="button"
                onClick={onBack || onClose}
                className="text-xs font-bold text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 px-3.5 py-1.5 rounded-xl border border-white/20 transition-all flex items-center space-x-1.5 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Kembali</span>
              </button>
            )}
          </div>

          <h2 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
            Tingkatkan Kapasitas Rekam & Storage Warehouse
          </h2>

          {/* Quick Benefits Checklist */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 text-xs text-slate-200">
            <div className="flex items-center space-x-2 bg-white/5 p-2.5 rounded-xl border border-white/10">
              <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
              <span>Smart Compression 800 Kbps (~28-30 MB / 5 Min)</span>
            </div>
            <div className="flex items-center space-x-2 bg-white/5 p-2.5 rounded-xl border border-white/10">
              <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
              <span>Video Maksimal 5 Menit (Pretelan & Kartonan)</span>
            </div>
            <div className="flex items-center space-x-2 bg-white/5 p-2.5 rounded-xl border border-white/10">
              <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
              <span>Integrasi Cloudflare R2 + PostgreSQL Real-Time</span>
            </div>
            <div className="flex items-center space-x-2 bg-white/5 p-2.5 rounded-xl border border-white/10">
              <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
              <span>Masa Simpan Cloud 30 Hari & Backup Offline</span>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CARDS BODY */}
      <div className="p-4 sm:p-6 md:p-8 space-y-6 bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
          <div>
            <h3 className="font-bold text-base sm:text-lg text-slate-900">
              Pilihan Paket Langganan Warehouse
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Resi terpakai bulan ini: <strong className="text-slate-900 font-mono font-bold">{usedResiCount.toLocaleString('id-ID')} Resi</strong>
            </p>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold px-3.5 py-2 rounded-xl flex items-center space-x-2 shrink-0">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>Paket Aktif: <strong className="text-blue-700 font-mono uppercase">{currentPlanId.replace('_', ' ')}</strong></span>
          </div>
        </div>

        {/* 4 SAAS PLANS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {SAAS_PLANS.map((plan) => {
            const isSelected = plan.id === selectedPlanId;
            const isCurrent = plan.id === currentPlanId;

            return (
              <div
                key={plan.id}
                onClick={() => setSelectedPlanId(plan.id)}
                className={`relative p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-white border-blue-600 shadow-xl ring-2 ring-blue-500/20 scale-[1.02]'
                    : 'bg-white hover:bg-slate-50 border-slate-200/90 shadow-xs'
                }`}
              >
                {/* Popular Badge */}
                {plan.isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white font-extrabold text-[10px] uppercase tracking-wider px-3 py-0.5 rounded-full shadow-md">
                    {plan.tag}
                  </div>
                )}

                <div className="space-y-4">
                  {/* Header Card */}
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        {plan.tag || 'PACKAGE'}
                      </span>
                      <h4 className="font-bold text-base text-slate-900 leading-tight">
                        {plan.name}
                      </h4>
                    </div>
                    <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'border-slate-300 text-transparent'
                    }`}>
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  {/* Price Tag */}
                  <div className="pt-1">
                    <div className="flex items-baseline space-x-1">
                      <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                        {plan.priceFormatted}
                      </span>
                      <span className="text-xs font-semibold text-slate-500">/bln</span>
                    </div>
                    <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md inline-block mt-1 border border-blue-100">
                      {plan.monthlyResiLimitFormatted}
                    </span>
                  </div>

                  {/* Feature List */}
                  <ul className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                    {plan.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start space-x-2 text-slate-600">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                        <span className="leading-tight">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Card Select Indicator */}
                <div className="pt-5 mt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setSelectedPlanId(plan.id)}
                    className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                      isSelected
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {isCurrent && !isSelected ? (
                      <span>Paket Anda Saat Ini</span>
                    ) : isSelected ? (
                      <>
                        <Check className="w-4 h-4 text-white" />
                        <span>Pilihan Anda</span>
                      </>
                    ) : (
                      <span>Pilih Paket Ini</span>
                    )}
                  </button>
                </div>

              </div>
            );
          })}
        </div>

        {/* BOTTOM ACTIONS BAR */}
        <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="text-xs text-slate-500 font-semibold block">Paket Ditingkatkan ke:</span>
            <p className="text-sm font-extrabold text-slate-900 flex items-center space-x-2 mt-0.5">
              <span>{activeSelectedPlan.name}</span>
              <span className="text-blue-600 font-mono">({activeSelectedPlan.priceFormatted} / bulan)</span>
            </p>
          </div>

          <div className="flex space-x-3 w-full sm:w-auto">
            {(onBack || onClose) && (
              <button
                type="button"
                onClick={onBack || onClose}
                className="flex-1 sm:flex-none px-5 py-3 rounded-xl border border-slate-200 font-bold text-xs text-slate-700 bg-white hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Batal
              </button>
            )}
            <button
              type="button"
              onClick={handleConfirmUpgrade}
              className="flex-1 sm:flex-none px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs shadow-lg shadow-blue-600/20 transition-all cursor-pointer flex items-center justify-center space-x-2"
            >
              <Zap className="w-4 h-4" />
              <span>Konfirmasi Langganan Paket</span>
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};

export const UpgradePlanModal = UpgradePlanView;
