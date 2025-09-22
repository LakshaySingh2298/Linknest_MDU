const pool = require('../config/database');

async function listAllAdmins() {
  try {
    console.log('📋 All Admin Accounts:');
    console.log('='.repeat(50));
    
    const result = await pool.query('SELECT id, username, created_at FROM admins ORDER BY id');
    
    if (result.rows.length === 0) {
      console.log('❌ No admin accounts found');
    } else {
      result.rows.forEach((admin, index) => {
        console.log(`${index + 1}. Username: ${admin.username}`);
        console.log(`   ID: ${admin.id}`);
        console.log(`   Created: ${admin.created_at}`);
        console.log('');
      });
      
      console.log('🔑 Login Credentials:');
      console.log('   Username: admin');
      console.log('   Password: admin123');
      console.log('');
      console.log('   OR');
      console.log('');
      console.log('   Username: lakshay123');
      console.log('   Password: lakshay123');
    }
    
  } catch (error) {
    console.error('❌ Error listing admin accounts:', error);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  listAllAdmins();
}

module.exports = listAllAdmins;
