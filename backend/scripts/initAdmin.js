const pool = require('../config/database');

async function initializeAdmin() {
  try {
    console.log('🔧 Initializing default admin account...');
    
    // Check if admin already exists
    const adminCheck = await pool.query('SELECT COUNT(*) FROM admins');
    if (parseInt(adminCheck.rows[0].count) > 0) {
      console.log('✅ Admin account already exists');
      return;
    }
    
    // Create default admin account
    const defaultUsername = 'admin';
    const defaultPassword = 'admin123';
    
    // Use MOCK: prefix for mock database
    const passwordHash = 'MOCK:' + defaultPassword;
    
    const result = await pool.query(
      'INSERT INTO admins (username, password_hash) VALUES ($1, $2) RETURNING id, username, created_at',
      [defaultUsername, passwordHash]
    );
    
    const admin = result.rows[0];
    
    console.log('✅ Default admin account created successfully!');
    console.log(`   Username: ${defaultUsername}`);
    console.log(`   Password: ${defaultPassword}`);
    console.log(`   ID: ${admin.id}`);
    console.log(`   Created: ${admin.created_at}`);
    
  } catch (error) {
    console.error('❌ Error initializing admin:', error);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  initializeAdmin();
}

module.exports = initializeAdmin;
