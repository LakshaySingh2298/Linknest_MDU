const express = require('express');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Get network statistics
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const activeConnections = await pool.query(`
      SELECT COUNT(*) as count 
      FROM network_sessions 
      WHERE is_active = true
    `);
    
    const totalBandwidth = await pool.query(`
      SELECT 
        SUM(data_uploaded + data_downloaded) as total_data,
        SUM(data_uploaded) as total_uploaded,
        SUM(data_downloaded) as total_downloaded
      FROM network_sessions
      WHERE is_active = true
    `);
    
    const tenantStats = await pool.query(`
      SELECT 
        t.plan_type,
        COUNT(DISTINCT ns.tenant_id) as active_tenants,
        SUM(ns.data_uploaded + ns.data_downloaded) as total_usage
      FROM network_sessions ns
      JOIN tenants t ON ns.tenant_id = t.id
      WHERE ns.is_active = true
      GROUP BY t.plan_type
    `);
    
    const hourlyUsage = await pool.query(`
      SELECT 
        DATE_TRUNC('hour', session_start) as hour,
        SUM(data_uploaded + data_downloaded) as data_usage,
        COUNT(DISTINCT tenant_id) as unique_users
      FROM network_sessions
      WHERE session_start >= NOW() - INTERVAL '24 hours'
      GROUP BY DATE_TRUNC('hour', session_start)
      ORDER BY hour DESC
    `);
    
    // Calculate network load percentage (mock calculation)
    const totalBandwidthMbps = 1000; // 1 Gbps total capacity
    const currentUsageMbps = Math.random() * 600; // Mock current usage
    const networkLoad = (currentUsageMbps / totalBandwidthMbps) * 100;
    
    res.json({
      activeConnections: parseInt(activeConnections.rows[0].count),
      totalBandwidth: totalBandwidth.rows[0],
      networkLoad: parseFloat(networkLoad.toFixed(2)),
      tenantStats: tenantStats.rows,
      hourlyUsage: hourlyUsage.rows,
      performance: {
        latency: Math.floor(Math.random() * 20) + 5, // Mock latency 5-25ms
        packetLoss: (Math.random() * 0.5).toFixed(2), // Mock packet loss 0-0.5%
        uptime: 99.9
      }
    });
  } catch (error) {
    console.error('Error fetching network stats:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get active sessions
router.get('/sessions', authMiddleware, async (req, res) => {
  try {
    const { active = 'true', page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    const query = `
      SELECT 
        ns.*,
        t.name as tenant_name,
        t.unit_number,
        t.plan_type,
        (ns.data_uploaded + ns.data_downloaded) as total_data
      FROM network_sessions ns
      JOIN tenants t ON ns.tenant_id = t.id
      WHERE ns.is_active = $1
      ORDER BY ns.session_start DESC
      LIMIT $2 OFFSET $3
    `;
    
    const result = await pool.query(query, [active === 'true', limit, offset]);
    
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM network_sessions WHERE is_active = $1',
      [active === 'true']
    );
    
    res.json({
      sessions: result.rows.map(session => ({
        ...session,
        duration: session.is_active 
          ? Date.now() - new Date(session.session_start).getTime()
          : new Date(session.session_end).getTime() - new Date(session.session_start).getTime()
      })),
      pagination: {
        total: parseInt(countResult.rows[0].count),
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(countResult.rows[0].count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new session (simulate device connection)
router.post('/sessions', authMiddleware, async (req, res) => {
  try {
    const { tenantId, deviceMac, deviceIp } = req.body;
    
    if (!tenantId || !deviceMac) {
      return res.status(400).json({ error: 'Tenant ID and Device MAC required' });
    }
    
    // Check if tenant exists
    const tenantCheck = await pool.query('SELECT * FROM tenants WHERE id = $1', [tenantId]);
    if (tenantCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    
    // End any existing active sessions for this device
    await pool.query(
      `UPDATE network_sessions 
       SET is_active = false, session_end = NOW()
       WHERE tenant_id = $1 AND device_mac = $2 AND is_active = true`,
      [tenantId, deviceMac]
    );
    
    // Create new session
    const result = await pool.query(
      `INSERT INTO network_sessions (tenant_id, device_mac, device_ip)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [tenantId, deviceMac, deviceIp || '192.168.1.' + Math.floor(Math.random() * 254 + 1)]
    );
    
    // Update tenant connection status
    await pool.query(
      'UPDATE tenants SET connection_status = $1 WHERE id = $2',
      ['online', tenantId]
    );
    
    res.status(201).json({
      message: 'Session created successfully',
      session: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update session (disconnect or update usage)
router.put('/sessions/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { action, dataUploaded, dataDownloaded } = req.body;
    
    if (action === 'disconnect') {
      // End session
      const result = await pool.query(
        `UPDATE network_sessions 
         SET is_active = false, session_end = NOW()
         WHERE id = $1
         RETURNING tenant_id`,
        [id]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Session not found' });
      }
      
      // Check if tenant has any other active sessions
      const activeCheck = await pool.query(
        'SELECT COUNT(*) FROM network_sessions WHERE tenant_id = $1 AND is_active = true',
        [result.rows[0].tenant_id]
      );
      
      if (parseInt(activeCheck.rows[0].count) === 0) {
        // Update tenant status to offline if no active sessions
        await pool.query(
          'UPDATE tenants SET connection_status = $1 WHERE id = $2',
          ['offline', result.rows[0].tenant_id]
        );
      }
      
      res.json({ message: 'Session disconnected successfully' });
    } else if (action === 'update') {
      // Update usage data
      const result = await pool.query(
        `UPDATE network_sessions 
         SET data_uploaded = data_uploaded + $1,
             data_downloaded = data_downloaded + $2
         WHERE id = $3 AND is_active = true
         RETURNING *`,
        [dataUploaded || 0, dataDownloaded || 0, id]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Active session not found' });
      }
      
      // Update tenant's total data usage
      const totalData = (result.rows[0].data_uploaded + result.rows[0].data_downloaded) / (1024 * 1024 * 1024); // Convert to GB
      await pool.query(
        'UPDATE tenants SET data_usage = data_usage + $1 WHERE id = $2',
        [totalData, result.rows[0].tenant_id]
      );
      
      res.json({
        message: 'Session updated successfully',
        session: result.rows[0]
      });
    } else {
      res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('Error updating session:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get building isolation status (mock data)
router.get('/isolation', authMiddleware, async (req, res) => {
  try {
    // Mock building data
    const buildings = [
      { id: 1, name: 'Building A', units: 24, isolated: 22, percentage: 91.7 },
      { id: 2, name: 'Building B', units: 32, isolated: 30, percentage: 93.8 },
      { id: 3, name: 'Building C', units: 28, isolated: 25, percentage: 89.3 },
      { id: 4, name: 'Building D', units: 20, isolated: 19, percentage: 95.0 }
    ];
    
    const totalUnits = buildings.reduce((sum, b) => sum + b.units, 0);
    const totalIsolated = buildings.reduce((sum, b) => sum + b.isolated, 0);
    const overallPercentage = (totalIsolated / totalUnits) * 100;
    
    res.json({
      buildings,
      summary: {
        totalUnits,
        totalIsolated,
        percentage: parseFloat(overallPercentage.toFixed(1)),
        status: overallPercentage >= 90 ? 'Excellent' : overallPercentage >= 75 ? 'Good' : 'Fair'
      }
    });
  } catch (error) {
    console.error('Error fetching isolation status:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
