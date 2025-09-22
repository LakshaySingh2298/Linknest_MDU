const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function setupEnvironment() {
  const envPath = path.join(__dirname, '..', '.env');
  const envExamplePath = path.join(__dirname, '..', '.env.example');
  
  console.log('🔧 Setting up environment variables...');
  
  // Check if .env exists
  if (!fs.existsSync(envPath)) {
    console.log('❌ .env file not found. Creating from .env.example...');
    
    if (fs.existsSync(envExamplePath)) {
      let envContent = fs.readFileSync(envExamplePath, 'utf8');
      
      // Generate a random JWT secret
      const jwtSecret = crypto.randomBytes(32).toString('hex');
      envContent = envContent.replace('your-super-secret-jwt-key-change-this-in-production', jwtSecret);
      
      fs.writeFileSync(envPath, envContent);
      console.log('✅ .env file created with secure JWT_SECRET');
    } else {
      // Create a minimal .env file
      const minimalEnv = `# Database Configuration
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

# Environment
NODE_ENV=development`;
      
      fs.writeFileSync(envPath, minimalEnv);
      console.log('✅ .env file created with default values');
    }
  } else {
    // Check if JWT_SECRET exists in .env
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    if (!envContent.includes('JWT_SECRET') || envContent.includes('JWT_SECRET=\n') || envContent.includes('JWT_SECRET=\r\n')) {
      console.log('⚠️ JWT_SECRET not found or empty in .env file');
      
      const jwtSecret = crypto.randomBytes(32).toString('hex');
      const updatedEnv = envContent + `\n\n# JWT Configuration (Auto-added)\nJWT_SECRET=${jwtSecret}\nJWT_EXPIRES_IN=7d\n`;
      
      fs.writeFileSync(envPath, updatedEnv);
      console.log('✅ JWT_SECRET added to .env file');
    } else {
      console.log('✅ .env file already configured');
    }
  }
  
  // Show current configuration (without sensitive data)
  console.log('\n📋 Current Environment Configuration:');
  const env = fs.readFileSync(envPath, 'utf8');
  const lines = env.split('\n');
  lines.forEach(line => {
    if (line.startsWith('#') || line.trim() === '') return;
    const [key] = line.split('=');
    if (key) {
      if (key.includes('PASSWORD') || key.includes('SECRET')) {
        console.log(`   ${key}=****** (hidden)`);
      } else {
        console.log(`   ${line}`);
      }
    }
  });
  
  console.log('\n✅ Environment setup complete!');
  console.log('🔄 Please restart your backend server for changes to take effect.');
}

// Run if called directly
if (require.main === module) {
  setupEnvironment();
}

module.exports = setupEnvironment;
