import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Wifi, 
  Smartphone, 
  Shield, 
  Clock, 
  Download, 
  Upload,
  Activity,
  CheckCircle,
  AlertCircle,
  QrCode
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../utils/api';

interface TenantData {
  id: number;
  name: string;
  unitNumber: string;
  planType: string;
  maxSpeed: string;
  dataUsage: number;
  currentBill: number;
  connectionStatus: string;
}

interface WiFiCredentials {
  ssid: string;
  password: string;
  validFor: number;
  createdAt: string;
}

interface QoSPolicy {
  maxDownload: number;
  maxUpload: number;
  priority: string;
}

const TenantPortal = () => {
  const [step, setStep] = useState<'phone' | 'otp' | 'connected' | 'scan'>('phone');
  const [phone, setPhone] = useState('');
  const [unitNumber, setUnitNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [tenant, setTenant] = useState<any>(null);
  const [tenantData, setTenantData] = useState<any>(null);
  const [wifiCredentials, setWifiCredentials] = useState<any>(null);
  const [qosPolicy, setQosPolicy] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [deviceIP, setDeviceIP] = useState<string | null>(null);
  const [isCaptivePortal, setIsCaptivePortal] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [otpExpiresIn, setOtpExpiresIn] = useState(0);

  // Check for captive portal parameters on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const deviceParam = urlParams.get('device');
    const captiveParam = urlParams.get('captive');
    
    if (deviceParam) {
      setDeviceIP(deviceParam);
    }
    
    if (captiveParam === 'true') {
      setIsCaptivePortal(true);
      toast.info('Device connected to WiFi - Authentication required for internet access');
    }
  }, []);

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !unitNumber) {
      toast.error('Please enter both phone number and unit number');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/tenant-auth/request-otp', {
        phone,
        unitNumber
      });

      toast.success('OTP sent to your registered mobile number!');
      setTenantData(response.data.tenant);
      setTenant(response.data.tenant);
      setOtpExpiresIn(response.data.expiresIn);
      setStep('otp');

      // Start countdown
      const countdown = setInterval(() => {
        setOtpExpiresIn(prev => {
          if (prev <= 1) {
            clearInterval(countdown);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/tenant-auth/verify-otp', {
        phone,
        unitNumber,
        otp
      });

      toast.success('WiFi access granted! You are now connected.');
      setTenant(response.data.tenant);
      setTenantData(response.data.tenant);
      setWifiCredentials(response.data.wifiCredentials);
      setQosPolicy(response.data.qosPolicy);
      setSessionToken(response.data.sessionToken);
      
      // If this is a captive portal authentication, notify the captive portal system
      if (isCaptivePortal && deviceIP) {
        try {
          await api.post('/authenticate-device', {
            deviceIP,
            sessionToken: response.data.sessionToken,
            tenantId: response.data.tenant.id
          });
          
          toast.success('Device authenticated! Internet access granted.');
          
          // Show success screen and auto-close
          setTimeout(() => {
            if (window.opener) {
              window.close(); // Close captive portal window
            } else {
              window.location.href = 'http://www.google.com'; // Redirect to internet
            }
          }, 5000); // 5 seconds delay
          
        } catch (authError) {
          console.error('Device authentication failed:', authError);
          toast.warning('WiFi connected but device authentication failed');
        }
      }
      
      setStep('connected');

    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'Premium': return 'text-purple-600 bg-purple-100';
      case 'Standard': return 'text-blue-600 bg-blue-100';
      case 'Basic': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600';
      case 'normal': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="bg-white rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Wifi className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">LinkNest WiFi</h1>
          <p className="text-gray-600 mt-1">Secure Tenant Portal</p>
        </div>

        {/* QR Code Scan Step */}
        {step === 'scan' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-xl p-6"
          >
            <div className="text-center mb-6">
              <QrCode className="w-24 h-24 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Scan QR Code</h2>
              <p className="text-gray-600 text-sm">
                Scan the QR code displayed in your building or click below to enter manually
              </p>
            </div>
            
            <button
              onClick={() => setStep('phone')}
              className="w-full bg-primary text-white py-3 rounded-lg font-medium hover:bg-primary-dark transition-colors"
            >
              Enter Details Manually
            </button>
          </motion.div>
        )}

        {/* Phone Number Step */}
        {step === 'phone' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-xl p-6"
          >
            <div className="text-center mb-6">
              <Smartphone className="w-12 h-12 text-primary mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Enter Your Details</h2>
              <p className="text-gray-600 text-sm">
                Enter your registered phone number and unit number
              </p>
            </div>

            <form onSubmit={handlePhoneSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter 10-digit phone number"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  maxLength={10}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Unit Number
                </label>
                <input
                  type="text"
                  value={unitNumber}
                  onChange={(e) => setUnitNumber(e.target.value)}
                  placeholder="e.g., A-101, B-202"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-white py-3 rounded-lg font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
              >
                {loading ? 'Sending OTP...' : 'Send OTP'}
              </button>
            </form>

            <button
              onClick={() => setStep('scan')}
              className="w-full mt-4 text-gray-600 hover:text-gray-800 text-sm"
            >
              ← Back to QR Scan
            </button>
          </motion.div>
        )}

        {/* OTP Verification Step */}
        {step === 'otp' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-xl p-6"
          >
            <div className="text-center mb-6">
              <Shield className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Enter OTP</h2>
              <p className="text-gray-600 text-sm mb-4">
                We've sent a 6-digit code to your registered mobile number
              </p>
              
              {tenantData && (
                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <p className="text-sm text-gray-700">
                    <strong>{tenantData.name}</strong> • {tenantData.unitNumber}
                  </p>
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-1 ${getPlanColor(tenantData.planType)}`}>
                    {tenantData.planType} Plan
                  </span>
                </div>
              )}

              {otpExpiresIn > 0 && (
                <div className="flex items-center justify-center text-sm text-gray-600 mb-4">
                  <Clock className="w-4 h-4 mr-1" />
                  OTP expires in {formatTime(otpExpiresIn)}
                </div>
              )}
            </div>

            <form onSubmit={handleOtpSubmit} className="space-y-4">
              <div>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Enter 6-digit OTP"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-center text-lg font-mono tracking-widest"
                  maxLength={6}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full bg-primary text-white py-3 rounded-lg font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Connect to WiFi'}
              </button>
            </form>

            <button
              onClick={() => setStep('phone')}
              className="w-full mt-4 text-gray-600 hover:text-gray-800 text-sm"
            >
              ← Change Phone Number
            </button>
          </motion.div>
        )}

        {/* Connected Step */}
        {step === 'connected' && tenantData && qosPolicy && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-xl p-6"
          >
            <div className="text-center mb-6">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Connected!</h2>
              <p className="text-gray-600 text-sm">
                You are now connected to LinkNest WiFi
              </p>
            </div>

            {/* Tenant Info */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{tenantData.name}</h3>
                  <p className="text-sm text-gray-600">{tenantData.unitNumber}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPlanColor(tenantData.planType)}`}>
                  {tenantData.planType}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Max Speed</p>
                  <p className="font-semibold text-gray-900">{tenantData.maxSpeed}</p>
                </div>
                <div>
                  <p className="text-gray-600">Priority</p>
                  <p className={`font-semibold capitalize ${getPriorityColor(qosPolicy.priority)}`}>
                    {qosPolicy.priority}
                  </p>
                </div>
              </div>
            </div>

            {/* Speed Limits */}
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                <Activity className="w-4 h-4 mr-2" />
                Your Speed Limits
              </h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center">
                  <Download className="w-4 h-4 text-green-600 mr-2" />
                  <div>
                    <p className="text-sm text-gray-600">Download</p>
                    <p className="font-semibold text-gray-900">{qosPolicy.maxDownload} Mbps</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Upload className="w-4 h-4 text-blue-600 mr-2" />
                  <div>
                    <p className="text-sm text-gray-600">Upload</p>
                    <p className="font-semibold text-gray-900">{qosPolicy.maxUpload} Mbps</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Usage Info */}
            <div className="bg-yellow-50 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" />
                <div className="w-full">
                  <h4 className="font-semibold text-gray-900 mb-3">Usage & Billing Information</h4>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Monthly Usage</p>
                      <p className="font-semibold text-gray-900">{tenantData.dataUsage} GB</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Current Bill</p>
                      <p className="font-semibold text-gray-900">₹{tenantData.currentBill}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Rate per GB</p>
                      <p className="font-semibold text-gray-900">₹{tenantData.planType === 'Premium' ? '15' : tenantData.planType === 'Standard' ? '10' : '5'}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Status</p>
                      <span className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">
                        {tenantData.connectionStatus || 'Connected'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* WiFi Credentials */}
            {wifiCredentials && (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 mb-6">
                <h4 className="font-semibold text-gray-900 mb-3">WiFi Credentials</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-600">Network: </span>
                    <span className="font-mono font-semibold">{wifiCredentials.ssid}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Password: </span>
                    <span className="font-mono font-semibold">{wifiCredentials.password}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Valid for 24 hours from connection time
                  </p>
                </div>
              </div>
            )}

            <button
              onClick={() => {
                setStep('scan');
                setPhone('');
                setUnitNumber('');
                setOtp('');
                setTenantData(null);
                setWifiCredentials(null);
                setQosPolicy(null);
                setSessionToken(null);
              }}
              className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              Disconnect & Start Over
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default TenantPortal;
