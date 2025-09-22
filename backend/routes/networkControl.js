const express = require('express');
const router = express.Router();
const networkControl = require('../services/networkControl');
const pool = require('../config/database');
const { authenticateAdmin } = require('../middleware/auth');

/**
 * Network Control API Routes
 * Handles speed control, QoS management, and traffic monitoring
 */

// Apply speed limit to a device
router.post('/apply-speed-limit', authenticateAdmin, async (req, res) => {
  try {
    const { deviceIP, tenantId, downloadMbps, uploadMbps } = req.body;

    if (!deviceIP || !tenantId || !downloadMbps || !uploadMbps) {
      return res.status(400).json({ 
        error: 'Device IP, tenant ID, download speed, and upload speed are required' 
      });
    }

    // Validate tenant exists
    const tenant = await pool.query('SELECT * FROM tenants WHERE id = $1', [tenantId]);
    if (tenant.rows.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const result = await networkControl.applySpeedLimit(deviceIP, downloadMbps, uploadMbps, tenantId);
    
    if (result.success) {
      // Log the speed control action
      await pool.query(
        `INSERT INTO network_sessions (tenant_id, device_ip, status, data_uploaded, data_downloaded, total_data, is_active)
         VALUES ($1, $2, 'speed_controlled', 0, 0, 0, true)
         ON CONFLICT (device_ip) DO UPDATE SET 
         status = 'speed_controlled', 
         start_time = NOW(), 
         is_active = true`,
        [tenantId, deviceIP]
      );

      console.log(`✅ Speed limit applied: ${deviceIP} -> ${downloadMbps}/${uploadMbps} Mbps`);
      
      res.json({
        success: true,
        message: result.message,
        deviceIP,
        downloadMbps,
        uploadMbps,
        appliedAt: new Date()
      });
    } else {
      res.status(500).json({ error: result.error });
    }

  } catch (error) {
    console.error('❌ Error applying speed limit:', error);
    res.status(500).json({ error: 'Failed to apply speed limit' });
  }
});

// Remove speed limit from a device
router.post('/remove-speed-limit', authenticateAdmin, async (req, res) => {
  try {
    const { deviceIP } = req.body;

    if (!deviceIP) {
      return res.status(400).json({ error: 'Device IP is required' });
    }

    const result = await networkControl.removeSpeedLimit(deviceIP);
    
    if (result.success) {
      // Update database
      await pool.query(
        `UPDATE network_sessions SET is_active = false, end_time = NOW(), status = 'disconnected' 
         WHERE device_ip = $1 AND is_active = true`,
        [deviceIP]
      );

      console.log(`✅ Speed limit removed: ${deviceIP}`);
      
      res.json({
        success: true,
        message: result.message,
        deviceIP,
        removedAt: new Date()
      });
    } else {
      res.status(500).json({ error: result.error });
    }

  } catch (error) {
    console.error('❌ Error removing speed limit:', error);
    res.status(500).json({ error: 'Failed to remove speed limit' });
  }
});

// Update speed limit for existing device
router.post('/update-speed-limit', authenticateAdmin, async (req, res) => {
  try {
    const { deviceIP, downloadMbps, uploadMbps } = req.body;

    if (!deviceIP || !downloadMbps || !uploadMbps) {
      return res.status(400).json({ 
        error: 'Device IP, download speed, and upload speed are required' 
      });
    }

    const result = await networkControl.updateSpeedLimit(deviceIP, downloadMbps, uploadMbps);
    
    if (result.success) {
      console.log(`✅ Speed limit updated: ${deviceIP} -> ${downloadMbps}/${uploadMbps} Mbps`);
      
      res.json({
        success: true,
        message: result.message,
        deviceIP,
        downloadMbps,
        uploadMbps,
        updatedAt: new Date()
      });
    } else {
      res.status(500).json({ error: result.error });
    }

  } catch (error) {
    console.error('❌ Error updating speed limit:', error);
    res.status(500).json({ error: 'Failed to update speed limit' });
  }
});

// Get all active network sessions
router.get('/active-sessions', authenticateAdmin, async (req, res) => {
  try {
    // Get sessions from network control service
    const activeSessions = networkControl.getActiveSessions();
    
    // Get additional data from database
    const dbSessions = await pool.query(`
      SELECT ns.*, t.name, t.unit_number, t.plan_type, t.speed_range
      FROM network_sessions ns
      JOIN tenants t ON ns.tenant_id = t.id
      WHERE ns.is_active = true
      ORDER BY ns.start_time DESC
    `);

    // Merge data
    const enrichedSessions = activeSessions.map(session => {
      const dbData = dbSessions.rows.find(db => db.device_ip === session.deviceIP);
      return {
        ...session,
        tenantName: dbData?.name || 'Unknown',
        unitNumber: dbData?.unit_number || 'Unknown',
        planType: dbData?.plan_type || 'Unknown',
        speedRange: dbData?.speed_range || 'Unknown',
        sessionStart: dbData?.start_time || session.appliedAt
      };
    });

    res.json({
      success: true,
      sessions: enrichedSessions,
      totalActiveSessions: enrichedSessions.length
    });

  } catch (error) {
    console.error('❌ Error fetching active sessions:', error);
    res.status(500).json({ error: 'Failed to fetch active sessions' });
  }
});

// Monitor network usage for all active sessions
router.get('/network-usage', authenticateAdmin, async (req, res) => {
  try {
    const usage = await networkControl.monitorNetworkUsage();
    
    const usageArray = Array.from(usage.entries()).map(([deviceIP, data]) => ({
      deviceIP,
      ...data
    }));

    res.json({
      success: true,
      usage: usageArray,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('❌ Error monitoring network usage:', error);
    res.status(500).json({ error: 'Failed to monitor network usage' });
  }
});

// Perform speed test for a specific device
router.post('/speed-test', authenticateAdmin, async (req, res) => {
  try {
    const { deviceIP } = req.body;

    if (!deviceIP) {
      return res.status(400).json({ error: 'Device IP is required' });
    }

    const speedTest = await networkControl.performSpeedTest(deviceIP);
    
    if (speedTest.error) {
      return res.status(404).json({ error: speedTest.error });
    }

    res.json({
      success: true,
      speedTest
    });

  } catch (error) {
    console.error('❌ Error performing speed test:', error);
    res.status(500).json({ error: 'Failed to perform speed test' });
  }
});

// Apply speed limits based on tenant plan
router.post('/apply-plan-speeds', authenticateAdmin, async (req, res) => {
  try {
    const { tenantId, deviceIP } = req.body;

    if (!tenantId || !deviceIP) {
      return res.status(400).json({ error: 'Tenant ID and device IP are required' });
    }

    // Get tenant plan details
    const tenant = await pool.query('SELECT * FROM tenants WHERE id = $1', [tenantId]);
    if (tenant.rows.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const tenantData = tenant.rows[0];
    
    // Parse speed range to get actual speeds
    const speeds = parseSpeedRange(tenantData.speed_range, tenantData.plan_type);
    
    const result = await networkControl.applySpeedLimit(
      deviceIP, 
      speeds.download, 
      speeds.upload, 
      tenantId
    );

    if (result.success) {
      res.json({
        success: true,
        message: `Speed limits applied based on ${tenantData.plan_type} plan`,
        tenant: {
          name: tenantData.name,
          unitNumber: tenantData.unit_number,
          planType: tenantData.plan_type,
          speedRange: tenantData.speed_range
        },
        appliedSpeeds: speeds,
        deviceIP
      });
    } else {
      res.status(500).json({ error: result.error });
    }

  } catch (error) {
    console.error('❌ Error applying plan speeds:', error);
    res.status(500).json({ error: 'Failed to apply plan speeds' });
  }
});

// Get network control system status
router.get('/system-status', authenticateAdmin, async (req, res) => {
  try {
    const activeSessions = networkControl.getActiveSessions();
    const totalSessions = activeSessions.length;
    
    // Calculate total bandwidth usage
    const totalDownload = activeSessions.reduce((sum, session) => sum + session.downloadMbps, 0);
    const totalUpload = activeSessions.reduce((sum, session) => sum + session.uploadMbps, 0);

    res.json({
      success: true,
      systemStatus: {
        isActive: true,
        platform: process.platform,
        totalActiveSessions: totalSessions,
        totalAllocatedDownload: totalDownload,
        totalAllocatedUpload: totalUpload,
        lastUpdated: new Date()
      },
      activeSessions: activeSessions.map(session => ({
        deviceIP: session.deviceIP,
        downloadMbps: session.downloadMbps,
        uploadMbps: session.uploadMbps,
        appliedAt: session.appliedAt,
        status: session.status
      }))
    });

  } catch (error) {
    console.error('❌ Error getting system status:', error);
    res.status(500).json({ error: 'Failed to get system status' });
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
