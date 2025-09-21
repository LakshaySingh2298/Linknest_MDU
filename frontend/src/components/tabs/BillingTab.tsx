import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, FileText, Send, Download, TrendingUp, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../utils/api';
import { BillingRecord, BillingOverview } from '../../types';
import { formatCurrency, formatDate, getPaymentStatusColor } from '../../utils/helpers';
import AnimatedCounter from '../AnimatedCounter';

interface BillingTabProps {
  refreshing: boolean;
}

const BillingTab: React.FC<BillingTabProps> = ({ refreshing }) => {
  const [billingRecords, setBillingRecords] = useState<BillingRecord[]>([]);
  const [overview, setOverview] = useState<BillingOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchBillingData();
  }, [selectedMonth, statusFilter]);

  useEffect(() => {
    if (refreshing) {
      fetchBillingData();
    }
  }, [refreshing]);

  const fetchBillingData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedMonth) params.append('month', `${selectedMonth}-01`);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const [billsRes, overviewRes] = await Promise.all([
        api.get(`/billing/tenants?${params}`),
        api.get('/billing/overview'),
      ]);

      setBillingRecords(billsRes.data.bills);
      setOverview(overviewRes.data);
    } catch (error) {
      console.error('Error fetching billing data:', error);
      toast.error('Failed to fetch billing data');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateBills = async () => {
    if (!confirm('Generate bills for all tenants for the current month?')) return;

    try {
      const response = await api.post('/billing/generate');
      toast.success(`Generated ${response.data.count} bills successfully`);
      fetchBillingData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to generate bills');
    }
  };

  const handleRecordPayment = async (billId: number, tenantId: number) => {
    try {
      await api.post('/billing/payments', { billId, tenantId });
      toast.success('Payment recorded successfully');
      fetchBillingData();
    } catch (error) {
      toast.error('Failed to record payment');
    }
  };

  const handleDownloadInvoice = (billId: number) => {
    window.open(`/api/billing/invoice/${billId}`, '_blank');
  };

  const handleSendReminder = (tenant: string) => {
    toast.success(`Payment reminder sent to ${tenant}`);
  };

  const getUsageBarColor = (usage: number) => {
    if (usage < 30) return 'bg-green-500';
    if (usage < 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'overdue':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing Management</h1>
        <p className="text-gray-600 mt-1">Manage tenant bills and payment tracking</p>
      </div>

      {/* Summary Cards */}
      {overview && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">
                  <AnimatedCounter 
                    value={overview.overview.total_revenue} 
                    prefix="₹" 
                    decimals={0}
                  />
                </p>
              </div>
              <div className="bg-primary/10 text-primary p-3 rounded-lg">
                <DollarSign className="w-6 h-6" />
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
                <p className="text-sm text-gray-600">Total Bills</p>
                <p className="text-2xl font-bold text-gray-900">
                  <AnimatedCounter value={overview.overview.total_bills} />
                </p>
              </div>
              <div className="bg-blue-100 text-blue-600 p-3 rounded-lg">
                <FileText className="w-6 h-6" />
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
                <p className="text-sm text-gray-600">Paid Bills</p>
                <p className="text-2xl font-bold text-gray-900">
                  <AnimatedCounter value={overview.overview.paid_bills} />
                </p>
                <p className="text-sm text-green-600 mt-1">
                  {formatCurrency(overview.overview.collected_revenue)}
                </p>
              </div>
              <div className="bg-green-100 text-green-600 p-3 rounded-lg">
                <CheckCircle className="w-6 h-6" />
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
                <p className="text-sm text-gray-600">Overdue Bills</p>
                <p className="text-2xl font-bold text-gray-900">
                  <AnimatedCounter value={overview.overview.overdue_bills} />
                </p>
                <p className="text-sm text-red-600 mt-1">
                  {formatCurrency(overview.overview.pending_revenue)}
                </p>
              </div>
              <div className="bg-red-100 text-red-600 p-3 rounded-lg">
                <AlertCircle className="w-6 h-6" />
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Filters and Actions */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Month Selector */}
          <input
            type="month"
            className="input"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          />

          {/* Status Filter */}
          <select
            className="input"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
          </select>

          {/* Actions */}
          <div className="flex gap-2 ml-auto">
            <button
              onClick={handleGenerateBills}
              className="btn-primary flex items-center gap-2"
            >
              <FileText className="w-5 h-5" />
              Generate Bills
            </button>
          </div>
        </div>
      </div>

      {/* Billing Records */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {loading ? (
          <div className="col-span-2 flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : billingRecords.length === 0 ? (
          <div className="col-span-2 card text-center py-12">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No billing records found for the selected period</p>
          </div>
        ) : (
          billingRecords.map((bill, index) => (
            <motion.div
              key={bill.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="card"
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-primary font-semibold">
                      {bill.tenant_name?.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{bill.tenant_name}</h3>
                    <p className="text-sm text-gray-500">Unit {bill.unit_number}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  bill.plan_type === 'Basic' ? 'bg-gray-100 text-gray-800' :
                  bill.plan_type === 'Standard' ? 'bg-blue-100 text-blue-800' :
                  'bg-purple-100 text-purple-800'
                }`}>
                  {bill.plan_type}
                </span>
              </div>

              {/* Usage Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Data Usage</span>
                  <span className="font-medium">{bill.data_consumed} GB</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${getUsageBarColor(bill.data_consumed)}`}
                    style={{ width: `${Math.min((bill.data_consumed / 100) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>

              {/* Billing Breakdown */}
              <div className="space-y-2 py-3 border-t border-b border-gray-100">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Usage Charges</span>
                  <span>{formatCurrency(bill.usage_charges)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Base Fee</span>
                  <span>{formatCurrency(50)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">GST (18%)</span>
                  <span>{formatCurrency(bill.gst_amount)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Total Amount</span>
                  <span className="text-lg">{formatCurrency(bill.total_amount)}</span>
                </div>
              </div>

              {/* Status and Actions */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(bill.payment_status)}
                    <span className={`text-sm font-medium ${
                      bill.payment_status === 'paid' ? 'text-green-600' :
                      bill.payment_status === 'pending' ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {bill.payment_status === 'paid' ? 'Paid' :
                       bill.payment_status === 'pending' ? 'Payment Pending' :
                       'Overdue'}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {formatDate(bill.billing_month)}
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleDownloadInvoice(bill.id)}
                    className="flex-1 btn-secondary text-sm flex items-center justify-center gap-1"
                  >
                    <Download className="w-4 h-4" />
                    Invoice
                  </button>
                  {bill.payment_status !== 'paid' && (
                    <>
                      <button
                        onClick={() => handleSendReminder(bill.tenant_name || '')}
                        className="flex-1 btn-secondary text-sm flex items-center justify-center gap-1"
                      >
                        <Send className="w-4 h-4" />
                        Reminder
                      </button>
                      <button
                        onClick={() => handleRecordPayment(bill.id, bill.tenant_id)}
                        className="flex-1 btn-primary text-sm flex items-center justify-center gap-1"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Record Payment
                      </button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default BillingTab;
