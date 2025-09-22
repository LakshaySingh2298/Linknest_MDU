const express = require('express');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// QoS Priority levels
const QOS_PRIORITIES = {
  HIGH: 'high',
  NORMAL: 'normal', 
  LOW: 'low'
};

// Plan-based QoS configurations
const QOS_CONFIG = {
  Basic: {
    maxDownload: 25,    // Mbps
    maxUpload: 5,       // Mbps
    priority: QOS_PRIORITIES.LOW,
    burstAllowed: false,
    throttleThreshold: 20, // GB per day
    description: '25/5 Mbps with low priority'
  },
  Standard: {
    maxDownload: 50,
    maxUpload: 10,
    priority: QOS_PRIORITIES.NORMAL,
    burstAllowed: true,
    burstLimit: 75,     // Mbps burst
    throttleThreshold: 50,
    description: '50/10 Mbps with normal priority + burst'
  },
  Premium: {
    maxDownload: 100,
    maxUpload: 20,
    priority: QOS_PRIORITIES.HIGH,
    burstAllowed: true,
    burstLimit: 150,
    throttleThreshold: 100,
    description: '100/20 Mbps with high priority + burst'
  }
};

// Get QoS overview
router.get('/overview', authMiddleware, async (req, res) => {
  try {
    // Get tenant distribution by plan
    const planDistribution = await pool.query(`
      SELECT 
        plan_type,
        COUNT(*) as tenant_count,
        AVG(data_usage) as avg_usage,
        SUM(CASE WHEN connection_status = 'online' THEN 1 ELSE 0 END) as online_count
      FROM tenants 
      GROUP BY plan_type
    `);

    // Calculate network load simulation
    const totalBandwidth = 1000; // 1 Gbps total capacity
    let usedBandwidth = 0;
    
    const qosStats = planDistribution.rows.map(plan => {
      const config = QOS_CONFIG[plan.plan_type];
      const activeBandwidth = plan.online_count * config.maxDownload;
      usedBandwidth += activeBandwidth;
      
      return {
        plan_type: plan.plan_type,
        tenant_count: parseInt(plan.tenant_count),
        online_count: parseInt(plan.online_count),
        avg_usage: parseFloat(plan.avg_usage) || 0,
        allocated_bandwidth: activeBandwidth,
        max_speed: config.maxDownload,
        priority: config.priority,
        burst_enabled: config.burstAllowed,
        description: config.description
      };
    });

    const networkLoad = ((usedBandwidth / totalBandwidth) * 100).toFixed(1);
    
    res.json({
      networkLoad: parseFloat(networkLoad),
      totalCapacity: totalBandwidth,
      usedBandwidth: usedBandwidth,
      availableBandwidth: totalBandwidth - usedBandwidth,
      planStats: qosStats,
      qosEnabled: true,
      lastUpdated: new Date()
    });
  } catch (error) {
    console.error('Error fetching QoS overview:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get bandwidth usage by tenant
router.get('/bandwidth-usage', authMiddleware, async (req, res) => {
  try {
    const tenants = await pool.query(`
      SELECT 
        id, name, unit_number, plan_type, connection_status, data_usage,
        CASE 
          WHEN connection_status = 'online' THEN RANDOM() * 0.8 + 0.2
          ELSE 0
        END as current_usage_ratio
      FROM tenants
      ORDER BY plan_type DESC, current_usage_ratio DESC
    `);

    const bandwidthUsage = tenants.rows.map(tenant => {
      const config = QOS_CONFIG[tenant.plan_type];
      const currentUsage = tenant.connection_status === 'online' 
        ? (config.maxDownload * tenant.current_usage_ratio).toFixed(1)
        : 0;
      
      return {
        id: tenant.id,
        name: tenant.name,
        unit_number: tenant.unit_number,
        plan_type: tenant.plan_type,
        connection_status: tenant.connection_status,
        max_speed: config.maxDownload,
        current_speed: parseFloat(currentUsage),
        usage_percentage: tenant.connection_status === 'online' 
          ? (tenant.current_usage_ratio * 100).toFixed(1)
          : 0,
        priority: config.priority,
        burst_available: config.burstAllowed,
        daily_usage: parseFloat(tenant.data_usage) || 0,
        throttled: parseFloat(tenant.data_usage) > config.throttleThreshold
      };
    });

    res.json({
      tenants: bandwidthUsage,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error fetching bandwidth usage:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Apply QoS policy to tenant
router.post('/apply-policy/:tenantId', authMiddleware, async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { action, priority, customSpeed } = req.body;

    // Get tenant info
    const tenant = await pool.query('SELECT * FROM tenants WHERE id = $1', [tenantId]);
    if (tenant.rows.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const tenantData = tenant.rows[0];
    const config = QOS_CONFIG[tenantData.plan_type];
    
    let appliedPolicy = {};
    
    switch (action) {
      case 'throttle':
        appliedPolicy = {
          maxDownload: Math.max(config.maxDownload * 0.3, 5), // 30% of normal speed, min 5 Mbps
          maxUpload: Math.max(config.maxUpload * 0.3, 1),
          priority: QOS_PRIORITIES.LOW,
          reason: 'Throttled due to excessive usage'
        };
        break;
        
      case 'boost':
        appliedPolicy = {
          maxDownload: config.burstLimit || config.maxDownload * 1.5,
          maxUpload: config.maxUpload * 1.5,
          priority: QOS_PRIORITIES.HIGH,
          reason: 'Temporary speed boost applied'
        };
        break;
        
      case 'custom':
        appliedPolicy = {
          maxDownload: customSpeed?.download || config.maxDownload,
          maxUpload: customSpeed?.upload || config.maxUpload,
          priority: priority || config.priority,
          reason: 'Custom policy applied'
        };
        break;
        
      case 'reset':
      default:
        appliedPolicy = {
          maxDownload: config.maxDownload,
          maxUpload: config.maxUpload,
          priority: config.priority,
          reason: 'Reset to plan defaults'
        };
    }

    // In a real implementation, this would call router APIs
    // For simulation, we'll just log and return success
    console.log(`QoS Policy Applied to ${tenantData.name}:`, appliedPolicy);

    res.json({
      message: 'QoS policy applied successfully',
      tenant: {
        id: tenantData.id,
        name: tenantData.name,
        unit_number: tenantData.unit_number,
        plan_type: tenantData.plan_type
      },
      appliedPolicy,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error applying QoS policy:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get network congestion and auto-QoS recommendations
router.get('/congestion-analysis', authMiddleware, async (req, res) => {
  try {
    const tenants = await pool.query(`
      SELECT plan_type, connection_status, data_usage
      FROM tenants
    `);

    const analysis = {
      totalOnline: 0,
      highUsageUsers: 0,
      congestionLevel: 'low',
      recommendations: [],
      autoQosActions: []
    };

    tenants.rows.forEach(tenant => {
      if (tenant.connection_status === 'online') {
        analysis.totalOnline++;
        
        const config = QOS_CONFIG[tenant.plan_type];
        if (tenant.data_usage > config.throttleThreshold) {
          analysis.highUsageUsers++;
          analysis.autoQosActions.push({
            action: 'throttle',
            reason: `High usage detected (${tenant.data_usage}GB > ${config.throttleThreshold}GB threshold)`
          });
        }
      }
    });

    // Determine congestion level
    if (analysis.totalOnline > 15) {
      analysis.congestionLevel = 'high';
      analysis.recommendations.push('Consider throttling heavy users');
      analysis.recommendations.push('Enable burst limiting for Premium users');
    } else if (analysis.totalOnline > 8) {
      analysis.congestionLevel = 'medium';
      analysis.recommendations.push('Monitor bandwidth usage closely');
    }

    if (analysis.highUsageUsers > 3) {
      analysis.recommendations.push('Apply fair usage policy to heavy users');
    }

    res.json(analysis);
  } catch (error) {
    console.error('Error analyzing congestion:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
