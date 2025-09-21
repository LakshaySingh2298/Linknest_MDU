import { useState } from 'react';
import { motion } from 'framer-motion';
import { Wifi, Home, Zap, CheckCircle, ArrowRight, Activity, Globe, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';

const CaptivePortal = () => {
  const [roomNumber, setRoomNumber] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState(1);
  const [upgradeSpeed, setUpgradeSpeed] = useState(1);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!roomNumber) {
      alert('Please enter your room number');
      return;
    }

    setIsConnecting(true);
    
    // Simulate connection process
    setTimeout(() => {
      setIsConnecting(false);
      setIsConnected(true);
      
      // Start speed upgrade animation after 2 seconds
      setTimeout(() => {
        setShowUpgrade(true);
        animateSpeedUpgrade();
      }, 2000);
    }, 2000);
  };

  const animateSpeedUpgrade = () => {
    let speed = 1;
    const targetSpeed = 100;
    const increment = 2;
    
    const interval = setInterval(() => {
      speed += increment;
      setUpgradeSpeed(speed);
      
      if (speed >= targetSpeed) {
        clearInterval(interval);
        setUpgradeSpeed(targetSpeed);
      }
    }, 30);
  };

  const features = [
    { icon: <Zap className="w-5 h-5" />, text: 'Lightning Fast Speeds up to 100 Mbps' },
    { icon: <Shield className="w-5 h-5" />, text: 'Secure & Isolated Network' },
    { icon: <Activity className="w-5 h-5" />, text: 'Real-time Usage Monitoring' },
    { icon: <Globe className="w-5 h-5" />, text: '99.9% Uptime Guaranteed' },
  ];

  const plans = [
    { name: 'Basic', speed: '25 Mbps', rate: '₹5/GB', color: 'gray' },
    { name: 'Standard', speed: '50 Mbps', rate: '₹10/GB', color: 'blue' },
    { name: 'Premium', speed: '100 Mbps', rate: '₹20/GB', color: 'purple' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-primary/10">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Wifi className="w-8 h-8 text-primary mr-2" />
              <span className="text-2xl font-bold text-gray-900">LinkNest</span>
            </div>
            <Link to="/" className="text-gray-600 hover:text-primary transition-colors">
              Back to Home
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        {!isConnected ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-xl overflow-hidden"
          >
            {/* Hero Section */}
            <div className="bg-gradient-to-r from-primary to-primary-dark text-white p-8 md:p-12">
              <h1 className="text-3xl md:text-4xl font-bold mb-4">
                Welcome to LinkNest Wi-Fi
              </h1>
              <p className="text-lg opacity-90">
                Experience blazing-fast internet with our smart MDU Wi-Fi system
              </p>
            </div>

            {/* Connection Form */}
            <div className="p-8 md:p-12">
              <form onSubmit={handleConnect} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Home className="w-4 h-4 inline mr-1" />
                    Enter Your Room Number
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-lg"
                    placeholder="e.g., A-101"
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isConnecting}
                  className="w-full bg-primary text-white py-4 rounded-lg font-semibold text-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isConnecting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Connecting...
                    </>
                  ) : (
                    <>
                      Connect to Wi-Fi
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>

              {/* Features */}
              <div className="mt-8 pt-8 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Why Choose LinkNest?</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {features.map((feature, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center gap-3"
                    >
                      <div className="text-primary">{feature.icon}</div>
                      <span className="text-gray-700">{feature.text}</span>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Plans */}
              <div className="mt-8 pt-8 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Plans</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {plans.map((plan, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="border border-gray-200 rounded-lg p-4 text-center hover:shadow-lg transition-shadow"
                    >
                      <h4 className={`font-semibold text-lg mb-2 ${
                        plan.color === 'gray' ? 'text-gray-700' :
                        plan.color === 'blue' ? 'text-blue-600' :
                        'text-purple-600'
                      }`}>
                        {plan.name}
                      </h4>
                      <p className="text-2xl font-bold text-gray-900">{plan.speed}</p>
                      <p className="text-gray-600 mt-1">{plan.rate}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl p-8 md:p-12"
          >
            {/* Success State */}
            <div className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
                className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
              >
                <CheckCircle className="w-10 h-10 text-green-500" />
              </motion.div>

              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Connected Successfully!
              </h2>
              <p className="text-lg text-gray-600 mb-2">
                Room: <span className="font-semibold">{roomNumber}</span>
              </p>
              <p className="text-gray-600 mb-8">
                You are now connected to LinkNest high-speed Wi-Fi
              </p>

              {/* Speed Upgrade Animation */}
              {showUpgrade && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl p-6 mb-8"
                >
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Your Connection Speed
                  </h3>
                  <div className="relative">
                    <div className="text-5xl font-bold text-primary mb-2">
                      <AnimatedSpeedCounter value={upgradeSpeed} /> Mbps
                    </div>
                    <div className="text-sm text-gray-600">
                      {upgradeSpeed < 30 ? 'Basic Plan' :
                       upgradeSpeed < 60 ? 'Standard Plan' :
                       'Premium Plan'}
                    </div>
                  </div>
                  
                  {/* Speed Bar */}
                  <div className="mt-4">
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <motion.div
                        initial={{ width: '1%' }}
                        animate={{ width: `${upgradeSpeed}%` }}
                        transition={{ duration: 2, ease: 'easeOut' }}
                        className="h-full bg-gradient-to-r from-primary to-primary-dark"
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Network Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">IP Address</p>
                  <p className="font-mono text-gray-900">192.168.1.{Math.floor(Math.random() * 254 + 1)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">MAC Address</p>
                  <p className="font-mono text-gray-900">AA:BB:CC:DD:EE:FF</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Signal Strength</p>
                  <p className="font-semibold text-green-600">Excellent</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col md:flex-row gap-4 justify-center">
                <a
                  href="https://www.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary flex items-center justify-center gap-2"
                >
                  <Globe className="w-5 h-5" />
                  Browse Internet
                </a>
                <button
                  onClick={() => window.location.reload()}
                  className="btn-secondary flex items-center justify-center gap-2"
                >
                  Disconnect
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Footer Info */}
        <div className="mt-8 text-center text-sm text-gray-600">
          <p>Need help? Contact support at support@linknest.com</p>
          <p className="mt-2">© 2025 LinkNest. All rights reserved.</p>
        </div>
      </main>
    </div>
  );
};

// Animated Speed Counter Component
const AnimatedSpeedCounter: React.FC<{ value: number }> = ({ value }) => {
  return <span>{value}</span>;
};

export default CaptivePortal;
