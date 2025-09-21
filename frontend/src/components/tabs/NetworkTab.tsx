import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Wifi, Activity, Shield, AlertTriangle, CheckCircle, Globe, Server, Users } from 'lucide-react';
import api from '../../utils/api';
import { NetworkStats, NetworkSession, IsolationStatus } from '../../types';
import { formatBytes, formatDateTime } from '../../utils/helpers';
import ProgressDonut from '../ProgressDonut';
import AnimatedCounter from '../AnimatedCounter';
import QoSManager from '../QoSManager';

interface NetworkTabProps {
  refreshing: boolean;
}

const NetworkTab: React.FC<NetworkTabProps> = ({ refreshing }) => {
  const [networkStats, setNetworkStats] = useState<NetworkStats | null>(null);
  const [sessions, setSessions] = useState<NetworkSession[]>([]);
  const [isolationStatus, setIsolationStatus] = useState<IsolationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'sessions' | 'isolation' | 'qos'>('overview');

  useEffect(() => {
    fetchNetworkData();
    const interval = setInterval(fetchNetworkData, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (refreshing) {
      fetchNetworkData();
    }
  }, [refreshing]);

  const fetchNetworkData = async () => {
    try {
      const [statsRes, sessionsRes, isolationRes] = await Promise.all([
        api.get('/network/stats'),
        api.get('/network/sessions'),
        api.get('/network/isolation'),
      ]);

      setNetworkStats(statsRes.data);
      setSessions(sessionsRes.data.sessions);
      setIsolationStatus(isolationRes.data);
    } catch (error) {
      console.error('Error fetching network data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPerformanceBadge = (value: number, type: 'load' | 'latency' | 'loss') => {
    let status = { color: 'green', text: 'Excellent' };
    
    if (type === 'load') {
      if (value > 80) status = { color: 'red', text: 'Critical' };
      else if (value > 60) status = { color: 'yellow', text: 'High' };
      else if (value > 40) status = { color: 'blue', text: 'Moderate' };
    } else if (type === 'latency') {
      if (value > 50) status = { color: 'red', text: 'Poor' };
      else if (value > 30) status = { color: 'yellow', text: 'Fair' };
      else if (value > 15) status = { color: 'blue', text: 'Good' };
    } else if (type === 'loss') {
      if (value > 1) status = { color: 'red', text: 'Poor' };
      else if (value > 0.5) status = { color: 'yellow', text: 'Fair' };
      else if (value > 0.1) status = { color: 'blue', text: 'Good' };
    }

    const colorClasses = {
      green: 'bg-green-100 text-green-800',
      blue: 'bg-blue-100 text-blue-800',
      yellow: 'bg-yellow-100 text-yellow-800',
      red: 'bg-red-100 text-red-800',
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colorClasses[status.color as keyof typeof colorClasses]}`}>
        {status.text}
      </span>
    );
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
        <h1 className="text-2xl font-bold text-gray-900">Network Management</h1>
        <p className="text-gray-600 mt-1">Monitor network performance and connections</p>
      </div>

      {/* Network Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Connections</p>
              <p className="text-2xl font-bold text-gray-900">
                <AnimatedCounter value={networkStats?.activeConnections || 0} />
              </p>
            </div>
            <div className="bg-green-100 text-green-600 p-3 rounded-lg">
              <Wifi className="w-6 h-6" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Network Load</p>
              <p className="text-2xl font-bold text-gray-900">
                <AnimatedCounter value={networkStats?.networkLoad || 0} suffix="%" decimals={1} />
              </p>
            </div>
            <div className="bg-blue-100 text-blue-600 p-3 rounded-lg">
              <Activity className="w-6 h-6" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Latency</p>
              <p className="text-2xl font-bold text-gray-900">
                {networkStats?.performance.latency || 0} ms
              </p>
            </div>
            <div className="bg-purple-100 text-purple-600 p-3 rounded-lg">
              <Globe className="w-6 h-6" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Uptime</p>
              <p className="text-2xl font-bold text-gray-900">
                {networkStats?.performance.uptime || 0}%
              </p>
            </div>
            <div className="bg-primary/10 text-primary p-3 rounded-lg">
              <Server className="w-6 h-6" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {(['overview', 'sessions', 'isolation', 'qos'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Performance Metrics */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Network Load</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{networkStats?.networkLoad.toFixed(1)}%</span>
                  {getPerformanceBadge(networkStats?.networkLoad || 0, 'load')}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Latency</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{networkStats?.performance.latency}ms</span>
                  {getPerformanceBadge(networkStats?.performance.latency || 0, 'latency')}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Packet Loss</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{networkStats?.performance.packetLoss}%</span>
                  {getPerformanceBadge(parseFloat(networkStats?.performance.packetLoss || '0'), 'loss')}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Total Bandwidth</span>
                <span className="font-medium">
                  {formatBytes(networkStats?.totalBandwidth.total_data || 0)}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Plan Distribution */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="card"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Connections by Plan</h2>
            <div className="space-y-4">
              {networkStats?.tenantStats.map((stat, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      stat.plan_type === 'Basic' ? 'bg-gray-500' :
                      stat.plan_type === 'Standard' ? 'bg-blue-500' :
                      'bg-purple-500'
                    }`}></div>
                    <span className="text-gray-700">{stat.plan_type}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-500">
                      {stat.active_tenants} users
                    </span>
                    <span className="font-medium">
                      {formatBytes(stat.total_usage || 0)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}

      {activeTab === 'sessions' && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tenant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Device
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Session Start
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data Usage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sessions.map((session, index) => (
                  <motion.tr
                    key={session.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{session.tenant_name}</div>
                        <div className="text-sm text-gray-500">Unit {session.unit_number}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm text-gray-900 font-mono">{session.device_mac}</div>
                        <div className="text-sm text-gray-500">{session.device_ip}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDateTime(session.session_start)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm text-gray-900">
                          {formatBytes(session.total_data || 0)}
                        </div>
                        <div className="text-xs text-gray-500">
                          ↑ {formatBytes(session.data_uploaded)} / ↓ {formatBytes(session.data_downloaded)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        session.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {session.is_active ? 'Active' : 'Ended'}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'isolation' && isolationStatus && (
        <div className="space-y-6">
          {/* Isolation Summary */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Network Isolation Status</h2>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                isolationStatus.summary.status === 'Excellent' ? 'bg-green-100 text-green-800' :
                isolationStatus.summary.status === 'Good' ? 'bg-blue-100 text-blue-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {isolationStatus.summary.status}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-sm text-gray-600">Total Units</p>
                <p className="text-2xl font-bold text-gray-900">{isolationStatus.summary.totalUnits}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Isolated Units</p>
                <p className="text-2xl font-bold text-gray-900">{isolationStatus.summary.totalIsolated}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Isolation Rate</p>
                <p className="text-2xl font-bold text-gray-900">{isolationStatus.summary.percentage}%</p>
              </div>
            </div>
          </div>

          {/* Building Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {isolationStatus.buildings.map((building, index) => (
              <motion.div
                key={building.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="card"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">{building.name}</h3>
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <div className="flex items-center justify-center mb-4">
                  <ProgressDonut
                    percentage={building.percentage}
                    size={100}
                    color={
                      building.percentage >= 90 ? '#10b981' :
                      building.percentage >= 75 ? '#3b82f6' :
                      '#f59e0b'
                    }
                  />
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">
                    {building.isolated} / {building.units} units isolated
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Security Incidents */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Security Status</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-green-500" />
                <div>
                  <p className="text-sm text-gray-600">No Security Incidents</p>
                  <p className="text-lg font-semibold text-gray-900">Last 24 hours</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-8 h-8 text-yellow-500" />
                <div>
                  <p className="text-sm text-gray-600">Warnings</p>
                  <p className="text-lg font-semibold text-gray-900">2 this week</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-sm text-gray-600">Authorized Devices</p>
                  <p className="text-lg font-semibold text-gray-900">156 total</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QoS Management Tab */}
      {activeTab === 'qos' && <QoSManager />}
    </div>
  );
};

export default NetworkTab;
