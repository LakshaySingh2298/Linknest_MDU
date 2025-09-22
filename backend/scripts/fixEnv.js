const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function fixEnvironment() {
  const envPath = path.join(__dirname, '..', '.env');
  
  console.log('🔧 Fixing environment configuration...');
  
  // Create proper .env file with correct values
  const envContent = `# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=linknest_mdu
DB_USER=postgres
DB_PASSWORD=123456

# JWT Configuration
JWT_SECRET=${crypto.randomBytes(32).toString('hex')}
JWT_EXPIRES_IN=7d

# Server Configuration
PORT=3000

# Email Configuration (Optional)
EMAIL_USER=your-email@gmail.com
EMAIL_APP_PASSWORD=your-app-password

# Environment
NODE_ENV=development`;

  fs.writeFileSync(envPath, envContent);
  console.log('✅ .env file created with correct configuration');
  
  // Verify the file
  console.log('\n📋 Configuration saved:');
  const saved = fs.readFileSync(envPath, 'utf8');
  const lines = saved.split('\n');
  lines.forEach(line => {
    if (line.startsWith('#') || line.trim() === '') return;
    const [key, value] = line.split('=');
    if (key && value) {
      if (key.includes('PASSWORD') || key.includes('SECRET')) {
        console.log(`   ${key}=****** (hidden)`);
      } else {
        console.log(`   ${key}=${value}`);
      }
    }
  });
  
  console.log('\n✅ Environment fixed! Please restart the backend server.');
}

fixEnvironment();
