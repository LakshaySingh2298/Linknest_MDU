const fs = require('fs');
const path = require('path');

function setupEmailConfig() {
  const envPath = path.join(__dirname, '..', '.env');
  
  console.log('📧 Setting up Email Configuration...\n');
  
  // Read current .env file
  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }
  
  console.log('Please provide your Gmail credentials:');
  console.log('1. Your Gmail address (e.g., linknest.mdu@gmail.com)');
  console.log('2. Your 16-character app password from Google');
  console.log('\nI will help you add these to your .env file...\n');
  
  // Check if email config already exists
  if (envContent.includes('EMAIL_USER') && envContent.includes('EMAIL_APP_PASSWORD')) {
    console.log('✅ Email configuration already exists in .env file');
    
    // Show current config (masked)
    const lines = envContent.split('\n');
    lines.forEach(line => {
      if (line.startsWith('EMAIL_USER=')) {
        console.log(`   ${line}`);
      }
      if (line.startsWith('EMAIL_APP_PASSWORD=')) {
        const [key] = line.split('=');
        console.log(`   ${key}=****** (hidden)`);
      }
    });
    
    console.log('\n📝 To update email credentials:');
    console.log('1. Open: backend/.env file');
    console.log('2. Update EMAIL_USER=your-email@gmail.com');
    console.log('3. Update EMAIL_APP_PASSWORD=your-16-char-password');
    console.log('4. Save the file');
    console.log('5. Restart the backend server');
    
  } else {
    console.log('⚠️ Email configuration not found in .env file');
    console.log('\n📝 Please add these lines to your backend/.env file:');
    console.log('');
    console.log('# Email Configuration (Gmail SMTP)');
    console.log('EMAIL_USER=your-email@gmail.com');
    console.log('EMAIL_APP_PASSWORD=your-16-char-app-password');
    console.log('');
    console.log('Replace:');
    console.log('- your-email@gmail.com with your actual Gmail address');
    console.log('- your-16-char-app-password with the password from Google');
  }
  
  console.log('\n🧪 After setup, test with:');
  console.log('node scripts/testEmail.js');
}

setupEmailConfig();
