const express = require('express');
const path = require('path');
const pool = require('../config/database');
const networkControl = require('../services/networkControl');
const captivePortalManager = require('../services/captivePortalManager');

const router = express.Router();

/**
 * Captive Portal Routes
 * Handles device detection, redirection, and authentication flow
 */

// Store authenticated devices in memory (in production, use Redis)
const authenticatedDevices = new Map();
const deviceSessions = new Map();

/**
 * Detect if device is mobile based on User-Agent
 */
function isMobileDevice(userAgent) {
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  return mobileRegex.test(userAgent);
}

/**
 * Get device info from request
 */
function getDeviceInfo(req) {
  const userAgent = req.get('User-Agent') || '';
  
  // Get real IP address
  let ip = req.headers['x-forwarded-for'] || 
           req.headers['x-real-ip'] ||
           req.connection.remoteAddress || 
           req.socket.remoteAddress ||
           req.ip || 
           'unknown';
  
  // Clean up IP address
  if (ip.includes(',')) {
    ip = ip.split(',')[0].trim(); // Get first IP if multiple
  }
  if (ip.includes('::ffff:')) {
    ip = ip.replace('::ffff:', ''); // Remove IPv6 prefix
  }
  if (ip === '::1') {
    ip = '127.0.0.1'; // Convert IPv6 localhost to IPv4
  }
  
  console.log(`📱 Device detected - IP: ${ip}, User-Agent: ${userAgent.substring(0, 50)}...`);
  
  return {
    ip,
    userAgent,
    os: getOSInfo(userAgent),
    browser: getBrowserInfo(userAgent),
    isMobile: /Mobile|Android|iPhone|iPad/i.test(userAgent),
    timestamp: new Date()
  };
}

function getBrowserInfo(userAgent) {
  if (userAgent.includes('Chrome')) return 'Chrome';
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Safari')) return 'Safari';
  if (userAgent.includes('Edge')) return 'Edge';
  return 'Unknown';
}

function getOSInfo(userAgent) {
  if (userAgent.includes('Android')) return 'Android';
  if (userAgent.includes('iPhone') || userAgent.includes('iPad')) return 'iOS';
  if (userAgent.includes('Windows')) return 'Windows';
  if (userAgent.includes('Mac')) return 'macOS';
  if (userAgent.includes('Linux')) return 'Linux';
  return 'Unknown';
}

/**
 * Main captive portal detection endpoint
 * This catches all HTTP requests from newly connected devices
 */
router.get('/generate_204', async (req, res) => {
  // Android connectivity check
  const deviceInfo = getDeviceInfo(req);
  
  console.log(`📱 Android device check: ${deviceInfo.ip}`);
  
  // Register device and check authentication
  const isAuthenticated = captivePortalManager.registerDevice(deviceInfo.ip, deviceInfo);
  
  if (isAuthenticated) {
    console.log(`✅ Device ${deviceInfo.ip} already authenticated`);
    // Set proper headers for Android captive portal detection
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Content-Type': 'text/plain'
    });
    return res.status(204).send(); // No content - device has internet access
  }
  
  // Apply default speed limit (5 Mbps)
  try {
    await networkControl.applySpeedLimit(deviceInfo.ip, 5, 5, 'unauthenticated');
    console.log(`🔒 Device ${deviceInfo.ip} limited to 5 Mbps until authentication`);
  } catch (error) {
    console.error(`Failed to apply initial speed limit: ${error.message}`);
  }
  
  // Redirect to captive portal
  const redirectUrl = captivePortalManager.getPortalRedirectUrl(deviceInfo.ip, deviceInfo.isMobile);
  console.log(`🔀 Redirecting ${deviceInfo.ip} to: ${redirectUrl}`);
  
  res.status(302).redirect(redirectUrl);
});

/**
 * iOS captive portal detection
 */
router.get('/hotspot-detect.html', async (req, res) => {
  const deviceInfo = getDeviceInfo(req);
  
  console.log(`🍎 iOS captive portal check: ${deviceInfo.ip}`);
  
  // Register device and check authentication
  const isAuthenticated = captivePortalManager.registerDevice(deviceInfo.ip, deviceInfo);
  
  if (isAuthenticated) {
    return res.send('<HTML><HEAD><TITLE>Success</TITLE></HEAD><BODY>Success</BODY></HTML>');
  }
  
  // Apply default speed limit
  try {
    await networkControl.applySpeedLimit(deviceInfo.ip, 5, 5, 'unauthenticated');
    console.log(`🔒 iOS device ${deviceInfo.ip} limited to 5 Mbps`);
  } catch (error) {
    console.error(`Failed to apply initial speed limit: ${error.message}`);
  }
  
  // Redirect to portal
  const redirectUrl = captivePortalManager.getPortalRedirectUrl(deviceInfo.ip, true);
  res.status(302).redirect(redirectUrl);
});

/**
 * Windows captive portal detection
 */
router.get('/connecttest.txt', (req, res) => {
  const deviceInfo = getDeviceInfo(req);
  
  console.log(`🪟 Windows captive portal check: ${deviceInfo.ip}`);
  
  if (authenticatedDevices.has(deviceInfo.ip)) {
    return res.send('Microsoft Connect Test');
  }
  
  deviceSessions.set(deviceInfo.ip, deviceInfo);
  res.status(302).redirect(`http://192.168.1.1:3000/portal?device=${deviceInfo.ip}&mobile=false`);
});

/**
 * Generic captive portal detection (fallback)
 */
router.get('/check', (req, res) => {
  const deviceInfo = getDeviceInfo(req);
  
  console.log(`🌐 Generic captive portal check: ${deviceInfo.ip}`);
  
  if (authenticatedDevices.has(deviceInfo.ip)) {
    return res.json({ status: 'authenticated', access: 'granted' });
  }
  
  deviceSessions.set(deviceInfo.ip, deviceInfo);
  res.status(302).redirect(`http://192.168.1.1:3000/portal?device=${deviceInfo.ip}&mobile=${deviceInfo.isMobile}`);
});

/**
 * Captive Portal Landing Page
 * This is where users are redirected to authenticate
 */
router.get('/portal', (req, res) => {
  const deviceIP = req.query.device || getDeviceInfo(req).ip;
  const isMobile = req.query.mobile === 'true';
  const deviceInfo = deviceSessions.get(deviceIP) || getDeviceInfo(req);
  
  console.log(`🔐 Serving captive portal to: ${deviceIP} (Mobile: ${isMobile})`);
  
  // Update device session
  deviceSessions.set(deviceIP, {
    ...deviceInfo,
    portalAccessed: new Date(),
    isMobile
  });
  
  // Serve the captive portal HTML
  const portalHTML = generateCaptivePortalHTML(deviceIP, deviceInfo);
  res.send(portalHTML);
});

/**
 * Handle device authentication after OTP verification
 */
router.post('/authenticate-device', async (req, res) => {
  const deviceIP = req.ip.replace('::ffff:', '');
  const { tenantId, sessionToken } = req.body;
  
  console.log(`🔐 Authenticating device ${deviceIP} for tenant ${tenantId}`);
  
  // Mark device as authenticated
  authenticatedDevices.set(deviceIP, {
    authenticated: true,
    tenantId,
    sessionToken,
    authenticatedAt: new Date()
  });
  
  // Store in captive portal manager if it exists
  if (captivePortalManager && captivePortalManager.authenticateDevice) {
    captivePortalManager.authenticateDevice(deviceIP, { tenantId, sessionToken });
  }
  
  res.json({
    success: true,
    message: 'Device authenticated successfully',
    deviceIP
  });
});

/**
 * Check if device is authenticated
 */
router.get('/check-auth/:deviceIP', (req, res) => {
  const deviceIP = req.params.deviceIP;
  const authInfo = authenticatedDevices.get(deviceIP);
  
  if (authInfo) {
    res.json({
      authenticated: true,
      tenantId: authInfo.tenantId,
      sessionToken: authInfo.sessionToken,
      authenticatedAt: authInfo.authenticatedAt
    });
  } else {
    res.json({
      authenticated: false,
      redirectUrl: `/portal?device=${deviceIP}`
    });
  }
});

/**
 * Disconnect device (admin function)
 */
router.post('/disconnect-device', async (req, res) => {
  try {
    const { deviceIP } = req.body;
    
    if (!deviceIP) {
      return res.status(400).json({ error: 'Device IP required' });
    }
    
    // Remove authentication
    authenticatedDevices.delete(deviceIP);
    deviceSessions.delete(deviceIP);
    
    // Remove speed limits
    await networkControl.removeSpeedLimit(deviceIP);
    
    // Update database
    await pool.query(
      'UPDATE network_sessions SET is_active = false, end_time = NOW() WHERE device_ip = $1',
      [deviceIP]
    );
    
    console.log(`🔌 Device ${deviceIP} disconnected`);
    
    res.json({
      success: true,
      message: 'Device disconnected successfully'
    });
    
  } catch (error) {
    console.error('❌ Error disconnecting device:', error);
    res.status(500).json({ error: 'Disconnection failed' });
  }
});

/**
 * Get all authenticated devices
 */
router.get('/authenticated-devices', (req, res) => {
  const devices = captivePortalManager.getConnectedDevices();
  
  res.json({
    success: true,
    devices,
    totalDevices: devices.length
  });
});

/**
 * Direct captive portal test endpoint
 */
router.get('/test-portal', async (req, res) => {
  const deviceInfo = getDeviceInfo(req);
  
  console.log(`🧪 PORTAL TEST: Device ${deviceInfo.ip} accessing test portal`);
  
  // Register device and check authentication
  const isAuthenticated = captivePortalManager.registerDevice(deviceInfo.ip, deviceInfo);
  
  if (isAuthenticated) {
    console.log(`✅ Device ${deviceInfo.ip} already authenticated`);
    return res.json({ 
      status: 'authenticated', 
      message: 'Device already has internet access',
      deviceIP: deviceInfo.ip 
    });
  }
  
  // Apply default speed limit
  try {
    await networkControl.applySpeedLimit(deviceInfo.ip, 5, 5, 'unauthenticated');
    console.log(`🔒 Device ${deviceInfo.ip} limited to 5 Mbps until authentication`);
  } catch (error) {
    console.error(`Failed to apply initial speed limit: ${error.message}`);
  }
  
  // Redirect to captive portal
  const redirectUrl = captivePortalManager.getPortalRedirectUrl(deviceInfo.ip, deviceInfo.isMobile);
  console.log(`🔀 Test portal redirecting ${deviceInfo.ip} to: ${redirectUrl}`);
  
  res.status(302).redirect(redirectUrl);
});

/**
 * Catch-all route for captive portal detection
 * This should be the LAST route to catch any unhandled requests
 */
router.get('*', async (req, res) => {
  const deviceInfo = getDeviceInfo(req);
  
  // Skip API routes, assets, and portal pages
  if (req.path.includes('/api/') || 
      req.path.includes('/tenant') ||
      req.path.includes('/admin') ||
      req.path.includes('.js') ||
      req.path.includes('.css') ||
      req.path.includes('.ico') ||
      req.path.includes('/assets/')) {
    return res.status(404).send('Not Found');
  }
  
  console.log(`🌐 Catch-all captive portal check: ${deviceInfo.ip} requested ${req.path}`);
  
  // Register device and check authentication
  const isAuthenticated = captivePortalManager.registerDevice(deviceInfo.ip, deviceInfo);
  
  if (isAuthenticated) {
    console.log(`✅ Device ${deviceInfo.ip} already authenticated - allowing request`);
    return res.status(204).send(); // No content - device has internet access
  }
  
  // Apply default speed limit
  try {
    await networkControl.applySpeedLimit(deviceInfo.ip, 5, 5, 'unauthenticated');
    console.log(`🔒 Device ${deviceInfo.ip} limited to 5 Mbps until authentication`);
  } catch (error) {
    console.error(`Failed to apply initial speed limit: ${error.message}`);
  }
  
  // Redirect to captive portal
  const redirectUrl = captivePortalManager.getPortalRedirectUrl(deviceInfo.ip, deviceInfo.isMobile);
  console.log(`🔀 Catch-all redirecting ${deviceInfo.ip} to: ${redirectUrl}`);
  
  res.status(302).redirect(redirectUrl);
});

/**
 * Generate Captive Portal HTML
 */
function generateCaptivePortalHTML(deviceIP, deviceInfo) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LinkNest WiFi - Authentication Required</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        
        .portal-container {
            background: white;
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            text-align: center;
            max-width: 400px;
            width: 100%;
        }
        
        .wifi-icon {
            width: 80px;
            height: 80px;
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 30px;
            color: white;
            font-size: 40px;
        }
        
        h1 {
            color: #333;
            margin-bottom: 10px;
            font-size: 28px;
        }
        
        .subtitle {
            color: #666;
            margin-bottom: 30px;
            font-size: 16px;
        }
        
        .device-info {
            background: #f8f9fa;
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 30px;
            text-align: left;
        }
        
        .device-info h3 {
            color: #333;
            margin-bottom: 15px;
            font-size: 18px;
        }
        
        .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            font-size: 14px;
        }
        
        .info-label {
            color: #666;
            font-weight: 500;
        }
        
        .info-value {
            color: #333;
            font-weight: 600;
        }
        
        .auth-button {
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
            color: white;
            border: none;
            padding: 15px 30px;
            border-radius: 50px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            width: 100%;
            margin-bottom: 20px;
        }
        
        .auth-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(79, 172, 254, 0.3);
        }
        
        .footer {
            color: #999;
            font-size: 12px;
            margin-top: 20px;
        }
        
        .status-indicator {
            display: inline-block;
            width: 10px;
            height: 10px;
            background: #ff6b6b;
            border-radius: 50%;
            margin-right: 8px;
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
        }
        
        @media (max-width: 480px) {
            .portal-container {
                padding: 30px 20px;
            }
            
            h1 {
                font-size: 24px;
            }
        }
    </style>
</head>
<body>
    <div class="portal-container">
        <div class="wifi-icon">📶</div>
        
        <h1>WiFi Authentication</h1>
        <p class="subtitle">
            <span class="status-indicator"></span>
            Internet access blocked - Authentication required
        </p>
        
        <div class="device-info">
            <h3>Device Information</h3>
            <div class="info-row">
                <span class="info-label">IP Address:</span>
                <span class="info-value">${deviceIP}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Device Type:</span>
                <span class="info-value">${deviceInfo.isMobile ? 'Mobile' : 'Desktop'}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Browser:</span>
                <span class="info-value">${deviceInfo.browser}</span>
            </div>
            <div class="info-row">
                <span class="info-label">OS:</span>
                <span class="info-value">${deviceInfo.os}</span>
            </div>
        </div>
        
        <button class="auth-button" onclick="redirectToAuth()">
            🔐 Authenticate with OTP
        </button>
        
        <div class="footer">
            <p>LinkNest Smart WiFi Controller</p>
            <p>Secure • Fast • Reliable</p>
        </div>
    </div>
    
    <script>
        function redirectToAuth() {
            // Redirect to the tenant portal with device info
            const authUrl = 'http://192.168.1.1:5175/tenant?device=${deviceIP}&captive=true';
            window.location.href = authUrl;
        }
        
        // Auto-redirect after 10 seconds if user doesn't click
        setTimeout(() => {
            console.log('Auto-redirecting to authentication...');
            redirectToAuth();
        }, 10000);
        
        // Check authentication status periodically
        setInterval(async () => {
            try {
                const response = await fetch('/status/${deviceIP}');
                const data = await response.json();
                
                if (data.authenticated) {
                    document.body.innerHTML = \`
                        <div class="portal-container">
                            <div class="wifi-icon" style="background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);">✅</div>
                            <h1 style="color: #4CAF50;">Connected!</h1>
                            <p class="subtitle">Internet access granted</p>
                            <p>Welcome \${data.tenant} (Unit \${data.unit})</p>
                            <p>Plan: \${data.plan}</p>
                        </div>
                    \`;
                    
                    // Redirect to a success page or close captive portal
                    setTimeout(() => {
                        window.location.href = 'http://www.google.com';
                    }, 3000);
                }
            } catch (error) {
                console.log('Status check failed:', error);
            }
        }, 5000);
    </script>
</body>
</html>
  `;
}

/**
 * Helper function to parse speed range
 */
function parseSpeedRange(speedRange, planType) {
  const planSpeeds = {
    'Basic': { download: 25, upload: 5 },
    'Standard': { download: 50, upload: 10 },
    'Premium': { download: 100, upload: 20 }
  };

  const match = speedRange.match(/(\d+)-(\d+)/);
  if (match) {
    const maxSpeed = parseInt(match[2]);
    return {
      download: maxSpeed,
      upload: Math.round(maxSpeed * 0.2)
    };
  }

  return planSpeeds[planType] || planSpeeds['Basic'];
}

module.exports = router;
