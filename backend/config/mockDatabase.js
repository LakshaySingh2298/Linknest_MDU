// Mock database for testing without PostgreSQL
// In-memory storage for mock admins
let mockAdmins = [];

const mockPool = {
  query: async (query, params) => {
    console.log('Mock DB Query:', query.substring(0, 50) + '...');
    
    // Mock responses for different queries
    if (query.includes('SELECT NOW()')) {
      return { rows: [{ now: new Date() }] };
    }
    
    if (query.includes('SELECT COUNT(*) FROM admins')) {
      // Check if we have any admins in our mock storage
      const adminCount = mockAdmins.length;
      return { rows: [{ count: adminCount.toString() }] };
    }
    
    if (query.includes('INSERT INTO admins')) {
      // Add new admin to mock storage
      const newAdmin = {
        id: mockAdmins.length + 1,
        username: params[0],
        password_hash: params[1], // This will be the bcrypt hash from the route
        created_at: new Date()
      };
      mockAdmins.push(newAdmin);
      return { 
        rows: [newAdmin] 
      };
    }
    
    if (query.includes('SELECT * FROM admins WHERE username')) {
      // Find admin by username in mock storage
      const admin = mockAdmins.find(a => a.username === params[0]);
      if (admin) {
        return { rows: [admin] };
      }
      return { rows: [] };
    }
    
    if (query.includes('SELECT id, username, created_at FROM admins WHERE id')) {
      return {
        rows: [{
          id: 1,
          username: 'admin',
          created_at: new Date()
        }]
      };
    }
    
    if (query.includes('SELECT * FROM tenants')) {
      return {
        rows: [
          {
            id: 1,
            name: 'Rajesh Kumar',
            email: 'rajesh@email.com',
            phone: '9876543210',
            unit_number: 'A-101',
            plan_type: 'Premium',
            speed_range: '100 Mbps',
            rate_per_gb: 20,
            data_usage: 125.5,
            current_bill: 2800,
            payment_status: 'pending',
            connection_status: 'online',
            created_at: new Date()
          },
          {
            id: 2,
            name: 'Priya Sharma',
            email: 'priya@email.com',
            phone: '9876543211',
            unit_number: 'A-102',
            plan_type: 'Standard',
            speed_range: '50 Mbps',
            rate_per_gb: 10,
            data_usage: 67.3,
            current_bill: 850,
            payment_status: 'current',
            connection_status: 'offline',
            created_at: new Date()
          }
        ]
      };
    }
    
    if (query.includes('COUNT(*) as total_tenants')) {
      return {
        rows: [{
          total_tenants: 8,
          active_connections: 6,
          overdue_accounts: 2,
          avg_usage: 75.5,
          total_revenue: 15000
        }]
      };
    }
    
    // Handle billing overview queries
    if (query.includes('COUNT(*) as total_bills') && query.includes('billing_records')) {
      return {
        rows: [{
          total_bills: 2,
          paid_bills: 0,
          pending_bills: 2,
          overdue_bills: 0,
          total_revenue: 1146.37, // Sum of both tenant bills
          collected_revenue: 0,
          pending_revenue: 1146.37
        }]
      };
    }
    
    // Handle monthly trend query
    if (query.includes('DATE_TRUNC') && query.includes('billing_month')) {
      return {
        rows: [
          {
            month: new Date(),
            revenue: 1146.37,
            total_data: 194.3
          }
        ]
      };
    }
    
    if (query.includes('billing_records')) {
      return {
        rows: [
          {
            id: 1,
            tenant_id: 1,
            tenant_name: 'piyush',
            tenant_email: 'piyush@gmail.com',
            unit_number: 'C-202',
            plan_type: 'Basic',
            billing_month: new Date(),
            data_consumed: 120.7,
            rate_per_gb: 5,
            usage_charges: 603.5,
            gst_amount: 108.63,
            total_amount: 712.13,
            payment_status: 'pending',
            created_at: new Date()
          },
          {
            id: 2,
            tenant_id: 2,
            tenant_name: 'lakshay',
            tenant_email: 'lakshayghosh@gmail.com',
            unit_number: 'B-202',
            plan_type: 'Basic',
            billing_month: new Date(),
            data_consumed: 73.6,
            rate_per_gb: 5,
            usage_charges: 368,
            gst_amount: 66.24,
            total_amount: 434.24,
            payment_status: 'pending',
            created_at: new Date()
          }
        ]
      };
    }
    
    if (query.includes('network_sessions')) {
      return {
        rows: [{
          id: 1,
          tenant_id: 1,
          tenant_name: 'Rajesh Kumar',
          unit_number: 'A-101',
          plan_type: 'Premium',
          device_mac: 'AA:BB:CC:DD:EE:FF',
          device_ip: '192.168.1.100',
          session_start: new Date(),
          data_uploaded: 1000000000,
          data_downloaded: 5000000000,
          total_data: 6000000000,
          is_active: true
        }]
      };
    }
    
    // Handle UPDATE queries for plan randomization
    if (query.includes('UPDATE tenants') && query.includes('plan_type')) {
      return {
        rows: [{
          id: params[3] || 1,
          name: 'Mock Tenant',
          email: 'mock@email.com',
          phone: '9876543210',
          unit_number: 'A-101',
          plan_type: params[0] || 'Standard',
          speed_range: params[1] || '50 Mbps',
          rate_per_gb: params[2] || 10,
          data_usage: 50.5,
          current_bill: 1200,
          payment_status: 'current',
          connection_status: 'online',
          created_at: new Date()
        }],
        rowCount: 1
      };
    }
    
    // Handle UPDATE queries for tenant activity simulation
    if (query.includes('UPDATE tenants') && query.includes('data_usage')) {
      // For simulate activity - just return success
      return {
        rows: [{
          id: params[3] || 1,
          name: 'Mock Tenant',
          email: 'mock@email.com',
          phone: '9876543210',
          unit_number: 'A-101',
          plan_type: 'Premium',
          speed_range: '100 Mbps',
          rate_per_gb: 20,
          data_usage: params[0] || 50.5,
          current_bill: params[2] || 1200,
          payment_status: 'current',
          connection_status: params[1] || 'online',
          created_at: new Date()
        }],
        rowCount: 1
      };
    }
    
    // Handle INSERT INTO billing_records for simulation
    if (query.includes('INSERT INTO billing_records') || (query.includes('ON CONFLICT') && query.includes('billing_records'))) {
      return {
        rows: [{
          id: 1,
          tenant_id: params[0] || 1,
          billing_month: params[1] || new Date(),
          data_consumed: params[2] || 50.5,
          rate_per_gb: params[3] || 20,
          usage_charges: params[4] || 1000,
          gst_amount: params[5] || 180,
          total_amount: params[6] || 1180,
          payment_status: 'pending',
          created_at: new Date()
        }],
        rowCount: 1
      };
    }
    
    // Handle QoS queries
    if (query.includes('GROUP BY plan_type')) {
      return {
        rows: [
          {
            plan_type: 'Basic',
            tenant_count: 3,
            avg_usage: 45.2,
            online_count: 2
          },
          {
            plan_type: 'Standard',
            tenant_count: 2,
            avg_usage: 78.5,
            online_count: 2
          },
          {
            plan_type: 'Premium', 
            tenant_count: 1,
            avg_usage: 125.8,
            online_count: 1
          }
        ]
      };
    }
    
    // Handle bandwidth usage queries with current_usage_ratio
    if (query.includes('current_usage_ratio')) {
      return {
        rows: [
          {
            id: 1,
            name: 'piyush',
            unit_number: 'C-202',
            plan_type: 'Premium',
            connection_status: 'online',
            data_usage: 145.7,
            current_usage_ratio: 0.85
          },
          {
            id: 2,
            name: 'lakshay',
            unit_number: 'B-202', 
            plan_type: 'Standard',
            connection_status: 'online',
            data_usage: 78.6,
            current_usage_ratio: 0.65
          },
          {
            id: 3,
            name: 'Amit Kumar',
            unit_number: 'A-101', 
            plan_type: 'Basic',
            connection_status: 'online',
            data_usage: 32.4,
            current_usage_ratio: 0.35
          },
          {
            id: 4,
            name: 'Priya Singh',
            unit_number: 'D-301', 
            plan_type: 'Standard',
            connection_status: 'offline',
            data_usage: 0,
            current_usage_ratio: 0
          }
        ]
      };
    }
    
    // Handle tenant auth queries
    if (query.includes('SELECT * FROM tenants WHERE phone') && query.includes('unit_number')) {
      // Mock tenant lookup for OTP request
      const phone = params[0];
      const unitNumber = params[1];
      
      if ((phone === '9876543210' || phone === '9717206255') && unitNumber === 'B-202') {
        return {
          rows: [{
            id: 2,
            name: 'lakshay',
            email: 'lakshayghosh@gmail.com',
            phone: phone, // Use the actual phone number provided
            unit_number: 'B-202',
            plan_type: 'Basic',
            speed_range: '25 Mbps',
            rate_per_gb: 5,
            data_usage: 73.6,
            current_bill: 434.24,
            payment_status: 'current',
            connection_status: 'offline',
            created_at: new Date()
          }]
        };
      }
      return { rows: [] };
    }
    
    // Handle network session insertion
    if (query.includes('INSERT INTO network_sessions')) {
      return {
        rows: [{
          id: Date.now(),
          tenant_id: params[0] || 2,
          device_ip: params[1] || '192.168.1.100',
          session_start: new Date(),
          is_active: true
        }],
        rowCount: 1
      };
    }
    
    // Default response
    return { rows: [], rowCount: 0 };
  },
  
  connect: async () => ({
    query: mockPool.query,
    release: () => {},
  }),
  
  end: async () => {
    console.log('Mock database connection closed');
  }
};

// Log successful mock connection
console.log('Using MOCK database (no PostgreSQL required)');
console.log('Mock database connected successfully at:', new Date());

module.exports = mockPool;
