const nodemailer = require('nodemailer');

// Gmail SMTP configuration (FREE)
const createEmailTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER || 'linknest.mdu@gmail.com',
      pass: process.env.EMAIL_APP_PASSWORD || 'your-app-specific-password'
    }
  });
};

// Send OTP via Email
const sendOTPEmail = async (email, otp, tenantName, unitNumber) => {
  try {
    const transporter = createEmailTransporter();
    
    const mailOptions = {
      from: `LinkNest MDU <${process.env.EMAIL_USER || 'linknest.mdu@gmail.com'}>`,
      to: email,
      subject: '🔐 Your LinkNest WiFi Access Code',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 28px; }
            .content { padding: 40px 30px; }
            .otp-box { background: #f8f9fa; border: 2px dashed #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0; }
            .otp-code { font-size: 36px; font-weight: bold; color: #667eea; letter-spacing: 8px; margin: 10px 0; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
            .info-item { padding: 10px; background: #f8f9fa; border-radius: 5px; }
            .info-label { color: #666; font-size: 12px; }
            .info-value { color: #333; font-weight: bold; margin-top: 5px; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px; }
            .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🌐 LinkNest WiFi Access</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Secure Tenant Portal</p>
            </div>
            
            <div class="content">
              <h2 style="color: #333; margin-top: 0;">Hello ${tenantName}! 👋</h2>
              <p style="color: #666; line-height: 1.6;">
                You've requested WiFi access for your unit. Use the OTP code below to complete your authentication:
              </p>
              
              <div class="otp-box">
                <p style="margin: 0; color: #666;">Your One-Time Password</p>
                <div class="otp-code">${otp}</div>
                <p style="margin: 10px 0 0 0; color: #999; font-size: 14px;">Valid for 5 minutes</p>
              </div>
              
              <div class="info-grid">
                <div class="info-item">
                  <div class="info-label">Unit Number</div>
                  <div class="info-value">${unitNumber}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Request Time</div>
                  <div class="info-value">${new Date().toLocaleTimeString()}</div>
                </div>
              </div>
              
              <div class="warning">
                <strong>⚠️ Security Notice:</strong><br>
                • Never share this OTP with anyone<br>
                • This code expires in 5 minutes<br>
                • Maximum 3 attempts allowed
              </div>
              
              <p style="color: #666; line-height: 1.6;">
                After entering the OTP, you'll get instant access to high-speed WiFi based on your subscription plan.
              </p>
              
              <center>
                <a href="http://192.168.137.1:3000/tenant" class="button">Open WiFi Portal</a>
              </center>
            </div>
            
            <div class="footer">
              <p style="margin: 5px 0;">© 2024 LinkNest MDU WiFi Controller</p>
              <p style="margin: 5px 0;">This is an automated message, please do not reply.</p>
              <p style="margin: 5px 0;">Need help? Contact your building administrator.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        LinkNest WiFi Access Code
        
        Hello ${tenantName},
        
        Your OTP code is: ${otp}
        
        Unit: ${unitNumber}
        Valid for: 5 minutes
        
        Enter this code in the WiFi portal to get instant access.
        
        Security Notice:
        - Never share this OTP with anyone
        - Maximum 3 attempts allowed
        
        © LinkNest MDU WiFi Controller
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
    
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    return { success: false, error: error.message };
  }
};

// Send welcome email to new tenant
const sendWelcomeEmail = async (email, tenantName, unitNumber, planType) => {
  try {
    const transporter = createEmailTransporter();
    
    const mailOptions = {
      from: `LinkNest MDU <${process.env.EMAIL_USER || 'linknest.mdu@gmail.com'}>`,
      to: email,
      subject: '🎉 Welcome to LinkNest WiFi!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #667eea;">Welcome to LinkNest, ${tenantName}!</h2>
          <p>Your WiFi account has been successfully created.</p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Account Details:</h3>
            <p><strong>Unit:</strong> ${unitNumber}</p>
            <p><strong>Plan:</strong> ${planType}</p>
            <p><strong>Speed:</strong> ${planType === 'Premium' ? '100 Mbps' : planType === 'Standard' ? '50 Mbps' : '25 Mbps'}</p>
          </div>
          
          <h3>How to Connect:</h3>
          <ol>
            <li>Connect to "LinkNest-WiFi" network</li>
            <li>Open browser and go to the portal</li>
            <li>Enter your unit number</li>
            <li>Verify with OTP sent to this email</li>
            <li>Enjoy high-speed internet!</li>
          </ol>
          
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            © 2024 LinkNest MDU WiFi Controller
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('✅ Welcome email sent to:', email);
    return { success: true };
    
  } catch (error) {
    console.error('❌ Welcome email failed:', error);
    return { success: false, error: error.message };
  }
};

// Send billing notification
const sendBillingEmail = async (email, tenantName, amount, dueDate) => {
  try {
    const transporter = createEmailTransporter();
    
    const mailOptions = {
      from: `LinkNest MDU <${process.env.EMAIL_USER || 'linknest.mdu@gmail.com'}>`,
      to: email,
      subject: '📊 Your LinkNest WiFi Bill',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #667eea;">Monthly WiFi Bill</h2>
          <p>Hello ${tenantName},</p>
          <p>Your WiFi bill for this month is ready:</p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #333;">Bill Summary</h3>
            <p style="font-size: 24px; color: #667eea; margin: 10px 0;"><strong>₹${amount}</strong></p>
            <p><strong>Due Date:</strong> ${dueDate}</p>
          </div>
          
          <p>Please ensure timely payment to avoid service interruption.</p>
          
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            © 2024 LinkNest MDU WiFi Controller
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('✅ Billing email sent to:', email);
    return { success: true };
    
  } catch (error) {
    console.error('❌ Billing email failed:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendOTPEmail,
  sendWelcomeEmail,
  sendBillingEmail
};
