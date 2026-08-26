import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area 
} from 'recharts';
import { Package, Clock, HardDrive, ShieldAlert, TrendingUp, Download, UserCheck, Truck } from 'lucide-react';
import { AnalyticsData } from '../types';

interface AnalyticsDashboardProps {
  analytics: AnalyticsData;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ analytics }) => {
  const exportCSV = () => {
    const csvRows = [
      ['Jam', 'Jumlah Packing', 'Anomali'],
      ...analytics.hourlyStats.map((h) => [h.hour, h.count, h.anomalies]),
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Laporan_Packing_${analytics.date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 text-white pb-24 md:pb-10">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 p-4 rounded-2xl shadow-sm text-slate-900">
        <div>
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            <h1 className="text-lg font-bold text-slate-900">Dashboard Analitik Performa Pengiriman Harian</h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Pantau throughput packing real-time, kecepatan operator, dan tingkat anomali pengiriman.
          </p>
        </div>

        <button
          onClick={exportCSV}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-4 py-2 rounded-xl flex items-center space-x-2 shadow-sm transition-all self-start md:self-auto"
        >
          <Download className="w-4 h-4" />
          <span>Ekspor Laporan Lini Packing (CSV)</span>
        </button>
      </div>

      {/* KPI Stats Cards (4 grid items) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Total Packed */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between text-slate-900">
          <div>
            <span className="text-xs text-slate-500 font-medium block">Total Dipack Hari Ini</span>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl font-extrabold text-slate-900">{analytics.totalPackedToday}</span>
              <span className="text-xs text-emerald-600 font-semibold">+12% vs kemarin</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Status D1 Index Terverifikasi</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Package className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 2: Avg Packing Duration */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between text-slate-900">
          <div>
            <span className="text-xs text-slate-500 font-medium block">Rata-rata Durasi Packing</span>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl font-extrabold text-slate-900">{analytics.avgPackingDurationSec}s</span>
              <span className="text-xs text-emerald-600 font-semibold">Cepat & Efisien</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">SOP Maksimal 3.0 Menit</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-cyan-50 border border-cyan-100 flex items-center justify-center text-cyan-600">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 3: Storage Volume */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between text-slate-900">
          <div>
            <span className="text-xs text-slate-500 font-medium block">Total Storage Video R2</span>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl font-extrabold text-slate-900">{(analytics.totalStorageMB / 1024).toFixed(2)} GB</span>
              <span className="text-xs text-slate-500 font-semibold">1,420 MB</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Kuota Terpakai 2.8% Dari 50 GB</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
            <HardDrive className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 4: Anomaly Rate */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between text-slate-900">
          <div>
            <span className="text-xs text-slate-500 font-medium block">Tingkat Anomali Unggahan</span>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl font-extrabold text-amber-600">{analytics.anomalyRatePercent}%</span>
              <span className="text-xs text-amber-600 font-semibold">2 Kasus Flagged</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Ambang Batas Aman &lt; 5.0%</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
            <ShieldAlert className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* CHARTS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Hourly Volume Chart (8 cols) */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4 text-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="font-bold text-sm text-slate-900">Grafik Volume Packing Per Jam</h2>
              <p className="text-xs text-slate-500">Distribusi jumlah video terunggah per rentang jam operasional</p>
            </div>
            <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg font-mono border border-slate-200">Hari Ini</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics.hourlyStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.7}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="hour" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', fontSize: '12px', color: '#0f172a' }}
                  itemStyle={{ color: '#4f46e5' }}
                />
                <Area type="monotone" dataKey="count" name="Paket Dipack" stroke="#4f46e5" fillOpacity={1} fill="url(#colorCount)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Courier Distribution Donut Chart (4 cols) */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4 text-slate-900">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="font-bold text-sm text-slate-900">Distribusi Ekspedisi / Kurir</h2>
            <p className="text-xs text-slate-500">Persentase porsi pengiriman tiap mitra kurir</p>
          </div>

          <div className="h-48 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analytics.courierStats}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="count"
                  nameKey="courier"
                >
                  {analytics.courierStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', fontSize: '12px', color: '#0f172a' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {analytics.courierStats.map((c) => (
              <div key={c.courier} className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }}></span>
                <span className="text-slate-600 truncate">{c.courier}: <strong className="text-slate-900">{c.count}</strong></span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* OPERATOR EFFICIENCY TABLE */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4 text-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <UserCheck className="w-4 h-4 text-emerald-600" />
            <h2 className="font-bold text-sm text-slate-900">Performa & Kecepatan Operator Packing</h2>
          </div>
          <span className="text-xs text-slate-500">Diperbarui real-time dari log D1</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200 font-mono">
              <tr>
                <th className="px-4 py-2.5">Nama Operator</th>
                <th className="px-4 py-2.5">Jumlah Packing</th>
                <th className="px-4 py-2.5">Rata-rata Waktu / Paket</th>
                <th className="px-4 py-2.5">Kasus Anomali</th>
                <th className="px-4 py-2.5">Skor Efisiensi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {analytics.operatorStats.map((op) => (
                <tr key={op.name} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-semibold text-slate-900">{op.name}</td>
                  <td className="px-4 py-3 font-mono text-slate-800">{op.count} paket</td>
                  <td className="px-4 py-3 font-mono text-slate-800">{op.avgTimeSeconds} detik</td>
                  <td className="px-4 py-3">
                    {op.anomalyCount === 0 ? (
                      <span className="text-emerald-600 font-semibold">0 (Sempurna)</span>
                    ) : (
                      <span className="text-amber-600 font-semibold">{op.anomalyCount} kasus</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="w-32 bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                      <div
                        className="bg-emerald-500 h-full"
                        style={{ width: `${Math.max(30, 100 - op.anomalyCount * 15)}%` }}
                      ></div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
