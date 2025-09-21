export interface Admin {
  id: number;
  username: string;
  createdAt: string;
}

export interface Tenant {
  id: number;
  name: string;
  email: string;
  phone: string;
  unit_number: string;
  plan_type: 'Basic' | 'Standard' | 'Premium';
  speed_range: string;
  rate_per_gb: number;
  data_usage: number;
  current_bill: number;
  payment_status: 'current' | 'pending' | 'overdue';
  connection_status: 'online' | 'offline';
  created_at: string;
}

export interface BillingRecord {
  id: number;
  tenant_id: number;
  tenant_name?: string;
  tenant_email?: string;
  unit_number?: string;
  plan_type?: string;
  billing_month: string;
  data_consumed: number;
  rate_per_gb: number;
  usage_charges: number;
  gst_amount: number;
  total_amount: number;
  payment_status: 'pending' | 'paid' | 'overdue';
  payment_date?: string;
  created_at: string;
}

export interface NetworkSession {
  id: number;
  tenant_id: number;
  tenant_name?: string;
  unit_number?: string;
  plan_type?: string;
  device_mac: string;
  device_ip: string;
  session_start: string;
  session_end?: string;
  data_uploaded: number;
  data_downloaded: number;
  total_data?: number;
  is_active: boolean;
  duration?: number;
}

export interface NetworkStats {
  activeConnections: number;
  totalBandwidth: {
    total_data: number;
    total_uploaded: number;
    total_downloaded: number;
  };
  networkLoad: number;
  tenantStats: Array<{
    plan_type: string;
    active_tenants: number;
    total_usage: number;
  }>;
  hourlyUsage: Array<{
    hour: string;
    data_usage: number;
    unique_users: number;
  }>;
  performance: {
    latency: number;
    packetLoss: string;
    uptime: number;
  };
}

export interface BillingOverview {
  overview: {
    total_bills: number;
    paid_bills: number;
    pending_bills: number;
    overdue_bills: number;
    total_revenue: number;
    collected_revenue: number;
    pending_revenue: number;
  };
  monthlyTrend: Array<{
    month: string;
    revenue: number;
    total_data: number;
  }>;
}

export interface TenantStats {
  stats: {
    total_tenants: number;
    active_connections: number;
    overdue_accounts: number;
    avg_usage: number;
    total_revenue: number;
  };
  planDistribution: Array<{
    plan_type: string;
    count: number;
  }>;
}

export interface Building {
  id: number;
  name: string;
  units: number;
  isolated: number;
  percentage: number;
}

export interface IsolationStatus {
  buildings: Building[];
  summary: {
    totalUnits: number;
    totalIsolated: number;
    percentage: number;
    status: 'Excellent' | 'Good' | 'Fair';
  };
}
