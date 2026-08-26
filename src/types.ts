export type UserRole = 'operator' | 'admin' | 'developer';

export interface User {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  station: string;
  avatar: string;
  allowedMenus: string[];
}

export type PackingStatus = 'uploaded' | 'uploading' | 'failed' | 'anomaly' | 'pending';

export type AnomalyType = 
  | 'upload_failed' 
  | 'short_video' 
  | 'missing_checklist' 
  | 'network_timeout' 
  | 'ai_flagged'
  | 'unsealed_box'
  | 'corrupted_file';

export interface PackingItem {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  verified: boolean;
}

export interface PackingChecklist {
  itemsChecked: boolean;
  bubbleWrapped: boolean;
  labelAttached: boolean;
  outerBoxSealed: boolean;
  fragileSticker: boolean;
}

export interface PasskeyUser {
  id: string;
  name: string;
  role: 'operator' | 'admin' | 'developer';
  isRegistered: boolean;
  station: string;
  registeredAt?: string;
}

/**
  * Supabase PostgreSQL Record Schema:
  * order_id, tracking_number, sku, nama_barang, packer, packing_station, 
  * video_url, video_size, duration, upload_status, created_at
  */
export interface SupabaseMetadata {
  order_id: string;
  tracking_number: string;
  sku: string;
  nama_barang: string;
  customer_name?: string;
  courier?: string;
  packer: string;
  packing_station: string;
  video_url: string;
  video_size: number; // in MB
  duration: number; // in seconds
  upload_status: 'pending' | 'uploaded' | 'failed';
  created_at: string;
  supabase_id?: string;
}

export interface PackingVideoLog {
  id: string;
  orderNumber: string; // mapped to order_id
  trackingNumber: string; // mapped to tracking_number
  sku: string; // mapped to sku
  namaBarang: string; // mapped to nama_barang
  customerName: string;
  courier: string;
  videoFileName: string; // e.g. SPX12345_20260804_082240.mp4
  videoUrl: string; // video_url
  r2StorageKey: string; // packing-video/2026/08/04/SPX12345/video.mp4
  d1RecordId: string; // mapped to supabase_id / record_id
  timestamp: string; // created_at
  durationSeconds: number; // duration
  fileSizeMB: number; // video_size
  operatorName: string; // packer
  packingStation: string; // packing_station
  checklist: PackingChecklist;
  items: PackingItem[];
  status: PackingStatus; // upload_status
  anomalyReason?: string;
  anomalySeverity?: 'low' | 'medium' | 'high' | 'critical';
  resolved?: boolean;
  resolvedAt?: string;
  notes?: string;
  createdAt?: string;
  isOfflineQueued?: boolean;
}

export interface OfflineQueueItem {
  id: string;
  orderId: string;
  trackingNumber: string;
  sku: string;
  namaBarang: string;
  customerName: string;
  courier: string;
  packer: string;
  packingStation: string;
  durationSeconds: number;
  fileSizeMB: number;
  videoFileName: string;
  r2StorageKey: string;
  videoBlob: Blob;
  createdAt: string;
  retryCount: number;
  status: 'pending' | 'uploading' | 'failed';
  errorMessage?: string;
}

export interface AnomalyNotification {
  id: string;
  logId?: string;
  orderNumber: string;
  timestamp: string;
  type: AnomalyType;
  title: string;
  message: string;
  severity: 'warning' | 'critical' | 'info';
  read: boolean;
  resolved: boolean;
}

export interface CloudflareConfig {
  accountId: string;
  r2BucketName: string;
  r2AccessKeyId: string;
  r2SecretKey: string;
  d1DatabaseId: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  useSimulatedCloud: boolean;
  autoUpload: boolean;
  maxVideoDurationMinutes: number;
  pushNotificationsEnabled: boolean;
  storageLimitGB: number;
}

export interface Operator {
  id: string;
  name: string;
  station: string;
  avatar: string;
  isOnline: boolean;
}

export interface HourlyStat {
  hour: string;
  count: number;
  anomalies: number;
}

export interface OperatorStat {
  name: string;
  count: number;
  avgTimeSeconds: number;
  anomalyCount: number;
}

export interface CourierStat {
  courier: string;
  count: number;
  color: string;
}

export interface AnalyticsData {
  date: string;
  totalPackedToday: number;
  totalStorageMB: number;
  avgPackingDurationSec: number;
  anomalyRatePercent: number;
  onTimeRatePercent: number;
  hourlyStats: HourlyStat[];
  operatorStats: OperatorStat[];
  courierStats: CourierStat[];
}

export type SubscriptionPlanId = 'starter_trial' | 'pro_seller' | 'mega_warehouse' | 'enterprise_corporate';

export interface SubscriptionPlan {
  id: SubscriptionPlanId;
  name: string;
  priceFormatted: string;
  priceMonthly: number;
  monthlyResiLimit: number;
  monthlyResiLimitFormatted: string;
  isPopular?: boolean;
  tag?: string;
  features: string[];
}


