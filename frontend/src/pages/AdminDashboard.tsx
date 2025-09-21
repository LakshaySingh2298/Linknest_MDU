import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Wifi, LogOut, RefreshCw, Users, DollarSign, Activity, 
  Settings, Bell, AlertCircle, CheckCircle, WifiOff,
  TrendingUp, TrendingDown, Clock, Database, Shield
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../utils/api';
import DashboardTab from '../components/tabs/DashboardTab';
import TenantsTab from '../components/tabs/TenantsTab';
import BillingTab from '../components/tabs/BillingTab';
import NetworkTab from '../components/tabs/NetworkTab';
import NetworkControlTab from '../components/tabs/NetworkControlTab';
import SettingsTab from '../components/tabs/SettingsTab';

type TabType = 'dashboard' | 'tenants' | 'billing' | 'network' | 'network-control' | 'settings';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [adminInfo, setAdminInfo] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);
  const [stats, setStats] = useState({
    totalTenants: 0,
    activeTenants: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    activeConnections: 0,
    dataUsageToday: 0,
    systemHealth: 'operational',
    alerts: []
  });
  const [realtimeData, setRealtimeData] = useState<any[]>([]);

  useEffect(() => {
    fetchAdminInfo();
    fetchDashboardStats();
    setupWebSocket();

    // Refresh stats every 30 seconds
    const interval = setInterval(() => {
      fetchDashboardStats();
    }, 30000);

    return () => {
      clearInterval(interval);
      if (wsConnection) {
        wsConnection.close();
      }
    };
  }, []);

  const fetchAdminInfo = async () => {
    try {
      const response = await api.get('/auth/me');
      setAdminInfo(response.data.admin);
    } catch (error: any) {
      console.error('Error fetching admin info:', error);
      // If not authenticated, redirect to login
      if (error?.response?.status === 401) {
        navigate('/admin/login');
      }
    }
  };

  const fetchDashboardStats = async () => {
    try {
      const [tenants, billing, network] = await Promise.all([
        api.get('/tenants'),
        api.get('/billing/stats'),
        api.get('/network/stats')
      ]);

      setStats({
        totalTenants: tenants.data.total || 0,
        activeTenants: tenants.data.active || 0,
        totalRevenue: billing.data.totalRevenue || 0,
        monthlyRevenue: billing.data.monthlyRevenue || 0,
        activeConnections: network.data.activeConnections || 0,
        dataUsageToday: network.data.dataUsageToday || 0,
        systemHealth: network.data.systemHealth || 'operational',
        alerts: network.data.alerts || []
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    }
  };

  const setupWebSocket = () => {
    const ws = new WebSocket('ws://localhost:3000');
    
    ws.onopen = () => {
      console.log('WebSocket connected');
      ws.send(JSON.stringify({ type: 'subscribe', events: ['all'] }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleWebSocketMessage(data);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      // Reconnect after 5 seconds
      setTimeout(setupWebSocket, 5000);
    };

    setWsConnection(ws);
  };

  const handleWebSocketMessage = (data: any) => {
    switch (data.type) {
      case 'network_update':
        // Handle network updates
        break;
      case 'tenant_activity':
        if (data.data.event === 'connection_change') {
          toast.info(`Tenant ${data.data.status === 'online' ? 'connected' : 'disconnected'}`);
        }
        break;
      default:
        console.log('Received WebSocket message:', data);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    toast.success('Logged out successfully');
    navigate('/admin');
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    toast.info('Refreshing data...');
    
    // Trigger refresh in active tab
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setRefreshing(false);
    toast.success('Data refreshed');
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'tenants', label: 'Tenants' },
    { id: 'billing', label: 'Billing' },
    { id: 'network', label: 'Network' },
    { id: 'network-control', label: 'Speed Control' },
    { id: 'settings', label: 'Settings' },
  ];

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as TabType);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardTab refreshing={refreshing} onTabChange={handleTabChange} />;
      case 'tenants':
        return <TenantsTab refreshing={refreshing} />;
      case 'billing':
        return <BillingTab refreshing={refreshing} />;
      case 'network':
        return <NetworkTab refreshing={refreshing} />;
      case 'network-control':
        return <NetworkControlTab />;
      case 'settings':
        return <SettingsTab adminInfo={adminInfo} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Wifi className="w-8 h-8 text-primary mr-2" />
              <span className="text-2xl font-bold text-gray-900">LinkNest</span>
              <span className="ml-2 text-sm text-gray-500">MDU Controller</span>
            </div>

            {/* Navigation Tabs */}
            <nav className="hidden md:flex items-center space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`py-2 px-1 border-b-2 transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'border-primary text-primary font-medium'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-4">
              <button
                onClick={handleRefresh}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={refreshing}
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              
              {adminInfo && (
                <div className="hidden sm:flex items-center gap-2 text-sm text-gray-600">
                  <span>Welcome,</span>
                  <span className="font-medium">{adminInfo.username}</span>
                </div>
              )}
              
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>

          {/* Mobile Tabs */}
          <div className="md:hidden flex overflow-x-auto py-2 -mx-4 px-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`px-4 py-2 whitespace-nowrap text-sm font-medium rounded-lg mr-2 ${
                  activeTab === tab.id
                    ? 'bg-primary text-white'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="p-4 sm:p-6 lg:p-8"
        >
          {renderTabContent()}
        </motion.div>
      </main>
    </div>
  );
};

export default AdminDashboard;
