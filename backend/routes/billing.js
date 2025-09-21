const express = require('express');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Calculate billing amount
const calculateBilling = (dataUsage, ratePerGB) => {
  const baseFee = 50;
  const usageCharges = dataUsage * ratePerGB;
  const gstAmount = usageCharges * 0.18; // 18% GST
  const totalAmount = usageCharges + gstAmount + baseFee;
  
  return {
    usageCharges: parseFloat(usageCharges.toFixed(2)),
    gstAmount: parseFloat(gstAmount.toFixed(2)),
    totalAmount: parseFloat(totalAmount.toFixed(2))
  };
};

// Get billing overview
router.get('/overview', authMiddleware, async (req, res) => {
  try {
    const currentMonth = new Date();
    currentMonth.setDate(1);
    
    const overview = await pool.query(`
      SELECT 
        COUNT(*) as total_bills,
        COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_bills,
        COUNT(CASE WHEN payment_status = 'pending' THEN 1 END) as pending_bills,
        COUNT(CASE WHEN payment_status = 'overdue' THEN 1 END) as overdue_bills,
        SUM(total_amount) as total_revenue,
        SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END) as collected_revenue,
        SUM(CASE WHEN payment_status IN ('pending', 'overdue') THEN total_amount ELSE 0 END) as pending_revenue
      FROM billing_records
      WHERE billing_month = $1
    `, [currentMonth]);
    
    const monthlyTrend = await pool.query(`
      SELECT 
        DATE_TRUNC('month', billing_month) as month,
        SUM(total_amount) as revenue,
        SUM(data_consumed) as total_data
      FROM billing_records
      WHERE billing_month >= DATE_TRUNC('month', NOW() - INTERVAL '6 months')
      GROUP BY DATE_TRUNC('month', billing_month)
      ORDER BY month DESC
    `);
    
    res.json({
      overview: overview.rows[0],
      monthlyTrend: monthlyTrend.rows
    });
  } catch (error) {
    console.error('Error fetching billing overview:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Generate monthly bills
router.post('/generate', authMiddleware, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);
    
    // Check if bills already generated for this month
    const existingBills = await client.query(
      'SELECT COUNT(*) FROM billing_records WHERE billing_month = $1',
      [currentMonth]
    );
    
    if (parseInt(existingBills.rows[0].count) > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Bills already generated for this month' });
    }
    
    // Get all tenants
    const tenants = await client.query('SELECT * FROM tenants');
    
    const billsGenerated = [];
    
    for (const tenant of tenants.rows) {
      const billing = calculateBilling(tenant.data_usage, parseFloat(tenant.rate_per_gb));
      
      // Create billing record
      const billResult = await client.query(
        `INSERT INTO billing_records 
         (tenant_id, billing_month, data_consumed, rate_per_gb, usage_charges, gst_amount, total_amount)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          tenant.id,
          currentMonth,
          tenant.data_usage,
          tenant.rate_per_gb,
          billing.usageCharges,
          billing.gstAmount,
          billing.totalAmount
        ]
      );
      
      // Update tenant's current bill
      await client.query(
        'UPDATE tenants SET current_bill = $1, payment_status = $2 WHERE id = $3',
        [billing.totalAmount, 'pending', tenant.id]
      );
      
      billsGenerated.push({
        tenant: tenant.name,
        unit: tenant.unit_number,
        bill: billResult.rows[0]
      });
    }
    
    await client.query('COMMIT');
    
    res.json({
      message: 'Bills generated successfully',
      count: billsGenerated.length,
      bills: billsGenerated
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error generating bills:', error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// Record payment
router.post('/payments', authMiddleware, async (req, res) => {
  try {
    const { billId, tenantId } = req.body;
    
    if (!billId || !tenantId) {
      return res.status(400).json({ error: 'Bill ID and Tenant ID required' });
    }
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Update billing record
      const billResult = await client.query(
        `UPDATE billing_records 
         SET payment_status = 'paid', payment_date = NOW()
         WHERE id = $1 AND tenant_id = $2
         RETURNING *`,
        [billId, tenantId]
      );
      
      if (billResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Bill not found' });
      }
      
      // Update tenant payment status
      await client.query(
        `UPDATE tenants 
         SET payment_status = 'current', current_bill = 0
         WHERE id = $1`,
        [tenantId]
      );
      
      await client.query('COMMIT');
      
      res.json({
        message: 'Payment recorded successfully',
        bill: billResult.rows[0]
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error recording payment:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get tenant bills
router.get('/tenants', authMiddleware, async (req, res) => {
  try {
    const { month, status, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT 
        br.*,
        t.name as tenant_name,
        t.email as tenant_email,
        t.unit_number,
        t.plan_type
      FROM billing_records br
      JOIN tenants t ON br.tenant_id = t.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;
    
    if (month) {
      paramCount++;
      query += ` AND br.billing_month = $${paramCount}`;
      params.push(month);
    }
    
    if (status) {
      paramCount++;
      query += ` AND br.payment_status = $${paramCount}`;
      params.push(status);
    }
    
    // Get total count
    const countQuery = query.replace('SELECT br.*, t.name as tenant_name, t.email as tenant_email, t.unit_number, t.plan_type', 'SELECT COUNT(*)');
    const countResult = await pool.query(countQuery, params);
    const totalCount = parseInt(countResult.rows[0].count);
    
    // Add pagination
    paramCount++;
    query += ` ORDER BY br.created_at DESC LIMIT $${paramCount}`;
    params.push(limit);
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(offset);
    
    const result = await pool.query(query, params);
    
    res.json({
      bills: result.rows,
      pagination: {
        total: totalCount,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching tenant bills:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Generate invoice HTML
router.get('/invoice/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT 
        br.*,
        t.name as tenant_name,
        t.email as tenant_email,
        t.phone as tenant_phone,
        t.unit_number,
        t.plan_type
      FROM billing_records br
      JOIN tenants t ON br.tenant_id = t.id
      WHERE br.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    const invoice = result.rows[0];
    const invoiceDate = new Date(invoice.billing_month).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long'
    });
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice - LinkNest</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          .header { background: #20B2AA; color: white; padding: 20px; text-align: center; }
          .invoice-details { margin: 20px 0; }
          .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .table th, .table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          .table th { background: #f4f4f4; }
          .total { font-size: 1.2em; font-weight: bold; text-align: right; margin-top: 20px; }
          .footer { margin-top: 40px; text-align: center; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>LinkNest MDU Wi-Fi</h1>
          <p>Invoice for ${invoiceDate}</p>
        </div>
        
        <div class="invoice-details">
          <h2>Bill To:</h2>
          <p><strong>${invoice.tenant_name}</strong></p>
          <p>Unit: ${invoice.unit_number}</p>
          <p>Email: ${invoice.tenant_email}</p>
          <p>Phone: ${invoice.tenant_phone}</p>
          <p>Plan: ${invoice.plan_type}</p>
        </div>
        
        <table class="table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Quantity</th>
              <th>Rate</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Data Usage</td>
              <td>${invoice.data_consumed} GB</td>
              <td>₹${invoice.rate_per_gb}/GB</td>
              <td>₹${invoice.usage_charges}</td>
            </tr>
            <tr>
              <td>Base Fee</td>
              <td>1</td>
              <td>₹50</td>
              <td>₹50</td>
            </tr>
            <tr>
              <td>GST (18%)</td>
              <td>-</td>
              <td>18%</td>
              <td>₹${invoice.gst_amount}</td>
            </tr>
          </tbody>
        </table>
        
        <div class="total">
          Total Amount: ₹${invoice.total_amount}
        </div>
        
        <div class="footer">
          <p>Thank you for using LinkNest MDU Wi-Fi</p>
          <p>Invoice ID: ${invoice.id} | Generated on ${new Date().toLocaleDateString('en-IN')}</p>
        </div>
      </body>
      </html>
    `;
    
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error('Error generating invoice:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create initial billing records for existing tenants (for demo)
router.post('/create-initial', async (req, res) => {
  try {
    const currentMonth = new Date();
    currentMonth.setDate(1);
    
    // Get all tenants
    const tenants = await pool.query('SELECT * FROM tenants');
    
    for (const tenant of tenants.rows) {
      // Check if billing record already exists
      const existing = await pool.query(
        'SELECT id FROM billing_records WHERE tenant_id = $1 AND billing_month = $2',
        [tenant.id, currentMonth]
      );
      
      if (existing.rows.length === 0) {
        // Create initial billing record with ₹0
        await pool.query(`
          INSERT INTO billing_records (
            tenant_id, billing_month, data_consumed, rate_per_gb,
            usage_charges, gst_amount, total_amount, payment_status, due_date
          ) VALUES ($1, $2, 0, $3, 0, 0, 0, 'pending', $4)
        `, [
          tenant.id,
          currentMonth,
          tenant.rate_per_gb || 10,
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
        ]);
      }
    }
    
    res.json({ success: true, message: 'Initial billing records created' });
  } catch (error) {
    console.error('Error creating initial billing records:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
