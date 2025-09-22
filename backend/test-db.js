// Test database connection
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function testConnection() {
  try {
    console.log('🔍 Testing database connection...');
    console.log('📍 Connection string:', process.env.DATABASE_URL);
    
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL!');
    
    // Test if database exists
    const result = await client.query('SELECT current_database(), version()');
    console.log('📊 Database:', result.rows[0].current_database);
    console.log('🔧 Version:', result.rows[0].version.split(' ')[0] + ' ' + result.rows[0].version.split(' ')[1]);
    
    // Check if tables exist
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    console.log('📋 Tables found:', tables.rows.length);
    tables.rows.forEach(row => console.log('  -', row.table_name));
    
    client.release();
    
    // Test tenant lookup
    try {
      const tenant = await pool.query('SELECT * FROM tenants WHERE phone = $1', ['9717206255']);
      console.log('👤 Tenant found:', tenant.rows.length > 0 ? 'YES' : 'NO');
      if (tenant.rows.length > 0) {
        console.log('   Name:', tenant.rows[0].name);
        console.log('   Unit:', tenant.rows[0].unit_number);
        console.log('   Plan:', tenant.rows[0].plan_type);
      }
    } catch (err) {
      console.log('❌ Tenant table error:', err.message);
    }
    
  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error('   Error:', error.message);
    console.error('   Code:', error.code);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Solution: PostgreSQL is not running or wrong port');
    } else if (error.code === '3D000') {
      console.log('💡 Solution: Database "linknest_db" does not exist');
    } else if (error.code === '28P01') {
      console.log('💡 Solution: Wrong username or password');
    }
  } finally {
    await pool.end();
  }
}

testConnection();
