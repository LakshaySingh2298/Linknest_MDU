import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Search, Filter, Plus, MoreVertical, Edit, Trash2, Eye, Mail, Phone, Home, Wifi, WifiOff, Activity } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../utils/api';
import { Tenant } from '../../types';
import { formatCurrency } from '../../utils/helpers';
import TableSkeleton from '../TableSkeleton';
import AddTenantModal from '../modals/AddTenantModal';
import EditTenantModal from '../modals/EditTenantModal';

interface TenantsTabProps {
  refreshing: boolean;
}

const TenantsTab: React.FC<TenantsTabProps> = ({ refreshing }) => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [showDropdown, setShowDropdown] = useState<number | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    online: 0,
    occupancyRate: 0,
    avgUsage: 0,
    premium: 0,
    standard: 0,
    basic: 0,
    overdue: 0
  });
  const [bulkAction, setBulkAction] = useState<string>('');
  const [selectedTenants, setSelectedTenants] = useState<number[]>([]);

  useEffect(() => {
    fetchTenants();
  }, [searchTerm, planFilter, statusFilter]);

  useEffect(() => {
    if (refreshing) {
      fetchTenants();
    }
  }, [refreshing]);

  const fetchTenants = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (planFilter !== 'all') params.append('plan', planFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const response = await api.get(`/tenants?${params.toString()}`);
      setTenants(response.data.tenants || []);
      
      // Calculate stats
      const tenantList = response.data.tenants || [];
      const onlineCount = tenantList.filter((t: Tenant) => t.connection_status === 'online').length;
      const premiumCount = tenantList.filter((t: Tenant) => t.plan_type === 'Premium').length;
      const standardCount = tenantList.filter((t: Tenant) => t.plan_type === 'Standard').length;
      const basicCount = tenantList.filter((t: Tenant) => t.plan_type === 'Basic').length;
      const overdueCount = tenantList.filter((t: Tenant) => t.payment_status === 'overdue').length;
      
      // Calculate total usage with proper null handling
      const totalUsage = tenantList.reduce((sum: number, t: Tenant) => {
        const usage = parseFloat(t.data_usage?.toString() || '0');
        return sum + (isNaN(usage) ? 0 : usage);
      }, 0);
      
      setStats({
        total: tenantList.length,
        online: onlineCount,
        occupancyRate: tenantList.length > 0 ? Math.round((onlineCount / tenantList.length) * 100) : 0,
        avgUsage: tenantList.length > 0 ? (totalUsage / tenantList.length) : 0,
        premium: premiumCount,
        standard: standardCount,
        basic: basicCount,
        overdue: overdueCount
      });
    } catch (error) {
      console.error('Error fetching tenants:', error);
      toast.error('Failed to fetch tenants');
    } finally {
      setLoading(false);
    }
  };

  // Removed duplicate function declarations - these are defined later in the file

  const handleToggleConnection = async (tenant: Tenant) => {
    try {
      const newStatus = tenant.connection_status === 'online' ? 'offline' : 'online';
      await api.patch(`/tenants/${tenant.id}/connection`, { status: newStatus });
      toast.success(`Tenant ${newStatus === 'online' ? 'connected' : 'disconnected'}`);
      fetchTenants();
    } catch (error) {
      console.error('Error toggling connection:', error);
      toast.error('Failed to toggle connection');
    }
  };

  const handleBulkAction = async () => {
    if (selectedTenants.length === 0) {
      toast.error('No tenants selected');
      return;
    }

    switch (bulkAction) {
      case 'disconnect':
        try {
          await api.post('/tenants/bulk-disconnect', { ids: selectedTenants });
          toast.success('Selected tenants disconnected');
          setSelectedTenants([]);
          fetchTenants();
        } catch (error) {
          toast.error('Failed to disconnect tenants');
        }
        break;
      case 'delete':
        if (!confirm(`Delete ${selectedTenants.length} tenants?`)) return;
        try {
          await api.post('/tenants/bulk-delete', { ids: selectedTenants });
          toast.success('Selected tenants deleted');
          setSelectedTenants([]);
          fetchTenants();
        } catch (error) {
          toast.error('Failed to delete tenants');
        }
        break;
    }
  };

  const simulateAllActivity = async () => {
    try {
      setLoading(true);
      await api.post('/tenants/simulate-all-activity');
      toast.success('Network activity simulated for all tenants!');
      fetchTenants(); // Refresh the data
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to simulate activity');
    } finally {
      setLoading(false);
    }
  };

  const randomizePlans = async () => {
    try {
      setLoading(true);
      await api.post('/tenants/randomize-plans');
      toast.success('Tenant plans randomized! Check QoS differences in Network tab.');
      fetchTenants(); // Refresh the data
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to randomize plans');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTenant = async (data: any) => {
    try {
      await api.post('/tenants', data);
      toast.success('Tenant added successfully');
      setShowAddModal(false);
      fetchTenants();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to add tenant');
    }
  };

  const handleEditTenant = async (data: any) => {
    if (!selectedTenant) return;
    
    try {
      await api.put(`/tenants/${selectedTenant.id}`, data);
      toast.success('Tenant updated successfully');
      setShowEditModal(false);
      setSelectedTenant(null);
      fetchTenants();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update tenant');
    }
  };

  const handleDeleteTenant = async (tenant: Tenant) => {
    if (!confirm(`Are you sure you want to delete ${tenant.name}?`)) return;
    
    try {
      await api.delete(`/tenants/${tenant.id}`);
      toast.success('Tenant deleted successfully');
      fetchTenants();
    } catch (error) {
      toast.error('Failed to delete tenant');
    }
  };

  const getStatusIcon = (status: string) => {
    return status === 'online' ? (
      <Wifi className="w-4 h-4 text-green-500" />
    ) : (
      <WifiOff className="w-4 h-4 text-gray-400" />
    );
  };

  const getPlanBadgeClass = (plan: string) => {
    switch (plan) {
      case 'Basic':
        return 'bg-gray-100 text-gray-800';
      case 'Standard':
        return 'bg-blue-100 text-blue-800';
      case 'Premium':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getUsageProgressColor = (usage: number) => {
    if (usage < 30) return 'bg-green-500';
    if (usage < 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tenant Management</h1>
        <p className="text-gray-600 mt-1">Manage all tenant accounts and connections</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Tenants</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <Users className="w-8 h-8 text-primary" />
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
              <p className="text-sm text-gray-600">Active Connections</p>
              <p className="text-2xl font-bold text-gray-900">{stats.online}</p>
            </div>
            <Wifi className="w-8 h-8 text-green-500" />
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
              <p className="text-sm text-gray-600">Occupancy Rate</p>
              <p className="text-2xl font-bold text-gray-900">{stats.occupancyRate}%</p>
            </div>
            <Home className="w-8 h-8 text-blue-500" />
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
              <p className="text-sm text-gray-600">Avg. Usage</p>
              <p className="text-2xl font-bold text-gray-900">{(isNaN(stats.avgUsage) ? 0 : stats.avgUsage).toFixed(1)} GB</p>
            </div>
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-purple-600 font-bold">GB</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Filters and Actions */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, or unit..."
                className="input pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            <select
              className="input"
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
            >
              <option value="all">All Plans</option>
              <option value="Basic">Basic</option>
              <option value="Standard">Standard</option>
              <option value="Premium">Premium</option>
            </select>

            <select
              className="input"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="online">Online</option>
              <option value="offline">Offline</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={randomizePlans}
              className="btn-secondary flex items-center gap-2"
            >
              <Users className="w-5 h-5" />
              Randomize Plans
            </button>
            <button
              onClick={simulateAllActivity}
              className="btn-secondary flex items-center gap-2"
            >
              <Activity className="w-5 h-5" />
              Simulate Activity
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add Tenant
            </button>
          </div>
        </div>
      </div>

      {/* Tenants Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <TableSkeleton rows={5} columns={7} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tenant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Room
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Plan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bill
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <AnimatePresence>
                  {tenants.map((tenant, index) => (
                    <motion.tr
                      key={tenant.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0 bg-primary/10 rounded-full flex items-center justify-center">
                            <span className="text-primary font-semibold">
                              {tenant.name.charAt(0)}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{tenant.name}</div>
                            <div className="text-sm text-gray-500">{tenant.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{tenant.unit_number}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getPlanBadgeClass(tenant.plan_type)}`}>
                          {tenant.plan_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="w-32">
                          <div className="flex items-center justify-between text-sm text-gray-900 mb-1">
                            <span>{(parseFloat(tenant.data_usage?.toString() || '0') || 0).toFixed(1)} GB</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${getUsageProgressColor(parseFloat(tenant.data_usage?.toString() || '0') || 0)}`}
                              style={{ width: `${Math.min(((parseFloat(tenant.data_usage?.toString() || '0') || 0) / 100) * 100, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(tenant.connection_status)}
                          <span className={`text-sm ${tenant.connection_status === 'online' ? 'text-green-600' : 'text-gray-500'}`}>
                            {tenant.connection_status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatCurrency(Number(tenant.current_bill))}</div>
                        <div className={`text-xs ${tenant.payment_status === 'current' ? 'text-green-600' : tenant.payment_status === 'pending' ? 'text-yellow-600' : 'text-red-600'}`}>
                          {tenant.payment_status}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="relative">
                          <button
                            onClick={() => setShowDropdown(showDropdown === tenant.id ? null : tenant.id)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <MoreVertical className="w-5 h-5 text-gray-500" />
                          </button>
                          
                          {showDropdown === tenant.id && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                              <button
                                onClick={() => {
                                  setSelectedTenant(tenant);
                                  setShowViewModal(true);
                                  setShowDropdown(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                              >
                                <Eye className="w-4 h-4" />
                                View Details
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedTenant(tenant);
                                  setShowEditModal(true);
                                  setShowDropdown(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                              >
                                <Edit className="w-4 h-4" />
                                Edit Tenant
                              </button>
                              <button
                                onClick={() => {
                                  handleDeleteTenant(tenant);
                                  setShowDropdown(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete Tenant
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {showAddModal && (
        <AddTenantModal
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddTenant}
        />
      )}

      {showEditModal && selectedTenant && (
        <EditTenantModal
          tenant={selectedTenant}
          onClose={() => {
            setShowEditModal(false);
            setSelectedTenant(null);
          }}
          onSubmit={handleEditTenant}
        />
      )}

      {showViewModal && selectedTenant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Tenant Details</h2>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedTenant(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium mb-4">Personal Information</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Name</label>
                    <p className="text-gray-900">{selectedTenant.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Email</label>
                    <p className="text-gray-900">{selectedTenant.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Phone</label>
                    <p className="text-gray-900">{selectedTenant.phone}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Unit Number</label>
                    <p className="text-gray-900">{selectedTenant.unit_number}</p>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-4">Plan & Usage</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Plan Type</label>
                    <p className="text-gray-900 capitalize">{selectedTenant.plan_type}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Data Usage</label>
                    <p className="text-gray-900">{Number(selectedTenant.data_usage).toFixed(2)} GB</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Connection Status</label>
                    <p className={`capitalize ${selectedTenant.connection_status === 'online' ? 'text-green-600' : 'text-gray-500'}`}>
                      {selectedTenant.connection_status}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Current Bill</label>
                    <p className="text-gray-900">{formatCurrency(Number(selectedTenant.current_bill))}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Payment Status</label>
                    <p className={`capitalize ${selectedTenant.payment_status === 'current' ? 'text-green-600' : selectedTenant.payment_status === 'pending' ? 'text-yellow-600' : 'text-red-600'}`}>
                      {selectedTenant.payment_status}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setShowEditModal(true);
                }}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
              >
                Edit Tenant
              </button>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedTenant(null);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TenantsTab;
