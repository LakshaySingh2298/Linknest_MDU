export const formatCurrency = (amount: number | string): string => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(numAmount || 0);
};

export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const formatDate = (date: string | Date): string => {
  return new Date(date).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatDateTime = (date: string | Date): string => {
  return new Date(date).toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const getDataUsageColor = (usage: number): string => {
  if (usage < 30) return 'text-green-600 bg-green-100';
  if (usage < 60) return 'text-yellow-600 bg-yellow-100';
  return 'text-red-600 bg-red-100';
};

export const getPaymentStatusColor = (status: string): string => {
  switch (status) {
    case 'current':
    case 'paid':
      return 'text-green-600 bg-green-100';
    case 'pending':
      return 'text-yellow-600 bg-yellow-100';
    case 'overdue':
      return 'text-red-600 bg-red-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
};

export const calculateBilling = (dataUsage: number, ratePerGB: number) => {
  const baseFee = 50;
  const usageCharges = dataUsage * ratePerGB;
  const gstAmount = usageCharges * 0.18;
  const totalAmount = usageCharges + gstAmount + baseFee;
  
  return {
    usageCharges: parseFloat(usageCharges.toFixed(2)),
    gstAmount: parseFloat(gstAmount.toFixed(2)),
    baseFee,
    totalAmount: parseFloat(totalAmount.toFixed(2)),
  };
};

export const getPlanConfig = (planType: string) => {
  const configs = {
    Basic: { rate: 5, speed: '25 Mbps', baseFee: 50, color: 'gray' },
    Standard: { rate: 10, speed: '50 Mbps', baseFee: 50, color: 'blue' },
    Premium: { rate: 20, speed: '100 Mbps', baseFee: 50, color: 'purple' },
  };
  return configs[planType as keyof typeof configs] || configs.Basic;
};
