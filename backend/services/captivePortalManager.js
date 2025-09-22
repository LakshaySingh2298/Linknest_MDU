/**
 * Captive Portal Manager
 * Handles device detection, redirection, and authentication
 */

class CaptivePortalManager {
  constructor() {
    // Map to track authenticated devices by IP
    this.authenticatedDevices = new Map();
    
    // Map to track device sessions
    this.deviceSessions = new Map();
    
    // Map to track speed limits per device
    this.deviceSpeedLimits = new Map();
    
    // Default speed limit for unauthenticated devices (5 Mbps)
    this.defaultSpeedMbps = 5;
  }

  /**
   * Check if device is authenticated
   */
  isAuthenticated(deviceIP) {
    return this.authenticatedDevices.has(deviceIP);
  }

  /**
   * Register new device connection
   */
  registerDevice(deviceIP, deviceInfo) {
    console.log(`📱 New device connected: ${deviceIP}`);
    
    if (!this.isAuthenticated(deviceIP)) {
      // Store device session
      this.deviceSessions.set(deviceIP, {
        ip: deviceIP,
        ...deviceInfo,
        connectedAt: new Date(),
        authenticated: false
      });
      
      // Apply default speed limit
      this.deviceSpeedLimits.set(deviceIP, {
        download: this.defaultSpeedMbps,
        upload: this.defaultSpeedMbps,
        type: 'default'
      });
      
      console.log(`🔒 Device ${deviceIP} needs authentication (limited to ${this.defaultSpeedMbps} Mbps)`);
      return false; // Not authenticated
    }
    
    return true; // Already authenticated
  }

  /**
   * Authenticate device after OTP verification
   */
  authenticateDevice(deviceIP, tenantId, planSpeeds) {
    console.log(`🔓 Authenticating device ${deviceIP} for tenant ${tenantId}`);
    
    // Mark device as authenticated
    this.authenticatedDevices.set(deviceIP, {
      tenantId,
      authenticatedAt: new Date(),
      planSpeeds
    });
    
    // Update device session
    const session = this.deviceSessions.get(deviceIP);
    if (session) {
      session.authenticated = true;
      session.tenantId = tenantId;
      session.authenticatedAt = new Date();
    }
    
    // Update speed limits
    this.deviceSpeedLimits.set(deviceIP, {
      download: planSpeeds.download,
      upload: planSpeeds.upload,
      type: 'authenticated',
      planType: planSpeeds.planType
    });
    
    console.log(`✅ Device ${deviceIP} authenticated with speeds: ${planSpeeds.download}/${planSpeeds.upload} Mbps`);
    
    return {
      success: true,
      deviceIP,
      tenantId,
      speeds: planSpeeds
    };
  }

  /**
   * Get device speed limits
   */
  getDeviceSpeed(deviceIP) {
    return this.deviceSpeedLimits.get(deviceIP) || {
      download: this.defaultSpeedMbps,
      upload: this.defaultSpeedMbps,
      type: 'default'
    };
  }

  /**
   * Disconnect device
   */
  disconnectDevice(deviceIP) {
    console.log(`🔌 Disconnecting device ${deviceIP}`);
    
    this.authenticatedDevices.delete(deviceIP);
    this.deviceSessions.delete(deviceIP);
    this.deviceSpeedLimits.delete(deviceIP);
    
    return { success: true, deviceIP };
  }

  /**
   * Get all connected devices
   */
  getConnectedDevices() {
    const devices = [];
    
    for (const [ip, session] of this.deviceSessions) {
      const authInfo = this.authenticatedDevices.get(ip);
      const speedInfo = this.deviceSpeedLimits.get(ip);
      
      devices.push({
        ip,
        ...session,
        authenticated: !!authInfo,
        tenantId: authInfo?.tenantId,
        speeds: speedInfo
      });
    }
    
    return devices;
  }

  /**
   * Check if request should redirect to captive portal
   */
  shouldRedirect(deviceIP, requestPath) {
    // Don't redirect if already authenticated
    if (this.isAuthenticated(deviceIP)) {
      return false;
    }
    
    // Don't redirect if already on portal pages
    if (requestPath.includes('/tenant') || 
        requestPath.includes('/api/') ||
        requestPath.includes('/assets/') ||
        requestPath.includes('.js') ||
        requestPath.includes('.css')) {
      return false;
    }
    
    // Redirect all other requests to portal
    return true;
  }

  /**
   * Get portal redirect URL
   */
  getPortalRedirectUrl(deviceIP, isMobile = false) {
    return `http://192.168.137.1:5173/tenant?device=${deviceIP}&captive=true&mobile=${isMobile}`;
  }
}

module.exports = new CaptivePortalManager();
