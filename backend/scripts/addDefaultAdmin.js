const pool = require('../config/database');
const bcrypt = require('bcryptjs');

async function addDefaultAdmin() {
  try {
    console.log('🔧 Adding default admin account...');
    
    // Check if 'admin' username already exists
    const adminCheck = await pool.query('SELECT * FROM admins WHERE username = $1', ['admin']);
    
    if (adminCheck.rows.length > 0) {
      console.log('✅ Admin account with username "admin" already exists');
      console.log(`   Password should be: admin123`);
      return;
    }
    
    // Create default admin account
    const defaultUsername = 'admin';
    const defaultPassword = 'admin123';
    
    // Hash the password properly
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(defaultPassword, salt);
    
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
    
    // Show all admin accounts
    console.log('\n📋 All admin accounts:');
    const allAdmins = await pool.query('SELECT id, username, created_at FROM admins ORDER BY id');
    allAdmins.rows.forEach((admin, index) => {
      console.log(`   ${index + 1}. ${admin.username} (ID: ${admin.id})`);
    });
    
  } catch (error) {
    console.error('❌ Error adding default admin:', error);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  addDefaultAdmin();
}

module.exports = addDefaultAdmin;
