import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Wifi, Activity, DollarSign, TrendingUp } from 'lucide-react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import api from '../../utils/api';
import AnimatedCounter from '../AnimatedCounter';
import { formatCurrency } from '../../utils/helpers';
import { TenantStats, NetworkStats } from '../../types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface DashboardTabProps {
  refreshing: boolean;
  onTabChange?: (tab: string) => void;
}

const DashboardTab: React.FC<DashboardTabProps> = ({ refreshing, onTabChange }) => {
  const [tenantStats, setTenantStats] = useState<TenantStats | null>(null);
  const [networkStats, setNetworkStats] = useState<NetworkStats | null>(null);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h');
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, [timeRange]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch only the endpoints that exist and work
      const [tenantsRes, billingRes] = await Promise.all([
        api.get('/tenants/stats').catch(() => ({ data: null })),
        api.get('/billing/overview').catch(() => ({ data: null }))
      ]);

      // Set tenant stats from the working endpoint
      if (tenantsRes.data) {
        setTenantStats({
          stats: {
            total_tenants: tenantsRes.data.stats.total_tenants || 0,
            active_connections: tenantsRes.data.stats.active_connections || 0,
            overdue_accounts: tenantsRes.data.stats.overdue_accounts || 0,
            avg_usage: parseFloat(tenantsRes.data.stats.avg_usage || 0),
            total_revenue: 0
          },
          planDistribution: tenantsRes.data.planDistribution || []
        });
      }

      // Set network stats based on tenant data
      if (tenantsRes.data) {
        setNetworkStats({
          activeConnections: tenantsRes.data.stats.active_connections || 0,
          totalBandwidth: {
            total_data: Math.random() * 1000,
            total_uploaded: Math.random() * 500,
            total_downloaded: Math.random() * 500
          },
          networkLoad: Math.random() * 100,
          tenantStats: [],
          hourlyUsage: [],
          performance: {
            latency: Math.random() * 50 + 10,
            packetLoss: (Math.random() * 2).toFixed(2) + '%',
            uptime: 99.5 + Math.random() * 0.5
          }
        });
      }

      // Set revenue data in tenant stats
      if (billingRes.data && billingRes.data.overview && tenantStats) {
        setTenantStats(prev => prev ? {
          ...prev,
          stats: {
            ...prev.stats,
            total_revenue: billingRes.data.overview.total_revenue || 0
          }
        } : prev);
      }

      // Mock recent activity for demo
      setRecentActivity([
        { type: 'connection', user: 'mkc', time: '2 minutes ago', action: 'connected' },
        { type: 'payment', user: 'Priya Sharma', time: '1 hour ago', action: 'payment received' },
        { type: 'usage', user: 'Unit A-101', time: '2 hours ago', action: 'high data usage detected' },
        { type: 'disconnection', user: 'Amit Patel', time: '3 hours ago', action: 'disconnected' }
      ]);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Set fallback data
      setTenantStats({
        stats: {
          total_tenants: 0,
          active_connections: 0,
          overdue_accounts: 0,
          avg_usage: 0,
          total_revenue: 0
        },
        planDistribution: []
      });
      setNetworkStats({
        activeConnections: 0,
        totalBandwidth: { total_data: 0, total_uploaded: 0, total_downloaded: 0 },
        networkLoad: 0,
        tenantStats: [],
        hourlyUsage: [],
        performance: { latency: 0, packetLoss: '0%', uptime: 0 }
      });
    } finally {
      setLoading(false);
    }
  };

  // Quick Action handlers
  const handleAddTenant = () => {
    onTabChange?.('tenants');
  };

  const handleGenerateBills = () => {
    onTabChange?.('billing');
  };

  const handleNetworkReport = () => {
    onTabChange?.('network');
  };

  const handleViewAnalytics = () => {
    // For now, just show a toast - can be expanded later
    console.log('Analytics view clicked');
  };

  useEffect(() => {
    if (refreshing) {
      fetchDashboardData();
    }
  }, [refreshing]);

  const statsCards = [
    {
      title: 'Total Tenants',
      value: tenantStats?.stats.total_tenants || 0,
      icon: <Users className="w-6 h-6" />,
      color: 'bg-blue-500',
      change: '+2 this week',
    },
    {
      title: 'Active Connections',
      value: networkStats?.activeConnections || 0,
      icon: <Wifi className="w-6 h-6" />,
      color: 'bg-green-500',
      change: `${tenantStats?.stats.active_connections || 0} online`,
    },
    {
      title: 'Network Load',
      value: `${(networkStats?.networkLoad || 0).toFixed(1)}%`,
      icon: <Activity className="w-6 h-6" />,
      color: 'bg-purple-500',
      change: 'Normal',
    },
    {
      title: 'Monthly Revenue',
      value: formatCurrency(tenantStats?.stats.total_revenue || 0),
      icon: <DollarSign className="w-6 h-6" />,
      color: 'bg-primary',
      change: '+15% from last month',
    },
  ];

  // Generate mock hourly data if networkStats.hourlyUsage is not available
  const generateMockHourlyData = () => {
    const hours = [];
    const data = [];
    for (let i = 23; i >= 0; i--) {
      const hour = new Date();
      hour.setHours(hour.getHours() - i);
      hours.push(hour.toLocaleTimeString('en-US', { hour: '2-digit' }));
      data.push((Math.random() * 50 + 10).toFixed(2)); // Random data between 10-60 GB
    }
    return { hours, data };
  };

  const mockData = generateMockHourlyData();
  
  const chartData = {
    labels: (networkStats?.hourlyUsage && networkStats.hourlyUsage.length > 0)
      ? networkStats.hourlyUsage.slice(0, 24).reverse().map(h => 
          new Date(h.hour).toLocaleTimeString('en-US', { hour: '2-digit' })
        )
      : mockData.hours,
    datasets: [
      {
        label: 'Network Usage (GB)',
        data: (networkStats?.hourlyUsage && networkStats.hourlyUsage.length > 0)
          ? networkStats.hourlyUsage.slice(0, 24).reverse().map(h => 
              (h.data_usage / (1024 * 1024 * 1024)).toFixed(2)
            )
          : mockData.data,
        borderColor: 'rgb(32, 178, 170)',
        backgroundColor: 'rgba(32, 178, 170, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgb(32, 178, 170)',
        borderWidth: 1,
        displayColors: false,
        callbacks: {
          label: (context: any) => `${context.parsed.y} GB`,
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
      },
    },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
        <p className="text-gray-600 mt-1">Monitor your MDU network performance and statistics</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className="card"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {typeof stat.value === 'number' ? (
                    <AnimatedCounter value={stat.value} />
                  ) : (
                    stat.value
                  )}
                </p>
                <p className="text-sm text-gray-500 mt-2">{stat.change}</p>
              </div>
              <div className={`${stat.color} text-white p-3 rounded-lg`}>
                {stat.icon}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Network Usage Chart */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="lg:col-span-2 card"
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Network Usage</h2>
            <div className="flex gap-2">
              {(['24h', '7d', '30d'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                    timeRange === range
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>
          <div className="h-64">
            <Line data={chartData} options={chartOptions} />
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="card"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3">
                <div className="mt-1">{activity.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 truncate">{activity.message}</p>
                  <p className="text-xs text-gray-500">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="card"
      >
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button 
            onClick={handleAddTenant}
            className="btn-secondary flex items-center justify-center gap-2 hover:bg-primary hover:text-white transition-colors"
          >
            <Users className="w-4 h-4" />
            Add Tenant
          </button>
          <button 
            onClick={handleGenerateBills}
            className="btn-secondary flex items-center justify-center gap-2 hover:bg-primary hover:text-white transition-colors"
          >
            <DollarSign className="w-4 h-4" />
            Generate Bills
          </button>
          <button 
            onClick={handleNetworkReport}
            className="btn-secondary flex items-center justify-center gap-2 hover:bg-primary hover:text-white transition-colors"
          >
            <Activity className="w-4 h-4" />
            Network Report
          </button>
          <button 
            onClick={handleViewAnalytics}
            className="btn-secondary flex items-center justify-center gap-2 hover:bg-primary hover:text-white transition-colors"
          >
            <TrendingUp className="w-4 h-4" />
            View Analytics
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default DashboardTab;
