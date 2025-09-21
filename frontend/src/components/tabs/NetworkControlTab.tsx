import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Wifi, 
  Zap, 
  Activity, 
  Settings, 
  Play, 
  Pause, 
  RotateCcw,
  Monitor,
  TrendingUp,
  TrendingDown,
  Clock,
  Users
} from 'lucide-react';
import api from '../../utils/api';

interface NetworkSession {
  deviceIP: string;
  tenantId: number;
  tenantName: string;
  unitNumber: string;
  planType: string;
  downloadMbps: number;
  uploadMbps: number;
  appliedAt: string;
  status: string;
  sessionStart: string;
}

interface SpeedTestResult {
  deviceIP: string;
  configuredDownload: number;
  configuredUpload: number;
  actualDownload: number;
  actualUpload: number;
  latency: number;
  jitter: number;
  packetLoss: number;
  timestamp: string;
}

interface SystemStatus {
  isActive: boolean;
  platform: string;
  totalActiveSessions: number;
  totalAllocatedDownload: number;
  totalAllocatedUpload: number;
  lastUpdated: string;
}

const NetworkControlTab: React.FC = () => {
  const [activeSessions, setActiveSessions] = useState<NetworkSession[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [speedTestResults, setSpeedTestResults] = useState<Map<string, SpeedTestResult>>(new Map());
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);

  useEffect(() => {
    fetchSystemStatus();
    fetchActiveSessions();
    
    // Set up real-time updates
    const interval = setInterval(() => {
      fetchActiveSessions();
      fetchSystemStatus();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const fetchSystemStatus = async () => {
    try {
      const response = await api.get('/network-control/system-status');
      if (response.data.success) {
        setSystemStatus(response.data.systemStatus);
      }
    } catch (error) {
      console.error('Error fetching system status:', error);
    }
  };

  const fetchActiveSessions = async () => {
    try {
      const response = await api.get('/network-control/active-sessions');
      if (response.data.success) {
        setActiveSessions(response.data.sessions);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching active sessions:', error);
      setLoading(false);
    }
  };

  const performSpeedTest = async (deviceIP: string) => {
    try {
      const response = await api.post('/network-control/speed-test', { deviceIP });
      if (response.data.success) {
        setSpeedTestResults(prev => new Map(prev.set(deviceIP, response.data.speedTest)));
      }
    } catch (error) {
      console.error('Error performing speed test:', error);
    }
  };

  const updateSpeedLimit = async (deviceIP: string, downloadMbps: number, uploadMbps: number) => {
    try {
      const response = await api.post('/network-control/update-speed-limit', {
        deviceIP,
        downloadMbps,
        uploadMbps
      });
      
      if (response.data.success) {
        fetchActiveSessions(); // Refresh the list
      }
    } catch (error) {
      console.error('Error updating speed limit:', error);
    }
  };

  const removeSpeedLimit = async (deviceIP: string) => {
    try {
      const response = await api.post('/network-control/remove-speed-limit', { deviceIP });
      if (response.data.success) {
        fetchActiveSessions(); // Refresh the list
      }
    } catch (error) {
      console.error('Error removing speed limit:', error);
    }
  };

  const getPlanColor = (planType: string) => {
    switch (planType) {
      case 'Premium': return 'text-purple-600 bg-purple-100';
      case 'Standard': return 'text-blue-600 bg-blue-100';
      case 'Basic': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'limited': return 'text-yellow-600 bg-yellow-100';
      case 'blocked': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* System Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm p-6"
        >
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Activity className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">System Status</p>
              <p className="text-2xl font-bold text-gray-900">
                {systemStatus?.isActive ? 'Active' : 'Inactive'}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-sm p-6"
        >
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Sessions</p>
              <p className="text-2xl font-bold text-gray-900">
                {systemStatus?.totalActiveSessions || 0}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl shadow-sm p-6"
        >
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingDown className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Download</p>
              <p className="text-2xl font-bold text-gray-900">
                {systemStatus?.totalAllocatedDownload || 0} Mbps
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl shadow-sm p-6"
        >
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Upload</p>
              <p className="text-2xl font-bold text-gray-900">
                {systemStatus?.totalAllocatedUpload || 0} Mbps
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Active Sessions Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-xl shadow-sm"
      >
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Wifi className="w-5 h-5 mr-2" />
              Active Network Sessions
            </h3>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">
                Platform: {systemStatus?.platform || 'Unknown'}
              </span>
              <button
                onClick={fetchActiveSessions}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tenant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Device IP
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Plan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Speed Limits
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {activeSessions.map((session) => {
                const speedTest = speedTestResults.get(session.deviceIP);
                return (
                  <tr key={session.deviceIP} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {session.tenantName}
                          </div>
                          <div className="text-sm text-gray-500">
                            Unit {session.unitNumber}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 font-mono">
                        {session.deviceIP}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPlanColor(session.planType)}`}>
                        {session.planType}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <div className="flex items-center space-x-2">
                          <TrendingDown className="w-4 h-4 text-blue-500" />
                          <span>{session.downloadMbps} Mbps</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <TrendingUp className="w-4 h-4 text-green-500" />
                          <span>{session.uploadMbps} Mbps</span>
                        </div>
                      </div>
                      {speedTest && (
                        <div className="text-xs text-gray-500 mt-1">
                          Actual: {speedTest.actualDownload}↓ / {speedTest.actualUpload}↑ Mbps
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}>
                        {session.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => performSpeedTest(session.deviceIP)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                          title="Speed Test"
                        >
                          <Zap className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setSelectedSession(session.deviceIP)}
                          className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50"
                          title="Modify Limits"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => removeSpeedLimit(session.deviceIP)}
                          className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                          title="Remove Limits"
                        >
                          <Pause className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {activeSessions.length === 0 && (
          <div className="text-center py-12">
            <Monitor className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No active sessions</h3>
            <p className="mt-1 text-sm text-gray-500">
              No devices are currently connected with speed limits applied.
            </p>
          </div>
        )}
      </motion.div>

      {/* Speed Test Results */}
      {speedTestResults.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-xl shadow-sm p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Activity className="w-5 h-5 mr-2" />
            Recent Speed Test Results
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from(speedTestResults.entries()).map(([deviceIP, result]) => (
              <div key={deviceIP} className="border border-gray-200 rounded-lg p-4">
                <div className="text-sm font-medium text-gray-900 mb-2">{deviceIP}</div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Download:</span>
                    <span className="font-medium">
                      {result.actualDownload} / {result.configuredDownload} Mbps
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Upload:</span>
                    <span className="font-medium">
                      {result.actualUpload} / {result.configuredUpload} Mbps
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Latency:</span>
                    <span className="font-medium">{result.latency}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Packet Loss:</span>
                    <span className="font-medium">{result.packetLoss.toFixed(2)}%</span>
                  </div>
                </div>
                <div className="text-xs text-gray-500 mt-2 flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  {new Date(result.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default NetworkControlTab;
