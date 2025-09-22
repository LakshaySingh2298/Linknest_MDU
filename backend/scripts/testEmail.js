require('dotenv').config();
const { sendOTPEmail } = require('../services/emailService');

async function testEmailService() {
  console.log('🧪 Testing Email Service...\n');
  
  // Check if email credentials are configured
  const emailUser = process.env.EMAIL_USER;
  const emailPassword = process.env.EMAIL_APP_PASSWORD;
  
  if (!emailUser || !emailPassword) {
    console.log('❌ Email credentials not configured!');
    console.log('\nPlease add to your .env file:');
    console.log('EMAIL_USER=your-email@gmail.com');
    console.log('EMAIL_APP_PASSWORD=your-16-char-password');
    return;
  }
  
  if (emailUser === 'your-email@gmail.com' || emailPassword === 'your-app-password') {
    console.log('⚠️ Please update the email credentials in .env file');
    console.log('Current EMAIL_USER:', emailUser);
    console.log('Current EMAIL_APP_PASSWORD:', emailPassword.substring(0, 4) + '****');
    return;
  }
  
  console.log('✅ Email credentials found:');
  console.log('   EMAIL_USER:', emailUser);
  console.log('   EMAIL_APP_PASSWORD:', emailPassword.substring(0, 4) + '****');
  console.log('');
  
  // Test sending OTP email
  console.log('📧 Sending test OTP email...');
  
  try {
    const testOTP = '123456';
    const result = await sendOTPEmail(
      emailUser, // Send to the same email for testing
      testOTP,
      'Test User',
      'A-101'
    );
    
    if (result.success) {
      console.log('✅ Email sent successfully!');
      console.log('   Message ID:', result.messageId);
      console.log('');
      console.log('🎉 Email OTP system is working!');
      console.log('Check your inbox for the test email.');
    } else {
      console.log('❌ Email sending failed:', result.error);
    }
    
  } catch (error) {
    console.log('❌ Email test failed:', error.message);
    console.log('');
    console.log('💡 Common issues:');
    console.log('1. Wrong app password (must be 16 characters from Google)');
    console.log('2. 2FA not enabled on Gmail account');
    console.log('3. Firewall blocking port 587');
    console.log('4. Gmail account locked/suspended');
  }
}

testEmailService();
