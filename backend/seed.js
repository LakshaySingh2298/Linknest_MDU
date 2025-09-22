const pool = require('./config/database');
const bcrypt = require('bcryptjs');

const seedDatabase = async () => {
  try {
    console.log('Starting database seed...');
    
    // Create admin account
    const adminPassword = await bcrypt.hash('admin123', 10);
    await pool.query(
      'INSERT INTO admins (username, password_hash) VALUES ($1, $2) ON CONFLICT (username) DO NOTHING',
      ['admin', adminPassword]
    );
    console.log('Admin account created (username: admin, password: admin123)');
    
    // Sample tenants data
    const tenants = [
      { name: 'Rajesh Kumar', email: 'rajesh.kumar@email.com', phone: '9876543210', unit: 'A-101', plan: 'Premium', usage: 125.5 },
      { name: 'Priya Sharma', email: 'priya.sharma@email.com', phone: '9876543211', unit: 'A-102', plan: 'Standard', usage: 67.3 },
      { name: 'Amit Patel', email: 'amit.patel@email.com', phone: '9876543212', unit: 'B-201', plan: 'Basic', usage: 29.8 },
      { name: 'Sneha Reddy', email: 'sneha.reddy@email.com', phone: '9876543213', unit: 'B-202', plan: 'Premium', usage: 98.2 },
      { name: 'Vikram Singh', email: 'vikram.singh@email.com', phone: '9876543214', unit: 'C-301', plan: 'Standard', usage: 45.6 },
      { name: 'Anjali Gupta', email: 'anjali.gupta@email.com', phone: '9876543215', unit: 'C-302', plan: 'Basic', usage: 31.2 },
      { name: 'Rohit Verma', email: 'rohit.verma@email.com', phone: '9876543216', unit: 'D-401', plan: 'Premium', usage: 112.7 },
      { name: 'Neha Joshi', email: 'neha.joshi@email.com', phone: '9876543217', unit: 'D-402', plan: 'Standard', usage: 58.9 }
    ];
    
    const planConfig = {
      Basic: { rate: 5, speed: '25 Mbps' },
      Standard: { rate: 10, speed: '50 Mbps' },
      Premium: { rate: 20, speed: '100 Mbps' }
    };
    
    for (const tenant of tenants) {
      const config = planConfig[tenant.plan];
      const connectionStatus = Math.random() > 0.3 ? 'online' : 'offline';
      const paymentStatus = Math.random() > 0.2 ? 'current' : Math.random() > 0.5 ? 'pending' : 'overdue';
      
      // Calculate current bill
      const usageCharges = tenant.usage * config.rate;
      const gst = usageCharges * 0.18;
      const currentBill = usageCharges + gst + 50; // +50 base fee
      
      const result = await pool.query(
        `INSERT INTO tenants 
         (name, email, phone, unit_number, plan_type, speed_range, rate_per_gb, data_usage, current_bill, payment_status, connection_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (email) DO UPDATE SET
         data_usage = $8, current_bill = $9, payment_status = $10, connection_status = $11
         RETURNING id`,
        [tenant.name, tenant.email, tenant.phone, tenant.unit, tenant.plan, config.speed, config.rate, 
         tenant.usage, currentBill.toFixed(2), paymentStatus, connectionStatus]
      );
      
      const tenantId = result.rows[0].id;
      
      // Create billing records for last 3 months
      for (let i = 0; i < 3; i++) {
        const billingMonth = new Date();
        billingMonth.setMonth(billingMonth.getMonth() - i);
        billingMonth.setDate(1);
        billingMonth.setHours(0, 0, 0, 0);
        
        const monthlyUsage = tenant.usage * (0.8 + Math.random() * 0.4); // Vary usage ±20%
        const monthlyCharges = monthlyUsage * config.rate;
        const monthlyGst = monthlyCharges * 0.18;
        const monthlyTotal = monthlyCharges + monthlyGst + 50;
        
        await pool.query(
          `INSERT INTO billing_records 
           (tenant_id, billing_month, data_consumed, rate_per_gb, usage_charges, gst_amount, total_amount, payment_status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (tenant_id, billing_month) DO NOTHING`,
          [tenantId, billingMonth, monthlyUsage.toFixed(2), config.rate, 
           monthlyCharges.toFixed(2), monthlyGst.toFixed(2), monthlyTotal.toFixed(2),
           i === 0 ? paymentStatus : 'paid']
        );
      }
      
      // Create network sessions
      if (connectionStatus === 'online') {
        const numDevices = Math.floor(Math.random() * 3) + 1;
        for (let j = 0; j < numDevices; j++) {
          const mac = `AA:BB:CC:${Math.floor(Math.random() * 100).toString(16).padStart(2, '0')}:${Math.floor(Math.random() * 100).toString(16).padStart(2, '0')}:${Math.floor(Math.random() * 100).toString(16).padStart(2, '0')}`.toUpperCase();
          const ip = `192.168.1.${Math.floor(Math.random() * 254) + 1}`;
          
          await pool.query(
            `INSERT INTO network_sessions 
             (tenant_id, device_mac, device_ip, data_uploaded, data_downloaded, is_active)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [tenantId, mac, ip, 
             Math.floor(Math.random() * 1000000000), // Random upload in bytes
             Math.floor(Math.random() * 5000000000), // Random download in bytes
             true]
          );
        }
      }
    }
    
    console.log(`Seeded ${tenants.length} tenants with billing records and network sessions`);
    console.log('Database seeding completed successfully!');
    
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await pool.end();
  }
};

// Run seed
seedDatabase();
