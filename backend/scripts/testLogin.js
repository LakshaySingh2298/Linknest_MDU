const pool = require('../config/database');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function testLogin() {
  try {
    console.log('🔍 Testing Login System...\n');
    
    // Check JWT_SECRET
    console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
    console.log('JWT_SECRET length:', process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0);
    
    // List all admins
    const admins = await pool.query('SELECT id, username, password_hash FROM admins');
    console.log(`\n📋 Found ${admins.rows.length} admin(s):`);
    
    for (const admin of admins.rows) {
      console.log(`\nAdmin: ${admin.username}`);
      console.log(`Password Hash: ${admin.password_hash.substring(0, 20)}...`);
      
      // Test password verification
      if (admin.username === 'admin') {
        const testPassword = 'admin123';
        const isMatch = await bcrypt.compare(testPassword, admin.password_hash);
        console.log(`Password 'admin123' matches: ${isMatch}`);
      }
      
      if (admin.username === 'lakshay123') {
        const testPassword = 'lakshay123';
        const isMatch = await bcrypt.compare(testPassword, admin.password_hash);
        console.log(`Password 'lakshay123' matches: ${isMatch}`);
      }
    }
    
    // Test JWT generation
    const jwt = require('jsonwebtoken');
    try {
      const token = jwt.sign(
        { id: 1, username: 'test' },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      console.log('\n✅ JWT generation works!');
      console.log('Sample token (first 50 chars):', token.substring(0, 50) + '...');
    } catch (error) {
      console.log('\n❌ JWT generation failed:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await pool.end();
  }
}

testLogin();
