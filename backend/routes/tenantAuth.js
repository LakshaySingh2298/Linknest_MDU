const express = require('express');
const pool = require('../config/database');
const crypto = require('crypto');
const { sendOTPEmail } = require('../services/emailService');
const networkControl = require('../services/networkControl');
const hotspotController = require('../services/windowsHotspotController');

const router = express.Router();

// Initialize Twilio client
const twilio = require('twilio');
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// In-memory OTP storage (in production, use Redis)
const otpStorage = new Map();

// Real database connection check
const isDatabaseConnected = async () => {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
};

// Generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// OTP delivery with email and console fallback
const sendOTP = async (phone, email, otp, tenantName, unitNumber) => {
  // Beautiful Console Display (always show for debugging)
  console.log(`\n╔══════════════════════════════════════════════════════════╗`);
  console.log(`║                    🔐 WIFI OTP VERIFICATION              ║`);
  console.log(`╠══════════════════════════════════════════════════════════╣`);
  console.log(`║  👤 Tenant: ${tenantName.padEnd(42)} ║`);
  console.log(`║  📱 Phone:  ${phone.padEnd(42)} ║`);
  console.log(`║  📧 Email:  ${(email || 'N/A').padEnd(42)} ║`);
  console.log(`║  🏠 Unit:   ${unitNumber.padEnd(42)} ║`);
  console.log(`║  🔑 OTP:    ${otp.padEnd(42)} ║`);
  console.log(`║  ⏰ Valid:  5 minutes${' '.repeat(33)} ║`);
  console.log(`╚══════════════════════════════════════════════════════════╝\n`);
  
  // Also log for easy copy-paste
  console.log(`🎯 QUICK COPY: OTP = ${otp}`);
  
  // Try to send email if available
  if (email) {
    try {
      const emailResult = await sendOTPEmail(email, otp, tenantName, unitNumber);
      if (emailResult.success) {
        console.log('✅ OTP sent via email to:', email);
        return { 
          success: true, 
          method: 'email', 
          message: 'OTP sent to your email address!',
          displayOtp: process.env.NODE_ENV === 'development' ? otp : undefined
        };
      }
    } catch (error) {
      console.error('Email failed, using console fallback:', error);
    }
  }
  
  // Fallback to console display
  return { 
    success: true, 
    method: 'console', 
    message: 'OTP generated! Check server console for the code.',
    displayOtp: otp // Show in frontend for demo/development
  };
};

// Generate WiFi credentials
const generateWiFiCredentials = (tenantId, planType) => {
  const ssid = `LinkNest_${planType}`;
  const password = crypto.randomBytes(8).toString('hex');
  
  return {
    ssid,
    password,
    validFor: 24 * 60 * 60 * 1000, // 24 hours
    createdAt: new Date()
  };
};

// Request OTP for WiFi access
router.post('/request-otp', async (req, res) => {
  try {
    const { phone, unitNumber } = req.body;

    // Validate input
    if (!phone || !unitNumber) {
      return res.status(400).json({ error: 'Phone number and unit number are required' });
    }

    // Validate phone number format
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ error: 'Please enter a valid 10-digit Indian mobile number' });
    }

    // Check database connection
    if (!(await isDatabaseConnected())) {
      return res.status(503).json({ error: 'Database service unavailable. Please try again later.' });
    }

    // Find tenant by phone and unit
    const tenant = await pool.query(
      'SELECT * FROM tenants WHERE phone = $1 AND unit_number = $2',
      [phone, unitNumber]
    );

    if (tenant.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Tenant not found. Please verify your phone number and unit number, or contact admin.' 
      });
    }

    const tenantData = tenant.rows[0];

    // Check if tenant has pending bills
    if (tenantData.payment_status === 'overdue') {
      return res.status(403).json({ 
        error: `Payment overdue: ₹${tenantData.current_bill}. Please clear dues before accessing WiFi.` 
      });
    }

    // Rate limiting - check if OTP was recently sent
    const otpKey = `${phone}_${unitNumber}`;
    const existingOTP = otpStorage.get(otpKey);
    
    if (existingOTP && (Date.now() - (existingOTP.expiresAt - 5 * 60 * 1000)) < 60 * 1000) {
      return res.status(429).json({ 
        error: 'OTP already sent. Please wait 1 minute before requesting again.' 
      });
    }

    // Generate and store OTP
    const otp = generateOTP();
    
    otpStorage.set(otpKey, {
      otp,
      tenantId: tenantData.id,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
      attempts: 0,
      requestedAt: Date.now()
    });

    // Send OTP via email or console
    const otpResult = await sendOTP(phone, tenantData.email, otp, tenantData.name, unitNumber);

    // Log OTP request
    console.log(`📱 OTP requested for tenant: ${tenantData.name} (${phone}) - Unit: ${unitNumber}`);

    res.json({
      message: otpResult.message,
      expiresIn: 300, // 5 minutes
      tenant: {
        name: tenantData.name,
        unitNumber: tenantData.unit_number,
        planType: tenantData.plan_type,
        maxSpeed: tenantData.speed_range
      },
      otp: otpResult.displayOtp // Include OTP for demo/development
    });

  } catch (error) {
    console.error('❌ Error requesting OTP:', error);
    
    // More specific error handling
    if (error.code === 'ECONNREFUSED' || error.message.includes('database')) {
      res.status(503).json({ error: 'Database service unavailable. Using demo mode.' });
    } else if (error.message.includes('SMS')) {
      res.status(503).json({ error: 'SMS service unavailable. Check console for OTP.' });
    } else {
      res.status(500).json({ error: 'Server error. Please check console logs.' });
    }
  }
});

// Verify OTP and get WiFi credentials
router.post('/verify-otp', async (req, res) => {
  try {
    const { phone, unitNumber, otp } = req.body;

    console.log(`🔐 OTP Verification Request:`, { phone, unitNumber, otp });

    // Validate input
    if (!phone || !unitNumber || !otp) {
      return res.status(400).json({ error: 'Phone, unit number, and OTP are required' });
    }

    // Validate OTP format
    if (!/^\d{6}$/.test(otp)) {
      console.log(`❌ Invalid OTP format: ${otp}`);
      return res.status(400).json({ error: 'OTP must be a 6-digit number' });
    }

    // Check database connection
    if (!(await isDatabaseConnected())) {
      return res.status(503).json({ error: 'Database service unavailable. Please try again later.' });
    }

    const otpKey = `${phone}_${unitNumber}`;
    console.log(`🔍 Looking for OTP with key: ${otpKey}`);
    
    // Debug: Show all stored OTPs
    console.log(`📋 Current OTP Storage (${otpStorage.size} entries):`);
    for (const [key, value] of otpStorage.entries()) {
      console.log(`   ${key}: ${value.otp} (expires: ${new Date(value.expiresAt).toLocaleString()})`);
    }
    
    const otpData = otpStorage.get(otpKey);

    if (!otpData) {
      return res.status(400).json({ error: 'OTP not found or expired. Please request a new OTP.' });
    }

    // Check expiry
    if (Date.now() > otpData.expiresAt) {
      otpStorage.delete(otpKey);
      return res.status(400).json({ error: 'OTP expired. Please request a new OTP.' });
    }

    // Check attempts
    if (otpData.attempts >= 3) {
      otpStorage.delete(otpKey);
      return res.status(400).json({ error: 'Too many failed attempts. Please request a new OTP.' });
    }

    // Verify OTP
    console.log(`🔍 Comparing OTPs: stored="${otpData.otp}" vs entered="${otp}"`);
    if (otpData.otp !== otp) {
      otpData.attempts++;
      console.log(`❌ OTP mismatch! Attempts: ${otpData.attempts}/3`);
      return res.status(400).json({ 
        error: 'Invalid OTP. Please check and try again.',
        attemptsLeft: 3 - otpData.attempts
      });
    }
    
    console.log(`✅ OTP verified successfully!`);

    // OTP verified - get fresh tenant details
    const tenant = await pool.query('SELECT * FROM tenants WHERE id = $1', [otpData.tenantId]);
    
    if (tenant.rows.length === 0) {
      return res.status(404).json({ error: 'Tenant account not found. Please contact admin.' });
    }

    const tenantData = tenant.rows[0];

    // Double-check payment status
    if (tenantData.payment_status === 'overdue') {
      return res.status(403).json({ 
        error: `Payment overdue: ₹${tenantData.current_bill}. Please clear dues before accessing WiFi.` 
      });
    }

    // Generate WiFi credentials
    const wifiCredentials = generateWiFiCredentials(tenantData.id, tenantData.plan_type);

    // Generate session token
    const sessionToken = crypto.randomBytes(32).toString('hex');
    
    // Clean up OTP
    otpStorage.delete(otpKey);

    // Get real client IP address (handle proxy and IPv6)
    let clientIP = req.headers['x-forwarded-for'] || 
                   req.connection.remoteAddress || 
                   req.socket.remoteAddress ||
                   req.ip;
  
    // Clean up IP address
    if (clientIP.includes('::ffff:')) {
      clientIP = clientIP.replace('::ffff:', ''); // Remove IPv6 prefix
    }
    if (clientIP === '::1') {
      clientIP = '127.0.0.1'; // Convert IPv6 localhost to IPv4
    }
  
    console.log(`🔍 Client IP detected: ${clientIP}`);

    const userAgent = req.get('User-Agent') || 'Unknown Device';
    const mockMacAddress = `AA:BB:CC:DD:EE:${Math.floor(Math.random() * 256).toString(16).padStart(2, '0').toUpperCase()}`;
    
    await pool.query(
      `INSERT INTO network_sessions (tenant_id, device_ip, device_mac, session_start, data_uploaded, data_downloaded, total_data, is_active)
       VALUES ($1, $2, $3, NOW(), 0, 0, 0, true)`,
      [tenantData.id, clientIP, mockMacAddress]
    );

    // Create or update billing record for current month
    const currentMonth = new Date();
    currentMonth.setDate(1); // First day of current month
    
    try {
      // Check if billing record exists for this month
      const existingBilling = await pool.query(
        'SELECT id FROM billing_records WHERE tenant_id = $1 AND billing_month = $2',
        [tenantData.id, currentMonth]
      );

      if (existingBilling.rows.length === 0) {
        // Create new billing record with ₹0 initial amount
        await pool.query(`
          INSERT INTO billing_records (
            tenant_id, billing_month, data_consumed, usage_charges, 
            gst_amount, total_amount, payment_status, due_date
          ) VALUES ($1, $2, 0, 0, 0, 0, 'pending', $3)
        `, [
          tenantData.id, 
          currentMonth, 
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
        ]);
        
        console.log(`📊 Billing record created for tenant: ${tenantData.name} - ₹0`);
      }
    } catch (billingError) {
      console.log('⚠️ Billing record creation failed (continuing without billing):', billingError.message);
    }

    // Apply speed limits based on tenant plan
    const speeds = parseSpeedRange(tenantData.speed_range, tenantData.plan_type);
    
    // Check if device is connected via hotspot
    const hotspotStatus = await hotspotController.getStatus();
    
    if (hotspotStatus.running) {
      // Use hotspot controller for speed management
      try {
        const authResult = await hotspotController.authenticateDevice(
          clientIP,
          tenantData.id,
          speeds
        );
        
        if (authResult.success) {
          console.log(`🚀 Hotspot speed changed: ${clientIP} -> From ${hotspotController.defaultLimitMbps} to ${speeds.download} Mbps`);
        } else {
          console.log(`⚠️ Hotspot authentication failed: ${authResult.error}`);
        }
      } catch (hotspotError) {
        console.error('❌ Error with hotspot authentication:', hotspotError.message);
      }
    } else {
      // Fallback to regular network control
      try {
        const speedResult = await networkControl.applySpeedLimit(
          clientIP, 
          speeds.download, 
          speeds.upload, 
          tenantData.id
        );
        
        if (speedResult.success) {
          console.log(`🚀 Speed limits applied: ${clientIP} -> ${speeds.download}/${speeds.upload} Mbps`);
        } else {
          console.log(`⚠️ Speed limit application failed: ${speedResult.error}`);
        }
      } catch (speedError) {
        console.error('❌ Error applying speed limits:', speedError.message);
        // Continue without speed limits in case of error
      }
    }

    // Log successful authentication
    console.log(`✅ WiFi access granted to: ${tenantData.name} (${phone}) - Plan: ${tenantData.plan_type}`);

    // Return success response with proper headers for Android
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    res.json({
      success: true,
      message: 'WiFi access granted successfully!',
      sessionToken,
      wifiCredentials,
      tenant: {
        id: tenantData.id,
        name: tenantData.name,
        unitNumber: tenantData.unit_number,
        planType: tenantData.plan_type,
        maxSpeed: tenantData.speed_range,
        dataUsage: parseFloat(tenantData.data_usage) || 0,
        currentBill: parseFloat(tenantData.current_bill) || 0,
        connectionStatus: 'online'
      },
      qosPolicy: {
        maxDownload: tenantData.plan_type === 'Premium' ? 100 : 
                    tenantData.plan_type === 'Standard' ? 50 : 25,
        maxUpload: tenantData.plan_type === 'Premium' ? 20 : 
                   tenantData.plan_type === 'Standard' ? 10 : 5,
        priority: tenantData.plan_type === 'Premium' ? 'high' : 
                 tenantData.plan_type === 'Standard' ? 'normal' : 'low',
        burstAllowed: tenantData.plan_type !== 'Basic',
        burstLimit: tenantData.plan_type === 'Premium' ? 150 : 
                   tenantData.plan_type === 'Standard' ? 75 : null
      },
      networkInfo: {
        connectedAt: new Date().toISOString(),
        clientIP,
        deviceMac: mockMacAddress,
        validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      }
    });

  } catch (error) {
    console.error('❌ Error verifying OTP:', error);
    res.status(500).json({ error: 'Server error. Please try again later.' });
  }
});

// Get real-time tenant dashboard data
router.get('/dashboard/:sessionToken', async (req, res) => {
  try {
    const { sessionToken } = req.params;
    
    if (!sessionToken) {
      return res.status(400).json({ error: 'Session token required' });
    }

    // Check database connection
    if (!(await isDatabaseConnected())) {
      return res.status(503).json({ error: 'Database service unavailable' });
    }

    // Get active session data
    const session = await pool.query(`
      SELECT ns.*, t.* FROM network_sessions ns
      JOIN tenants t ON ns.tenant_id = t.id
      WHERE ns.is_active = true
      ORDER BY ns.session_start DESC
      LIMIT 1
    `);

    if (session.rows.length === 0) {
      return res.status(404).json({ error: 'No active session found' });
    }

    const sessionData = session.rows[0];
    const tenantData = sessionData;

    // Calculate real-time usage stats
    const sessionDuration = Date.now() - new Date(sessionData.session_start).getTime();
    const hoursConnected = sessionDuration / (1000 * 60 * 60);
    
    // Simulate real-time data transfer
    const currentSpeed = Math.floor(Math.random() * 
      (tenantData.plan_type === 'Premium' ? 100 : 
       tenantData.plan_type === 'Standard' ? 50 : 25) * 0.8 + 10);
    
    const sessionDataTransfer = (hoursConnected * currentSpeed * 0.1).toFixed(2); // MB

    // Get billing information
    const currentMonth = new Date();
    currentMonth.setDate(1);
    
    const billing = await pool.query(`
      SELECT * FROM billing_records 
      WHERE tenant_id = $1 AND billing_month >= $2
      ORDER BY billing_month DESC LIMIT 1
    `, [tenantData.id, currentMonth]);

    const billingData = billing.rows[0] || {};

    res.json({
      tenant: {
        id: tenantData.id,
        name: tenantData.name,
        unitNumber: tenantData.unit_number,
        planType: tenantData.plan_type,
        maxSpeed: tenantData.speed_range,
        dataUsage: parseFloat(tenantData.data_usage) || 0,
        currentBill: parseFloat(tenantData.current_bill) || 0,
        connectionStatus: 'online',
        paymentStatus: tenantData.payment_status
      },
      usage: {
        dailyUsage: (parseFloat(tenantData.data_usage) * 0.033).toFixed(1), // ~1/30 of monthly
        weeklyUsage: (parseFloat(tenantData.data_usage) * 0.25).toFixed(1), // 25% of monthly
        monthlyUsage: parseFloat(tenantData.data_usage) || 0,
        remainingData: tenantData.plan_type === 'Premium' ? 'Unlimited' :
                      tenantData.plan_type === 'Standard' ? (200 - parseFloat(tenantData.data_usage)).toFixed(1) + ' GB' : 
                      (100 - parseFloat(tenantData.data_usage)).toFixed(1) + ' GB',
        billingCycle: {
          startDate: currentMonth.toISOString().split('T')[0],
          endDate: new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).toISOString().split('T')[0],
          daysRemaining: Math.ceil((new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0) - new Date()) / (1000 * 60 * 60 * 24))
        }
      },
      currentSession: {
        connectedSince: sessionData.session_start,
        duration: Math.floor(hoursConnected * 60), // minutes
        currentSpeed: currentSpeed,
        maxSpeed: tenantData.plan_type === 'Premium' ? 100 : 
                 tenantData.plan_type === 'Standard' ? 50 : 25,
        dataTransferred: sessionDataTransfer,
        deviceIP: sessionData.device_ip,
        deviceMac: sessionData.device_mac,
        priority: tenantData.plan_type === 'Premium' ? 'high' : 
                 tenantData.plan_type === 'Standard' ? 'normal' : 'low'
      },
      qosPolicy: {
        maxDownload: tenantData.plan_type === 'Premium' ? 100 : 
                    tenantData.plan_type === 'Standard' ? 50 : 25,
        maxUpload: tenantData.plan_type === 'Premium' ? 20 : 
                   tenantData.plan_type === 'Standard' ? 10 : 5,
        priority: tenantData.plan_type === 'Premium' ? 'high' : 
                 tenantData.plan_type === 'Standard' ? 'normal' : 'low',
        burstAllowed: tenantData.plan_type !== 'Basic',
        burstLimit: tenantData.plan_type === 'Premium' ? 150 : 
                   tenantData.plan_type === 'Standard' ? 75 : null,
        throttled: false // Real-time throttling status
      },
      billing: {
        currentMonth: billingData.billing_month || currentMonth,
        dataConsumed: parseFloat(billingData.data_consumed) || parseFloat(tenantData.data_usage) || 0,
        usageCharges: parseFloat(billingData.usage_charges) || 0,
        gstAmount: parseFloat(billingData.gst_amount) || 0,
        totalAmount: parseFloat(billingData.total_amount) || parseFloat(tenantData.current_bill) || 0,
        paymentStatus: billingData.payment_status || tenantData.payment_status,
        ratePerGB: parseFloat(tenantData.rate_per_gb) || 0
      },
      networkHealth: {
        latency: Math.floor(Math.random() * 20 + 5), // ms
        packetLoss: (Math.random() * 0.5).toFixed(2), // %
        jitter: Math.floor(Math.random() * 5 + 1), // ms
        signalStrength: Math.floor(Math.random() * 20 + 80) // %
      }
    });

  } catch (error) {
    console.error('❌ Error fetching dashboard:', error);
    res.status(500).json({ error: 'Server error. Please try again later.' });
  }
});

// Disconnect session
router.post('/disconnect/:sessionToken', async (req, res) => {
  try {
    const { sessionToken } = req.params;
    
    // Update all active sessions for demo
    await pool.query(`
      UPDATE network_sessions 
      SET is_active = false, session_end = NOW()
      WHERE is_active = true
    `);

    // Update tenant status
    await pool.query(`
      UPDATE tenants 
      SET connection_status = 'offline'
      WHERE connection_status = 'online'
    `);

    console.log('📴 WiFi session disconnected');

    res.json({
      message: 'WiFi session disconnected successfully',
      disconnectedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error disconnecting session:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Helper function to parse speed range and plan type into actual speeds
 */
function parseSpeedRange(speedRange, planType) {
  // Default speeds based on plan type
  const planSpeeds = {
    'Basic': { download: 25, upload: 5 },
    'Standard': { download: 50, upload: 10 },
    'Premium': { download: 100, upload: 20 }
  };

  // Try to parse speed range (e.g., "50-100 Mbps")
  const match = speedRange.match(/(\d+)-(\d+)/);
  if (match) {
    const minSpeed = parseInt(match[1]);
    const maxSpeed = parseInt(match[2]);
    
    return {
      download: maxSpeed,
      upload: Math.round(maxSpeed * 0.2) // 20% of download speed for upload
    };
  }

  // Fall back to plan-based speeds
  return planSpeeds[planType] || planSpeeds['Basic'];
}

module.exports = router;
