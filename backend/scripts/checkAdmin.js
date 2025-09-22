const pool = require('../config/database');

async function checkAdminAccounts() {
  try {
    console.log('🔍 Checking existing admin accounts...');
    
    const result = await pool.query('SELECT id, username, password_hash, created_at FROM admins');
    
    if (result.rows.length === 0) {
      console.log('❌ No admin accounts found');
    } else {
      console.log(`✅ Found ${result.rows.length} admin account(s):`);
      result.rows.forEach((admin, index) => {
        console.log(`\n   Admin ${index + 1}:`);
        console.log(`   ID: ${admin.id}`);
        console.log(`   Username: ${admin.username}`);
        console.log(`   Password Hash: ${admin.password_hash}`);
        console.log(`   Created: ${admin.created_at}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking admin accounts:', error);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  checkAdminAccounts();
}

module.exports = checkAdminAccounts;
