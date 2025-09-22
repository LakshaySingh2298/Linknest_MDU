require('dotenv').config();

console.log('🔍 Checking Environment Variables:');
console.log('=====================================');

// Check critical environment variables
const criticalVars = [
  'JWT_SECRET',
  'JWT_EXPIRES_IN',
  'DB_HOST',
  'DB_PORT',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD'
];

let allPresent = true;

criticalVars.forEach(varName => {
  const value = process.env[varName];
  if (!value) {
    console.log(`❌ ${varName}: NOT SET`);
    allPresent = false;
  } else {
    if (varName.includes('SECRET') || varName.includes('PASSWORD')) {
      console.log(`✅ ${varName}: ****** (hidden)`);
    } else {
      console.log(`✅ ${varName}: ${value}`);
    }
  }
});

console.log('\n=====================================');

if (!allPresent) {
  console.log('⚠️  Some critical environment variables are missing!');
  console.log('Run: node scripts/setupEnv.js to fix this');
} else {
  console.log('✅ All critical environment variables are set!');
}

// Test JWT generation
if (process.env.JWT_SECRET) {
  try {
    const jwt = require('jsonwebtoken');
    const testToken = jwt.sign({ test: 'data' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    console.log('\n✅ JWT generation test: PASSED');
  } catch (error) {
    console.log('\n❌ JWT generation test: FAILED');
    console.log('Error:', error.message);
  }
}
