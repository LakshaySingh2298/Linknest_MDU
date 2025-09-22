const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateAdmin } = require('../middleware/auth');

// Get comprehensive dashboard statistics
router.get('/stats', authenticateAdmin, async (req, res) => {
  try {
    // Get tenant statistics
    const tenantStats = await pool.query(`
      SELECT 
        COUNT(*) as total_tenants,
        COUNT(CASE WHEN connection_status = 'online' THEN 1 END) as active_tenants,
        COUNT(CASE WHEN plan_type = 'Premium' THEN 1 END) as premium_tenants,
        COUNT(CASE WHEN plan_type = 'Standard' THEN 1 END) as standard_tenants,
        COUNT(CASE WHEN plan_type = 'Basic' THEN 1 END) as basic_tenants,
        COUNT(CASE WHEN payment_status = 'overdue' THEN 1 END) as overdue_tenants,
        AVG(data_usage) as avg_data_usage,
        SUM(current_bill) as total_pending_bills
      FROM tenants
    `);

    // Get revenue statistics
    const revenueStats = await pool.query(`
      SELECT 
        SUM(total_amount) as total_revenue,
        SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END) as collected_revenue,
        SUM(CASE WHEN payment_status = 'pending' THEN total_amount ELSE 0 END) as pending_revenue,
        COUNT(DISTINCT tenant_id) as billed_tenants
      FROM billing_records
      WHERE billing_month >= DATE_TRUNC('month', CURRENT_DATE)
    `);

    // Get network statistics
    const networkStats = await pool.query(`
      SELECT 
        COUNT(*) as active_sessions,
        SUM(data_uploaded + data_downloaded) as total_data_transferred,
        AVG(EXTRACT(EPOCH FROM (COALESCE(session_end, NOW()) - session_start))/3600) as avg_session_duration
      FROM network_sessions
      WHERE is_active = true
    `);

    // Get recent activity
    const recentActivity = await pool.query(`
      SELECT 
        t.name,
        t.unit_number,
        ns.session_start,
        ns.data_uploaded + ns.data_downloaded as data_used,
        t.plan_type
      FROM network_sessions ns
      JOIN tenants t ON ns.tenant_id = t.id
      ORDER BY ns.session_start DESC
      LIMIT 10
    `);

    // Get system health metrics
    const systemHealth = {
      status: 'operational',
      uptime: process.uptime(),
      memory_usage: process.memoryUsage().heapUsed / 1024 / 1024,
      cpu_load: process.cpuUsage(),
      database_status: 'connected',
      network_status: 'active'
    };

    res.json({
      tenants: tenantStats.rows[0],
      revenue: revenueStats.rows[0],
      network: networkStats.rows[0],
      recentActivity: recentActivity.rows,
      systemHealth,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
});

// Get real-time network connections
router.get('/connections', authenticateAdmin, async (req, res) => {
  try {
    const connections = await pool.query(`
      SELECT 
        t.id,
        t.name,
        t.unit_number,
        t.plan_type,
        ns.device_ip,
        ns.device_mac,
        ns.session_start,
        ns.data_uploaded,
        ns.data_downloaded,
        ns.is_active,
        t.speed_range
      FROM network_sessions ns
      JOIN tenants t ON ns.tenant_id = t.id
      WHERE ns.is_active = true
      ORDER BY ns.session_start DESC
    `);

    res.json({
      connections: connections.rows,
      total: connections.rows.length,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Error fetching connections:', error);
    res.status(500).json({ error: 'Failed to fetch network connections' });
  }
});

// Get system alerts
router.get('/alerts', authenticateAdmin, async (req, res) => {
  try {
    const alerts = [];

    // Check for overdue payments
    const overdueCount = await pool.query(
      'SELECT COUNT(*) FROM tenants WHERE payment_status = $1',
      ['overdue']
    );
    
    if (overdueCount.rows[0].count > 0) {
      alerts.push({
        type: 'warning',
        message: `${overdueCount.rows[0].count} tenants have overdue payments`,
        timestamp: new Date(),
        priority: 'high'
      });
    }

    // Check for high data usage
    const highUsage = await pool.query(`
      SELECT name, unit_number, data_usage 
      FROM tenants 
      WHERE data_usage > 100
      LIMIT 5
    `);

    highUsage.rows.forEach(tenant => {
      alerts.push({
        type: 'info',
        message: `${tenant.name} (${tenant.unit_number}) has high data usage: ${tenant.data_usage} GB`,
        timestamp: new Date(),
        priority: 'medium'
      });
    });

    // Check system resources
    const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024;
    if (memoryUsage > 500) {
      alerts.push({
        type: 'warning',
        message: `High memory usage: ${memoryUsage.toFixed(2)} MB`,
        timestamp: new Date(),
        priority: 'low'
      });
    }

    res.json({
      alerts,
      total: alerts.length,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ error: 'Failed to fetch system alerts' });
  }
});

// Get revenue analytics
router.get('/revenue', authenticateAdmin, async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    let dateFilter = "DATE_TRUNC('month', CURRENT_DATE)";
    if (period === '7d') {
      dateFilter = "CURRENT_DATE - INTERVAL '7 days'";
    } else if (period === '90d') {
      dateFilter = "CURRENT_DATE - INTERVAL '90 days'";
    }

    const revenue = await pool.query(`
      SELECT 
        DATE(billing_month) as date,
        SUM(total_amount) as revenue,
        SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END) as collected,
        COUNT(DISTINCT tenant_id) as tenants
      FROM billing_records
      WHERE billing_month >= ${dateFilter}
      GROUP BY DATE(billing_month)
      ORDER BY date DESC
    `);

    const planRevenue = await pool.query(`
      SELECT 
        t.plan_type,
        COUNT(DISTINCT br.tenant_id) as tenant_count,
        SUM(br.total_amount) as total_revenue,
        AVG(br.total_amount) as avg_revenue
      FROM billing_records br
      JOIN tenants t ON br.tenant_id = t.id
      WHERE br.billing_month >= ${dateFilter}
      GROUP BY t.plan_type
    `);

    res.json({
      daily: revenue.rows,
      byPlan: planRevenue.rows,
      period,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Error fetching revenue data:', error);
    res.status(500).json({ error: 'Failed to fetch revenue analytics' });
  }
});

// Get network usage analytics
router.get('/usage', authenticateAdmin, async (req, res) => {
  try {
    const hourlyUsage = await pool.query(`
      SELECT 
        DATE_TRUNC('hour', session_start) as hour,
        COUNT(*) as connections,
        SUM(data_uploaded + data_downloaded) as total_data,
        AVG(data_uploaded + data_downloaded) as avg_data
      FROM network_sessions
      WHERE session_start >= NOW() - INTERVAL '24 hours'
      GROUP BY DATE_TRUNC('hour', session_start)
      ORDER BY hour DESC
    `);

    const planUsage = await pool.query(`
      SELECT 
        t.plan_type,
        COUNT(ns.id) as session_count,
        SUM(ns.data_uploaded + ns.data_downloaded) as total_data,
        AVG(ns.data_uploaded + ns.data_downloaded) as avg_data
      FROM network_sessions ns
      JOIN tenants t ON ns.tenant_id = t.id
      WHERE ns.session_start >= NOW() - INTERVAL '24 hours'
      GROUP BY t.plan_type
    `);

    res.json({
      hourly: hourlyUsage.rows,
      byPlan: planUsage.rows,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Error fetching usage data:', error);
    res.status(500).json({ error: 'Failed to fetch network usage analytics' });
  }
});

// Quick actions
router.post('/quick-action', authenticateAdmin, async (req, res) => {
  try {
    const { action, params } = req.body;

    switch (action) {
      case 'disconnect-all':
        await pool.query(`
          UPDATE network_sessions 
          SET is_active = false, session_end = NOW()
          WHERE is_active = true
        `);
        res.json({ message: 'All connections disconnected' });
        break;

      case 'generate-bills':
        // Generate monthly bills for all tenants
        const tenants = await pool.query('SELECT * FROM tenants');
        const billingMonth = new Date();
        billingMonth.setDate(1);

        for (const tenant of tenants.rows) {
          const usageCharges = tenant.data_usage * tenant.rate_per_gb;
          const gstAmount = usageCharges * 0.18;
          const totalAmount = usageCharges + gstAmount;

          await pool.query(`
            INSERT INTO billing_records 
            (tenant_id, billing_month, data_consumed, usage_charges, gst_amount, total_amount, payment_status)
            VALUES ($1, $2, $3, $4, $5, $6, 'pending')
            ON CONFLICT (tenant_id, billing_month) DO UPDATE
            SET data_consumed = $3, usage_charges = $4, gst_amount = $5, total_amount = $6
          `, [tenant.id, billingMonth, tenant.data_usage, usageCharges, gstAmount, totalAmount]);
        }
        res.json({ message: 'Bills generated for all tenants' });
        break;

      case 'reset-usage':
        await pool.query('UPDATE tenants SET data_usage = 0');
        res.json({ message: 'Usage reset for all tenants' });
        break;

      default:
        res.status(400).json({ error: 'Invalid action' });
    }

  } catch (error) {
    console.error('Error executing quick action:', error);
    res.status(500).json({ error: 'Failed to execute action' });
  }
});

module.exports = router;
