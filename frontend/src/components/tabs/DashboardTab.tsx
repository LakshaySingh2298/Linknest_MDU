import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Wifi, Activity, DollarSign, TrendingUp, AlertCircle, Clock, CheckCircle } from 'lucide-react';
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
import { formatCurrency, formatBytes } from '../../utils/helpers';
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
  const [liveConnections, setLiveConnections] = useState<any[]>([]);
  const [systemAlerts, setSystemAlerts] = useState<any[]>([]);
  const [revenueData, setRevenueData] = useState<any>(null);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, [timeRange]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [tenants, network, activity, connections, alerts, revenue] = await Promise.all([
        api.get('/tenants/stats'),
        api.get('/network/stats'),
        api.get('/activity/recent'),
        api.get('/network/connections'),
        api.get('/system/alerts'),
        api.get('/billing/revenue')
      ]);

      setTenantStats(tenants.data);
      setNetworkStats(network.data);
      setRecentActivity(activity.data || []);
      setLiveConnections(connections.data || []);
      setSystemAlerts(alerts.data || []);
      setRevenueData(revenue.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
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
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (refreshing) {
      fetchData();
    }
  }, [refreshing]);

  const fetchData = async () => {
    try {
      const [tenantsRes, networkRes] = await Promise.all([
        api.get('/tenants/stats'),
        api.get('/network/stats'),
      ]);

      setTenantStats(tenantsRes.data);
      setNetworkStats(networkRes.data);
      
      // Generate mock recent activity
      setRecentActivity([
        { id: 1, type: 'tenant_online', message: 'Rajesh Kumar connected', time: '2 minutes ago', icon: <CheckCircle className="w-4 h-4 text-green-500" /> },
        { id: 2, type: 'bill_paid', message: 'Payment received from Priya Sharma', time: '15 minutes ago', icon: <DollarSign className="w-4 h-4 text-blue-500" /> },
        { id: 3, type: 'high_usage', message: 'High data usage detected in Unit A-101', time: '1 hour ago', icon: <AlertCircle className="w-4 h-4 text-yellow-500" /> },
        { id: 4, type: 'tenant_offline', message: 'Amit Patel disconnected', time: '2 hours ago', icon: <Clock className="w-4 h-4 text-gray-500" /> },
      ]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

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
      value: `${networkStats?.networkLoad || 0}%`,
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
