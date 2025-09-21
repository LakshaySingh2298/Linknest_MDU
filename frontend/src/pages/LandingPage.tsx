import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Wifi, Users, BarChart3, Shield, Zap, CreditCard, ArrowRight, CheckCircle } from 'lucide-react';

const LandingPage = () => {
  const features = [
    {
      icon: <Users className="w-6 h-6" />,
      title: 'Tenant Management',
      description: 'Efficiently manage all tenants with detailed profiles and real-time status tracking',
    },
    {
      icon: <CreditCard className="w-6 h-6" />,
      title: 'Usage-Based Billing',
      description: 'Fair pricing model where tenants pay only for the data they consume',
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: 'Real-Time Analytics',
      description: 'Monitor network usage, billing, and performance with live dashboards',
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: 'Network Isolation',
      description: 'Secure network isolation between units for enhanced privacy and security',
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: 'Speed Management',
      description: 'Flexible speed tiers from 25 Mbps to 100 Mbps based on tenant plans',
    },
    {
      icon: <Wifi className="w-6 h-6" />,
      title: 'Captive Portal',
      description: 'Professional captive portal for tenant authentication and upgrades',
    },
  ];

  const plans = [
    {
      name: 'Basic',
      speed: '25 Mbps',
      rate: '₹5/GB',
      features: ['Email Support', 'Basic Analytics', 'Standard Security'],
    },
    {
      name: 'Standard',
      speed: '50 Mbps',
      rate: '₹10/GB',
      features: ['Priority Support', 'Advanced Analytics', 'Enhanced Security'],
      popular: true,
    },
    {
      name: 'Premium',
      speed: '100 Mbps',
      rate: '₹20/GB',
      features: ['24/7 Support', 'Premium Analytics', 'Maximum Security'],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Wifi className="w-8 h-8 text-primary mr-2" />
              <span className="text-2xl font-bold text-gray-900">LinkNest</span>
            </div>
            <nav className="flex items-center gap-6">
              <a href="#features" className="text-gray-600 hover:text-primary transition-colors">Features</a>
              <a href="#pricing" className="text-gray-600 hover:text-primary transition-colors">Pricing</a>
              <Link to="/portal" className="text-gray-600 hover:text-primary transition-colors">Tenant Portal</Link>
              <Link to="/admin" className="btn-primary">Admin Login</Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-20 pb-32 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Smart MDU Wi-Fi Controller
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Revolutionary usage-based billing system for Multi-Dwelling Units. 
              Fair pricing, transparent billing, and complete network control.
            </p>
            <div className="flex gap-4 justify-center">
              <Link to="/admin" className="btn-primary text-lg px-8 py-3 flex items-center gap-2">
                Get Started <ArrowRight className="w-5 h-5" />
              </Link>
              <Link to="/tenant" className="btn-secondary text-lg px-8 py-3">
                WiFi Access
              </Link>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="grid grid-cols-4 gap-8 mt-20 max-w-4xl mx-auto"
          >
            <div className="text-center">
              <div className="text-4xl font-bold text-primary">99.9%</div>
              <div className="text-gray-600 mt-2">Uptime</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary">1000+</div>
              <div className="text-gray-600 mt-2">Units Managed</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary">24/7</div>
              <div className="text-gray-600 mt-2">Support</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary">100%</div>
              <div className="text-gray-600 mt-2">Transparent</div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Powerful Features</h2>
            <p className="text-xl text-gray-600">Everything you need to manage MDU Wi-Fi efficiently</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="card hover:scale-105 transition-transform duration-200"
              >
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center text-primary mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Transparent Pricing</h2>
            <p className="text-xl text-gray-600">Choose the plan that fits your needs</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className={`card ${plan.popular ? 'ring-2 ring-primary' : ''} hover:scale-105 transition-transform duration-200`}
              >
                {plan.popular && (
                  <div className="bg-primary text-white text-sm px-3 py-1 rounded-full inline-block mb-4">
                    Most Popular
                  </div>
                )}
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <div className="text-4xl font-bold text-primary mb-2">{plan.rate}</div>
                <div className="text-gray-600 mb-6">{plan.speed} Speed</div>
                <ul className="space-y-3">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-4xl font-bold text-white mb-4">
            Ready to Transform Your MDU Wi-Fi Management?
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Join hundreds of property managers who trust LinkNest
          </p>
          <Link to="/admin" className="bg-white text-primary px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors inline-flex items-center gap-2">
            Start Free Trial <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Wifi className="w-8 h-8 text-primary mr-2" />
              <span className="text-2xl font-bold">LinkNest</span>
            </div>
            <p className="text-gray-400">© 2025 LinkNest. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
