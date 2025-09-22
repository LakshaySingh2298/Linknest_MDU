require('dotenv').config();

// Simple in-memory OTP storage (same as in tenantAuth.js)
const otpStorage = new Map();

function simulateOTPFlow() {
  console.log('🔍 Debugging OTP Flow...\n');
  
  // Simulate OTP generation (same logic as backend)
  const phone = '9717206255';
  const unitNumber = 'B-202';
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  
  console.log('📱 Simulating OTP Request:');
  console.log(`   Phone: ${phone}`);
  console.log(`   Unit: ${unitNumber}`);
  console.log(`   Generated OTP: ${otp}`);
  
  // Store OTP (same logic as backend)
  const otpKey = `${phone}_${unitNumber}`;
  const otpData = {
    otp: otp,
    tenantId: 1,
    expiresAt: Date.now() + (5 * 60 * 1000), // 5 minutes
    attempts: 0,
    requestedAt: Date.now()
  };
  
  otpStorage.set(otpKey, otpData);
  
  console.log(`\n💾 OTP Stored with key: ${otpKey}`);
  console.log(`   Expires at: ${new Date(otpData.expiresAt).toLocaleString()}`);
  console.log(`   Current time: ${new Date().toLocaleString()}`);
  
  // Test OTP verification
  console.log('\n🔐 Testing OTP Verification:');
  
  // Test 1: Correct OTP
  console.log('\n   Test 1: Correct OTP');
  const storedData = otpStorage.get(otpKey);
  if (!storedData) {
    console.log('   ❌ OTP not found in storage');
  } else if (Date.now() > storedData.expiresAt) {
    console.log('   ❌ OTP expired');
  } else if (storedData.otp === otp) {
    console.log('   ✅ OTP matches!');
  } else {
    console.log(`   ❌ OTP mismatch: stored=${storedData.otp}, entered=${otp}`);
  }
  
  // Test 2: Wrong OTP
  console.log('\n   Test 2: Wrong OTP (123456)');
  const wrongOtp = '123456';
  if (storedData.otp === wrongOtp) {
    console.log('   ✅ OTP matches!');
  } else {
    console.log(`   ❌ OTP mismatch: stored=${storedData.otp}, entered=${wrongOtp}`);
  }
  
  // Show storage contents
  console.log('\n📋 Current OTP Storage:');
  for (const [key, value] of otpStorage.entries()) {
    console.log(`   Key: ${key}`);
    console.log(`   OTP: ${value.otp}`);
    console.log(`   Expires: ${new Date(value.expiresAt).toLocaleString()}`);
    console.log(`   Attempts: ${value.attempts}`);
  }
  
  console.log('\n💡 Tips for testing:');
  console.log('1. Use the exact phone number and unit from OTP request');
  console.log('2. Enter OTP within 5 minutes');
  console.log('3. Check backend console for the actual OTP');
  console.log('4. Make sure no extra spaces in OTP input');
}

simulateOTPFlow();
