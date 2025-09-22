const express = require('express');
const router = express.Router();
const hotspotController = require('../services/windowsHotspotController');
const pool = require('../config/database');

/**
 * Hotspot Management Routes
 * Controls Windows Mobile Hotspot with automatic speed limiting
 */

// Start hotspot with captive portal
router.post('/start', async (req, res) => {
  try {
    console.log('🚀 Starting LinkNest WiFi Hotspot...');
    
    // Start the hotspot
    const result = await hotspotController.startHotspot();
    
    if (result.success) {
      // Setup DNS redirection for captive portal
      await hotspotController.setupDNSRedirection();
      
      res.json({
        success: true,
        message: 'Hotspot started successfully',
        ssid: result.ssid,
        defaultSpeedLimit: hotspotController.defaultLimitMbps,
        captivePortal: true
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
    
  } catch (error) {
    console.error('❌ Error starting hotspot:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Stop hotspot
router.post('/stop', async (req, res) => {
  try {
    console.log('🛑 Stopping LinkNest WiFi Hotspot...');
    
    // Cleanup DNS redirection
    await hotspotController.cleanupDNSRedirection();
    
    // Stop the hotspot
    const result = await hotspotController.stopHotspot();
    
    res.json({
      success: result.success,
      message: result.success ? 'Hotspot stopped successfully' : 'Failed to stop hotspot'
    });
    
  } catch (error) {
    console.error('❌ Error stopping hotspot:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get hotspot status
router.get('/status', async (req, res) => {
  try {
    const status = await hotspotController.getStatus();
    
    res.json({
      success: true,
      ...status
    });
    
  } catch (error) {
    console.error('❌ Error getting hotspot status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get connected devices
router.get('/devices', async (req, res) => {
  try {
    const devices = await hotspotController.getConnectedDevices();
    
    res.json({
      success: true,
      devices,
      totalDevices: devices.length
    });
    
  } catch (error) {
    console.error('❌ Error getting connected devices:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Authenticate device after OTP verification
router.post('/authenticate-device', async (req, res) => {
  try {
    const { deviceIP, tenantId } = req.body;
    
    if (!deviceIP || !tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Device IP and tenant ID required'
      });
    }
    
    console.log(`🔓 Authenticating device ${deviceIP} for tenant ${tenantId}`);
    
    // Get tenant plan details
    const tenantResult = await pool.query(
      'SELECT * FROM tenants WHERE id = $1',
      [tenantId]
    );
    
    if (tenantResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Tenant not found'
      });
    }
    
    const tenant = tenantResult.rows[0];
    
    // Determine speeds based on plan
    const planSpeeds = getPlanSpeeds(tenant.plan_type, tenant.speed_range);
    
    // Authenticate device and apply new speed limits
    const result = await hotspotController.authenticateDevice(
      deviceIP,
      tenantId,
      planSpeeds
    );
    
    if (result.success) {
      // Log the session in database
      await pool.query(
        `INSERT INTO network_sessions 
         (tenant_id, device_ip, session_start, is_active, status)
         VALUES ($1, $2, NOW(), true, 'active')
         ON CONFLICT (device_ip) DO UPDATE SET
         tenant_id = $1, session_start = NOW(), is_active = true, status = 'active'`,
        [tenantId, deviceIP]
      );
      
      res.json({
        success: true,
        message: 'Device authenticated successfully',
        deviceIP,
        tenant: {
          id: tenant.id,
          name: tenant.name,
          unitNumber: tenant.unit_number,
          planType: tenant.plan_type
        },
        speeds: planSpeeds,
        previousSpeed: hotspotController.defaultLimitMbps,
        newSpeed: planSpeeds.download
      });
      
      console.log(`✅ Device ${deviceIP} authenticated - Speed changed from ${hotspotController.defaultLimitMbps} to ${planSpeeds.download} Mbps`);
      
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
    
  } catch (error) {
    console.error('❌ Error authenticating device:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Disconnect device
router.post('/disconnect-device', async (req, res) => {
  try {
    const { deviceIP } = req.body;
    
    if (!deviceIP) {
      return res.status(400).json({
        success: false,
        error: 'Device IP required'
      });
    }
    
    console.log(`🔌 Disconnecting device ${deviceIP}`);
    
    // Remove speed limits
    await hotspotController.removeSpeedLimit(deviceIP);
    
    // Update database
    await pool.query(
      'UPDATE network_sessions SET is_active = false, end_time = NOW() WHERE device_ip = $1',
      [deviceIP]
    );
    
    res.json({
      success: true,
      message: 'Device disconnected successfully'
    });
    
  } catch (error) {
    console.error('❌ Error disconnecting device:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Apply speed limit manually (for testing)
router.post('/apply-speed-limit', async (req, res) => {
  try {
    const { deviceIP, downloadMbps, uploadMbps } = req.body;
    
    if (!deviceIP || !downloadMbps || !uploadMbps) {
      return res.status(400).json({
        success: false,
        error: 'Device IP and speed limits required'
      });
    }
    
    const result = await hotspotController.applySpeedLimit(
      deviceIP,
      downloadMbps,
      uploadMbps
    );
    
    res.json(result);
    
  } catch (error) {
    console.error('❌ Error applying speed limit:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Helper function to determine speeds based on plan
function getPlanSpeeds(planType, speedRange) {
  const defaultSpeeds = {
    'Basic': { download: 25, upload: 5 },
    'Standard': { download: 50, upload: 10 },
    'Premium': { download: 100, upload: 20 }
  };
  
  // Try to parse speed range if provided
  if (speedRange) {
    const match = speedRange.match(/(\d+)-(\d+)/);
    if (match) {
      const maxSpeed = parseInt(match[2]);
      return {
        download: maxSpeed,
        upload: Math.round(maxSpeed * 0.2) // 20% of download for upload
      };
    }
  }
  
  return defaultSpeeds[planType] || defaultSpeeds['Basic'];
}

module.exports = router;
