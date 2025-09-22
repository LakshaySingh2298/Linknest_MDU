const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Plan configurations
const PLAN_CONFIG = {
  Basic: { rate: 5, speed: '25 Mbps', baseFee: 50 },
  Standard: { rate: 10, speed: '50 Mbps', baseFee: 50 },
  Premium: { rate: 20, speed: '100 Mbps', baseFee: 50 }
};

// Get all tenants with filters
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { search, plan, status, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
    let query = 'SELECT * FROM tenants WHERE 1=1';
    const params = [];
    let paramCount = 0;
    
    if (search) {
      paramCount++;
      query += ` AND (name ILIKE $${paramCount} OR email ILIKE $${paramCount} OR unit_number ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }
    
    if (plan) {
      paramCount++;
      query += ` AND plan_type = $${paramCount}`;
      params.push(plan);
    }
    
    if (status) {
      paramCount++;
      query += ` AND connection_status = $${paramCount}`;
      params.push(status);
    }
    
    // Get total count
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*)');
    const countResult = await pool.query(countQuery, params);
    const totalCount = parseInt(countResult.rows[0].count);
    
    // Add pagination
    paramCount++;
    query += ` ORDER BY created_at DESC LIMIT $${paramCount}`;
    params.push(limit);
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(offset);
    
    const result = await pool.query(query, params);
    
    res.json({
      tenants: result.rows,
      pagination: {
        total: totalCount,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching tenants:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new tenant
router.post('/', authMiddleware, [
  body('name').isLength({ min: 2 }).trim(),
  body('email').isEmail().normalizeEmail(),
  body('phone').matches(/^\d{10}$/),
  body('unit_number').notEmpty().trim(),
  body('plan_type').isIn(['Basic', 'Standard', 'Premium'])
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { name, email, phone, unit_number, plan_type } = req.body;
    
    // Check if email or unit already exists
    const existingCheck = await pool.query(
      'SELECT * FROM tenants WHERE email = $1 OR unit_number = $2',
      [email, unit_number]
    );
    
    if (existingCheck.rows.length > 0) {
      const existing = existingCheck.rows[0];
      if (existing.email === email) {
        return res.status(400).json({ error: 'Email already registered' });
      }
      if (existing.unit_number === unit_number) {
        return res.status(400).json({ error: 'Unit number already occupied' });
      }
    }
    
    const planConfig = PLAN_CONFIG[plan_type];
    
    const result = await pool.query(
      `INSERT INTO tenants (name, email, phone, unit_number, plan_type, speed_range, rate_per_gb)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [name, email, phone, unit_number, plan_type, planConfig.speed, planConfig.rate]
    );
    
    res.status(201).json({
      message: 'Tenant created successfully',
      tenant: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating tenant:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update tenant
router.put('/:id', authMiddleware, [
  body('name').optional().isLength({ min: 2 }).trim(),
  body('email').optional().isEmail().normalizeEmail(),
  body('phone').optional().matches(/^\d{10}$/),
  body('unit_number').optional().notEmpty().trim(),
  body('plan_type').optional().isIn(['Basic', 'Standard', 'Premium'])
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Check if tenant exists
    const tenantCheck = await pool.query('SELECT * FROM tenants WHERE id = $1', [id]);
    if (tenantCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    
    // Build update query
    const updateFields = [];
    const values = [];
    let paramCount = 1;
    
    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        updateFields.push(`${key} = $${paramCount}`);
        
        if (key === 'plan_type') {
          const planConfig = PLAN_CONFIG[updates[key]];
          updateFields.push(`speed_range = $${paramCount + 1}`);
          updateFields.push(`rate_per_gb = $${paramCount + 2}`);
          values.push(updates[key], planConfig.speed, planConfig.rate);
          paramCount += 3;
        } else {
          values.push(updates[key]);
          paramCount++;
        }
      }
    });
    
    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    values.push(id);
    const query = `UPDATE tenants SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    
    const result = await pool.query(query, values);
    
    res.json({
      message: 'Tenant updated successfully',
      tenant: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating tenant:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete tenant
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM tenants WHERE id = $1 RETURNING name, unit_number',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    
    res.json({
      message: 'Tenant deleted successfully',
      deleted: result.rows[0]
    });
  } catch (error) {
    console.error('Error deleting tenant:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get tenant statistics
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_tenants,
        COUNT(CASE WHEN connection_status = 'online' THEN 1 END) as active_connections,
        COUNT(CASE WHEN payment_status = 'overdue' THEN 1 END) as overdue_accounts,
        AVG(data_usage) as avg_usage,
        SUM(current_bill) as total_revenue
      FROM tenants
    `);
    
    const planDistribution = await pool.query(`
      SELECT plan_type, COUNT(*) as count
      FROM tenants
      GROUP BY plan_type
    `);
    
    res.json({
      stats: stats.rows[0],
      planDistribution: planDistribution.rows
    });
  } catch (error) {
    console.error('Error fetching tenant stats:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Simulate network activity for a tenant
router.post('/:id/simulate-activity', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Generate random usage between 10-100 GB
    const randomUsage = (Math.random() * 90 + 10).toFixed(1);
    
    // Random connection status (80% chance of being online)
    const connectionStatus = Math.random() > 0.2 ? 'online' : 'offline';
    
    // Get tenant's plan to calculate bill
    const tenantResult = await pool.query('SELECT * FROM tenants WHERE id = $1', [id]);
    if (tenantResult.rows.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    
    const tenant = tenantResult.rows[0];
    const currentBill = (parseFloat(randomUsage) * tenant.rate_per_gb * 1.18).toFixed(2); // Including 18% GST
    
    // Update tenant with simulated data
    const result = await pool.query(
      `UPDATE tenants 
       SET data_usage = $1, connection_status = $2, current_bill = $3
       WHERE id = $4
       RETURNING *`,
      [randomUsage, connectionStatus, currentBill, id]
    );
    
    // Create or update billing record for current month
    const currentMonth = new Date();
    currentMonth.setDate(1); // First day of current month
    
    const usageCharges = (parseFloat(randomUsage) * tenant.rate_per_gb).toFixed(2);
    const gstAmount = (usageCharges * 0.18).toFixed(2);
    
    await pool.query(
      `INSERT INTO billing_records (tenant_id, billing_month, data_consumed, rate_per_gb, usage_charges, gst_amount, total_amount, payment_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
       ON CONFLICT (tenant_id, billing_month) 
       DO UPDATE SET 
         data_consumed = $3,
         usage_charges = $5,
         gst_amount = $6,
         total_amount = $7`,
      [id, currentMonth, randomUsage, tenant.rate_per_gb, usageCharges, gstAmount, currentBill]
    );
    
    res.json({
      message: 'Network activity simulated successfully',
      tenant: result.rows[0]
    });
  } catch (error) {
    console.error('Error simulating network activity:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Simulate activity for all tenants
router.post('/simulate-all-activity', authMiddleware, async (req, res) => {
  try {
    // Get all tenants
    const tenantsResult = await pool.query('SELECT * FROM tenants');
    const updatedTenants = [];
    
    for (const tenant of tenantsResult.rows) {
      // Generate usage based on plan type (higher plans = higher usage tendency)
      let usageMultiplier = 1;
      switch (tenant.plan_type) {
        case 'Premium': usageMultiplier = 1.5; break;
        case 'Standard': usageMultiplier = 1.2; break;
        case 'Basic': usageMultiplier = 0.8; break;
      }
      
      const randomUsage = (Math.random() * 100 * usageMultiplier + 20).toFixed(1);
      
      // Higher plan users more likely to be online
      const onlineChance = tenant.plan_type === 'Premium' ? 0.9 : 
                          tenant.plan_type === 'Standard' ? 0.8 : 0.7;
      const connectionStatus = Math.random() < onlineChance ? 'online' : 'offline';
      
      // Calculate bill
      const currentBill = (parseFloat(randomUsage) * tenant.rate_per_gb * 1.18).toFixed(2);
      
      // Update tenant
      const result = await pool.query(
        `UPDATE tenants 
         SET data_usage = $1, connection_status = $2, current_bill = $3
         WHERE id = $4
         RETURNING *`,
        [randomUsage, connectionStatus, currentBill, tenant.id]
      );
      
      // Create or update billing record for current month
      const currentMonth = new Date();
      currentMonth.setDate(1); // First day of current month
      
      const usageCharges = (parseFloat(randomUsage) * tenant.rate_per_gb).toFixed(2);
      const gstAmount = (usageCharges * 0.18).toFixed(2);
      
      await pool.query(
        `INSERT INTO billing_records (tenant_id, billing_month, data_consumed, rate_per_gb, usage_charges, gst_amount, total_amount, payment_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
         ON CONFLICT (tenant_id, billing_month) 
         DO UPDATE SET 
           data_consumed = $3,
           usage_charges = $5,
           gst_amount = $6,
           total_amount = $7`,
        [tenant.id, currentMonth, randomUsage, tenant.rate_per_gb, usageCharges, gstAmount, currentBill]
      );
      
      updatedTenants.push(result.rows[0]);
    }
    
    res.json({
      message: 'Network activity simulated for all tenants',
      tenants: updatedTenants
    });
  } catch (error) {
    console.error('Error simulating network activity for all tenants:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Randomly upgrade tenant plans for QoS demonstration
router.post('/randomize-plans', authMiddleware, async (req, res) => {
  try {
    const tenantsResult = await pool.query('SELECT * FROM tenants');
    const updatedTenants = [];
    const plans = ['Basic', 'Standard', 'Premium'];
    
    for (const tenant of tenantsResult.rows) {
      // Randomly assign plan (40% Basic, 35% Standard, 25% Premium)
      const rand = Math.random();
      let newPlan;
      if (rand < 0.4) newPlan = 'Basic';
      else if (rand < 0.75) newPlan = 'Standard';
      else newPlan = 'Premium';
      
      const planConfig = PLAN_CONFIG[newPlan];
      
      // Update tenant plan
      const result = await pool.query(
        `UPDATE tenants 
         SET plan_type = $1, speed_range = $2, rate_per_gb = $3
         WHERE id = $4
         RETURNING *`,
        [newPlan, planConfig.speed, planConfig.rate, tenant.id]
      );
      
      updatedTenants.push(result.rows[0]);
    }
    
    res.json({
      message: 'Tenant plans randomized successfully',
      tenants: updatedTenants
    });
  } catch (error) {
    console.error('Error randomizing tenant plans:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
