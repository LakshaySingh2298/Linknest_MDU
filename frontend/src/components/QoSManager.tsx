import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Zap, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  CheckCircle,
  Activity,
  Gauge
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../utils/api';
import AnimatedCounter from './AnimatedCounter';

interface QoSStats {
  networkLoad: number;
  totalCapacity: number;
  usedBandwidth: number;
  availableBandwidth: number;
  planStats: PlanStat[];
  qosEnabled: boolean;
  lastUpdated: string;
}

interface PlanStat {
  plan_type: string;
  tenant_count: number;
  online_count: number;
  avg_usage: number;
  allocated_bandwidth: number;
  max_speed: number;
  priority: string;
  burst_enabled: boolean;
  description: string;
}

interface BandwidthUsage {
  id: number;
  name: string;
  unit_number: string;
  plan_type: string;
  connection_status: string;
  max_speed: number;
  current_speed: number;
  usage_percentage: string;
  priority: string;
  burst_available: boolean;
  daily_usage: number;
  throttled: boolean;
}

const QoSManager: React.FC = () => {
  const [qosStats, setQosStats] = useState<QoSStats | null>(null);
  const [bandwidthUsage, setBandwidthUsage] = useState<BandwidthUsage[]>([]);
  const [loading, setLoading] = useState(true);
  // const [selectedTenant, setSelectedTenant] = useState<number | null>(null);

  useEffect(() => {
    fetchQoSData();
    const interval = setInterval(fetchQoSData, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchQoSData = async () => {
    try {
      const [overviewRes, bandwidthRes] = await Promise.all([
        api.get('/qos/overview'),
        api.get('/qos/bandwidth-usage')
      ]);

      setQosStats(overviewRes.data);
      setBandwidthUsage(bandwidthRes.data.tenants);
    } catch (error) {
      console.error('Error fetching QoS data:', error);
      toast.error('Failed to fetch QoS data');
    } finally {
      setLoading(false);
    }
  };

  const applyQoSPolicy = async (tenantId: number, action: string, customSpeed?: any) => {
    try {
      await api.post(`/qos/apply-policy/${tenantId}`, {
        action,
        customSpeed
      });
      
      toast.success(`QoS policy ${action} applied successfully!`);
      fetchQoSData(); // Refresh data
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to apply QoS policy');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'normal': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <TrendingUp className="w-4 h-4" />;
      case 'normal': return <Activity className="w-4 h-4" />;
      case 'low': return <TrendingDown className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getSpeedColor = (current: number, max: number) => {
    const percentage = (current / max) * 100;
    if (percentage > 80) return 'text-red-600';
    if (percentage > 60) return 'text-yellow-600';
    return 'text-green-600';
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
      {/* QoS Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Network Load</p>
              <p className="text-2xl font-bold text-gray-900">
                <AnimatedCounter value={qosStats?.networkLoad || 0} />%
              </p>
            </div>
            <div className="bg-primary text-white p-3 rounded-lg">
              <Gauge className="w-6 h-6" />
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
              <p className="text-sm text-gray-600 mb-1">Total Capacity</p>
              <p className="text-2xl font-bold text-gray-900">
                <AnimatedCounter value={qosStats?.totalCapacity || 0} /> Mbps
              </p>
            </div>
            <div className="bg-blue-500 text-white p-3 rounded-lg">
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
              <p className="text-sm text-gray-600 mb-1">Used Bandwidth</p>
              <p className="text-2xl font-bold text-gray-900">
                <AnimatedCounter value={qosStats?.usedBandwidth || 0} /> Mbps
              </p>
            </div>
            <div className="bg-orange-500 text-white p-3 rounded-lg">
              <TrendingUp className="w-6 h-6" />
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
              <p className="text-sm text-gray-600 mb-1">Available</p>
              <p className="text-2xl font-bold text-gray-900">
                <AnimatedCounter value={qosStats?.availableBandwidth || 0} /> Mbps
              </p>
            </div>
            <div className="bg-green-500 text-white p-3 rounded-lg">
              <CheckCircle className="w-6 h-6" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Plan Statistics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="card"
      >
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Plan-wise QoS Configuration</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {qosStats?.planStats.map((plan) => (
            <div key={plan.plan_type} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-900">{plan.plan_type}</h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(plan.priority)}`}>
                  {getPriorityIcon(plan.priority)}
                  <span className="ml-1">{plan.priority}</span>
                </span>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Max Speed:</span>
                  <span className="font-medium">{plan.max_speed} Mbps</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Online Users:</span>
                  <span className="font-medium">{plan.online_count}/{plan.tenant_count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Allocated:</span>
                  <span className="font-medium">{plan.allocated_bandwidth} Mbps</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Burst:</span>
                  <span className={`font-medium ${plan.burst_enabled ? 'text-green-600' : 'text-gray-400'}`}>
                    {plan.burst_enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
              
              <p className="text-xs text-gray-500 mt-3">{plan.description}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Real-time Bandwidth Usage */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="card"
      >
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Real-time Bandwidth Usage</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tenant</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Speed</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usage</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {bandwidthUsage.map((tenant) => (
                <tr key={tenant.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{tenant.name}</div>
                      <div className="text-sm text-gray-500">{tenant.unit_number}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{tenant.plan_type}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm">
                      <span className={`font-medium ${getSpeedColor(tenant.current_speed, tenant.max_speed)}`}>
                        {tenant.current_speed} Mbps
                      </span>
                      <span className="text-gray-500"> / {tenant.max_speed} Mbps</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{ width: `${Math.min(parseFloat(tenant.usage_percentage), 100)}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-600">{tenant.usage_percentage}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(tenant.priority)}`}>
                      {getPriorityIcon(tenant.priority)}
                      <span className="ml-1">{tenant.priority}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {tenant.connection_status === 'online' ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-gray-400" />
                      )}
                      {tenant.throttled && (
                        <div title="Throttled due to high usage">
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                        </div>
                      )}
                      {tenant.burst_available && (
                        <div title="Burst available">
                          <Zap className="w-4 h-4 text-yellow-500" />
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => applyQoSPolicy(tenant.id, 'boost')}
                        className="text-green-600 hover:text-green-800 text-sm"
                        disabled={tenant.connection_status === 'offline'}
                      >
                        Boost
                      </button>
                      <button
                        onClick={() => applyQoSPolicy(tenant.id, 'throttle')}
                        className="text-red-600 hover:text-red-800 text-sm"
                        disabled={tenant.connection_status === 'offline'}
                      >
                        Throttle
                      </button>
                      <button
                        onClick={() => applyQoSPolicy(tenant.id, 'reset')}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Reset
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
};

export default QoSManager;
