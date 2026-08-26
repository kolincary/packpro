import { PackingVideoLog, AnomalyNotification, CloudflareConfig, Operator, AnalyticsData, User } from '../types';

export const MOCK_USERS: User[] = [
  {
    id: 'user-op-1',
    username: 'operator',
    fullName: 'Operator',
    role: 'operator',
    station: 'Stasiun 01 (Utama)',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    allowedMenus: ['recorder', 'logs', 'indexeddb_manager'], // Kamera, Log Order & Manajer IndexedDB HP
  },
  {
    id: 'user-admin-1',
    username: 'admin',
    fullName: 'Admin',
    role: 'admin',
    station: 'Pusat Kontrol',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    allowedMenus: ['recorder', 'logs', 'analytics', 'anomalies', 'indexeddb_manager'], // Kamera, Log, Analitik, Anomali, IndexedDB
  },
  {
    id: 'user-dev-1',
    username: 'developer',
    fullName: 'Developer',
    role: 'developer',
    station: 'Dev System Ops',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80',
    allowedMenus: ['recorder', 'logs', 'analytics', 'anomalies', 'settings', 'sql_editor', 'indexeddb_manager'], // Semua Menu + SQL Editor + IndexedDB
  },
];

export const SUPABASE_SQL_SCHEMA = `-- =========================================================================
-- PACKGUARD PRO - SUPABASE POSTGRESQL SCHEMA DDL & RBAC SEED DATA
-- Copy & Paste script ini ke Supabase SQL Editor (https://supabase.com/dashboard)
-- =========================================================================

-- Enable Extension UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABEL ROLE AKSES (user_roles)
CREATE TABLE IF NOT EXISTS public.user_roles (
    role_name VARCHAR(20) PRIMARY KEY,
    display_name VARCHAR(50) NOT NULL,
    description TEXT,
    allowed_menus TEXT[] NOT NULL
);

-- 2. TABEL PENGGUNA (users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL REFERENCES public.user_roles(role_name) ON DELETE RESTRICT,
    station VARCHAR(50) DEFAULT 'Stasiun 01',
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABEL LOG PACKING VIDEO & METADATA (packing_logs)
CREATE TABLE IF NOT EXISTS public.packing_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id VARCHAR(50) NOT NULL,
    tracking_number VARCHAR(100) NOT NULL,
    sku VARCHAR(100),
    nama_barang TEXT,
    customer_name VARCHAR(100),
    courier VARCHAR(50),
    video_file_name TEXT NOT NULL,
    video_url TEXT,
    r2_storage_key TEXT NOT NULL,
    duration_seconds INT DEFAULT 0,
    file_size_mb NUMERIC(6,2) DEFAULT 0,
    operator_name VARCHAR(100),
    operator_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    packing_station VARCHAR(50),
    status VARCHAR(20) DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'uploading', 'failed', 'anomaly', 'pending')),
    anomaly_reason TEXT,
    anomaly_severity VARCHAR(20) CHECK (anomaly_severity IN ('low', 'medium', 'high', 'critical')),
    resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMPTZ,
    notes TEXT,
    is_offline_queued BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexing Cepat untuk Pencarian Resi & SKU di Supabase
CREATE INDEX IF NOT EXISTS idx_packing_logs_tracking ON public.packing_logs(tracking_number);
CREATE INDEX IF NOT EXISTS idx_packing_logs_order ON public.packing_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_packing_logs_sku ON public.packing_logs(sku);
CREATE INDEX IF NOT EXISTS idx_packing_logs_created ON public.packing_logs(created_at DESC);

-- 4. TABEL DETAIL BARANG PER PAKET (packing_items)
CREATE TABLE IF NOT EXISTS public.packing_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    packing_log_id UUID REFERENCES public.packing_logs(id) ON DELETE CASCADE,
    tracking_number VARCHAR(100),
    sku VARCHAR(100),
    name TEXT NOT NULL,
    quantity INT DEFAULT 1,
    verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABEL ANOMALI & WARNING PACKING (anomalies)
CREATE TABLE IF NOT EXISTS public.anomalies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    log_id UUID REFERENCES public.packing_logs(id) ON DELETE SET NULL,
    order_number VARCHAR(50) NOT NULL,
    tracking_number VARCHAR(100),
    type VARCHAR(50) NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    severity VARCHAR(20) DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),
    is_read BOOLEAN DEFAULT false,
    is_resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABEL CLOUDFLARE R2 BUCKET AUDIT LOG (r2_storage_audits)
CREATE TABLE IF NOT EXISTS public.r2_storage_audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bucket_name VARCHAR(100) DEFAULT 'packing-video',
    r2_storage_key TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    mime_type VARCHAR(50) DEFAULT 'video/mp4',
    uploaded_by VARCHAR(100),
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================================
-- INITIAL SEED DATA FOR ROLES & DEMO USERS
-- =========================================================================

-- Insert Roles
INSERT INTO public.user_roles (role_name, display_name, description, allowed_menus) VALUES
('operator', 'Operator Gudang', 'Hanya dapat merekam video packing dan melihat Log Order', ARRAY['recorder', 'logs']),
('admin', 'Supervisor Admin', 'Dapat merekam, mengecek log, melihat analitik & kelola anomali', ARRAY['recorder', 'logs', 'analytics', 'anomalies']),
('developer', 'System Developer', 'Akses penuh ke semua fitur, pengatur sistem R2 & SQL Editor', ARRAY['recorder', 'logs', 'analytics', 'anomalies', 'settings', 'sql_editor'])
ON CONFLICT (role_name) DO UPDATE SET allowed_menus = EXCLUDED.allowed_menus;

-- Insert Seed Users
INSERT INTO public.users (username, password_hash, full_name, role, station) VALUES
('operator', 'PackGuard#Op2026!', 'Operator', 'operator', 'Stasiun 01 (Utama)'),
('admin', 'PackGuard#Admin2026!', 'Admin', 'admin', 'Pusat Kontrol'),
('developer', 'PackGuard#Dev2026!', 'Developer', 'developer', 'Dev System Ops')
ON CONFLICT (username) DO NOTHING;

-- RLS (Row Level Security) Policies Example for Supabase
ALTER TABLE public.packing_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read Access" ON public.packing_logs FOR SELECT USING (true);
CREATE POLICY "Authenticated Insert" ON public.packing_logs FOR INSERT WITH CHECK (true);
`;

export const INITIAL_CONFIG: CloudflareConfig = {
  accountId: 'd89c44120fd91b332dd07d4527d69ade',
  r2BucketName: 'packing-video',
  r2AccessKeyId: '3ee23b57c409595f1c26f7ae30cc86b6',
  r2SecretKey: 'cbc1ddc8e0ec83688e9a43c1afe66f8474ade4fc573c8ce7a05de34468392577',
  d1DatabaseId: 'db-a92c-4701-9981-d108f921a91e',
  supabaseUrl: 'https://zyhkgasqwcmpxydndbzw.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5aGtnYXNxd2NtcHh5ZG5kYnp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDk4NTYwMDAsImV4cCI6MjAyNTQzMjAwMH0.sampleKeyHash',
  useSimulatedCloud: false,
  autoUpload: true,
  maxVideoDurationMinutes: 10,
  pushNotificationsEnabled: true,
  storageLimitGB: 50,
};

export const INITIAL_OPERATORS: Operator[] = [
  { id: 'op-1', name: 'Operator 01', station: 'Stasiun 01 (Utama)', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80', isOnline: true },
  { id: 'op-2', name: 'Operator 02', station: 'Stasiun 02 (Fragile)', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80', isOnline: true },
  { id: 'op-3', name: 'Operator 03', station: 'Stasiun 03 (Express)', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80', isOnline: false },
];

export const MOCK_PENDING_ORDERS = [
  {
    orderNumber: 'ORD-88391',
    trackingNumber: 'SPX9918231',
    sku: 'CAM-SONY-A6400',
    namaBarang: 'Kamera Mirrorless Sony A6400 Body',
    customerName: 'Dewi Lestari',
    courier: 'ShopeeXpress',
    items: [
      { id: 'i-1', name: 'Kamera Mirrorless Sony A6400', sku: 'CAM-SONY-A6400', quantity: 1, verified: false },
      { id: 'i-2', name: 'Lensa 35mm f/1.8', sku: 'LNS-SONY-35MM', quantity: 1, verified: false }
    ]
  },
  {
    orderNumber: 'ORD-88392',
    trackingNumber: 'SPX12345',
    sku: 'WCH-AMZ-GTR4',
    namaBarang: 'Smartwatch Amazfit GTR 4 Black Edition',
    customerName: 'Rian Hidayat',
    courier: 'ShopeeXpress',
    items: [
      { id: 'i-3', name: 'Smartwatch Amazfit GTR 4', sku: 'WCH-AMZ-GTR4', quantity: 1, verified: false },
      { id: 'i-4', name: 'Screen Protector Tempered', sku: 'ACC-SCR-GTR4', quantity: 2, verified: false }
    ]
  },
  {
    orderNumber: 'ORD-88393',
    trackingNumber: 'JNE8820391',
    sku: 'AUD-BOSE-QC45',
    namaBarang: 'Headphone Wireless Bose QC45 Noise Cancelling',
    customerName: 'Maya Indah',
    courier: 'JNE YES',
    items: [
      { id: 'i-5', name: 'Headphone Wireless Bose QC45', sku: 'AUD-BOSE-QC45', quantity: 1, verified: false }
    ]
  },
  {
    orderNumber: 'ORD-88394',
    trackingNumber: 'SCP2991022',
    sku: 'KEY-KC-K2V2',
    namaBarang: 'Mechanical Keyboard Keychron K2 V2 Wireless',
    customerName: 'Bambang Tri',
    courier: 'SiCepat Halu',
    items: [
      { id: 'i-6', name: 'Mechanical Keyboard Keychron K2', sku: 'KEY-KC-K2V2', quantity: 1, verified: false },
      { id: 'i-7', name: 'Custom Coiled Cable Type-C', sku: 'ACC-CBL-TYPC', quantity: 1, verified: false }
    ]
  }
];

export const INITIAL_LOGS: PackingVideoLog[] = [];

export const INITIAL_ANOMALIES: AnomalyNotification[] = [];

export const INITIAL_ANALYTICS: AnalyticsData = {
  date: '2026-08-04',
  totalPackedToday: 48,
  totalStorageMB: 1420,
  avgPackingDurationSec: 94,
  anomalyRatePercent: 4.1,
  onTimeRatePercent: 98.2,
  hourlyStats: [
    { hour: '07:00', count: 12, anomalies: 1 },
    { hour: '08:00', count: 18, anomalies: 1 },
    { hour: '09:00', count: 15, anomalies: 0 },
    { hour: '10:00', count: 3, anomalies: 0 },
    { hour: '11:00', count: 0, anomalies: 0 },
    { hour: '12:00', count: 0, anomalies: 0 },
    { hour: '13:00', count: 0, anomalies: 0 },
    { hour: '14:00', count: 0, anomalies: 0 },
    { hour: '15:00', count: 0, anomalies: 0 },
    { hour: '16:00', count: 0, anomalies: 0 }
  ],
  operatorStats: [
    { name: 'Operator 1', count: 22, avgTimeSeconds: 88, anomalyCount: 0 },
    { name: 'Operator 2', count: 18, avgTimeSeconds: 102, anomalyCount: 1 },
    { name: 'Operator 3', count: 8, avgTimeSeconds: 76, anomalyCount: 1 }
  ],
  courierStats: [
    { courier: 'J&T Express', count: 18, color: '#EF4444' },
    { courier: 'SiCepat', count: 14, color: '#F59E0B' },
    { courier: 'JNE Express', count: 9, color: '#3B82F6' },
    { courier: 'ShopeeXpress', count: 7, color: '#F97316' }
  ]
};
